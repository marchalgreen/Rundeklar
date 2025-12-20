import type {
  StatisticsSnapshot,
  PlayerStatistics,
  StatisticsFilters,
  Match,
  MatchPlayer,
  CheckIn,
  MatchResult,
  PlayerMatchResult,
  HeadToHeadResult,
  PlayerComparison,
  TrainingGroupAttendance,
  WeekdayAttendance,
  PlayerCheckInLongTail,
  WeekdayAttendanceOverTime,
  TrainingDayComparison
} from '@rundeklar/common'
import { createId, getStateCopy, getStatisticsSnapshots, createStatisticsSnapshot, createSession, createCheckIn, getMatches, getMatchPlayers, getMatchResults, getMatchResultsBySession, invalidateCache, type DatabaseState } from './postgres'
import { logger } from '../lib/utils/logger'

/**
 * Determines season from a date string (August to July).
 * @param dateStr - ISO date string
 * @returns Season string (e.g., "2023-2024")
 * @remarks Seasons run from August 1st to July 31st.
 * Dates in August-December use current year as start.
 * Dates in January-July use previous year as start.
 */
const getSeasonFromDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1 // 1-12 (Jan=1, Dec=12)
  const year = date.getFullYear()
  
  // If month is August (8) or later, season is YEAR-YEAR+1
  // If month is January-July (1-7), season is YEAR-1-YEAR
  if (month >= 8) {
    return `${year}-${year + 1}`
  } else {
    return `${year - 1}-${year}`
  }
}

/**
 * Determines team structure for a match based on player slots.
 * @param matchPlayers - Players in the match with their slots
 * @returns Object with team1 and team2 player IDs
 * @remarks For 2v2 (4 players, slots 0-3): team1 = slots 0,1; team2 = slots 2,3.
 * For 1v1 (2 players, slots 1-2): both are opponents.
 * For extended capacity (5-8 players): first half vs second half.
 */
const getTeamStructure = (matchPlayers: MatchPlayer[]): { team1: string[]; team2: string[] } => {
  const sorted = [...matchPlayers].sort((a, b) => a.slot - b.slot)
  const playerIds = sorted.map((mp) => mp.playerId)

  if (playerIds.length === 2) {
    // 1v1 match: both are opponents
    return { team1: [playerIds[0]], team2: [playerIds[1]] }
  }

  // For 2v2 or extended capacity: split into two teams
  const midPoint = Math.ceil(playerIds.length / 2)
  return {
    team1: playerIds.slice(0, midPoint),
    team2: playerIds.slice(midPoint)
  }
}

/**
 * Creates a statistics snapshot for an ended session.
 * @param sessionId - Session ID to snapshot
 * @returns Created snapshot
 * @throws Error if session not found or not ended
 */
