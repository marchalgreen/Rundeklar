import type { MatchPlayer } from '@rundeklar/common'

/**
 * Determines season from a date string (August to July).
 * @param dateStr - ISO date string
 * @returns Season string (e.g., "2023-2024")
 * @remarks Seasons run from August 1st to July 31st.
 * Dates in August-December use current year as start.
 * Dates in January-July use previous year as start.
 */
export const getSeasonFromDate = (dateStr: string): string => {
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
export const getTeamStructure = (matchPlayers: MatchPlayer[]): { team1: string[]; team2: string[] } => {
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





