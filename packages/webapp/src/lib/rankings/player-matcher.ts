/**
 * Player Matcher
 * 
 * Automatically matches players from database with BadmintonPlayer.dk profiles
 * by searching based on name and club.
 */

import * as cheerio from 'cheerio'
import { chromium } from 'playwright'
import { logger } from '../utils/logger.js'

export type PlayerMatch = {
  playerId: string // Database player ID
  playerName: string // Player name in database
  badmintonplayerId: string | null // Numeric ID from BadmintonPlayer.dk (e.g., "25886")
  officialBadmintonId: string | null // Official BadmintonID (e.g., "881203-09")
  confidence: 'high' | 'medium' | 'low' // Match confidence
  matchedName?: string // Name found on BadmintonPlayer.dk
  club?: string // Club name from BadmintonPlayer.dk
  // Ranking points (if available from ranking list)
  single?: number | null
  double?: number | null
  mix?: number | null
}

const DEFAULT_BASE_URL = 'https://badmintonplayer.dk'
const DEFAULT_DELAY_MS = 500 // 500ms delay between requests (polite scraping)

/**
 * Normalizes player name for matching (removes accents, converts to lowercase)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    // Remove parenthesized content like "(EU)", "(Udl.)", etc. first
    .replace(/\s*\([^)]*\)\s*/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .trim()
}

/**
 * Calculates similarity between two names (simple Levenshtein-like approach)
 */
function nameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1)
  const n2 = normalizeName(name2)
  
  // Exact match
  if (n1 === n2) return 1.0
  
  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) return 0.8
  
  // Simple word-based similarity
  const words1 = n1.split(/\s+/)
  const words2 = n2.split(/\s+/)
  
  let matches = 0
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 && word1.length > 2) {
        matches++
        break
      }
    }
  }
  
  const maxWords = Math.max(words1.length, words2.length)
  return matches / maxWords
}

/**
 * Gets all players from a club on BadmintonPlayer.dk using the ranking list URL
 * 
 * The ranking list URL format is: /DBF/Ranglister/#{clubId},{season},...
 * Example: https://badmintonplayer.dk/DBF/Ranglister/#287,2025,,0,,,1148,0,,,,15,,,,0,,,,,,
 * 
 * This is more reliable than searching individual players, as we can get
 * all players from the club ranking list and match them with our database.
 * 
 * @param rankingListUrl - Full ranking list URL for the club (e.g., "https://badmintonplayer.dk/DBF/Ranglister/#287,2025,,0,,,1148,0,,,,15,,,,0,,,,,,")
 * @param baseUrl - Base URL for BadmintonPlayer.dk (optional, extracted from URL if not provided)
 * @returns Array of players from the club with their rankings
 */
