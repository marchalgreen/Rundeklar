/**
 * Ranking Service
 * 
 * Coordinates API/scraper logic and updates database with ranking data.
 */

import type { RankingData } from './badmintonplayer-scraper'
import { discoverBadmintonPlayerApi } from './badmintonplayer-api'
import { scrapeRankings } from './badmintonplayer-scraper'
import { scrapeAllRankingLists } from './ranking-list-scraper'
import { logger } from '../utils/logger'
import type postgres from 'postgres'
import type { TenantConfig } from '@rundeklar/common'

export type UpdateResult = {
  updated: number
  failed: number
  skipped: number
  errors: Array<{ playerId: string; error: string }>
}

/**
 * Updates player rankings in the database
 * 
 * @param sql - Postgres client instance
 * @param tenantId - Tenant ID for database queries
 * @param tenantConfig - Optional tenant config (for ranking list URLs)
 * @returns Update result statistics
 */
export async function updatePlayerRankings(
  sql: ReturnType<typeof postgres>,
  tenantId: string,
  tenantConfig?: TenantConfig
): Promise<UpdateResult> {
  const result: UpdateResult = {
    updated: 0,
    failed: 0,
    skipped: 0,
    errors: []
  }

  try {
    // Get all players with badmintonplayer_id
    const players = await sql`
      SELECT id, badmintonplayer_id, name
      FROM players
      WHERE tenant_id = ${tenantId}
        AND badmintonplayer_id IS NOT NULL
        AND badmintonplayer_id != ''
    `

    if (players.length === 0) {
      logger.info('[Ranking Service] No players with badmintonplayer_id found')
      return result
    }

    logger.info(`[Ranking Service] Found ${players.length} players with badmintonplayer_id`)

    // Try to use API first, fall back to scraping
    const apiClient = await discoverBadmintonPlayerApi()
    let rankingData: RankingData[]
    let scrapedPlayersCount = 0
    let playersWithRankings = 0

    if (apiClient) {
      logger.info('[Ranking Service] Using API client')
      const badmintonplayerIds = players.map((p: any) => p.badmintonplayer_id)
      rankingData = await apiClient.getRankings(badmintonplayerIds)
      scrapedPlayersCount = rankingData.length
      playersWithRankings = rankingData.filter(r => r.single !== null || r.double !== null || r.mix !== null).length
    } else if (tenantConfig?.badmintonplayerRankingLists) {
      // Use fast ranking list scraping (scrapes 6 lists instead of 63 individual profiles)
      logger.info('[Ranking Service] Using fast ranking list scraper (6 lists)')
      const rankingLists = tenantConfig.badmintonplayerRankingLists as any
      const combinedData = await scrapeAllRankingLists({
        singleHerre: rankingLists.singleHerre,
        doubleHerre: rankingLists.doubleHerre,
        mixHerre: rankingLists.mixHerre,
        mixDame: rankingLists.mixDame,
        doubleDame: rankingLists.doubleDame,
        singleDame: rankingLists.singleDame
      })
      
      scrapedPlayersCount = combinedData.size
      playersWithRankings = Array.from(combinedData.values()).filter(p => 
        p.single !== null || p.double !== null || p.mix !== null
      ).length
      
      // Convert Map to RankingData array
      rankingData = Array.from(combinedData.values()).map(player => ({
        badmintonplayerId: player.officialId || player.numericId,
        numericId: player.numericId,
        single: player.single ?? null,
        double: player.double ?? null,
        mix: player.mix ?? null
      }))
      
      logger.info(`[Ranking Service] 📊 Scraped ${scrapedPlayersCount} unique players from ranking lists`)
      logger.info(`[Ranking Service] 📊 ${playersWithRankings} players have ranking data (${scrapedPlayersCount - playersWithRankings} without rankings)`)
    } else {
      logger.info('[Ranking Service] Using individual player scraper (slower, fallback)')
      const badmintonplayerIds = players.map((p: any) => p.badmintonplayer_id)
      rankingData = await scrapeRankings(badmintonplayerIds)
      scrapedPlayersCount = rankingData.length
      playersWithRankings = rankingData.filter(r => r.single !== null || r.double !== null || r.mix !== null).length
      logger.info(`[Ranking Service] 📊 Scraped ${scrapedPlayersCount} players`)
      logger.info(`[Ranking Service] 📊 ${playersWithRankings} players have ranking data`)
    }

    // Create a map for quick lookup (support both official BadmintonID and numeric ID)
    const rankingMap = new Map<string, RankingData>()
    rankingData.forEach(data => {
      // Map by official BadmintonID (primary)
      rankingMap.set(data.badmintonplayerId, data)
      // Also map by numeric ID if available (for backwards compatibility)
      if (data.numericId) {
        rankingMap.set(data.numericId, data)
      }
    })

    // Track players not found for better logging
    const notFoundPlayers: Array<{ name: string; id: string; badmintonplayerId: string }> = []
    const playersWithoutRankings: Array<{ name: string; id: string; badmintonplayerId: string }> = []

    // Update each player
    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      const progress = ((i + 1) / players.length * 100).toFixed(1)
      
      const badmintonplayerId = player.badmintonplayer_id
      // Try to find ranking by the stored ID (could be official BadmintonID or numeric ID)
      let ranking = rankingMap.get(badmintonplayerId)
      
      // If not found and it's a numeric ID, also try to match by official ID from results
      if (!ranking && /^\d+$/.test(badmintonplayerId)) {
        // Input is numeric, try to find by matching numericId in results
        ranking = rankingData.find(r => r.numericId === badmintonplayerId) ?? undefined
      }

      if (!ranking) {
        // Player not found in ranking lists - try individual scraper as fallback
        logger.info(`[Ranking Service] Player ${player.name} (${badmintonplayerId}) not found in ranking lists, trying individual scraper...`)
        try {
          const individualRanking = await scrapeRankings([badmintonplayerId])
          if (individualRanking.length > 0 && individualRanking[0]) {
            ranking = individualRanking[0]
            logger.info(`[Ranking Service] ✅ Found ${player.name} via individual scraper`)
          } else {
            result.skipped++
            notFoundPlayers.push({
              name: player.name,
              id: player.id,
              badmintonplayerId
            })
            continue
          }
        } catch (error) {
          logger.warn(`[Ranking Service] Failed to scrape individual profile for ${player.name} (${badmintonplayerId})`, error)
          result.skipped++
          notFoundPlayers.push({
            name: player.name,
            id: player.id,
            badmintonplayerId
          })
          continue
        }
      }

      // Validate that at least 1 ranking exists (relaxed from 2 to allow partial updates)
      const rankingsCount = [ranking.single, ranking.double, ranking.mix].filter(r => r !== null).length
      if (rankingsCount < 1) {
        result.skipped++
        playersWithoutRankings.push({
          name: player.name,
          id: player.id,
          badmintonplayerId
        })
        continue
      }

      try {
        // Update player rankings
        await sql`
          UPDATE players
          SET 
            level_single = ${ranking.single ?? null},
            level_double = ${ranking.double ?? null},
            level_mix = ${ranking.mix ?? null}
          WHERE id = ${player.id}
            AND tenant_id = ${tenantId}
        `

        result.updated++
        const rankingsStr = [
          ranking.single ? `Single: ${ranking.single}` : null,
          ranking.double ? `Double: ${ranking.double}` : null,
          ranking.mix ? `Mix: ${ranking.mix}` : null
        ].filter(Boolean).join(', ')
        
        // Log every 10th player or important updates
        if (result.updated % 10 === 0 || i === players.length - 1) {
          logger.info(`[Ranking Service] [${i + 1}/${players.length}] (${progress}%) ✅ Updated ${player.name}: ${rankingsStr}`)
        }
      } catch (error) {
        result.failed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push({
          playerId: player.id,
          error: errorMessage
        })
        logger.error(`[Ranking Service] ❌ Failed to update player ${player.name} (ID: ${badmintonplayerId})`, error)
      }
    }

    // Summary logging
    logger.info('')
    logger.info(`[Ranking Service] 📊 Update Summary:`)
    logger.info(`   ✅ Updated: ${result.updated} players`)
    logger.info(`   ❌ Failed: ${result.failed} players`)
    logger.info(`   ⏭️  Skipped: ${result.skipped} players`)
    
    if (notFoundPlayers.length > 0) {
      logger.info('')
      logger.info(`[Ranking Service] ⚠️  Players not found in scraped data (${notFoundPlayers.length}):`)
      notFoundPlayers.forEach(p => {
        logger.info(`   - ${p.name} (BadmintonPlayer ID: ${p.badmintonplayerId})`)
      })
    }
    
    if (playersWithoutRankings.length > 0) {
      logger.info('')
      logger.info(`[Ranking Service] ⚠️  Players found but without ranking data (${playersWithoutRankings.length}):`)
      playersWithoutRankings.forEach(p => {
        logger.info(`   - ${p.name} (BadmintonPlayer ID: ${p.badmintonplayerId})`)
      })
    }
    
    logger.info('')
    return result
  } catch (error) {
    logger.error('[Ranking Service] Fatal error during ranking update', error)
    throw error
  }
}

