import { z } from 'zod'
import type { Player, PlayerCreateInput, PlayerListFilters, PlayerUpdateInput } from '@rundeklar/common'
import { createPlayer as createPlayerInDb, getPlayers, updatePlayer as updatePlayerInDb } from './postgres'
import { normalizeError, ValidationError } from '../lib/errors'

/**
 * Normalizes player data — ensures nullable fields are null (not undefined).
 * @param player - Player to normalize
 * @returns Normalized player
 */
export const normalisePlayer = (player: Player): Player => ({
  ...player,
  alias: player.alias ?? null,
  level: player.level ?? null,
  gender: player.gender ?? null,
  primaryCategory: player.primaryCategory ?? null,
  active: Boolean(player.active)
})

/** Zod schema for player creation input validation. */
const playerCreateSchema = z.object({
  name: z.string().min(1),
  alias: z.string().min(1).optional(),
  level: z.number().optional(),
  levelSingle: z.number().optional(),
  levelDouble: z.number().optional(),
  levelMix: z.number().optional(),
  gender: z.enum(['Herre', 'Dame']).optional(),
  primaryCategory: z.enum(['Single', 'Double', 'Begge']).optional(),
  trainingGroups: z.array(z.string().min(1)).optional(),
  active: z.boolean().optional(),
  preferredDoublesPartners: z.array(z.string()).optional(),
  preferredMixedPartners: z.array(z.string()).optional()
})

/** Zod schema for player update input validation. */
const playerUpdateSchema = z.object({
  id: z.string().min(1),
  patch: z
    .object({
      name: z.string().min(1).optional(),
      alias: z.string().nullable().optional(),
      level: z.number().nullable().optional(),
      levelSingle: z.number().nullable().optional(),
      levelDouble: z.number().nullable().optional(),
      levelMix: z.number().nullable().optional(),
      gender: z.enum(['Herre', 'Dame']).nullable().optional(),
      primaryCategory: z.enum(['Single', 'Double', 'Begge']).nullable().optional(),
      trainingGroups: z.array(z.string()).nullable().optional(),
      active: z.boolean().optional(),
      preferredDoublesPartners: z.array(z.string()).nullable().optional(),
      preferredMixedPartners: z.array(z.string()).nullable().optional()
    })
    .refine((value) => Object.keys(value).length > 0, 'patch must update mindst ét felt')
})

/**
 * Lists players with optional filters (search, active status).
 * @param filters - Optional filters (q for search, active for status)
 * @returns Array of normalized players
 */
const listPlayers = async (filters?: PlayerListFilters): Promise<Player[]> => {
  const players = await getPlayers()
  const term = filters?.q?.trim().toLowerCase()
  const filtered = players.filter((player) => {
    if (filters?.active !== undefined && Boolean(player.active) !== filters.active) {
      return false
    }
    if (!term) return true
    const alias = player.alias ?? ''
    return player.name.toLowerCase().includes(term) || alias.toLowerCase().includes(term)
  })
  return filtered
    .map(normalisePlayer)
    .sort((a: Player, b: Player) => a.name.localeCompare(b.name, 'da'))
}

/**
 * Creates a new player.
 * 
 * @param input - Player creation input
 * @returns Created and normalized player
 * @throws {ValidationError} If input validation fails
 * @throws {DatabaseError} If database operation fails
 */
const createPlayer = async (input: PlayerCreateInput): Promise<Player> => {
  try {
    const parsed = playerCreateSchema.parse(input)
    const created = await createPlayerInDb({
      name: parsed.name.trim(),
      alias: parsed.alias ? parsed.alias.trim() : null,
      level: parsed.level ?? null,
      levelSingle: parsed.levelSingle ?? null,
      levelDouble: parsed.levelDouble ?? null,
      levelMix: parsed.levelMix ?? null,
      gender: parsed.gender ?? null,
      primaryCategory: parsed.primaryCategory ?? null,
      trainingGroups: parsed.trainingGroups ?? [],
      active: parsed.active ?? true,
      preferredDoublesPartners: parsed.preferredDoublesPartners ?? null,
      preferredMixedPartners: parsed.preferredMixedPartners ?? null
    } as Omit<Player, 'id' | 'createdAt'>)
    return normalisePlayer(created)
  } catch (error) {
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
 * Updates an existing player.
 * 
 * @param input - Player update input (id + patch)
 * @returns Updated and normalized player
 * @throws {ValidationError} If input validation fails
 * @throws {PlayerError} If player not found
 * @throws {DatabaseError} If database operation fails
 */
const updatePlayer = async (input: PlayerUpdateInput): Promise<Player> => {
  try {
    const parsed = playerUpdateSchema.parse(input)
    const updateData: PlayerUpdateInput['patch'] = {}
    if (parsed.patch.name !== undefined) updateData.name = parsed.patch.name.trim()
    if (parsed.patch.alias !== undefined) updateData.alias = parsed.patch.alias
    if (parsed.patch.level !== undefined) updateData.level = parsed.patch.level
    if (parsed.patch.levelSingle !== undefined) updateData.levelSingle = parsed.patch.levelSingle
    if (parsed.patch.levelDouble !== undefined) updateData.levelDouble = parsed.patch.levelDouble
    if (parsed.patch.levelMix !== undefined) updateData.levelMix = parsed.patch.levelMix
    if (parsed.patch.gender !== undefined) updateData.gender = parsed.patch.gender
    if (parsed.patch.primaryCategory !== undefined) updateData.primaryCategory = parsed.patch.primaryCategory
    if (parsed.patch.trainingGroups !== undefined) updateData.trainingGroups = parsed.patch.trainingGroups ?? []
    if (parsed.patch.active !== undefined) updateData.active = parsed.patch.active
    if (parsed.patch.preferredDoublesPartners !== undefined) updateData.preferredDoublesPartners = parsed.patch.preferredDoublesPartners
    if (parsed.patch.preferredMixedPartners !== undefined) updateData.preferredMixedPartners = parsed.patch.preferredMixedPartners

    const updated = await updatePlayerInDb(parsed.id, updateData)
    return normalisePlayer(updated)
  } catch (error) {
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

/** Players API — CRUD operations for players. */
export const playersApi = {
  list: listPlayers,
  create: createPlayer,
  update: updatePlayer
}
