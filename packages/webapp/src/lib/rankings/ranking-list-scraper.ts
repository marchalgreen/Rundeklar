/**
 * Ranking List Scraper
 * 
 * Scrapes ranking lists directly instead of individual player profiles.
 * Much faster than scraping 63 individual profiles - only needs to scrape 6 lists.
 * 
 * For Herlev/Hjorten, there are 6 ranking list URLs:
 * 1. Single Herre (M): #288
 * 2. Double Herre (M): #289
 * 3. Mix Herre (M): #292
 * 4. Mix Dame (K): #292
 * 5. Double Dame (K): #289
 * 6. Single Dame (K): #288
 */

import * as cheerio from 'cheerio'
import { chromium } from 'playwright'
import { logger } from '../utils/logger'

export type RankingListData = {
  numericId: string
  officialId: string | null
  name: string
  points: number
  rankingType: 'single' | 'double' | 'mix'
  gender: 'M' | 'K'
}

const DEFAULT_BASE_URL = 'https://badmintonplayer.dk'

/**
 * Scrapes a single ranking list page
 * 
 * @param rankingListUrl - Full URL to ranking list (e.g., "https://badmintonplayer.dk/DBF/Ranglister/#288,2025,,0,,,1148,0,,,,15,,,,0,,,,,,M")
 * @param rankingType - Type of ranking ('single', 'double', or 'mix')
 * @param gender - Gender ('M' for Herre, 'K' for Dame)
 * @returns Array of players with their ranking points
 */
export async function scrapeRankingList(
  rankingListUrl: string,
  rankingType: 'single' | 'double' | 'mix',
  gender: 'M' | 'K'
): Promise<RankingListData[]> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
  
  try {
    logger.info(`[Ranking List Scraper] Scraping ${rankingType} ${gender === 'M' ? 'Herre' : 'Dame'} ranking list...`)
    
    // Use Playwright to load the page (needed for hash-based routing)
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      userAgent: 'RundeklarRankingBot/1.0 (+https://rundeklar.dk)'
    })
    const page = await context.newPage()
    
    // Navigate to base URL first, then to hash URL
    const baseUrlOnly = rankingListUrl.split('#')[0]
    await page.goto(baseUrlOnly, { waitUntil: 'networkidle', timeout: 30000 })
    
    // Navigate to hash URL to trigger JavaScript routing
    await page.goto(rankingListUrl, { waitUntil: 'networkidle', timeout: 30000 })
    
    // Wait for table content to load
    await page.waitForSelector('table tr a[href*="VisSpiller"], table tr td', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2000) // Extra wait for AJAX
    
    const html = await page.content()
    await browser.close()
    browser = null
    
    const $ = cheerio.load(html)
    const players: RankingListData[] = []
    
    // Parse ranking list table
    // Structure: <tr><td class="rank">1</td><td>(246)</td><td class="playerid">...</td><td class="name"><a href="...">Name</a></td><td class="clas">...</td><td class="points">...</td></tr>
    $('table tr').each((_, element) => {
      const $row = $(element)
      
      // Find player link
      const playerLink = $row.find('a[href*="VisSpiller"]').first()
      const href = playerLink.attr('href') || ''
      
      // Extract numeric ID from URL
      const numericIdMatch = href.match(/#(\d+)/)
      if (!numericIdMatch) return
      
      const numericId = numericIdMatch[1]
      
      // Extract player name
      let nameText = playerLink.text().trim()
      if (!nameText || nameText.length < 2) return
      
      // Store original name with parentheses for reference
      const originalName = nameText
      
      // Normalize name by removing parenthesized content like "(EU)", "(Udl.)"
      // This helps with matching players in our database who don't have these suffixes
      nameText = nameText.replace(/\s*\([^)]*\)\s*/g, '').trim()
      
      // Extract official BadmintonID from playerid cell
      const playerIdCell = $row.find('td.playerid').first()
      const officialIdText = playerIdCell.text().trim()
      const officialIdMatch = officialIdText.match(/(\d{6}-\d{2})/)
      const officialId = officialIdMatch ? officialIdMatch[1] : null
      
      // Extract ranking points from points cell (4th cell, index 3)
      // Points are in a link with onclick handler, but the text content is the point value
      const cells = $row.find('td')
      let points: number | null = null
      
      // Look for points in cells with class "points" or in cells with right-aligned text
      cells.each((index, cell) => {
        const $cell = $(cell)
        const cellClass = $cell.attr('class') || ''
        const cellStyle = $cell.attr('style') || ''
        
        // Points are typically in cells with class "points" or style "text-align:right"
        if (cellClass.includes('points') || cellStyle.includes('text-align:right')) {
          const text = $cell.text().trim()
          const pointMatch = text.match(/(\d{3,5})/)
          if (pointMatch) {
            const num = parseInt(pointMatch[1], 10)
            // Ranking points are typically between 2000-4000, but can be higher/lower
            // But we also need to exclude ranking positions which are in parentheses
            if (num >= 2000 && num <= 10000 && !text.includes('(')) {
              points = num
              return false // Break loop
            }
          }
        }
      })
      
      // If not found, try looking in the 4th cell (index 3) which typically contains points
      if (points === null && cells.length >= 4) {
        const pointCell = $(cells[3])
        const pointText = pointCell.text().trim()
        const pointMatch = pointText.match(/(\d{3,5})/)
        if (pointMatch) {
          const num = parseInt(pointMatch[1], 10)
          if (num >= 2000 && num <= 10000 && !pointText.includes('(')) {
            points = num
          }
        }
      }
      
      if (points === null) {
        // No points found for this player in this ranking list
        return
      }
      
      players.push({
        numericId,
        officialId,
        name: nameText, // Normalized name (without parentheses)
        points,
        rankingType,
        gender
      })
    })
    
    logger.info(`[Ranking List Scraper] Found ${players.length} players in ${rankingType} ${gender === 'M' ? 'Herre' : 'Dame'} ranking list`)
    return players
    
  } catch (error) {
    logger.error(`[Ranking List Scraper] Failed to scrape ranking list`, error)
    if (browser) {
      await browser.close().catch(() => {})
    }
    return []
  }
}

