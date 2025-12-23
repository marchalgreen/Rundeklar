/**
 * BadmintonPlayer.dk Web Scraper
 * 
 * Polite web scraper for extracting ranking data from badmintonplayer.dk.
 * Respects rate limits and uses proper User-Agent headers.
 */

import * as cheerio from 'cheerio'
import pLimit from 'p-limit'
import { chromium } from 'playwright'
import { logger } from '../utils/logger'

export type RankingData = {
  badmintonplayerId: string // Official BadmintonID (e.g., "881203-09") - this is what we store
  numericId?: string | null // Numeric URL ID (e.g., "25886") - used for scraping
  single?: number | null
  double?: number | null
  mix?: number | null
}

const DEFAULT_BASE_URL = 'https://badmintonplayer.dk'
const DEFAULT_DELAY_MS = 400 // 400ms delay between requests (polite scraping)
const DEFAULT_CONCURRENCY = 1 // Serial requests for safety

/**
 * Determines if an ID is a numeric URL ID or official BadmintonID
 * 
 * @param id - Player ID to check
 * @returns true if numeric ID (e.g., "25886"), false if official BadmintonID (e.g., "881203-09")
 */
function isNumericId(id: string): boolean {
  // Numeric IDs are pure numbers, official BadmintonIDs contain dashes (e.g., "881203-09")
  return /^\d+$/.test(id)
}

/**
 * Scrapes ranking data for a single player from BadmintonPlayer.dk
 * 
 * Supports two ID formats:
 * 1. Official BadmintonID (e.g., "881203-09") - preferred, used in badminton world
 * 2. Numeric URL ID (e.g., "25886") - used for URL construction
 * 
 * @param badmintonplayerId - BadmintonPlayer.dk player ID (official BadmintonID or numeric ID)
 * @param baseUrl - Base URL for BadmintonPlayer.dk (default: https://badmintonplayer.dk)
 * @returns Ranking data or null if player not found
 */
