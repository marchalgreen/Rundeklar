import type { StatisticsSnapshot, StatisticsFilters } from '@rundeklar/common'
import { getStateCopy, getStatisticsSnapshots, createStatisticsSnapshot, getMatches, getMatchPlayers } from '../postgres'
import { invalidateCache } from '../postgres'
import { logger } from '../../lib/utils/logger'
import { getSeasonFromDate } from './utils'

/**
 * Creates a statistics snapshot for an ended session.
 * @param sessionId - Session ID to snapshot
 * @returns Created snapshot
 * @throws Error if session not found or not ended
 */
export const snapshotSession = async (sessionId: string): Promise<StatisticsSnapshot> => {
  try {
    logger.info('[snapshotSession] Starting snapshot creation for session', sessionId)
    
    // Invalidate cache to ensure we get fresh data from Postgres
    invalidateCache()
    
    const state = await getStateCopy()
    logger.debug('[snapshotSession] State loaded, sessions:', state.sessions.length)
    
    const session = state.sessions.find((s) => s.id === sessionId)
    if (!session) {
      logger.error('[snapshotSession] Session not found', sessionId)
      throw new Error('Session ikke fundet')
    }
    logger.debug('[snapshotSession] Session found', { id: session.id, status: session.status, date: session.date })
    
    if (session.status !== 'ended') {
      logger.error('[snapshotSession] Session not ended', session.status)
      throw new Error('Session er ikke afsluttet')
    }

    // Check if snapshot already exists
    const existingSnapshot = state.statistics?.find((s) => s.sessionId === sessionId)
    if (existingSnapshot) {
      logger.info('[snapshotSession] Snapshot already exists for session', sessionId)
      return existingSnapshot
    }

    const season = getSeasonFromDate(session.date)
    logger.debug('[snapshotSession] Season calculated', season)

    // Directly query Postgres for fresh matches and matchPlayers to avoid stale cache
    // Also get checkIns from fresh state
    logger.debug('[snapshotSession] Querying Postgres for matches and matchPlayers...')
    const [allMatches, allMatchPlayers] = await Promise.all([
      getMatches(),
      getMatchPlayers()
    ])
    
    logger.debug('[snapshotSession] Retrieved from Postgres', {
      totalMatches: allMatches.length,
      totalMatchPlayers: allMatchPlayers.length
    })
    
    // Get checkIns from fresh state (already loaded above)
    const allCheckIns = state.checkIns
    
    const sessionMatches = allMatches.filter((m) => m.sessionId === sessionId)
    const sessionMatchPlayers = allMatchPlayers.filter((mp) =>
      sessionMatches.some((m) => m.id === mp.matchId)
    )
    const sessionCheckIns = allCheckIns.filter((c) => c.sessionId === sessionId)

    logger.debug('[snapshotSession] Filtered session data', {
      sessionId,
      matches: sessionMatches.length,
      matchPlayers: sessionMatchPlayers.length,
      checkIns: sessionCheckIns.length,
      matchIds: sessionMatches.map((m) => m.id),
      matchPlayerDetails: sessionMatchPlayers.map((mp) => ({ matchId: mp.matchId, playerId: mp.playerId, slot: mp.slot }))
    })

    if (sessionMatches.length === 0) {
      logger.warn('[snapshotSession] WARNING: No matches found for session', sessionId)
      logger.warn(
        '[snapshotSession] All matches in database',
        allMatches.map((m) => ({ id: m.id, sessionId: m.sessionId }))
      )
    }
    if (sessionMatchPlayers.length === 0) {
      logger.warn('[snapshotSession] WARNING: No matchPlayers found for session', sessionId)
      logger.warn(
        '[snapshotSession] All matchPlayers in database',
        allMatchPlayers.map((mp) => ({ matchId: mp.matchId, playerId: mp.playerId }))
      )
    }

    logger.debug('[snapshotSession] Creating snapshot with data', {
      sessionId: session.id,
      sessionDate: session.date,
      season,
      matchesCount: sessionMatches.length,
      matchPlayersCount: sessionMatchPlayers.length,
      checkInsCount: sessionCheckIns.length
    })

    const snapshot = await createStatisticsSnapshot({
      sessionId: session.id,
      sessionDate: session.date,
      season,
      matches: sessionMatches.map((m) => ({ ...m })),
      matchPlayers: sessionMatchPlayers.map((mp) => ({ ...mp })),
      checkIns: sessionCheckIns.map((c) => ({ ...c }))
    })

    logger.info('[snapshotSession] Snapshot created successfully', snapshot.id)
    logger.debug('[snapshotSession] Snapshot data', {
      id: snapshot.id,
      matches: snapshot.matches.length,
      matchPlayers: snapshot.matchPlayers.length,
      checkIns: snapshot.checkIns.length
    })
    
    return snapshot
  } catch (error) {
    logger.error('[snapshotSession] Error creating snapshot', error)
    throw error
  }
}

/**
 * Gets all seasons from statistics snapshots.
 * @returns Array of unique season strings, sorted
 */
export const getAllSeasons = async (): Promise<string[]> => {
  const statistics = await getStatisticsSnapshots()
  const seasons = new Set<string>()
  statistics.forEach((stat) => {
    seasons.add(stat.season)
  })
  return Array.from(seasons).sort()
}

/**
 * Gets session history with optional filters.
 * @param filters - Optional filters (season, dateFrom, dateTo)
 * @returns Array of statistics snapshots
 */
export const getSessionHistory = async (filters?: StatisticsFilters): Promise<StatisticsSnapshot[]> => {
  let snapshots = await getStatisticsSnapshots()

  if (filters?.season) {
    snapshots = snapshots.filter((s) => s.season === filters.season)
  }

  if (filters?.dateFrom) {
    snapshots = snapshots.filter((s) => s.sessionDate >= filters.dateFrom!)
  }

  if (filters?.dateTo) {
    snapshots = snapshots.filter((s) => s.sessionDate <= filters.dateTo!)
  }

  return snapshots.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
}






