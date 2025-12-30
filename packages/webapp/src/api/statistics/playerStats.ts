import type {
  StatisticsSnapshot,
  PlayerStatistics,
  StatisticsFilters,
  MatchPlayer,
  MatchResult,
  PlayerMatchResult,
  HeadToHeadResult,
  PlayerComparison,
  Player
} from '@rundeklar/common'
import { getStateCopy, getStatisticsSnapshots, getMatches, getMatchPlayers, getMatchResults, type DatabaseState } from '../postgres'
import { logger } from '../../lib/utils/logger'
import { getTeamStructure, getSeasonFromDate } from './utils'

/**
 * Gets check-ins by season for a player.
 * @param playerId - Player ID
 * @returns Record mapping season to check-in count
 */
export const getCheckInsBySeason = async (playerId: string): Promise<Record<string, number>> => {
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
 * @param state - Optional state to reuse if already loaded
 * @param statistics - Optional statistics to reuse if already loaded
 * @returns Array of partners with count and names
 */
export const getTopPartners = async (
  playerId: string,
  limit: number = 5,
  state?: DatabaseState,
  statistics?: StatisticsSnapshot[]
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
 * @param state - Optional state to reuse if already loaded
 * @param statistics - Optional statistics to reuse if already loaded
 * @returns Array of opponents with count and names
 */
export const getTopOpponents = async (
  playerId: string,
  limit: number = 5,
  state?: DatabaseState,
  statistics?: StatisticsSnapshot[]
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
export const getPlayerComparison = async (
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

  // Create a map of players by ID for name lookup
  const playerMap = new Map<string, Player>()
  state.players.forEach((p) => {
    playerMap.set(p.id, p)
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

            // Calculate partner and opponent names for 2v2 matches
            let partnerNames: string[] | undefined = undefined
            let opponentNamesSeparate: string[] | undefined = undefined
            let opponentNames: string[] | undefined = undefined

            // Check if this is a 2v2 match (more than 2 players total)
            const totalPlayers = team1.length + team2.length
            if (totalPlayers > 2) {
              if (sameTeam) {
                // They played together - get their partners and opponents
                const player1TeamMembers = player1InTeam1 ? team1 : team2
                const otherTeamMembers = player1InTeam1 ? team2 : team1
                
                // Partner names (excluding player1 and player2 themselves)
                partnerNames = player1TeamMembers
                  .filter((pid) => pid !== playerId1 && pid !== playerId2)
                  .map((pid) => {
                    const player = playerMap.get(pid)
                    return player?.name || 'Ukendt spiller'
                  })
                  .filter(name => name !== 'Ukendt spiller')

                // Opponent names
                opponentNames = otherTeamMembers
                  .map((pid) => {
                    const player = playerMap.get(pid)
                    return player?.name || 'Ukendt spiller'
                  })
                  .filter(name => name !== 'Ukendt spiller')
              } else {
                // They played against each other - get their partners and opponents
                const player1TeamMembers = player1InTeam1 ? team1 : team2
                const player2TeamMembers = player2InTeam1 ? team1 : team2
                
                // Partner names for player1 (excluding player1 themselves)
                const player1Partners = player1TeamMembers
                  .filter((pid) => pid !== playerId1)
                  .map((pid) => {
                    const player = playerMap.get(pid)
                    return player?.name || 'Ukendt spiller'
                  })
                  .filter(name => name !== 'Ukendt spiller')

                // Partner names for player2 (excluding player2 themselves)
                // Note: Currently unused but kept for potential future use
                const _player2Partners = player2TeamMembers
                  .filter((pid) => pid !== playerId2)
                  .map((pid) => {
                    const player = playerMap.get(pid)
                    return player?.name || 'Ukendt spiller'
                  })
                  .filter(name => name !== 'Ukendt spiller')

                // Opponent names (the other team - player2's team)
                opponentNamesSeparate = player2TeamMembers
                  .map((pid) => {
                    const player = playerMap.get(pid)
                    return player?.name || 'Ukendt spiller'
                  })
                  .filter(name => name !== 'Ukendt spiller')

                // For opponent matches, show player1's partners
                if (player1Partners.length > 0) {
                  partnerNames = player1Partners
                }
              }
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
              wasPartner: sameTeam,
              opponentNames,
              partnerNames,
              opponentNamesSeparate
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
export const getPlayerHeadToHead = async (
  playerId1: string,
  playerId2: string
): Promise<{ headToHeadMatches: HeadToHeadResult[], player1Wins: number, player2Wins: number }> => {
  const [statistics, allMatchResults, allMatches, state] = await Promise.all([
    getStatisticsSnapshots(),
    getMatchResults(),
    getMatches(),
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

  // Create a map of players by ID for name lookup
  const playerMap = new Map<string, Player>()
  state.players.forEach((p) => {
    playerMap.set(p.id, p)
  })

  // Process statistics snapshots to find all matches where both players participated
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

            // Calculate partner and opponent names for 2v2 matches
            let partnerNames: string[] | undefined = undefined
            let opponentNamesSeparate: string[] | undefined = undefined
            let opponentNames: string[] | undefined = undefined

            // Check if this is a 2v2 match (more than 2 players total)
            const totalPlayers = team1.length + team2.length
            if (totalPlayers > 2) {
              if (sameTeam) {
                // They played together - get their partners and opponents
                const player1TeamMembers = player1InTeam1 ? team1 : team2
                const otherTeamMembers = player1InTeam1 ? team2 : team1
                
                // Partner names (excluding player1 and player2 themselves)
                partnerNames = player1TeamMembers
                  .filter((pid) => pid !== playerId1 && pid !== playerId2)
                  .map((pid) => {
                    const player = playerMap.get(pid)
                    return player?.name || 'Ukendt spiller'
                  })
                  .filter(name => name !== 'Ukendt spiller')

                // Opponent names
                opponentNames = otherTeamMembers
                  .map((pid) => {
                    const player = playerMap.get(pid)
                    return player?.name || 'Ukendt spiller'
                  })
                  .filter(name => name !== 'Ukendt spiller')
              } else {
                // They played against each other - get their partners and opponents
                const player1TeamMembers = player1InTeam1 ? team1 : team2
                const player2TeamMembers = player2InTeam1 ? team1 : team2
                
                // Partner names for player1 (excluding player1 themselves)
                const player1Partners = player1TeamMembers
                  .filter((pid) => pid !== playerId1)
                  .map((pid) => {
                    const player = playerMap.get(pid)
                    return player?.name || 'Ukendt spiller'
                  })
                  .filter(name => name !== 'Ukendt spiller')

                // Opponent names (the other team - player2's team)
                opponentNamesSeparate = player2TeamMembers
                  .map((pid) => {
                    const player = playerMap.get(pid)
                    return player?.name || 'Ukendt spiller'
                  })
                  .filter(name => name !== 'Ukendt spiller')

                // For opponent matches, show player1's partners
                if (player1Partners.length > 0) {
                  partnerNames = player1Partners
                }
              }
            }

            if (match) {
              headToHeadMatches.push({
                matchId,
                date: session.date,
                sessionId: match.sessionId,
                player1Won: player1WonThisMatch,
                player1Team,
                player2Team,
                scoreData: matchResult.scoreData,
                sport: matchResult.sport,
                wasPartner: sameTeam,
                opponentNames,
                partnerNames,
                opponentNamesSeparate
              })
            }

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
    headToHeadMatches,
    player1Wins,
    player2Wins
  }
}

/**
 * Gets recent match results for a player.
 * @param playerId - Player ID
 * @param limit - Maximum number of results to return (default: 5)
 * @param state - Optional state to reuse if already loaded
 * @returns Array of recent match results with details
 */
export const getPlayerRecentMatches = async (
  playerId: string,
  limit: number = 5,
  state?: DatabaseState
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
    const _playerInTeam2 = team2.includes(playerId)
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
export const getPlayerAllMatches = async (
  playerId: string,
  state?: DatabaseState
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
    const _playerInTeam2 = team2.includes(playerId)
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
export const getPlayerStatistics = async (
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
    const relevantMatchResults = allMatchResults.filter((mr) => {
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