async function scrapePlayerRankings(
  badmintonplayerId: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<RankingData | null> {
  try {
    // Determine ID type and construct appropriate URL
    // URL format: https://badmintonplayer.dk/DBF/Spiller/VisSpiller/#{numericId}
    // We need the numeric ID for the URL, but store the official BadmintonID
    
    let numericId: string
    let officialId: string = badmintonplayerId
    
    if (isNumericId(badmintonplayerId)) {
      // Input is numeric ID - use it directly for URL
      numericId = badmintonplayerId
      // We'll try to extract the official BadmintonID from the page
    } else {
      // Input is official BadmintonID (e.g., "881203-09")
      // The URL requires numeric ID, so we need to search for the player first
      // Note: This is a limitation - if you only have the official BadmintonID,
      // you may need to use the numeric ID for scraping, or implement a search function
      // For now, we'll log a warning and skip this player
      logger.warn(`[BadmintonPlayer Scraper] Official BadmintonID provided (${badmintonplayerId}), but numeric ID required for URL. Please use numeric ID (e.g., "25886") or implement search functionality.`)
      return null
    }
    
    // Construct player profile URL using numeric ID
    // Note: The site uses hash-based routing (#25886)
    const playerUrl = `${baseUrl}/DBF/Spiller/VisSpiller/#${numericId}`
    
    // Use Playwright to load the page (needed for hash-based routing)
    const browser = await chromium.launch({ headless: true })
    let html: string
    
    try {
      const context = await browser.newContext({
        userAgent: 'RundeklarRankingBot/1.0 (+https://rundeklar.dk)'
      })
      const page = await context.newPage()
      
      // Navigate to base URL first, then to hash URL
      const baseUrlOnly = playerUrl.split('#')[0]
      await page.goto(baseUrlOnly, { waitUntil: 'networkidle', timeout: 30000 })
      
      // Navigate to hash URL to trigger JavaScript routing
      await page.goto(playerUrl, { waitUntil: 'networkidle', timeout: 30000 })
      
      // Wait for content to load
      await page.waitForSelector('table, .ranking, [id*="ranking"]', { timeout: 10000 }).catch(() => {})
      await page.waitForTimeout(2000) // Extra wait for AJAX
      
      html = await page.content()
    } finally {
      await browser.close()
    }
    
    const $ = cheerio.load(html)

    // Try to extract official BadmintonID from the page if we only had numeric ID
    if (isNumericId(badmintonplayerId)) {
      // Look for BadmintonID in the page (might be in various places)
      // Common patterns: "BadmintonID: 881203-09" or similar
      const badmintonIdMatch = html.match(/BadmintonID[:\s]+([\d-]+)/i) || 
                               html.match(/(\d{6}-\d{2})/) // Pattern: YYMMDD-NN
      if (badmintonIdMatch && badmintonIdMatch[1]) {
        officialId = badmintonIdMatch[1]
      }
    }

    // Extract ranking data from HTML
    // The page structure needs to be inspected, but common patterns:
    // - Tables with ranking data
    // - Divs with ranking information
    // - Text content containing "Rangliste Single", "Rangliste Double", "Rangliste Mix"
    
    // Look for ranking values - try multiple selector patterns
    // Pattern 1: Look for text containing "Rangliste Single/Double/Mix" followed by numbers
    const singleMatch = html.match(/Rangliste\s+Single[:\s]+([\d.,]+)/i) || 
                       html.match(/Single[:\s]+([\d.,]+)/i)
    const doubleMatch = html.match(/Rangliste\s+Double[:\s]+([\d.,]+)/i) || 
                       html.match(/Double[:\s]+([\d.,]+)/i)
    const mixMatch = html.match(/Rangliste\s+Mix[:\s]+([\d.,]+)/i) || 
                    html.match(/Mix[:\s]+([\d.,]+)/i)
    
    // Pattern 2: Look for data attributes or class names
    const singleText = singleMatch?.[1] || 
                      $('[data-ranking="single"], .ranking-single, .rangliste-single, td:contains("Single")').first().text().trim()
    const doubleText = doubleMatch?.[1] || 
                      $('[data-ranking="double"], .ranking-double, .rangliste-double, td:contains("Double")').first().text().trim()
    const mixText = mixMatch?.[1] || 
                   $('[data-ranking="mix"], .ranking-mix, .rangliste-mix, td:contains("Mix")').first().text().trim()

    // Parse ranking values (remove non-numeric characters, handle decimals)
    const parseRanking = (text: string): number | null => {
      if (!text) return null
      // Extract numbers (handle formats like "2.500", "2500", "2,500")
      const cleaned = text.replace(/[^\d,.]/g, '').replace(',', '.')
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? null : Math.round(parsed)
    }

    const single = parseRanking(singleText)
    const double = parseRanking(doubleText)
    const mix = parseRanking(mixText)

    // Validate that at least 2 of the 3 rankings exist
    const rankingsCount = [single, double, mix].filter(r => r !== null).length
    if (rankingsCount < 2) {
      logger.warn(`[BadmintonPlayer Scraper] Player ${badmintonplayerId} has less than 2 rankings (found ${rankingsCount})`)
      // Still return the data, but log a warning
    }

    return {
      badmintonplayerId: officialId, // Store the official BadmintonID
      numericId: isNumericId(badmintonplayerId) ? numericId : null,
      single: single ?? null,
      double: double ?? null,
      mix: mix ?? null
    }
  } catch (error) {
    logger.error(`[BadmintonPlayer Scraper] Failed to scrape player ${badmintonplayerId}`, error)
    return null
  }
}

/**
 * Scrapes ranking data for multiple players
 * 
 * Accepts both official BadmintonIDs (e.g., "881203-09") and numeric URL IDs (e.g., "25886").
 * The function will use numeric IDs for URL construction but return official BadmintonIDs when found.
 * 
 * @param badmintonplayerIds - Array of BadmintonPlayer.dk player IDs (official BadmintonID or numeric ID)
 * @param options - Scraping options
 * @returns Array of ranking data (may be shorter than input if some fail)
 */
export async function scrapeRankings(
  badmintonplayerIds: string[],
  options: {
    baseUrl?: string
    delayMs?: number
    concurrency?: number
  } = {}
): Promise<RankingData[]> {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY

  const limit = pLimit(concurrency)
  const results: RankingData[] = []

  logger.info(`[BadmintonPlayer Scraper] Starting scrape for ${badmintonplayerIds.length} players`)

  // Process players with rate limiting
  const promises = badmintonplayerIds.map((id, index) =>
    limit(async () => {
      // Add delay between requests (except first one)
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

      const data = await scrapePlayerRankings(id, baseUrl)
      if (data) {
        results.push(data)
      }
      return data
    })
  )

  await Promise.all(promises)

  logger.info(`[BadmintonPlayer Scraper] Scraped ${results.length} of ${badmintonplayerIds.length} players`)
  return results
}