export async function getPlayersFromRankingList(
  rankingListUrl: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<Array<{
  numericId: string
  officialId: string | null
  name: string
  club: string | null
  single?: number | null
  double?: number | null
  mix?: number | null
}>> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
  
  try {
    // The page uses hash-based routing, so we need a browser to execute JavaScript
    // Use Playwright to load the page and wait for content
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent: 'RundeklarRankingBot/1.0 (+https://rundeklar.dk)'
    })
    const page = await context.newPage()
    
    // Navigate to ranking list page (without hash first to load base page)
    const baseUrl = rankingListUrl.split('#')[0]
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 })
    
    // Extract hash part and navigate to it (this should trigger JavaScript routing)
    const hash = rankingListUrl.split('#')[1]
    if (hash) {
      await page.goto(rankingListUrl, { waitUntil: 'networkidle', timeout: 30000 })
    }
    
    // Wait for table content to load - try multiple selectors
    await page.waitForSelector('table tr a[href*="#"], table tr td', { timeout: 15000 }).catch(() => {
      // If selector not found, continue anyway - content might already be loaded
    })
    
    // Wait a bit more for any AJAX calls to complete
    await page.waitForTimeout(2000)
    
    // Get HTML after JavaScript execution
    const html = await page.content()
    
    // Debug: Save HTML to file for inspection (only in development)
    if (process.env.NODE_ENV !== 'production') {
      const fs = await import('fs')
      const path = await import('path')
      const debugPath = path.join(process.cwd(), 'badmintonplayer-debug.html')
      fs.writeFileSync(debugPath, html, 'utf-8')
      logger.debug(`Saved HTML to ${debugPath}`)
    }
    
    await browser.close()
    browser = null
    
    const $ = cheerio.load(html)

    // Debug: Log some info about the page structure
    const tableCount = $('table').length
    const linkCount = $('a[href*="VisSpiller"]').length
    const allLinks = $('a[href*="#"]').length
    
    logger.debug(`Page loaded: ${tableCount} tables, ${linkCount} VisSpiller links, ${allLinks} hash links found`)
    
    // Debug: Log first few links to see structure
    if (linkCount === 0) {
      const firstFewLinks = $('a[href*="#"]').slice(0, 5)
      const sampleHrefs = firstFewLinks.map((_, el) => $(el).attr('href')).get()
      logger.debug(`No VisSpiller links found. Sample links: ${sampleHrefs.join(', ')}`)
      
      // Also check for any links with numbers in href
      const numericLinks = $('a[href*="#"]').filter((_, el) => {
        const href = $(el).attr('href') || ''
        return /#\d+/.test(href)
      })
      logger.debug(`Found ${numericLinks.length} links with numeric IDs in href`)
    }

    const players: Array<{
      numericId: string
      officialId: string | null
      name: string
      club: string | null
      single?: number | null
      double?: number | null
      mix?: number | null
    }> = []

    // Parse ranking list table
    // Try multiple selector patterns to find player rows
    // Look for links to player profiles first (most reliable)
    $('a[href*="VisSpiller"]').each((_, element) => {
      const $link = $(element)
      const href = $link.attr('href') || ''
      
      // Extract numeric ID from URL (e.g., /DBF/Spiller/VisSpiller/#25886 or #25886)
      const numericIdMatch = href.match(/#(\d+)/)
      if (!numericIdMatch) return
      
      const numericId = numericIdMatch[1]
      
      // Extract player name from link text
      const nameText = $link.text().trim()
      if (!nameText || nameText.length < 2) return
      
      // Find the parent row to get ranking values
      const $row = $link.closest('tr')
      
      // Try to extract official BadmintonID from nearby text
      const rowText = $row.text()
      const officialIdMatch = rowText.match(/(\d{6}-\d{2})/)
      const officialId = officialIdMatch ? officialIdMatch[1] : null
      
      // Extract ranking values from table cells in the row
      // Based on HTML structure: <td class="rank">1</td><td>(246)</td><td class="playerid">...</td><td class="name">...</td><td class="clas">...</td><td class="points"></td><td class="points"></td>
      // NOTE: The number in parentheses (e.g., "(246)") is the player's overall ranking position in Denmark, NOT ranking points
      // Ranking points are typically in the 2000-4000 range and would be in separate columns
      // The ranking list page only shows ONE ranking type at a time (Single, Double, or Mix)
      // To get all three ranking types, we need to scrape individual player profiles
      
      const cells = $row.find('td')
      let single: number | null = null
      let double: number | null = null
      let mix: number | null = null
      
      // Look for ranking numbers in cells with class "points" (these should contain actual ranking points)
      cells.filter('.points').each((index, cell) => {
        const text = $(cell).text().trim()
        const numMatch = text.match(/(\d{3,5})/)
        if (numMatch) {
          const num = parseInt(numMatch[1], 10)
          // Ranking points are typically between 2000-4000, but can be higher/lower
          if (num >= 1000 && num <= 10000) {
            // Assign based on position (will need to check table headers to determine which ranking type this list shows)
            // For now, we can't determine which ranking type this is without checking the page context
            // So we'll leave them as null - ranking points should be scraped from individual player profiles
          }
        }
      })
      
      // Look for numbers in other cells (excluding rank position in parentheses and other metadata)
      cells.each((index, cell) => {
        const text = $(cell).text().trim()
        const cellClass = $(cell).attr('class') || ''
        
        // Skip cells that are metadata (rank position, playerid, name, clas)
        if (cellClass.includes('rank') || cellClass.includes('playerid') || cellClass.includes('name') || cellClass.includes('clas')) {
          return
        }
        
        // Skip parenthesized numbers (these are ranking positions, not points)
        if (text.match(/^\(\d+\)$/)) {
          return
        }
        
        // Look for numbers that could be ranking points (2000-4000 range)
        const numMatch = text.match(/(\d{3,5})/)
        if (numMatch) {
          const num = parseInt(numMatch[1], 10)
          // Ranking points are typically between 2000-4000, but can be higher/lower
          if (num >= 2000 && num <= 10000) {
            // This might be a ranking point, but we can't determine which type without context
            // Leave as null - we'll scrape from individual profiles instead
          }
        }
      })
      
      // Try to find rankings by looking for labels (unlikely to be in ranking list table)
      const singleMatch = rowText.match(/Single[:\s]+(\d{3,5})/i)
      const doubleMatch = rowText.match(/Double[:\s]+(\d{3,5})/i)
      const mixMatch = rowText.match(/Mix[:\s]+(\d{3,5})/i)
      
      if (singleMatch) single = parseInt(singleMatch[1], 10)
      if (doubleMatch) double = parseInt(doubleMatch[1], 10)
      if (mixMatch) mix = parseInt(mixMatch[1], 10)
      
      // NOTE: Ranking list pages typically only show one ranking type at a time
      // To get all three ranking types (Single, Double, Mix), we need to scrape individual player profiles
      // So we'll leave ranking points as null here and rely on individual profile scraping
      
      players.push({
        numericId,
        officialId,
        name: nameText,
        club: null,
        single: single || null,
        double: double || null,
        mix: mix || null
      })
    })
    
    // If no players found via links, try parsing table rows directly
    if (players.length === 0) {
      logger.warn('[Player Matcher] No players found via links, trying table rows...')
      $('table tr').each((_, element) => {
        const $row = $(element)
      
      // Try to find player link - links to player profiles contain numeric ID
      const playerLink = $row.find('a[href*="VisSpiller"], a[href*="#"]').first()
      const href = playerLink.attr('href') || ''
      
      // Extract numeric ID from URL (e.g., /DBF/Spiller/VisSpiller/#25886)
      const numericIdMatch = href.match(/#(\d+)/)
      if (!numericIdMatch) return
      
      const numericId = numericIdMatch[1]
      
      // Extract player name
      const nameText = playerLink.text().trim() || $row.find('td').first().text().trim()
      if (!nameText) return
      
      // Try to extract official BadmintonID from the row or nearby elements
      // Pattern: YYMMDD-NN (e.g., 881203-09)
      const officialIdMatch = $row.text().match(/(\d{6}-\d{2})/) || 
                             html.match(new RegExp(`${nameText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?(\\d{6}-\\d{2})`))
      const officialId = officialIdMatch ? officialIdMatch[1] : null
      
      // Extract ranking values from table cells
      // Look for numeric values that could be rankings (typically 2000-4000 range)
      const cells = $row.find('td')
      let single: number | null = null
      let double: number | null = null
      let mix: number | null = null
      
      // Try to identify ranking columns by position or labels
      // This will need adjustment based on actual table structure
      cells.each((index, cell) => {
        const text = $(cell).text().trim()
        const numMatch = text.match(/(\d{3,5})/)
        if (numMatch) {
          const num = parseInt(numMatch[1], 10)
          // Rankings are typically between 2000-4000, but can be higher/lower
          if (num >= 1000 && num <= 10000) {
            // Try to determine which ranking based on column position or header
            // For now, assign based on position (needs verification)
            if (single === null) single = num
            else if (double === null) double = num
            else if (mix === null) mix = num
          }
        }
      })
      
      // Also try to find rankings by looking for labels like "Single", "Double", "Mix"
      const rowText = $row.text()
      const singleMatch = rowText.match(/Single[:\s]+(\d{3,5})/i)
      const doubleMatch = rowText.match(/Double[:\s]+(\d{3,5})/i)
      const mixMatch = rowText.match(/Mix[:\s]+(\d{3,5})/i)
      
      if (singleMatch) single = parseInt(singleMatch[1], 10)
      if (doubleMatch) double = parseInt(doubleMatch[1], 10)
      if (mixMatch) mix = parseInt(mixMatch[1], 10)
      
        players.push({
          numericId,
          officialId,
          name: nameText,
          club: null, // Club is known from the URL context
          single: single || null,
          double: double || null,
          mix: mix || null
        })
      })
    }

    logger.info(`[Player Matcher] Found ${players.length} players from ranking list`)
    return players
    
  } catch (error) {
    logger.error(`[Player Matcher] Failed to get players from ranking list`, error)
    if (browser) {
      await browser.close().catch(() => {})
    }
    return []
  }
}

