import type { MatchResult, BadmintonScoreData } from '@rundeklar/common'
import {
  createMatchResult as createMatchResultInDb,
  deleteMatchResult as deleteMatchResultInDb,
  getMatchResult as getMatchResultInDb,
  getMatchResultsBySession,
  updateMatchResult as updateMatchResultInDb
} from './postgres'

/**
 * Creates a match result.
 */
const createMatchResult = async (
  matchId: string,
  scoreData: BadmintonScoreData | Record<string, unknown>,
  sport: 'badminton' | 'tennis' | 'padel',
  winnerTeam: 'team1' | 'team2'
): Promise<MatchResult> => {
  return await createMatchResultInDb(matchId, scoreData, sport, winnerTeam)
}

/**
 * Gets a match result by match ID.
 */
const getMatchResult = async (matchId: string): Promise<MatchResult | null> => {
  return await getMatchResultInDb(matchId)
}

/**
 * Updates a match result.
 */
const updateMatchResult = async (
  id: string,
  updates: Partial<Pick<MatchResult, 'scoreData' | 'winnerTeam'>>
): Promise<MatchResult> => {
  return await updateMatchResultInDb(id, updates)
}

/**
 * Deletes a match result.
 */
const deleteMatchResult = async (id: string): Promise<void> => {
  return await deleteMatchResultInDb(id)
}

/**
 * Gets match results by session ID.
 */
const getMatchResultsBySessionId = async (sessionId: string): Promise<MatchResult[]> => {
  return await getMatchResultsBySession(sessionId)
}

/** Match Results API — manages match scores and results. */
export const matchResultsApi = {
  create: createMatchResult,
  get: getMatchResult,
  update: updateMatchResult,
  delete: deleteMatchResult,
  getBySession: getMatchResultsBySessionId
}