const snapshotSession = async (sessionId: string): Promise<StatisticsSnapshot> => {
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
const getAllSeasons = async (): Promise<string[]> => {
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
const getSessionHistory = async (filters?: StatisticsFilters): Promise<StatisticsSnapshot[]> => {
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

/**
 * Gets check-ins by season for a player.
 * @param playerId - Player ID
 * @returns Record mapping season to check-in count
 */
const getCheckInsBySeason = async (playerId: string): Promise<Record<string, number>> => {
  const statistics = await getStatisticsSnapshots()
  const bySeason: Record<string, number> = {}

  statistics.forEach((stat) => {
    // Defensive check: ensure checkIns is an array
    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []
    const checkInCount = checkIns.filter((c) => c.playerId === playerId).length
    if (checkInCount > 0) {
      bySeason[stat.season] = (bySeason[stat.season] ?? 0) + checkInCount
    }
  })

  return bySeason
}

/**
 * Gets top N partners for a player.
 * @param playerId - Player ID
 * @param limit - Maximum number of partners to return (default: 5)
 * @returns Array of partners with count and names
 */
const getTopPartners = async (
  playerId: string,
  limit: number = 5,
  state?: DatabaseState, // Optional state to reuse if already loaded
  statistics?: StatisticsSnapshot[] // Optional statistics to reuse if already loaded
): Promise<Array<{ playerId: string; count: number; names: string }>> => {
  const [stateData, statisticsData] = await Promise.all([
    state ? Promise.resolve(state) : getStateCopy(),
    statistics ? Promise.resolve(statistics) : getStatisticsSnapshots()
  ])
  
  // Create player lookup Map for O(1) access
  const playerMap = new Map<string, typeof stateData.players[0]>()
  stateData.players.forEach(player => {
    playerMap.set(player.id, player)
  })
  
  const partnerCounts = new Map<string, number>()

  statisticsData.forEach((stat) => {
    // Defensive check: ensure matchPlayers is an array
    const matchPlayers = Array.isArray(stat.matchPlayers) ? stat.matchPlayers : []
    
    // Group matchPlayers by matchId
    const matchGroups = new Map<string, MatchPlayer[]>()
    matchPlayers.forEach((mp) => {
      if (!matchGroups.has(mp.matchId)) {
        matchGroups.set(mp.matchId, [])
      }
      matchGroups.get(mp.matchId)!.push(mp)
    })

    matchGroups.forEach((matchPlayers) => {
      const { team1, team2 } = getTeamStructure(matchPlayers)
      const playerInTeam1 = team1.includes(playerId)
      const playerInTeam2 = team2.includes(playerId)

      if (playerInTeam1) {
        // Player is in team1, partners are other players in team1
        team1.forEach((pid) => {
          if (pid !== playerId) {
            partnerCounts.set(pid, (partnerCounts.get(pid) ?? 0) + 1)
          }
        })
      } else if (playerInTeam2) {
        // Player is in team2, partners are other players in team2
        team2.forEach((pid) => {
          if (pid !== playerId) {
            partnerCounts.set(pid, (partnerCounts.get(pid) ?? 0) + 1)
          }
        })
      }
    })
  })

  // Convert to array and sort by count
  const partners = Array.from(partnerCounts.entries())
    .map(([pid, count]) => {
      // Use Map lookup instead of find()
      const player = playerMap.get(pid)
      return {
        playerId: pid,
        count,
        names: player?.name ?? 'Ukendt spiller'
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  return partners
}

/**
 * Gets top N opponents for a player.
 * @param playerId - Player ID
 * @param limit - Maximum number of opponents to return (default: 5)
 * @returns Array of opponents with count and names
 */
const getTopOpponents = async (
  playerId: string,
  limit: number = 5,
  state?: DatabaseState, // Optional state to reuse if already loaded
  statistics?: StatisticsSnapshot[] // Optional statistics to reuse if already loaded
): Promise<Array<{ playerId: string; count: number; names: string }>> => {
  const [stateData, statisticsData] = await Promise.all([
    state ? Promise.resolve(state) : getStateCopy(),
    statistics ? Promise.resolve(statistics) : getStatisticsSnapshots()
  ])
  
  // Create player lookup Map for O(1) access
  const playerMap = new Map<string, typeof stateData.players[0]>()
  stateData.players.forEach(player => {
    playerMap.set(player.id, player)
  })
  
  const opponentCounts = new Map<string, number>()

  statisticsData.forEach((stat) => {
    // Defensive check: ensure matchPlayers is an array
    const matchPlayers = Array.isArray(stat.matchPlayers) ? stat.matchPlayers : []
    
    // Group matchPlayers by matchId
    const matchGroups = new Map<string, MatchPlayer[]>()
    matchPlayers.forEach((mp) => {
      if (!matchGroups.has(mp.matchId)) {
        matchGroups.set(mp.matchId, [])
      }
      matchGroups.get(mp.matchId)!.push(mp)
    })

    matchGroups.forEach((matchPlayers) => {
      const { team1, team2 } = getTeamStructure(matchPlayers)
      const playerInTeam1 = team1.includes(playerId)
      const playerInTeam2 = team2.includes(playerId)

      if (playerInTeam1) {
        // Player is in team1, opponents are players in team2
        team2.forEach((pid) => {
          opponentCounts.set(pid, (opponentCounts.get(pid) ?? 0) + 1)
        })
      } else if (playerInTeam2) {
        // Player is in team2, opponents are players in team1
        team1.forEach((pid) => {
          opponentCounts.set(pid, (opponentCounts.get(pid) ?? 0) + 1)
        })
      }
    })
  })

  // Convert to array and sort by count
  const opponents = Array.from(opponentCounts.entries())
    .map(([pid, count]) => {
      // Use Map lookup instead of find()
      const player = playerMap.get(pid)
      return {
        playerId: pid,
        count,
        names: player?.name ?? 'Ukendt spiller'
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  return opponents
}

/**
 * Gets comparison statistics between two players including head-to-head results.
 * @param playerId1 - First player ID
 * @param playerId2 - Second player ID
 * @returns Object with partner count, opponent count, and head-to-head matches
 */
const getPlayerComparison = async (
  playerId1: string,
  playerId2: string
): Promise<PlayerComparison> => {
  const [statistics, allMatchResults, allMatches, state] = await Promise.all([
    getStatisticsSnapshots(),
    getMatchResults(),
    getMatches(),
    getStateCopy()
  ])
  
  let partnerCount = 0
  let opponentCount = 0
  const headToHeadMatches: HeadToHeadResult[] = []
  let player1Wins = 0
  let player2Wins = 0

  // Create a map of match results by matchId
  const matchResultsMap = new Map<string, MatchResult>()
  allMatchResults.forEach((mr) => {
    matchResultsMap.set(mr.matchId, mr)
  })

  // Create a map of sessions by sessionId for dates
  const sessionsMap = new Map<string, { date: string }>()
  state.sessions.forEach((s) => {
    sessionsMap.set(s.id, { date: s.date })
  })

  statistics.forEach((stat) => {
    // Group matchPlayers by matchId
    const matchGroups = new Map<string, MatchPlayer[]>()
    stat.matchPlayers.forEach((mp) => {
      if (!matchGroups.has(mp.matchId)) {
        matchGroups.set(mp.matchId, [])
      }
      matchGroups.get(mp.matchId)!.push(mp)
    })

    matchGroups.forEach((matchPlayers, matchId) => {
      const { team1, team2 } = getTeamStructure(matchPlayers)
      const player1InTeam1 = team1.includes(playerId1)
      const player1InTeam2 = team2.includes(playerId1)
      const player2InTeam1 = team1.includes(playerId2)
      const player2InTeam2 = team2.includes(playerId2)

      // Check if both players are in the same match
      if ((player1InTeam1 || player1InTeam2) && (player2InTeam1 || player2InTeam2)) {
        const sameTeam = (player1InTeam1 && player2InTeam1) || (player1InTeam2 && player2InTeam2)
        
        if (sameTeam) {
          partnerCount++
        } else {
          opponentCount++
        }

        // If there's a match result, add to head-to-head
        const matchResult = matchResultsMap.get(matchId)
        if (matchResult) {
          const match = allMatches.find((m) => m.id === matchId)
          const session = match ? sessionsMap.get(match.sessionId) : null
          
          if (session) {
            const player1Team: 'team1' | 'team2' = player1InTeam1 ? 'team1' : 'team2'
            const player2Team: 'team1' | 'team2' = player2InTeam1 ? 'team1' : 'team2'
            
            // Determine who won
            let player1WonThisMatch = false
            if (sameTeam) {
              // They played together - both win or both lose
              player1WonThisMatch = matchResult.winnerTeam === player1Team
            } else {
              // They played against each other
              player1WonThisMatch = matchResult.winnerTeam === player1Team
            }

            headToHeadMatches.push({
              matchId,
              date: session.date,
              sessionId: match!.sessionId,
              player1Won: player1WonThisMatch,
              player1Team,
              player2Team,
              scoreData: matchResult.scoreData,
              sport: matchResult.sport,
              wasPartner: sameTeam
            })

            // Count wins for head-to-head (only when playing against each other)
            if (!sameTeam) {
              if (player1WonThisMatch) {
                player1Wins++
              } else {
                player2Wins++
              }
            }
          }
        }
      }
    })
  })

  // Sort head-to-head matches by date (newest first)
  headToHeadMatches.sort((a, b) => b.date.localeCompare(a.date))

  return {
    partnerCount,
    opponentCount,
    headToHeadMatches,
    player1Wins,
    player2Wins
  }
}

/**
 * Gets head-to-head statistics between two specific players.
 * @param playerId1 - First player ID
 * @param playerId2 - Second player ID
 * @returns Object with head-to-head matches and win counts
 */
const getPlayerHeadToHead = async (
  playerId1: string,
  playerId2: string
): Promise<{ headToHeadMatches: HeadToHeadResult[], player1Wins: number, player2Wins: number }> => {
  const [allMatchResults, allMatches, allMatchPlayers, state] = await Promise.all([
    getMatchResults(),
    getMatches(),
    getMatchPlayers(),
    getStateCopy()
  ])
  
  const headToHeadMatches: HeadToHeadResult[] = []
  let player1Wins = 0
  let player2Wins = 0

  // Create a map of match results by matchId
  const matchResultsMap = new Map<string, MatchResult>()
  allMatchResults.forEach((mr) => {
    matchResultsMap.set(mr.matchId, mr)
  })

  // Create a map of sessions by sessionId for dates
  const sessionsMap = new Map<string, { date: string }>()
  state.sessions.forEach((s) => {
    sessionsMap.set(s.id, { date: s.date })
  })

  // Group matchPlayers by matchId
  const matchPlayersByMatch = new Map<string, MatchPlayer[]>()
  allMatchPlayers.forEach((mp) => {
    if (!matchPlayersByMatch.has(mp.matchId)) {
      matchPlayersByMatch.set(mp.matchId, [])
    }
    matchPlayersByMatch.get(mp.matchId)!.push(mp)
  })

  // Find all matches where both players participated
  const relevantMatchIds = new Set<string>()
  matchPlayersByMatch.forEach((matchPlayers, matchId) => {
    const player1InMatch = matchPlayers.some((mp) => mp.playerId === playerId1)
    const player2InMatch = matchPlayers.some((mp) => mp.playerId === playerId2)
    if (player1InMatch && player2InMatch) {
      relevantMatchIds.add(matchId)
    }
  })

  // Process each relevant match
  relevantMatchIds.forEach((matchId) => {
    const matchPlayers = matchPlayersByMatch.get(matchId) || []
    const { team1, team2 } = getTeamStructure(matchPlayers)
    const player1InTeam1 = team1.includes(playerId1)
    const player1InTeam2 = team2.includes(playerId1)
    const player2InTeam1 = team1.includes(playerId2)
    const player2InTeam2 = team2.includes(playerId2)

    // Check if both players are in the same match
    if ((player1InTeam1 || player1InTeam2) && (player2InTeam1 || player2InTeam2)) {
      const sameTeam = (player1InTeam1 && player2InTeam1) || (player1InTeam2 && player2InTeam2)

      // If there's a match result, add to head-to-head
      const matchResult = matchResultsMap.get(matchId)
      if (matchResult) {
        const match = allMatches.find((m) => m.id === matchId)
        const session = match ? sessionsMap.get(match.sessionId) : null
        
        if (session) {
          const player1Team: 'team1' | 'team2' = player1InTeam1 ? 'team1' : 'team2'
          const player2Team: 'team1' | 'team2' = player2InTeam1 ? 'team1' : 'team2'
          
          // Determine who won
          let player1WonThisMatch = false
          if (sameTeam) {
            // They played together - both win or both lose
            player1WonThisMatch = matchResult.winnerTeam === player1Team
          } else {
            // They played against each other
            player1WonThisMatch = matchResult.winnerTeam === player1Team
          }

          headToHeadMatches.push({
            matchId,
            date: session.date,
            sessionId: match.sessionId,
            player1Won: player1WonThisMatch,
            player1Team,
            player2Team,
            scoreData: matchResult.scoreData,
            sport: matchResult.sport,
            wasPartner: sameTeam
          })

          // Count wins for head-to-head (only when playing against each other)
          if (!sameTeam) {
            if (player1WonThisMatch) {
              player1Wins++
            } else {
              player2Wins++
            }
          }
        }
      }
    }
  })

  // Sort head-to-head matches by date (newest first)
  headToHeadMatches.sort((a, b) => b.date.localeCompare(a.date))

  return {
    headToHeadMatches,
    player1Wins,
    player2Wins
  }
}

/**
 * Gets recent match results for a player.
 * @param playerId - Player ID
 * @param limit - Maximum number of results to return (default: 5)
 * @returns Array of recent match results with details
 */
const getPlayerRecentMatches = async (
  playerId: string,
  limit: number = 5,
  state?: DatabaseState // Optional state to reuse if already loaded
): Promise<PlayerMatchResult[]> => {
  const [allMatchResults, allMatches, allMatchPlayers, stateData] = await Promise.all([
    getMatchResults(),
    getMatches(),
    getMatchPlayers(),
    state ? Promise.resolve(state) : getStateCopy()
  ])

  // Create maps for quick lookup - use Maps instead of find() for O(1) access
  const allMatchesMap = new Map<string, typeof allMatches[0]>()
  allMatches.forEach((m) => {
    allMatchesMap.set(m.id, m)
  })

  const sessionsMap = new Map<string, { date: string }>()
  stateData.sessions.forEach((s) => {
    sessionsMap.set(s.id, { date: s.date })
  })

  const matchPlayersByMatch = new Map<string, MatchPlayer[]>()
  allMatchPlayers.forEach((mp) => {
    if (!matchPlayersByMatch.has(mp.matchId)) {
      matchPlayersByMatch.set(mp.matchId, [])
    }
    matchPlayersByMatch.get(mp.matchId)!.push(mp)
  })

  // Create player lookup Map for O(1) access
  const playerMap = new Map<string, typeof stateData.players[0]>()
  stateData.players.forEach(player => {
    playerMap.set(player.id, player)
  })

  logger.debug('[getPlayerRecentMatches] Starting', {
    playerId,
    limit,
    totalMatchResults: allMatchResults.length,
    totalMatches: allMatches.length,
    totalMatchPlayers: allMatchPlayers.length,
    sampleMatchResultIds: allMatchResults.slice(0, 5).map(mr => mr.matchId)
  })

  // Create a map of match results by matchId for quick lookup
  const matchResultsMap = new Map<string, MatchResult>()
  allMatchResults.forEach((mr) => {
    matchResultsMap.set(mr.matchId, mr)
  })

  // Find all matches where player participated AND has a result
  const playerMatches: PlayerMatchResult[] = []

  // Only process matches that have results
  let checkedMatches = 0
  let skippedNoMatchPlayers = 0
  let skippedPlayerNotInMatch = 0
  let skippedNoMatch = 0
  let skippedNoSession = 0
  
  for (const matchResult of allMatchResults) {
    if (playerMatches.length >= limit) break
    checkedMatches++

    const matchPlayers = matchPlayersByMatch.get(matchResult.matchId) || []
    if (matchPlayers.length === 0) {
      skippedNoMatchPlayers++
      continue
    }
    
    const playerInMatch = matchPlayers.some((mp) => mp.playerId === playerId)
    if (!playerInMatch) {
      skippedPlayerNotInMatch++
      continue
    }

    const match = allMatchesMap.get(matchResult.matchId)
    if (!match) {
      skippedNoMatch++
      continue
    }

    const session = sessionsMap.get(match.sessionId)
    if (!session) {
      skippedNoSession++
      continue
    }

    const { team1, team2 } = getTeamStructure(matchPlayers)
    const playerInTeam1 = team1.includes(playerId)
    const playerInTeam2 = team2.includes(playerId)
    const playerTeam: 'team1' | 'team2' = playerInTeam1 ? 'team1' : 'team2'
    
    // Get opponent/partner names
    const partnerIds = playerInTeam1 
      ? team1.filter(id => id !== playerId)
      : team2.filter(id => id !== playerId)
    
    const opponentIds = playerInTeam1 
      ? team2
      : team1
    
    const otherPlayerIds = [...partnerIds, ...opponentIds]
    
    const opponentNames = otherPlayerIds.map((pid) => {
      const player = playerMap.get(pid)
      return player?.name || 'Ukendt spiller'
    })

    const partnerNames = partnerIds.map((pid) => {
      const player = playerMap.get(pid)
      return player?.name || 'Ukendt spiller'
    })

    const opponentNamesSeparate = opponentIds.map((pid) => {
      const player = playerMap.get(pid)
      return player?.name || 'Ukendt spiller'
    })

    const wasPartner = partnerIds.length > 0
    const won = matchResult.winnerTeam === playerTeam

    playerMatches.push({
      matchId: matchResult.matchId,
      date: session.date,
      sessionId: match.sessionId,
      opponentNames, // Keep for backward compatibility
      wasPartner, // Keep for backward compatibility
      partnerNames,
      opponentNamesSeparate,
      won,
      scoreData: matchResult.scoreData,
      sport: matchResult.sport
    })
  }

  // Sort by date (newest first) and return top N
  const sorted = playerMatches.sort((a, b) => b.date.localeCompare(a.date))
  
  logger.debug('[getPlayerRecentMatches] Completed', {
    playerId,
    foundMatches: sorted.length,
    matchIds: sorted.map(m => m.matchId),
    checkedMatches,
    skippedNoMatchPlayers,
    skippedPlayerNotInMatch,
    skippedNoMatch,
    skippedNoSession,
    sampleMatchResultIds: allMatchResults.slice(0, 5).map(mr => ({
      matchId: mr.matchId,
      hasMatchPlayers: matchPlayersByMatch.has(mr.matchId),
      matchPlayersCount: matchPlayersByMatch.get(mr.matchId)?.length || 0
    }))
  })
  
  return sorted.slice(0, limit)
}

/**
 * Gets all match results for a player (no limit).
 * @param playerId - Player ID
 * @param state - Optional state to reuse if already loaded
 * @returns Array of all match results with details
 */
const getPlayerAllMatches = async (
  playerId: string,
  state?: DatabaseState // Optional state to reuse if already loaded
): Promise<PlayerMatchResult[]> => {
  // Reuse logic from getPlayerRecentMatches but without limit
  const [allMatchResults, allMatches, allMatchPlayers, stateData] = await Promise.all([
    getMatchResults(),
    getMatches(),
    getMatchPlayers(),
    state ? Promise.resolve(state) : getStateCopy()
  ])

  // Create maps for quick lookup - use Maps instead of find() for O(1) access
  const allMatchesMap = new Map<string, typeof allMatches[0]>()
  allMatches.forEach((m) => {
    allMatchesMap.set(m.id, m)
  })

  const sessionsMap = new Map<string, { date: string }>()
  stateData.sessions.forEach((s) => {
    sessionsMap.set(s.id, { date: s.date })
  })

  const matchPlayersByMatch = new Map<string, MatchPlayer[]>()
  allMatchPlayers.forEach((mp) => {
    if (!matchPlayersByMatch.has(mp.matchId)) {
      matchPlayersByMatch.set(mp.matchId, [])
    }
    matchPlayersByMatch.get(mp.matchId)!.push(mp)
  })

  // Create player lookup Map for O(1) access
  const playerMap = new Map<string, typeof stateData.players[0]>()
  stateData.players.forEach(player => {
    playerMap.set(player.id, player)
  })

  logger.debug('[getPlayerAllMatches] Starting', {
    playerId,
    totalMatchResults: allMatchResults.length,
    totalMatches: allMatches.length,
    totalMatchPlayers: allMatchPlayers.length
  })

  // Create a map of match results by matchId for quick lookup
  const matchResultsMap = new Map<string, MatchResult>()
  allMatchResults.forEach((mr) => {
    matchResultsMap.set(mr.matchId, mr)
  })

  // Find all matches where player participated AND has a result
  const playerMatches: PlayerMatchResult[] = []

  // Only process matches that have results
  for (const matchResult of allMatchResults) {
    const matchPlayers = matchPlayersByMatch.get(matchResult.matchId) || []
    const playerInMatch = matchPlayers.some((mp) => mp.playerId === playerId)
    
    if (!playerInMatch) continue

    const match = allMatchesMap.get(matchResult.matchId)
    if (!match) continue

    const session = sessionsMap.get(match.sessionId)
    if (!session) continue

    const { team1, team2 } = getTeamStructure(matchPlayers)
    const playerInTeam1 = team1.includes(playerId)
    const playerInTeam2 = team2.includes(playerId)
    const playerTeam: 'team1' | 'team2' = playerInTeam1 ? 'team1' : 'team2'
    
    // Get opponent/partner names
    const partnerIds = playerInTeam1 
      ? team1.filter(id => id !== playerId)
      : team2.filter(id => id !== playerId)
    
    const opponentIds = playerInTeam1 
      ? team2
      : team1
    
    const otherPlayerIds = [...partnerIds, ...opponentIds]
    
    const opponentNames = otherPlayerIds.map((pid) => {
      const player = playerMap.get(pid)
      return player?.name || 'Ukendt spiller'
    })

    const partnerNames = partnerIds.map((pid) => {
      const player = playerMap.get(pid)
      return player?.name || 'Ukendt spiller'
    })

    const opponentNamesSeparate = opponentIds.map((pid) => {
      const player = playerMap.get(pid)
      return player?.name || 'Ukendt spiller'
    })

    const wasPartner = partnerIds.length > 0
    const won = matchResult.winnerTeam === playerTeam

    playerMatches.push({
      matchId: matchResult.matchId,
      date: session.date,
      sessionId: match.sessionId,
      opponentNames, // Keep for backward compatibility
      wasPartner, // Keep for backward compatibility
      partnerNames,
      opponentNamesSeparate,
      won,
      scoreData: matchResult.scoreData,
      sport: matchResult.sport
    })
  }

  // Sort by date (newest first) and return all
  const sorted = playerMatches.sort((a, b) => b.date.localeCompare(a.date))
  
  logger.debug('[getPlayerAllMatches] Completed', {
    playerId,
    foundMatches: sorted.length,
    matchIds: sorted.slice(0, 10).map(m => m.matchId)
  })
  
  return sorted
}

/**
 * Gets comprehensive player statistics.
 * @param playerId - Player ID
 * @param filters - Optional filters (season, dateFrom, dateTo)
 * @returns Complete player statistics
 */
const getPlayerStatistics = async (
  playerId: string,
  filters?: StatisticsFilters
): Promise<PlayerStatistics> => {
  try {
    logger.debug('[getPlayerStatistics] Starting', { playerId, filters })
    
    // Don't invalidate cache unnecessarily - cache should only be invalidated when data changes
    // This prevents expensive database queries on every statistics load
    
    const state = await getStateCopy()
    logger.debug('[getPlayerStatistics] State loaded', { 
      playersCount: state.players.length,
      sessionsCount: state.sessions.length,
      courtsCount: state.courts.length
    })
    
    // Create lookup Maps for O(1) access instead of O(n) find()
    const playerMap = new Map<string, typeof state.players[0]>()
    state.players.forEach(player => {
      playerMap.set(player.id, player)
    })
    
    const sessionMap = new Map<string, typeof state.sessions[0]>()
    state.sessions.forEach(session => {
      sessionMap.set(session.id, session)
    })
    
    const courtMap = new Map<string, typeof state.courts[0]>()
    state.courts.forEach(court => {
      courtMap.set(court.id, court)
    })
    
    const player = playerMap.get(playerId)
    if (!player) {
      logger.error('[getPlayerStatistics] Player not found', { playerId, availablePlayers: state.players.length })
      throw new Error('Spiller ikke fundet')
    }

    // Filter statistics by filters
    let relevantStats = await getStatisticsSnapshots()
    logger.debug('[getPlayerStatistics] Statistics loaded', { 
      totalStats: relevantStats.length 
    })
    if (filters?.season) {
      relevantStats = relevantStats.filter((s) => s.season === filters.season)
    }
    if (filters?.dateFrom) {
      relevantStats = relevantStats.filter((s) => s.sessionDate >= filters.dateFrom!)
    }
    if (filters?.dateTo) {
      relevantStats = relevantStats.filter((s) => s.sessionDate <= filters.dateTo!)
    }

    // Calculate check-ins
    const checkInsBySeason: Record<string, number> = {}
    let totalCheckIns = 0
    relevantStats.forEach((stat) => {
    // Defensive check: ensure checkIns is an array
    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []
    // Handle both camelCase (playerId) and snake_case (player_id) formats
    const checkInCount = checkIns.filter((c) => {
      const checkInPlayerId = (c as any).playerId || (c as any).player_id
      return checkInPlayerId === playerId
    }).length
    if (checkInCount > 0) {
      checkInsBySeason[stat.season] = (checkInsBySeason[stat.season] ?? 0) + checkInCount
      totalCheckIns += checkInCount
    }
  })

    // Calculate matches
    const matchesBySeason: Record<string, number> = {}
    let totalMatches = 0
    const courtCounts = new Map<number, number>()
    const matchDates: string[] = []
    let lastPlayedDate: string | null = null

    // Create match lookup Map for O(1) access across all stats
    const matchMap = new Map<string, any>()
    relevantStats.forEach((stat) => {
      if (Array.isArray(stat.matches)) {
        stat.matches.forEach(match => {
          matchMap.set(match.id, match)
        })
      }
    })
    
    relevantStats.forEach((stat) => {
    // Defensive check: ensure matchPlayers is an array
    const matchPlayers = Array.isArray(stat.matchPlayers) ? stat.matchPlayers : []
    
    // Group matchPlayers by matchId to count unique matches
    const playerMatches = new Set<string>()
    matchPlayers
      .filter((mp) => mp.playerId === playerId)
      .forEach((mp) => {
        playerMatches.add(mp.matchId)
        const match = matchMap.get(mp.matchId)
        if (match) {
          const court = courtMap.get(match.courtId)
          if (court) {
            courtCounts.set(court.idx, (courtCounts.get(court.idx) ?? 0) + 1)
          }
          matchDates.push(stat.sessionDate)
        }
      })

    const matchCount = playerMatches.size
    if (matchCount > 0) {
      matchesBySeason[stat.season] = (matchesBySeason[stat.season] ?? 0) + matchCount
      totalMatches += matchCount
    }
  })

    // Find most played court
    let mostPlayedCourt: number | null = null
    if (courtCounts.size > 0) {
      const sorted = Array.from(courtCounts.entries()).sort((a, b) => b[1] - a[1])
      mostPlayedCourt = sorted[0][0]
    }

    // Find last played date
    if (matchDates.length > 0) {
      matchDates.sort((a, b) => b.localeCompare(a))
      lastPlayedDate = matchDates[0]
    }

    // Get partners and opponents - reuse state and statistics to avoid duplicate calls
    const partners = await getTopPartners(playerId, 5, state, relevantStats)
    const opponents = await getTopOpponents(playerId, 5, state, relevantStats)

    // Calculate average level difference
    let totalLevelDiff = 0
    let levelDiffCount = 0
    const playerLevel = player.level ?? 0

    partners.forEach((partner) => {
      const partnerPlayer = playerMap.get(partner.playerId)
      if (partnerPlayer?.level !== null && partnerPlayer?.level !== undefined) {
        const diff = Math.abs(playerLevel - partnerPlayer.level)
        totalLevelDiff += diff * partner.count
        levelDiffCount += partner.count
      }
    })

    opponents.forEach((opponent) => {
      const opponentPlayer = playerMap.get(opponent.playerId)
      if (opponentPlayer?.level !== null && opponentPlayer?.level !== undefined) {
        const diff = Math.abs(playerLevel - opponentPlayer.level)
        totalLevelDiff += diff * opponent.count
        levelDiffCount += opponent.count
      }
    })

    const averageLevelDifference = levelDiffCount > 0 ? totalLevelDiff / levelDiffCount : null

    // Determine preferred category based on match history
    let preferredCategory: 'Single' | 'Double' | 'Mixed' | null = null
    const singlesCount = new Map<string, number>()
    const doublesCount = new Map<string, number>()

    relevantStats.forEach((stat) => {
      // Defensive check: ensure matchPlayers is an array
      const matchPlayers = Array.isArray(stat.matchPlayers) ? stat.matchPlayers : []
      
      const matchGroups = new Map<string, MatchPlayer[]>()
      matchPlayers.forEach((mp) => {
        if (!matchGroups.has(mp.matchId)) {
          matchGroups.set(mp.matchId, [])
        }
        matchGroups.get(mp.matchId)!.push(mp)
      })

      matchGroups.forEach((matchPlayers) => {
        const playerInMatch = matchPlayers.some((mp) => mp.playerId === playerId)
        if (playerInMatch) {
          if (matchPlayers.length === 2) {
            // Singles match
            singlesCount.set(stat.season, (singlesCount.get(stat.season) ?? 0) + 1)
          } else if (matchPlayers.length >= 4) {
            // Doubles match
            doublesCount.set(stat.season, (doublesCount.get(stat.season) ?? 0) + 1)
          }
        }
      })
    })

    const totalSingles = Array.from(singlesCount.values()).reduce((a, b) => a + b, 0)
    const totalDoubles = Array.from(doublesCount.values()).reduce((a, b) => a + b, 0)

    if (totalSingles > 0 && totalDoubles > 0) {
      preferredCategory = 'Mixed'
    } else if (totalSingles > 0) {
      preferredCategory = 'Single'
    } else if (totalDoubles > 0) {
      preferredCategory = 'Double'
    }

    // Calculate match result statistics
    const [allMatchResults, allMatches, allMatchPlayers] = await Promise.all([
      getMatchResults(),
      getMatches(),
      getMatchPlayers()
    ])

    // Create maps for quick lookup
    const matchResultsMap = new Map<string, MatchResult>()
    allMatchResults.forEach((mr) => {
      matchResultsMap.set(mr.matchId, mr)
    })

    const matchPlayersByMatch = new Map<string, MatchPlayer[]>()
    allMatchPlayers.forEach((mp) => {
      if (!matchPlayersByMatch.has(mp.matchId)) {
        matchPlayersByMatch.set(mp.matchId, [])
      }
      matchPlayersByMatch.get(mp.matchId)!.push(mp)
    })

    // Create match and session lookup Maps for O(1) access
    const allMatchesMap = new Map<string, typeof allMatches[0]>()
    allMatches.forEach(match => {
      allMatchesMap.set(match.id, match)
    })
    
    // Filter match results by relevant stats (same filters as above)
    let relevantMatchResults = allMatchResults.filter((mr) => {
      const match = allMatchesMap.get(mr.matchId)
      if (!match) return false
      
      const session = sessionMap.get(match.sessionId)
      if (!session) return false

      // Check if player was in this match
      const matchPlayers = matchPlayersByMatch.get(mr.matchId) || []
      if (!matchPlayers.some((mp) => mp.playerId === playerId)) return false

      // Apply filters
      if (filters?.season) {
        const season = getSeasonFromDate(session.date)
        if (season !== filters.season) return false
      }
      if (filters?.dateFrom && session.date < filters.dateFrom) return false
      if (filters?.dateTo && session.date > filters.dateTo) return false

      return true
    })

    // Calculate wins/losses
    let totalWins = 0
    let totalLosses = 0
    const winsBySeason: Record<string, number> = {}
    const lossesBySeason: Record<string, number> = {}
    let totalScoreDifference = 0
    let scoreDifferenceCount = 0

    relevantMatchResults.forEach((matchResult) => {
      const match = allMatchesMap.get(matchResult.matchId)
      if (!match) return

      const session = sessionMap.get(match.sessionId)
      if (!session) return

      const matchPlayers = matchPlayersByMatch.get(matchResult.matchId) || []
      const { team1, team2 } = getTeamStructure(matchPlayers)
      const playerInTeam1 = team1.includes(playerId)
      const playerInTeam2 = team2.includes(playerId)
      const playerTeam: 'team1' | 'team2' = playerInTeam1 ? 'team1' : 'team2'
      
      const won = matchResult.winnerTeam === playerTeam
      const season = getSeasonFromDate(session.date)

      if (won) {
        totalWins++
        winsBySeason[season] = (winsBySeason[season] || 0) + 1
      } else {
        totalLosses++
        lossesBySeason[season] = (lossesBySeason[season] || 0) + 1
      }

      // Calculate score difference for badminton
      if (matchResult.sport === 'badminton' && 'sets' in matchResult.scoreData) {
        const scoreData = matchResult.scoreData as { sets: Array<{ team1: number; team2: number }> }
        let playerScore = 0
        let opponentScore = 0
        
        scoreData.sets.forEach((set) => {
          if (playerTeam === 'team1') {
            playerScore += set.team1
            opponentScore += set.team2
          } else {
            playerScore += set.team2
            opponentScore += set.team1
          }
        })

        const diff = playerScore - opponentScore
        totalScoreDifference += diff
        scoreDifferenceCount++
      }
    })

    const matchesWithResults = relevantMatchResults.length
    const winRate = matchesWithResults > 0 ? (totalWins / matchesWithResults) * 100 : 0
    const averageScoreDifference = scoreDifferenceCount > 0 ? totalScoreDifference / scoreDifferenceCount : null

    // Get recent matches - reuse state to avoid duplicate getStateCopy() call
    // Default to 10 matches for better balance between information and scroll
    const recentMatches = await getPlayerRecentMatches(playerId, 10, state)

    const result: PlayerStatistics = {
      playerId,
      totalCheckIns,
      checkInsBySeason,
      totalMatches,
      matchesBySeason,
      partners,
      opponents,
      preferredCategory,
      averageLevelDifference,
      mostPlayedCourt,
      lastPlayedDate,
      // Match result statistics
      totalWins,
      totalLosses,
      winRate,
      matchesWithResults,
      averageScoreDifference,
      winsBySeason,
      lossesBySeason,
      recentMatches
    }
    
    logger.debug('[getPlayerStatistics] Completed', {
      playerId,
      totalCheckIns: result.totalCheckIns,
      totalMatches: result.totalMatches,
      totalWins: result.totalWins,
      totalLosses: result.totalLosses,
      partnersCount: result.partners.length,
      opponentsCount: result.opponents.length,
      recentMatchesCount: result.recentMatches.length
    })
    
    return result
  } catch (error) {
    logger.error('[getPlayerStatistics] Error', { playerId, error })
    throw error
  }
}

/**
 * Generates dummy historical data for demo purposes.
 * @remarks Creates realistic historical sessions, matches, and check-ins spanning multiple seasons.
 * This function is for demo/testing purposes only.
 */
const generateDummyHistoricalData = async (): Promise<void> => {
  const state = await getStateCopy()

  const players = state.players.filter((p) => p.active)
  if (players.length < 8) {
    throw new Error('Mindst 8 aktive spillere kræves for at generere dummy data')
  }

  // Note: We don't clear existing statistics in Postgres - this function generates additional data
  // If you want to clear, you would need to delete from Postgres directly

  const courts = state.courts
  const now = new Date()

  // Generate sessions for the past 1.5 seasons (about 18 months)
  // Start from 18 months ago (reduced to avoid localStorage quota issues)
  const sessions: Array<{ date: string; season: string }> = []
  const monthsToGenerate = 18

  for (let i = monthsToGenerate; i >= 0; i--) {
    const sessionDate = new Date(now)
    sessionDate.setMonth(sessionDate.getMonth() - i)
    
    // Generate 8 sessions per month
    const sessionsThisMonth = 8
    
    for (let j = 0; j < sessionsThisMonth; j++) {
      const dayOfMonth = Math.floor(Math.random() * 28) + 1 // 1-28 to avoid month boundary issues
      const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), dayOfMonth)
      const hour = 18 + Math.floor(Math.random() * 3) // 18-20 (6-8 PM)
      const minute = Math.floor(Math.random() * 4) * 15 // 0, 15, 30, 45
      sessionDay.setHours(hour, minute, 0, 0)
      
      const season = getSeasonFromDate(sessionDay.toISOString())
      sessions.push({
        date: sessionDay.toISOString(),
        season
      })
    }
  }

  // Sort sessions by date
  sessions.sort((a, b) => a.date.localeCompare(b.date))

  // Process each session and create in Supabase
  for (const sessionInfo of sessions) {
    const sessionDate = new Date(sessionInfo.date)
      
    // Create ended session in Postgres
    const session = await createSession({
      date: sessionInfo.date,
      status: 'ended'
    })
    const sessionId = session.id

    // Randomly select ~26 players to check in on average (target: 1.7 matches per check-in)
    // Use a range around 26 to make it realistic
    const checkInCount = Math.min(
      Math.floor(Math.random() * 10) + 22, // 22-32 players, average ~26
      players.length
    )
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5)
    const checkedInPlayers = shuffledPlayers.slice(0, checkInCount)

    // Create check-ins in Postgres
    const checkIns: CheckIn[] = []
    for (const player of checkedInPlayers) {
      const checkInTime = new Date(sessionDate)
      checkInTime.setMinutes(checkInTime.getMinutes() - Math.floor(Math.random() * 60)) // Random time before session
      
      const checkIn = await createCheckIn({
        sessionId,
        playerId: player.id,
        maxRounds: null
      })
      checkIns.push(checkIn)
    }

    // Generate 2 rounds on average (1-3 rounds per session)
    const roundsPerSession = Math.floor(Math.random() * 3) + 1 // 1-3 rounds, average ~2
    const allMatches: Match[] = []
    const allMatchPlayers: MatchPlayer[] = []
    
    // Track how many matches each player has been assigned to in this session
    const playerMatchCount = new Map<string, number>()
    checkedInPlayers.forEach((p) => playerMatchCount.set(p.id, 0))
    
    // Target: ~1.7 matches per player per session
    // Calculate how many player slots we need: checkedInPlayers.length × 1.7
    const targetPlayerSlots = Math.round(checkedInPlayers.length * 1.7)
    
    // With 2 rounds and 5-7 courts, we can create 10-14 matches
    // If mostly 2v2 (4 players per match), that's 40-56 player slots
    // If mostly 1v1 (2 players per match), that's 20-28 player slots
    // We need to ensure we create enough matches to reach target
    const avgPlayersPerMatch = 3 // Mix of 1v1 and 2v2 averages to ~3
    const neededMatches = Math.ceil(targetPlayerSlots / avgPlayersPerMatch)
    const courtsPerRound = Math.ceil(neededMatches / roundsPerSession)

    for (let roundNum = 1; roundNum <= roundsPerSession; roundNum++) {
      // Create matches - ensure enough courts to reach ~1.7 matches per player
      const courtCount = Math.min(
        Math.max(courtsPerRound, Math.floor(Math.random() * 3) + 5), // At least courtsPerRound, but 5-7 if possible
        courts.length,
        Math.floor(checkedInPlayers.length / 2) // Ensure we can assign at least 2 players per court
      )
      const usedCourts = courts.slice(0, courtCount)
      const matches: Match[] = []
      const matchPlayers: MatchPlayer[] = []
      
      // For each round, sort players by match count (fewer matches first) to ensure fair distribution
      // Re-sort at the start of each round based on current match counts
      const sortedPlayers = [...checkedInPlayers].sort((a, b) => {
        const countA = playerMatchCount.get(a.id) ?? 0
        const countB = playerMatchCount.get(b.id) ?? 0
        return countA - countB // Players with fewer matches first
      })

      usedCourts.forEach((court, courtIndex) => {
        const matchId = createId()
        const matchStart = new Date(sessionDate)
        // Stagger start times: round 1 starts at session time, round 2 starts 45 min later, etc.
        matchStart.setMinutes(matchStart.getMinutes() + (roundNum - 1) * 45 + courtIndex * 5)
        
        matches.push({
          id: matchId,
          sessionId,
          courtId: court.id,
          startedAt: matchStart.toISOString(),
          endedAt: new Date(matchStart.getTime() + 45 * 60000).toISOString(), // 45 minutes later
          round: roundNum
        })

        // Re-sort players before each court to prioritize those with fewer matches
        sortedPlayers.sort((a, b) => {
          const countA = playerMatchCount.get(a.id) ?? 0
          const countB = playerMatchCount.get(b.id) ?? 0
          return countA - countB
        })

        if (sortedPlayers.length < 2) return

        // Prefer 2v2 matches to use more players and reach target faster
        // But still allow some 1v1 for variety
        const currentAvgMatches = Array.from(playerMatchCount.values()).reduce((a, b) => a + b, 0) / checkedInPlayers.length
        const needsMoreMatches = currentAvgMatches < 1.7
        
        // If we need more matches, prefer 2v2 (uses 4 players vs 2)
        const isDoubles = sortedPlayers.length >= 4 && (needsMoreMatches || Math.random() > 0.3)
        
        if (isDoubles && sortedPlayers.length >= 4) {
          // 2v2 match - take first 4 players (those with fewest matches)
          const selectedPlayers = sortedPlayers.slice(0, 4)
          
          // Assign slots 0, 1, 2, 3
          selectedPlayers.forEach((player, index) => {
            playerMatchCount.set(player.id, (playerMatchCount.get(player.id) ?? 0) + 1)
            matchPlayers.push({
              id: createId(),
              matchId,
              playerId: player.id,
              slot: index
            })
          })
        } else {
          // 1v1 match - take first 2 players (those with fewest matches)
          const selectedPlayers = sortedPlayers.slice(0, 2)
          
          // Assign slots 1 and 2
          selectedPlayers.forEach((player) => {
            playerMatchCount.set(player.id, (playerMatchCount.get(player.id) ?? 0) + 1)
          })
          matchPlayers.push({
            id: createId(),
            matchId,
            playerId: selectedPlayers[0].id,
            slot: 1
          })
          matchPlayers.push({
            id: createId(),
            matchId,
            playerId: selectedPlayers[1].id,
            slot: 2
          })
        }
      })

      allMatches.push(...matches)
      allMatchPlayers.push(...matchPlayers)
    }

    // Create snapshot in Postgres
    await createStatisticsSnapshot({
      sessionId,
      sessionDate: sessionInfo.date,
      season: sessionInfo.season,
      matches: allMatches.map((m) => ({ ...m })),
      matchPlayers: allMatchPlayers.map((mp) => ({ ...mp })),
      checkIns: checkIns.map((c) => ({ ...c }))
    })
  }
}

/**
 * Gets training group attendance statistics.
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Array of training group attendance data
 */
const getTrainingGroupAttendance = async (
  dateFrom?: string,
  dateTo?: string,
  groupNames?: string[]
): Promise<TrainingGroupAttendance[]> => {
  // Don't invalidate cache here - cache should only be invalidated when data actually changes
  // This prevents unnecessary database queries on every filter change
  
  const [statistics, state] = await Promise.all([
    getStatisticsSnapshots(),
    getStateCopy()
  ])
  
  // Create player lookup Map for O(1) access instead of O(n) find()
  const playerMap = new Map<string, typeof state.players[0]>()
  state.players.forEach(player => {
    playerMap.set(player.id, player)
  })

  // Filter statistics by date range if provided
  let relevantStats = statistics
  if (dateFrom || dateTo) {
    relevantStats = statistics.filter((stat) => {
      if (dateFrom && stat.sessionDate < dateFrom) return false
      if (dateTo && stat.sessionDate > dateTo) return false
      return true
    })
  }

  // Debug: Log statistics summary
  logger.debug('[getTrainingGroupAttendance] Processing statistics', {
    totalSnapshots: statistics.length,
    relevantSnapshots: relevantStats.length,
    dateFrom,
    dateTo,
    groupNames,
    firstSnapshotSample: relevantStats.length > 0 ? {
      sessionId: relevantStats[0].sessionId,
      sessionDate: relevantStats[0].sessionDate,
      checkInsType: typeof relevantStats[0].checkIns,
      checkInsIsArray: Array.isArray(relevantStats[0].checkIns),
      checkInsLength: Array.isArray(relevantStats[0].checkIns) 
        ? relevantStats[0].checkIns.length 
        : typeof relevantStats[0].checkIns === 'string'
          ? relevantStats[0].checkIns.length
          : 'unknown',
      checkInsPreview: Array.isArray(relevantStats[0].checkIns) && relevantStats[0].checkIns.length > 0
        ? JSON.stringify(relevantStats[0].checkIns[0]).substring(0, 200)
        : typeof relevantStats[0].checkIns === 'string'
          ? relevantStats[0].checkIns.substring(0, 200)
          : 'empty or null'
    } : null
  })

  // Group check-ins by training group
  const groupStats = new Map<string, {
    checkInCount: number
    uniquePlayers: Set<string>
    sessions: Set<string>
  }>()

  let totalCheckInsProcessed = 0
  let checkInsWithoutPlayer = 0
  let checkInsWithoutGroups = 0
  relevantStats.forEach((stat) => {
    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []
    totalCheckInsProcessed += checkIns.length
    
    
    checkIns.forEach((checkIn) => {
      // Debug logging removed for performance - only log in development if needed
      
      // Handle both camelCase (playerId) and snake_case (player_id) formats
      // This is needed because old snapshots might have snake_case from fix scripts
      const playerId = (checkIn as any).playerId || (checkIn as any).player_id
      if (!playerId) {
        checkInsWithoutPlayer++
        return
      }
      // Use Map lookup for O(1) performance instead of O(n) find()
      const player = playerMap.get(playerId)
      if (!player) {
        checkInsWithoutPlayer++
        return
      }

      const trainingGroups = player.trainingGroups || []
      if (trainingGroups.length === 0) {
        checkInsWithoutGroups++
      }
      
      // If filtering by group names, check if player belongs to any of the selected groups
      if (groupNames && groupNames.length > 0) {
        const hasMatchingGroup = trainingGroups.some(groupName => groupNames.includes(groupName))
        if (!hasMatchingGroup) {
          return // Skip this check-in if player doesn't belong to any selected group
        }
      }
      
      trainingGroups.forEach((groupName) => {
        if (!groupName) return
        
        // Filter by group names if provided - only count groups that match the filter
        if (groupNames && groupNames.length > 0 && !groupNames.includes(groupName)) {
          return
        }

        if (!groupStats.has(groupName)) {
          groupStats.set(groupName, {
            checkInCount: 0,
            uniquePlayers: new Set(),
            sessions: new Set()
          })
        }

        const stats = groupStats.get(groupName)!
        stats.checkInCount++
        stats.uniquePlayers.add(checkIn.playerId)
        stats.sessions.add(stat.sessionId)
      })
    })
  })

  // Collect all unique session IDs across all groups for accurate total session count
  const allUniqueSessionIds = new Set<string>()
  groupStats.forEach(stats => {
    stats.sessions.forEach(sessionId => allUniqueSessionIds.add(sessionId))
  })
  
  // Store total unique sessions in a way that calculateKPIs can access it
  // We'll attach it to the result array as a non-enumerable property
  const result: TrainingGroupAttendance[] = Array.from(groupStats.entries()).map(([groupName, stats]) => {
    const uniqueSessions = stats.sessions.size
    const averageAttendance = uniqueSessions > 0 ? stats.checkInCount / uniqueSessions : 0

    return {
      groupName,
      checkInCount: stats.checkInCount,
      uniquePlayers: stats.uniquePlayers.size,
      sessions: uniqueSessions,
      averageAttendance: Math.round(averageAttendance * 10) / 10 // Round to 1 decimal
    }
  })
  
  // Attach total unique sessions as a property on the result array
  // This allows calculateKPIs to access it without re-querying
  ;(result as any).__totalUniqueSessions = allUniqueSessionIds.size

  // Debug: Log result summary
  logger.debug('[getTrainingGroupAttendance] Result summary', {
    totalCheckInsProcessed,
    checkInsWithoutPlayer,
    checkInsWithoutGroups,
    groupsFound: result.length,
    totalCheckInsInResult: result.reduce((sum, g) => sum + g.checkInCount, 0),
    totalUniqueSessions: allUniqueSessionIds.size,
    groups: result.map(g => ({ name: g.groupName, checkIns: g.checkInCount }))
  })

  // Sort by group name
  return result.sort((a, b) => a.groupName.localeCompare(b.groupName))
}

/**
 * Gets weekday attendance statistics for comparing training attendance across weekdays.
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Array of weekday attendance data
 */
const getWeekdayAttendance = async (
  dateFrom?: string,
  dateTo?: string,
  groupNames?: string[]
): Promise<WeekdayAttendance[]> => {
  const [statistics, state] = await Promise.all([
    getStatisticsSnapshots(),
    getStateCopy()
  ])

  // Filter statistics by date range if provided
  let relevantStats = statistics
  if (dateFrom || dateTo) {
    relevantStats = statistics.filter((stat) => {
      if (dateFrom && stat.sessionDate < dateFrom) return false
      if (dateTo && stat.sessionDate > dateTo) return false
      return true
    })
  }

  // Danish weekday names
  const weekdayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']

  // Group check-ins by weekday
  const weekdayStats = new Map<number, {
    checkInCount: number
    uniquePlayers: Set<string>
    sessions: Set<string>
  }>()

  relevantStats.forEach((stat) => {
    // Get weekday from session date
    const sessionDate = new Date(stat.sessionDate)
    const weekday = sessionDate.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []
    
    checkIns.forEach((checkIn) => {
      const player = state.players.find((p) => p.id === checkIn.playerId)
      if (!player) return

      // Filter by training groups if provided
      if (groupNames && groupNames.length > 0) {
        const playerGroups = player.trainingGroups || []
        const hasMatchingGroup = groupNames.some(groupName => playerGroups.includes(groupName))
        if (!hasMatchingGroup) return
      }

      if (!weekdayStats.has(weekday)) {
        weekdayStats.set(weekday, {
          checkInCount: 0,
          uniquePlayers: new Set(),
          sessions: new Set()
        })
      }

      const stats = weekdayStats.get(weekday)!
      stats.checkInCount++
      stats.uniquePlayers.add(checkIn.playerId)
      stats.sessions.add(stat.sessionId)
    })
  })

  // Convert to array and calculate averages
  const result: WeekdayAttendance[] = Array.from(weekdayStats.entries()).map(([weekday, stats]) => {
    const uniqueSessions = stats.sessions.size
    const averageAttendance = uniqueSessions > 0 ? stats.checkInCount / uniqueSessions : 0

    return {
      weekday,
      weekdayName: weekdayNames[weekday],
      checkInCount: stats.checkInCount,
      uniquePlayers: stats.uniquePlayers.size,
      sessions: uniqueSessions,
      averageAttendance: Math.round(averageAttendance * 10) / 10 // Round to 1 decimal
    }
  })

  // Sort by weekday (Monday = 1 first, then Tuesday = 2, etc., Sunday = 0 last)
  return result.sort((a, b) => {
    // Convert Sunday (0) to 7 for sorting purposes
    const aWeekday = a.weekday === 0 ? 7 : a.weekday
    const bWeekday = b.weekday === 0 ? 7 : b.weekday
    return aWeekday - bWeekday
  })
}

/**
 * Gets player check-in long-tail statistics (check-ins per player).
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Array of player check-in data sorted by check-in count (descending)
 */
const getPlayerCheckInLongTail = async (
  dateFrom?: string,
  dateTo?: string,
  groupNames?: string[]
): Promise<PlayerCheckInLongTail[]> => {
  const [statistics, state] = await Promise.all([
    getStatisticsSnapshots(),
    getStateCopy()
  ])

  // Filter statistics by date range if provided
  let relevantStats = statistics
  if (dateFrom || dateTo) {
    relevantStats = statistics.filter((stat) => {
      if (dateFrom && stat.sessionDate < dateFrom) return false
      if (dateTo && stat.sessionDate > dateTo) return false
      return true
    })
  }

  // Count check-ins per player
  const playerCheckIns = new Map<string, number>()

  relevantStats.forEach((stat) => {
    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []
    
    checkIns.forEach((checkIn) => {
      const player = state.players.find((p) => p.id === checkIn.playerId)
      if (!player) return

      // Filter by training groups if provided
      if (groupNames && groupNames.length > 0) {
        const playerGroups = player.trainingGroups || []
        const hasMatchingGroup = groupNames.some(groupName => playerGroups.includes(groupName))
        if (!hasMatchingGroup) return
      }

      playerCheckIns.set(checkIn.playerId, (playerCheckIns.get(checkIn.playerId) || 0) + 1)
    })
  })

  // Convert to array
  const result: PlayerCheckInLongTail[] = Array.from(playerCheckIns.entries()).map(([playerId, checkInCount]) => {
    const player = state.players.find((p) => p.id === playerId)
    return {
      playerId,
      playerName: player?.name || 'Ukendt spiller',
      checkInCount
    }
  })

  // Sort by check-in count (descending)
  return result.sort((a, b) => b.checkInCount - a.checkInCount)
}

/**
 * Gets weekday attendance over time (time series data).
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Array of weekday attendance data over time
 */
const getWeekdayAttendanceOverTime = async (
  dateFrom?: string,
  dateTo?: string,
  groupNames?: string[]
): Promise<WeekdayAttendanceOverTime[]> => {
  const [statistics, state] = await Promise.all([
    getStatisticsSnapshots(),
    getStateCopy()
  ])

  // Create player lookup Map for O(1) access instead of O(n) find()
  const playerMap = new Map<string, typeof state.players[0]>()
  state.players.forEach(player => {
    playerMap.set(player.id, player)
  })

  // Filter statistics by date range if provided
  let relevantStats = statistics
  if (dateFrom || dateTo) {
    relevantStats = statistics.filter((stat) => {
      if (dateFrom && stat.sessionDate < dateFrom) return false
      if (dateTo && stat.sessionDate > dateTo) return false
      return true
    })
  }

  // Danish weekday names
  const weekdayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']

  // Group by date and weekday
  const dateWeekdayStats = new Map<string, {
    checkInCount: number
    sessions: Set<string>
  }>()

  relevantStats.forEach((stat) => {
    const sessionDate = new Date(stat.sessionDate)
    const weekday = sessionDate.getDay()
    const dateKey = `${stat.sessionDate}_${weekday}`

    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []
    
    let sessionCheckInCount = 0
    checkIns.forEach((checkIn) => {
      // Handle both camelCase (playerId) and snake_case (player_id) formats
      const playerId = (checkIn as any).playerId || (checkIn as any).player_id
      if (!playerId) return
      
      // Use Map lookup for O(1) performance
      const player = playerMap.get(playerId)
      if (!player) return

      // Filter by training groups if provided
      if (groupNames && groupNames.length > 0) {
        const playerGroups = player.trainingGroups || []
        const hasMatchingGroup = groupNames.some(groupName => playerGroups.includes(groupName))
        if (!hasMatchingGroup) return
      }

      sessionCheckInCount++
    })

    // Only include sessions that have check-ins matching the filter
    // This prevents showing 0 values for sessions with no relevant check-ins
    if (sessionCheckInCount === 0) return

    if (!dateWeekdayStats.has(dateKey)) {
      dateWeekdayStats.set(dateKey, {
        checkInCount: 0,
        sessions: new Set()
      })
    }

    const stats = dateWeekdayStats.get(dateKey)!
    stats.checkInCount += sessionCheckInCount
    stats.sessions.add(stat.sessionId)
  })

  // Convert to array - only include entries with actual check-ins
  const result: WeekdayAttendanceOverTime[] = Array.from(dateWeekdayStats.entries())
    .filter(([_, stats]) => stats.checkInCount > 0) // Only include if there are check-ins
    .map(([dateKey, stats]) => {
      const [date, weekdayStr] = dateKey.split('_')
      const weekday = parseInt(weekdayStr, 10)
      const averageAttendance = stats.sessions.size > 0 ? stats.checkInCount / stats.sessions.size : 0

      return {
        date,
        weekday,
        weekdayName: weekdayNames[weekday],
        checkInCount: stats.checkInCount,
        averageAttendance: Math.round(averageAttendance * 10) / 10
      }
    })

  // Sort by date (ascending)
  return result.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Gets comparison between the two most active training days.
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Comparison data between the two most active training days
 */
const getTrainingDayComparison = async (
  dateFrom?: string,
  dateTo?: string,
  groupNames?: string[]
): Promise<TrainingDayComparison | null> => {
  const weekdayData = await getWeekdayAttendance(dateFrom, dateTo, groupNames)
  
  if (weekdayData.length < 2) {
    return null
  }

  // Sort by check-in count (descending) and take top 2
  const sortedDays = [...weekdayData].sort((a, b) => b.checkInCount - a.checkInCount)
  const day1 = sortedDays[0]
  const day2 = sortedDays[1]

  const checkInDiff = day1.checkInCount - day2.checkInCount
  const avgDiff = day1.averageAttendance - day2.averageAttendance
  const percentageDiff = day2.checkInCount > 0 
    ? ((checkInDiff / day2.checkInCount) * 100) 
    : 0

  return {
    day1: {
      weekday: day1.weekday,
      weekdayName: day1.weekdayName,
      checkInCount: day1.checkInCount,
      uniquePlayers: day1.uniquePlayers,
      sessions: day1.sessions,
      averageAttendance: day1.averageAttendance
    },
    day2: {
      weekday: day2.weekday,
      weekdayName: day2.weekdayName,
      checkInCount: day2.checkInCount,
      uniquePlayers: day2.uniquePlayers,
      sessions: day2.sessions,
      averageAttendance: day2.averageAttendance
    },
    difference: {
      checkInCount: checkInDiff,
      averageAttendance: avgDiff,
      percentageDifference: Math.round(percentageDiff * 10) / 10
    }
  }
}

/**
 * Searches match results based on filters.
 */
const searchMatchResults = async (filters: {
  playerId?: string
  dateFrom?: string
  dateTo?: string
  sessionId?: string
  sport?: 'badminton' | 'tennis' | 'padel'
  winnerTeam?: 'team1' | 'team2'
}): Promise<MatchResult[]> => {
  let results: MatchResult[]
  
  // If filtering by session, use optimized query
  if (filters.sessionId) {
    results = await getMatchResultsBySession(filters.sessionId)
  } else {
    results = await getMatchResults()
  }
  
  const allMatches = await getMatches()
  const state = await getStateCopy()
  
  let filtered = results
  
  // Filter by player ID (check if player was in the match)
  if (filters.playerId) {
    const playerMatchIds = new Set(
      allMatches
        .filter(m => {
          // Get match players for this match
          const matchPlayers = state.matchPlayers.filter(mp => mp.matchId === m.id)
          return matchPlayers.some(mp => mp.playerId === filters.playerId)
        })
        .map(m => m.id)
    )
    filtered = filtered.filter(r => playerMatchIds.has(r.matchId))
  }
  
  // Filter by date range
  if (filters.dateFrom || filters.dateTo) {
    const matchDates = new Map<string, string>()
    allMatches.forEach(m => {
      const session = state.sessions.find(s => s.id === m.sessionId)
      if (session) {
        matchDates.set(m.id, session.date)
      }
    })
    
    filtered = filtered.filter(r => {
      const matchDate = matchDates.get(r.matchId)
      if (!matchDate) return false
      
      if (filters.dateFrom && matchDate < filters.dateFrom) return false
      if (filters.dateTo && matchDate > filters.dateTo) return false
      return true
    })
  }
  
  // Filter by session ID (already handled above, but keep for consistency)
  if (filters.sessionId) {
    const sessionMatchIds = new Set(
      allMatches
        .filter(m => m.sessionId === filters.sessionId)
        .map(m => m.id)
    )
    filtered = filtered.filter(r => sessionMatchIds.has(r.matchId))
  }
  
  // Filter by sport
  if (filters.sport) {
    filtered = filtered.filter(r => r.sport === filters.sport)
  }
  
  // Filter by winner
  if (filters.winnerTeam) {
    filtered = filtered.filter(r => r.winnerTeam === filters.winnerTeam)
  }
  
  return filtered
}

/** Statistics API — manages historical statistics and player analytics. */
const statsApi = {
  snapshotSession,
  getPlayerStatistics,
  getTopPartners,
  getTopOpponents,
  getCheckInsBySeason,
  getAllSeasons,
  getSessionHistory,
  generateDummyHistoricalData,
  getPlayerComparison,
  getPlayerHeadToHead,
  searchMatchResults,
  getPlayerRecentMatches,
  getPlayerAllMatches,
  getTrainingGroupAttendance,
  getWeekdayAttendance,
  getPlayerCheckInLongTail,
  getWeekdayAttendanceOverTime,
  getTrainingDayComparison
}

export default statsApi
