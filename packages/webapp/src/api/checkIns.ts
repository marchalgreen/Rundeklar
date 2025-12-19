import { z } from 'zod'
import type { CheckIn, CheckedInPlayer, Player } from '@rundeklar/common'
import { createCheckIn as createCheckInInDb, deleteCheckIn as deleteCheckInInDb, getCheckIns, getPlayers, updateCheckIn as updateCheckInInDb } from './postgres'
import {
  createCheckInExistsError,
  createCheckInNotFoundError,
  createPlayerInactiveError,
  createPlayerNotFoundError,
  normalizeError,
  ValidationError
} from '../lib/errors'
import { normalisePlayer } from './players'
import { ensureActiveSession } from './session'

/** Zod schema for check-in notes validation. */
const checkInNotesSchema = z
  .string()
  .max(500, 'Noter må maksimalt være 500 tegn')
  .nullable()
  .optional()

/**
 * Adds a player check-in for the active session.
 * 
 * @param input - Check-in input (playerId, optional maxRounds, optional notes)
 * @returns Created check-in
 * @throws {ValidationError} If notes validation fails
 * @throws {SessionError} If no active session exists
 * @throws {PlayerError} If player not found or inactive
 * @throws {SessionError} If player already checked in
 * @throws {DatabaseError} If database operation fails
 */
const addCheckIn = async (input: { playerId: string; maxRounds?: number; notes?: string | null }) => {
  try {
    // Validate notes if provided
    let validatedNotes: string | null | undefined = input.notes
    if (input.notes !== undefined && input.notes !== null) {
      validatedNotes = checkInNotesSchema.parse(input.notes)
    }

    const session = await ensureActiveSession()
    const players = await getPlayers()
    const player = players.find((item) => item.id === input.playerId)

    if (!player) {
      throw createPlayerNotFoundError(input.playerId)
    }

    if (!player.active) {
      throw createPlayerInactiveError(player.name)
    }

    const checkIns = await getCheckIns()
    const existing = checkIns.find(
      (checkIn) => checkIn.sessionId === session.id && checkIn.playerId === input.playerId
    )

    if (existing) {
      throw createCheckInExistsError(player.name)
    }

    const checkIn = await createCheckInInDb({
      sessionId: session.id,
      playerId: input.playerId,
      maxRounds: input.maxRounds ?? null,
      notes: validatedNotes ?? null
    })

    return checkIn
  } catch (error) {
    // Re-throw AppError instances as-is
    if (error instanceof Error && 'code' in error) {
      throw error
    }
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        error.errors.map((e) => e.message).join(', '),
        undefined,
        error
      )
    }
    throw normalizeError(error)
  }
}

/**
 * Lists checked-in players for the active session.
 * @returns Array of checked-in players with full player data
 * @throws Error if no active session
 */
const listActiveCheckIns = async (): Promise<CheckedInPlayer[]> => {
  const session = await ensureActiveSession()
  const [checkIns, players] = await Promise.all([getCheckIns(), getPlayers()])
  return checkIns
    .filter((checkIn: CheckIn) => checkIn.sessionId === session.id)
    .sort((a: CheckIn, b: CheckIn) => a.createdAt.localeCompare(b.createdAt))
    .map((checkIn: CheckIn) => {
      const player = players.find((p: Player) => p.id === checkIn.playerId)
      if (!player) throw new Error('Manglende spillerdata')
      return {
        ...normalisePlayer(player),
        checkInAt: checkIn.createdAt,
        maxRounds: checkIn.maxRounds ?? null,
        notes: checkIn.notes ?? null
      }
    })
}

/**
 * Removes a player check-in for the active session.
 * 
 * @param input - Check-in input (playerId)
 * @throws {SessionError} If no active session exists
 * @throws {SessionError} If player not checked in
 * @throws {DatabaseError} If database operation fails
 */
const removeCheckIn = async (input: { playerId: string }) => {
  try {
    const session = await ensureActiveSession()
    const checkIns = await getCheckIns()
    const checkIn = checkIns.find(
      (checkIn: CheckIn) => checkIn.sessionId === session.id && checkIn.playerId === input.playerId
    )

    if (!checkIn) {
      // Try to get player name for better error message
      const players = await getPlayers()
      const player = players.find((p) => p.id === input.playerId)
      const playerName = player?.name || 'Spilleren'
      throw createCheckInNotFoundError(playerName)
    }

    await deleteCheckInInDb(checkIn.id)
  } catch (error) {
    // Re-throw AppError instances as-is
    if (error instanceof Error && 'code' in error) {
      throw error
    }
    throw normalizeError(error)
  }
}

/**
 * Updates a player check-in for the active session.
 * 
 * @param input - Update input (playerId, optional maxRounds, optional notes)
 * @returns Updated check-in
 * @throws {ValidationError} If notes validation fails
 * @throws {SessionError} If no active session exists
 * @throws {SessionError} If player not checked in
 * @throws {DatabaseError} If database operation fails
 */
const updateCheckIn = async (input: { playerId: string; maxRounds?: number; notes?: string | null }) => {
  try {
    // Validate notes if provided
    let validatedNotes: string | null | undefined = input.notes
    if (input.notes !== undefined && input.notes !== null) {
      validatedNotes = checkInNotesSchema.parse(input.notes)
    }

    const session = await ensureActiveSession()
    const checkIns = await getCheckIns()
    const checkIn = checkIns.find(
      (ci: CheckIn) => ci.sessionId === session.id && ci.playerId === input.playerId
    )

    if (!checkIn) {
      // Try to get player name for better error message
      const players = await getPlayers()
      const player = players.find((p: Player) => p.id === input.playerId)
      const playerName = player?.name ?? input.playerId
      throw createCheckInNotFoundError(playerName)
    }

    const updateData: Partial<Pick<CheckIn, 'maxRounds' | 'notes'>> = {}
    if (input.maxRounds !== undefined) updateData.maxRounds = input.maxRounds
    if (input.notes !== undefined) updateData.notes = validatedNotes ?? null

    const updated = await updateCheckInInDb(checkIn.id, updateData)

    return updated
  } catch (error) {
    // Re-throw AppError instances as-is
    if (error instanceof Error && 'code' in error) {
      throw error
    }
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        error.errors.map((e) => e.message).join(', '),
        undefined,
        error
      )
    }
    throw normalizeError(error)
  }
}

/** Check-ins API — manages player check-ins for training sessions. */
export const checkInsApi = {
  add: addCheckIn,
  update: updateCheckIn,
  remove: removeCheckIn,
  listActive: listActiveCheckIns
}
