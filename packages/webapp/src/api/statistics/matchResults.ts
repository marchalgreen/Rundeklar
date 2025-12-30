import type { MatchResult } from '@rundeklar/common'
import { getStateCopy, getMatchResults, getMatchResultsBySession, getMatches } from '../postgres'

/**
 * Searches match results based on filters.
 * @param filters - Search filters (playerId, dateFrom, dateTo, sessionId, sport, winnerTeam)
 * @returns Filtered array of match results
 */
export const searchMatchResults = async (filters: {
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