/**
 * Gets all players from a club on BadmintonPlayer.dk
 * 
 * This is a convenience wrapper that uses the ranking list URL.
 * 
 * @param clubName - Club name (for logging)
 * @param rankingListUrl - Full ranking list URL for the club
 * @param baseUrl - Base URL for BadmintonPlayer.dk
 * @returns Array of players from the club
 */
export async function getPlayersFromClub(
  clubName: string,
  rankingListUrl?: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<Array<{
  numericId: string
  officialId: string | null
  name: string
  club: string | null
}>> {
  try {
    if (!rankingListUrl) {
      logger.warn(`[Player Matcher] Ranking list URL required for club ${clubName}`)
      return []
    }
    
    const players = await getPlayersFromRankingList(rankingListUrl, baseUrl)
    
    // Return simplified format (without rankings for matching purposes)
    return players.map(p => ({
      numericId: p.numericId,
      officialId: p.officialId,
      name: p.name,
      club: p.club
    }))
    
  } catch (error) {
    logger.error(`[Player Matcher] Failed to get players from club ${clubName}`, error)
    return []
  }
}

/**
 * Searches for a player on BadmintonPlayer.dk
 * 
 * Note: This is a placeholder. The actual implementation would need to:
 * 1. Handle ASP.NET postback forms (complex)
 * 2. Or use club-based lookup (getPlayersFromClub) which is more reliable
 * 
 * @param playerName - Player name to search for
 * @param clubName - Optional club name to narrow search
 * @param baseUrl - Base URL for BadmintonPlayer.dk
 * @returns Array of potential matches
 */
export async function searchPlayerOnBadmintonPlayer(
  playerName: string,
  clubName?: string,
  rankingListUrl?: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<Array<{
  numericId: string
  officialId: string | null
  name: string
  club: string | null
}>> {
  try {
    // If ranking list URL is provided, use it to get all players from club
    if (rankingListUrl) {
      const clubPlayers = await getPlayersFromClub(clubName || '', rankingListUrl, baseUrl)
      // Filter by name similarity
      const normalizedSearchName = normalizeName(playerName)
      return clubPlayers.filter(p => {
        const normalizedPlayerName = normalizeName(p.name)
        return normalizedPlayerName.includes(normalizedSearchName) || 
               normalizedSearchName.includes(normalizedPlayerName) ||
               nameSimilarity(playerName, p.name) > 0.5
      })
    }
    
    // If club name is provided but no URL, try to get all players from club
    if (clubName) {
      const clubPlayers = await getPlayersFromClub(clubName, undefined, baseUrl)
      // Filter by name similarity
      const normalizedSearchName = normalizeName(playerName)
      return clubPlayers.filter(p => {
        const normalizedPlayerName = normalizeName(p.name)
        return normalizedPlayerName.includes(normalizedSearchName) || 
               normalizedSearchName.includes(normalizedPlayerName) ||
               nameSimilarity(playerName, p.name) > 0.5
      })
    }
    
    // Fallback: Try direct search (not implemented yet)
    logger.warn(`[Player Matcher] Direct search not implemented - please provide ranking list URL or club name for better matching`)
    return []
    
  } catch (error) {
    logger.error(`[Player Matcher] Failed to search for player ${playerName}`, error)
    return []
  }
}

/**
 * Finds numeric ID from a player profile URL or page
 * 
 * @param officialBadmintonId - Official BadmintonID (e.g., "881203-09")
 * @param baseUrl - Base URL for BadmintonPlayer.dk
 * @returns Numeric ID if found, null otherwise
 */
export async function findNumericIdFromOfficialId(
  officialBadmintonId: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<string | null> {
  try {
    // Try to find player by official ID
    // This might require searching or using a different endpoint
    // For now, return null - needs implementation
    logger.warn(`[Player Matcher] Finding numeric ID from official ID not yet implemented`)
    return null
  } catch (error) {
    logger.error(`[Player Matcher] Failed to find numeric ID for ${officialBadmintonId}`, error)
    return null
  }
}

/**
 * Matches all players from database with BadmintonPlayer.dk using ranking list
 * 
 * This is more efficient than matching one by one, as it fetches all players
 * from the ranking list once and matches them all.
 * 
 * @param players - Array of players from database { id, name }
 * @param rankingListUrl - Full ranking list URL for the club
 * @param baseUrl - Base URL for BadmintonPlayer.dk
 * @returns Array of match results
 */
export async function matchAllPlayersFromRankingList(
  players: Array<{ id: string; name: string }>,
  rankingListUrl: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<PlayerMatch[]> {
  try {
    // Get all players from ranking list
    const rankingPlayers = await getPlayersFromRankingList(rankingListUrl, baseUrl)
    
    const matches: PlayerMatch[] = []
    
    // Match each database player with ranking list players
    for (const player of players) {
      let bestMatch: typeof rankingPlayers[0] | null = null
      let bestSimilarity = 0
      
      for (const rankingPlayer of rankingPlayers) {
        const similarity = nameSimilarity(player.name, rankingPlayer.name)
        if (similarity > bestSimilarity) {
          bestMatch = rankingPlayer
          bestSimilarity = similarity
        }
      }
      
      if (!bestMatch || bestSimilarity < 0.5) {
        matches.push({
          playerId: player.id,
          playerName: player.name,
          badmintonplayerId: null,
          officialBadmintonId: null,
          confidence: 'low'
        })
        continue
      }
      
      // Determine confidence
      let confidence: 'high' | 'medium' | 'low' = 'low'
      if (bestSimilarity >= 0.9) {
        confidence = 'high'
      } else if (bestSimilarity >= 0.7) {
        confidence = 'medium'
      }
      
      matches.push({
        playerId: player.id,
        playerName: player.name,
        badmintonplayerId: bestMatch.numericId,
        officialBadmintonId: bestMatch.officialId,
        confidence,
        matchedName: bestMatch.name,
        // Include ranking points if available
        single: bestMatch.single ?? null,
        double: bestMatch.double ?? null,
        mix: bestMatch.mix ?? null
      })
    }
    
    return matches
  } catch (error) {
    logger.error(`[Player Matcher] Failed to match all players`, error)
    return []
  }
}

/**
 * Matches a single player from database with BadmintonPlayer.dk
 * 
 * @param playerId - Database player ID
 * @param playerName - Player name in database
 * @param clubName - Optional club name for matching
 * @param rankingListUrl - Optional ranking list URL (more efficient than searching)
 * @param baseUrl - Base URL for BadmintonPlayer.dk
 * @returns Match result or null if no match found
 */
export async function matchPlayer(
  playerId: string,
  playerName: string,
  clubName?: string,
  rankingListUrl?: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<PlayerMatch | null> {
  try {
    // Search for player
    const results = await searchPlayerOnBadmintonPlayer(playerName, clubName, rankingListUrl, baseUrl)
    
    if (results.length === 0) {
      return {
        playerId,
        playerName,
        badmintonplayerId: null,
        officialBadmintonId: null,
        confidence: 'low'
      }
    }
    
    // Find best match
    let bestMatch = results[0]
    let bestSimilarity = nameSimilarity(playerName, results[0].name)
    
    for (const result of results.slice(1)) {
      const similarity = nameSimilarity(playerName, result.name)
      if (similarity > bestSimilarity) {
        bestMatch = result
        bestSimilarity = similarity
      }
    }
    
    // Determine confidence
    let confidence: 'high' | 'medium' | 'low' = 'low'
    if (bestSimilarity >= 0.9) {
      confidence = 'high'
    } else if (bestSimilarity >= 0.7) {
      confidence = 'medium'
    }
    
    // If club name provided, check if it matches
    if (clubName && bestMatch.club) {
      const clubMatch = normalizeName(clubName) === normalizeName(bestMatch.club)
      if (clubMatch && confidence === 'medium') {
        confidence = 'high'
      } else if (!clubMatch && confidence === 'high') {
        confidence = 'medium'
      }
    }
    
    return {
      playerId,
      playerName,
      badmintonplayerId: bestMatch.numericId,
      officialBadmintonId: bestMatch.officialId,
      confidence,
      matchedName: bestMatch.name,
      club: bestMatch.club || undefined
    }
  } catch (error) {
    logger.error(`[Player Matcher] Failed to match player ${playerName}`, error)
    return null
  }
}

