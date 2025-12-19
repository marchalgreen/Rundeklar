import type { CourtWithPlayers, Match, TrainingSession } from '@rundeklar/common'
import statsApi from './stats'
import {
  createMatch as createMatchInDb,
  createMatchPlayer as createMatchPlayerInDb,
  deleteMatch as deleteMatchInDb,
  deleteMatchPlayer as deleteMatchPlayerInDb,
  getMatches,
  getSessions,
  getStateCopy,
  updateMatch as updateMatchInDb,
  createSession as createSessionInDb,
  updateSession as updateSessionInDb
} from './postgres'
import { createSessionNotFoundError } from '../lib/errors'
import { logger } from '../lib/utils/logger'

/**
 * Automatically ends training sessions that have been active for too long.
 * @param session - Session to check
 * @returns True if session was auto-ended, false otherwise
 */
const autoEndExpiredSession = async (session: TrainingSession): Promise<boolean> => {
  const { SESSION_TIMEOUT } = await import('../constants')
  const sessionStartTime = new Date(session.createdAt).getTime()
  const now = Date.now()
  const sessionAge = now - sessionStartTime

  if (sessionAge > SESSION_TIMEOUT.MAX_DURATION_MS) {
    logger.info(
      `[autoEndExpiredSession] Auto-ending session ${session.id} (age: ${Math.round(sessionAge / 1000 / 60)} minutes)`
    )

    // Update session status to ended
    await updateSessionInDb(session.id, { status: 'ended' })

    // Update all matches for this session with endedAt
    const matches = await getMatches()
    const sessionMatches = matches.filter((match: Match) => match.sessionId === session.id)
    const endedAt = new Date().toISOString()
    await Promise.all(sessionMatches.map((match) => updateMatchInDb(match.id, { endedAt })))

    // Invalidate cache
    const { invalidateCache } = await import('./postgres')
    invalidateCache('matches')
    invalidateCache('sessions')

    // Try to create statistics snapshot (don't fail if it errors)
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))
      await statsApi.snapshotSession(session.id)
      logger.info('[autoEndExpiredSession] Statistics snapshot created successfully')
    } catch (err) {
      logger.error('[autoEndExpiredSession] Failed to create statistics snapshot', err)
    }

    return true
  }

  return false
}

/**
 * Gets the active training session (if any).
 * Automatically ends sessions that have been active for too long.
 * @returns Active session or null
 */
export const getActiveSession = async (): Promise<TrainingSession | null> => {
  const sessions = await getSessions()
  const active = sessions
    .filter((session) => session.status === 'active')
    .sort((a: TrainingSession, b: TrainingSession) => b.createdAt.localeCompare(a.createdAt))[0]

  if (!active) {
    return null
  }

  // Check if session has expired and auto-end it
  const wasEnded = await autoEndExpiredSession(active)
  if (wasEnded) {
    // Session was auto-ended, return null
    return null
  }

  return active
}

/**
 * Ensures an active session exists (throws if none).
 * 
 * @returns Active session
 * @throws {SessionError} If no active session exists
 */
export const ensureActiveSession = async (): Promise<TrainingSession> => {
  const active = await getActiveSession()
  if (!active) {
    throw createSessionNotFoundError()
  }
  return active
}

/**
 * Starts a new session or returns existing active session.
 * @returns Active session
 */
const startOrGetActiveSession = async (): Promise<TrainingSession> => {
  const active = await getActiveSession()
  if (active) return active

  const now = new Date().toISOString()
  const session = await createSessionInDb({
    date: now,
    status: 'active'
  })
  return session
}

/**
 * Saves all match data for the active session to the database.
 * This is called when ending the training session to persist all match changes.
 * @param matchesData - Array of CourtWithPlayers for all rounds
 * @throws Error if no active session
 */
const saveAllMatches = async (matchesData: Array<{ round: number; matches: CourtWithPlayers[] }>): Promise<void> => {
  const active = await getActiveSession()
  if (!active) {
    throw new Error('Ingen aktiv træning')
  }

  const state = await getStateCopy()
  const courts = state.courts.slice()
  const startedAt = new Date().toISOString()

  // Delete all existing matches for this session (we'll recreate them)
  const existingMatches = state.matches.filter((match: Match) => match.sessionId === active.id)
  const existingMatchIds = existingMatches.map((m: Match) => m.id)
  const existingMatchPlayers = state.matchPlayers.filter((mp) => existingMatchIds.includes(mp.matchId))

  // Delete all match players first
  await Promise.all(existingMatchPlayers.map((mp) => deleteMatchPlayerInDb(mp.id)))
  // Then delete all matches
  await Promise.all(existingMatchIds.map((matchId) => deleteMatchInDb(matchId)))

  // Create all matches and match players for all rounds
  for (const { round, matches: roundMatches } of matchesData) {
    for (const courtMatch of roundMatches) {
      const court = courts.find((c) => c.idx === courtMatch.courtIdx)
      if (!court) {
        // If court doesn't exist in state, skip creating matches for this court
        // (dynamic court creation is disabled in this build)
        continue
      }
      if (courtMatch.slots.length === 0) continue

      // Create match for this court and round
      const match = await createMatchInDb({
        sessionId: active.id,
        courtId: court.id,
        startedAt,
        endedAt: null,
        round
      })

      // Create match players for all slots
      for (const slot of courtMatch.slots) {
        if (slot.player) {
          await createMatchPlayerInDb({
            matchId: match.id,
            playerId: slot.player.id,
            slot: slot.slot
          })
        }
      }
    }
  }
}

/**
 * Ends the active session and marks all related matches as ended.
 * @param matchesData - Optional array of CourtWithPlayers for all rounds to save before ending
 * @throws Error if no active session
 * @remarks Automatically creates a statistics snapshot when session ends.
 */
const endActiveSession = async (matchesData?: Array<{ round: number; matches: CourtWithPlayers[] }>): Promise<void> => {
  const active = await getActiveSession()
  if (!active) {
    throw new Error('Ingen aktiv træning')
  }

  // Save all match data if provided (in-memory changes)
  if (matchesData && matchesData.length > 0) {
    await saveAllMatches(matchesData)
  }

  // Update session status to ended
  await updateSessionInDb(active.id, { status: 'ended' })

  // Update all matches for this session with endedAt
  const matches = await getMatches()
  const sessionMatches = matches.filter((match: Match) => match.sessionId === active.id)
  const endedAt = new Date().toISOString()
  await Promise.all(sessionMatches.map((match) => updateMatchInDb(match.id, { endedAt })))

  // Invalidate cache before creating snapshot to ensure fresh data
  const { invalidateCache } = await import('./postgres')
  // Only invalidate matches and sessions since we updated those
  invalidateCache('matches')
  invalidateCache('sessions')

  // Create statistics snapshot after session is marked as ended
  // Add a small delay to ensure all database writes are committed
  await new Promise((resolve) => setTimeout(resolve, 200))

  try {
    logger.info('[endActiveSession] Creating statistics snapshot for session', active.id)
    await statsApi.snapshotSession(active.id)
    logger.info('[endActiveSession] Statistics snapshot created successfully')
  } catch (err) {
    // Log error but don't fail the session ending
    logger.error('[endActiveSession] Failed to create statistics snapshot', err)
  }
}

/** Session API — manages training sessions. */
export const sessionApi = {
  startOrGetActive: startOrGetActiveSession,
  getActive: getActiveSession,
  endActive: endActiveSession,
  saveAllMatches
}
