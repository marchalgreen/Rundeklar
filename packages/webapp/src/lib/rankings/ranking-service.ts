/**
 * Ranking Service
 * 
 * Coordinates API/scraper logic and updates database with ranking data.
 */

import type { RankingData } from './badmintonplayer-scraper'
import { discoverBadmintonPlayerApi } from './badmintonplayer-api'
import { scrapeRankings } from './badmintonplayer-scraper'
import { logger } from '../utils/logger'
import type postgres from 'postgres'

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
 * @returns Update result statistics
 */
export async function updatePlayerRankings(
  sql: ReturnType<typeof postgres>,
  tenantId: string
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

    if (apiClient) {
      logger.info('[Ranking Service] Using API client')
      const badmintonplayerIds = players.map((p: any) => p.badmintonplayer_id)
      rankingData = await apiClient.getRankings(badmintonplayerIds)
    } else {
      logger.info('[Ranking Service] Using web scraper (API not available)')
      const badmintonplayerIds = players.map((p: any) => p.badmintonplayer_id)
      rankingData = await scrapeRankings(badmintonplayerIds)
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

    // Update each player
    for (const player of players) {
      const badmintonplayerId = player.badmintonplayer_id
      // Try to find ranking by the stored ID (could be official BadmintonID or numeric ID)
      let ranking = rankingMap.get(badmintonplayerId)
      
      // If not found and it's a numeric ID, also try to match by official ID from results
      if (!ranking && /^\d+$/.test(badmintonplayerId)) {
        // Input is numeric, try to find by matching numericId in results
        ranking = rankingData.find(r => r.numericId === badmintonplayerId) || null
      }

      if (!ranking) {
        result.skipped++
        logger.warn(`[Ranking Service] No ranking data found for player ${player.name} (${badmintonplayerId})`)
        continue
      }

      // Validate that at least 2 of the 3 rankings exist
      const rankingsCount = [ranking.single, ranking.double, ranking.mix].filter(r => r !== null).length
      if (rankingsCount < 2) {
        result.skipped++
        logger.warn(`[Ranking Service] Player ${player.name} has less than 2 rankings, skipping update`)
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
        logger.info(`[Ranking Service] Updated rankings for player ${player.name}`)
      } catch (error) {
        result.failed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push({
          playerId: player.id,
          error: errorMessage
        })
        logger.error(`[Ranking Service] Failed to update player ${player.name}`, error)
      }
    }

    logger.info(`[Ranking Service] Update complete: ${result.updated} updated, ${result.failed} failed, ${result.skipped} skipped`)
    return result
  } catch (error) {
    logger.error('[Ranking Service] Fatal error during ranking update', error)
    throw error
  }
}