/**
 * Scrapes all ranking lists for a club and combines the data
 * 
 * @param rankingListUrls - Object with URLs for each ranking type and gender
 * @returns Map of numericId -> combined ranking data
 */
export async function scrapeAllRankingLists(
  rankingListUrls: {
    singleHerre?: string
    doubleHerre?: string
    mixHerre?: string
    mixDame?: string
    doubleDame?: string
    singleDame?: string
  }
): Promise<Map<string, {
  numericId: string
  officialId: string | null
  name: string
  single?: number | null
  double?: number | null
  mix?: number | null
}>> {
  const combinedData = new Map<string, {
    numericId: string
    officialId: string | null
    name: string
    single?: number | null
    double?: number | null
    mix?: number | null
  }>()
  
  // Scrape all ranking lists in parallel
  const promises: Promise<RankingListData[]>[] = []
  
  if (rankingListUrls.singleHerre) {
    promises.push(scrapeRankingList(rankingListUrls.singleHerre, 'single', 'M'))
  }
  if (rankingListUrls.doubleHerre) {
    promises.push(scrapeRankingList(rankingListUrls.doubleHerre, 'double', 'M'))
  }
  if (rankingListUrls.mixHerre) {
    promises.push(scrapeRankingList(rankingListUrls.mixHerre, 'mix', 'M'))
  }
  if (rankingListUrls.mixDame) {
    promises.push(scrapeRankingList(rankingListUrls.mixDame, 'mix', 'K'))
  }
  if (rankingListUrls.doubleDame) {
    promises.push(scrapeRankingList(rankingListUrls.doubleDame, 'double', 'K'))
  }
  if (rankingListUrls.singleDame) {
    promises.push(scrapeRankingList(rankingListUrls.singleDame, 'single', 'K'))
  }
  
  const results = await Promise.all(promises)
  
  // Combine all results
  for (const rankingList of results) {
    for (const player of rankingList) {
      const existing = combinedData.get(player.numericId)
      
      if (existing) {
        // Update existing player with new ranking data
        if (player.rankingType === 'single') {
          existing.single = player.points
        } else if (player.rankingType === 'double') {
          existing.double = player.points
        } else if (player.rankingType === 'mix') {
          existing.mix = player.points
        }
        // Update official ID if we found one and didn't have it before
        if (!existing.officialId && player.officialId) {
          existing.officialId = player.officialId
        }
      } else {
        // Create new entry
        combinedData.set(player.numericId, {
          numericId: player.numericId,
          officialId: player.officialId,
          name: player.name,
          single: player.rankingType === 'single' ? player.points : null,
          double: player.rankingType === 'double' ? player.points : null,
          mix: player.rankingType === 'mix' ? player.points : null
        })
      }
    }
  }
  
  logger.info(`[Ranking List Scraper] Combined data for ${combinedData.size} unique players`)
  return combinedData
}

