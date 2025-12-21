/**
 * Player Matcher
 * 
 * Automatically matches players from database with BadmintonPlayer.dk profiles
 * by searching based on name and club.
 */

import * as cheerio from 'cheerio'
import { logger } from '../utils/logger'

export type PlayerMatch = {
  playerId: string // Database player ID
  playerName: string // Player name in database
  badmintonplayerId: string | null // Numeric ID from BadmintonPlayer.dk (e.g., "25886")
  officialBadmintonId: string | null // Official BadmintonID (e.g., "881203-09")
  confidence: 'high' | 'medium' | 'low' // Match confidence
  matchedName?: string // Name found on BadmintonPlayer.dk
  club?: string // Club name from BadmintonPlayer.dk
}

const DEFAULT_BASE_URL = 'https://badmintonplayer.dk'
const DEFAULT_DELAY_MS = 500 // 500ms delay between requests (polite scraping)

/**
 * Normalizes player name for matching (removes accents, converts to lowercase)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
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
 * Gets all players from a club on BadmintonPlayer.dk
 * 
 * This is more reliable than searching individual players, as we can get
 * all players from the club page and match them with our database.
 * 
 * @param clubName - Club name to search for (e.g., "Herlev Hjorten")
 * @param baseUrl - Base URL for BadmintonPlayer.dk
 * @returns Array of players from the club
 */
export async function getPlayersFromClub(
  clubName: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<Array<{
  numericId: string
  officialId: string | null
  name: string
  club: string | null
}>> {
  try {
    // Try to find club page - the URL structure needs to be determined
    // Common patterns: /DBF/Klub/VisKlub/{clubId} or similar
    // For now, we'll need to search for the club first or use a known club ID
    
    // TODO: Implement club lookup and player listing
    // This requires understanding the club page structure on badmintonplayer.dk
    logger.warn(`[Player Matcher] Getting players from club not yet implemented - needs investigation of club page structure`)
    return []
    
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
  baseUrl: string = DEFAULT_BASE_URL
): Promise<Array<{
  numericId: string
  officialId: string | null
  name: string
  club: string | null
}>> {
  try {
    // If club name is provided, try to get all players from club first
    if (clubName) {
      const clubPlayers = await getPlayersFromClub(clubName, baseUrl)
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
    logger.warn(`[Player Matcher] Direct search not implemented - please provide club name for better matching`)
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
 * Matches a single player from database with BadmintonPlayer.dk
 * 
 * @param playerId - Database player ID
 * @param playerName - Player name in database
 * @param clubName - Optional club name for matching
 * @param baseUrl - Base URL for BadmintonPlayer.dk
 * @returns Match result or null if no match found
 */
export async function matchPlayer(
  playerId: string,
  playerName: string,
  clubName?: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<PlayerMatch | null> {
  try {
    // Search for player
    const results = await searchPlayerOnBadmintonPlayer(playerName, clubName, baseUrl)
    
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

