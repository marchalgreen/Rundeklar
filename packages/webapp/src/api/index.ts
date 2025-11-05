import { z } from 'zod'
import type {
  AutoArrangeResult,
  CheckIn,
  CheckedInPlayer,
  CourtWithPlayers,
  Match,
  MatchMovePayload,
  Player,
  PlayerCreateInput,
  PlayerListFilters,
  PlayerUpdateInput,
  TrainingSession
} from '@badminton/common'
import { buildAssignments } from '../lib/matchmaker'
import { createId, getStateCopy, loadState, updateState } from './storage'
import type { DatabaseState } from './storage'

const normalisePlayer = (player: Player): Player => ({
  ...player,
  alias: player.alias ?? null,
  level: player.level ?? null,
  gender: player.gender ?? null,
  primaryCategory: player.primaryCategory ?? null,
  active: Boolean(player.active)
})

const playerCreateSchema = z.object({
  name: z.string().min(1),
  alias: z.string().min(1).optional(),
  level: z.number().optional(),
  gender: z.enum(['Herre', 'Dame']).optional(),
  primaryCategory: z.enum(['Single', 'Double', 'Begge']).optional(),
  active: z.boolean().optional()
})

const playerUpdateSchema = z.object({
  id: z.string().min(1),
  patch: z
    .object({
      name: z.string().min(1).optional(),
      alias: z.string().nullable().optional(),
      level: z.number().nullable().optional(),
      gender: z.enum(['Herre', 'Dame']).nullable().optional(),
      primaryCategory: z.enum(['Single', 'Double', 'Begge']).nullable().optional(),
      active: z.boolean().optional()
    })
    .refine((value) => Object.keys(value).length > 0, 'patch must update mindst ét felt')
})

const listPlayers = async (filters?: PlayerListFilters): Promise<Player[]> => {
  const state = getStateCopy()
  const term = filters?.q?.trim().toLowerCase()
  const filtered = state.players.filter((player) => {
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

const createPlayer = async (input: PlayerCreateInput): Promise<Player> => {
  const parsed = playerCreateSchema.parse(input)
  let created!: Player
  updateState((state: DatabaseState) => {
    created = {
      id: createId(),
      name: parsed.name.trim(),
      alias: parsed.alias ? parsed.alias.trim() : null,
      level: parsed.level ?? null,
      gender: parsed.gender ?? null,
      primaryCategory: parsed.primaryCategory ?? null,
      active: parsed.active ?? true,
      createdAt: new Date().toISOString()
    }
    state.players.push(created)
  })
  return normalisePlayer(created)
}

const updatePlayer = async (input: PlayerUpdateInput): Promise<Player> => {
  const parsed = playerUpdateSchema.parse(input)
  let updated!: Player
  updateState((state: DatabaseState) => {
    const index = state.players.findIndex((player) => player.id === parsed.id)
    if (index === -1) {
      throw new Error('Spiller ikke fundet')
    }
    const existing = state.players[index]
    updated = {
      ...existing,
      ...parsed.patch,
      name: parsed.patch.name !== undefined ? parsed.patch.name.trim() : existing.name,
      alias: parsed.patch.alias !== undefined ? parsed.patch.alias : existing.alias,
      level: parsed.patch.level !== undefined ? parsed.patch.level : existing.level,
      gender: parsed.patch.gender !== undefined ? parsed.patch.gender : existing.gender,
      primaryCategory: parsed.patch.primaryCategory !== undefined ? parsed.patch.primaryCategory : existing.primaryCategory,
      active: parsed.patch.active !== undefined ? parsed.patch.active : existing.active
    }
    state.players[index] = updated
  })
  return normalisePlayer(updated)
}

const playersApi = {
  list: listPlayers,
  create: createPlayer,
  update: updatePlayer
}

const getActiveSession = async (): Promise<TrainingSession | null> => {
  const state = loadState()
  const active = state.sessions
    .filter((session) => session.status === 'active')
    .sort((a: TrainingSession, b: TrainingSession) => b.createdAt.localeCompare(a.createdAt))[0]
  return active ?? null
}

const ensureActiveSession = async (): Promise<TrainingSession> => {
  const active = await getActiveSession()
  if (!active) {
    throw new Error('Ingen aktiv træning')
  }
  return active
}

const startOrGetActiveSession = async (): Promise<TrainingSession> => {
  const active = await getActiveSession()
  if (active) return active

  const now = new Date().toISOString()
  const session: TrainingSession = {
    id: createId(),
    date: now,
    status: 'active',
    createdAt: now
  }
  updateState((state: DatabaseState) => {
    state.sessions.push(session)
  })
  return session
}

const endActiveSession = async (): Promise<void> => {
  updateState((state: DatabaseState) => {
    const active = state.sessions.find((session) => session.status === 'active')
    if (!active) {
      throw new Error('Ingen aktiv træning')
    }
    active.status = 'ended'
    const matches = state.matches.filter((match: Match) => match.sessionId === active.id)
    const endedAt = new Date().toISOString()
    matches.forEach((match: Match) => {
      match.endedAt = endedAt
    })
  })
}

const sessionApi = {
  startOrGetActive: startOrGetActiveSession,
  getActive: getActiveSession,
  endActive: endActiveSession
}

const addCheckIn = async (input: { playerId: string }) => {
  const session = await ensureActiveSession()
  const state = loadState()
  const player = state.players.find((item) => item.id === input.playerId)
  if (!player) {
    throw new Error('Spiller ikke fundet')
  }
  if (!player.active) {
    throw new Error('Spiller er inaktiv')
  }
  const existing = state.checkIns.find(
    (checkIn) => checkIn.sessionId === session.id && checkIn.playerId === input.playerId
  )
  if (existing) {
    throw new Error('Spilleren er allerede tjekket ind')
  }
  const checkIn = {
    id: createId(),
    sessionId: session.id,
    playerId: input.playerId,
    createdAt: new Date().toISOString()
  }
  updateState((current: DatabaseState) => {
    current.checkIns.push(checkIn)
  })
  return checkIn
}

const listActiveCheckIns = async (): Promise<CheckedInPlayer[]> => {
  const session = await ensureActiveSession()
  const state = loadState()
  return state.checkIns
    .filter((checkIn: CheckIn) => checkIn.sessionId === session.id)
    .sort((a: CheckIn, b: CheckIn) => a.createdAt.localeCompare(b.createdAt))
    .map((checkIn: CheckIn) => {
      const player = state.players.find((p: Player) => p.id === checkIn.playerId)
      if (!player) throw new Error('Manglende spillerdata')
      return {
        ...normalisePlayer(player),
        checkInAt: checkIn.createdAt
      }
    })
}

const removeCheckIn = async (input: { playerId: string }) => {
  const session = await ensureActiveSession()
  const state = loadState()
  const checkInIndex = state.checkIns.findIndex(
    (checkIn: CheckIn) => checkIn.sessionId === session.id && checkIn.playerId === input.playerId
  )
  if (checkInIndex === -1) {
    throw new Error('Spilleren er ikke tjekket ind')
  }
  updateState((current: DatabaseState) => {
    current.checkIns.splice(checkInIndex, 1)
  })
}

const checkInsApi = {
  add: addCheckIn,
  remove: removeCheckIn,
  listActive: listActiveCheckIns
}

const listMatches = async (round?: number): Promise<CourtWithPlayers[]> => {
  const state = loadState()
  const session = await getActiveSession()
  const courts = [...state.courts].sort((a, b) => a.idx - b.idx)
  if (!session) {
    return courts.map((court) => ({ courtIdx: court.idx, slots: [] }))
  }

  let matches = state.matches.filter((match: Match) => match.sessionId === session.id)
  
  // Filter by round if specified
  if (round !== undefined) {
    matches = matches.filter((match: Match) => {
      // If round is specified, show only matches for that round
      // If round is null/undefined on match, treat as round 1 (for backward compatibility)
      const matchRound = match.round ?? 1
      return matchRound === round
    })
  }

  if (!matches.length) {
    return courts.map((court) => ({ courtIdx: court.idx, slots: [] }))
  }

  const grouped = new Map<number, CourtWithPlayers['slots']>()
  const playersMap = new Map(state.players.map((player: Player) => [player.id, normalisePlayer(player)]))

  matches.forEach((match: Match) => {
    const court = state.courts.find((court) => court.id === match.courtId)
    if (!court) return
    grouped.set(court.idx, [])
  })

  state.matchPlayers
    .filter((mp) => matches.some((match: Match) => match.id === mp.matchId))
    .forEach((mp) => {
      const match = matches.find((m: Match) => m.id === mp.matchId)
      if (!match) return
      const court = state.courts.find((court) => court.id === match.courtId)
      if (!court) return
      const player = playersMap.get(mp.playerId)
      if (!player) return
      const slots = grouped.get(court.idx) ?? []
      slots.push({ slot: mp.slot, player })
      grouped.set(court.idx, slots)
    })

  return courts.map((court) => ({
    courtIdx: court.idx,
    slots: (grouped.get(court.idx) ?? []).sort((a, b) => a.slot - b.slot)
  }))
}

const resetMatches = async (): Promise<void> => {
  const session = await ensureActiveSession()
  updateState((state: DatabaseState) => {
    const matchIds = state.matches.filter((match: Match) => match.sessionId === session.id).map((m: Match) => m.id)
    state.matches = state.matches.filter((match: Match) => match.sessionId !== session.id)
    state.matchPlayers = state.matchPlayers.filter((mp) => !matchIds.includes(mp.matchId))
  })
}

const autoArrangeMatches = async (round?: number): Promise<AutoArrangeResult> => {
  const session = await ensureActiveSession()
  const state = loadState()
  const checkIns = state.checkIns
    .filter((checkIn: CheckIn) => checkIn.sessionId === session.id)
    .sort((a: CheckIn, b: CheckIn) => a.createdAt.localeCompare(b.createdAt))

  if (!checkIns.length) {
    return { filledCourts: 0, benched: 0 }
  }

  // Filter matches: exclude players already in the same round (allow same player in different rounds)
  const existingMatchesInRound = state.matches.filter(
    (match: Match) => match.sessionId === session.id && (match.round ?? 1) === (round ?? 1)
  )
  
  // Only exclude players who are already assigned in THIS round
  const assignedPlayers = new Set(
    state.matchPlayers
      .filter((mp) => existingMatchesInRound.some((match: Match) => match.id === mp.matchId))
      .map((mp) => mp.playerId)
  )

  // Get bench players with their full data
  const benchPlayers = checkIns
    .map((checkIn: CheckIn) => {
      const player = state.players.find((p: Player) => p.id === checkIn.playerId)
      return player ? { ...player, checkInId: checkIn.id } : null
    })
    .filter((p): p is Player & { checkInId: string } => p !== null && !assignedPlayers.has(p.id))

  if (!benchPlayers.length) {
    return { filledCourts: 0, benched: 0 }
  }

  const courts = [...state.courts].sort((a, b) => a.idx - b.idx)
  
  // Only exclude courts that are occupied in THIS round
  const occupied = new Set(
    existingMatchesInRound
      .map((match) => courts.find((court) => court.id === match.courtId)?.idx)
      .filter((idx): idx is number => typeof idx === 'number')
  )

  const availableCourtIdxs = courts
    .map((court) => court.idx)
    .filter((idx) => !occupied.has(idx))

  if (!availableCourtIdxs.length) {
    return { filledCourts: 0, benched: benchPlayers.length }
  }

  // Sort players by level (ascending - lower Niveau = better player)
  benchPlayers.sort((a, b) => (a.level ?? 0) - (b.level ?? 0))

  // Smart matching algorithm - prioritize getting everyone into a fair game
  const assignments: Array<{ courtIdx: number; playerIds: string[] }> = []
  const usedPlayerIds = new Set<string>()
  let courtIdxIndex = 0
  const remainingPlayers = [...benchPlayers]

  // Main strategy: Fill courts with balanced matches, prioritizing getting everyone in
  while (courtIdxIndex < availableCourtIdxs.length && remainingPlayers.length >= 2) {
    remainingPlayers.sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
    
    // Try to create 1v1 match if we have 2+ players and at least one isn't Doubles-only
    if (remainingPlayers.length >= 2) {
      const singlesEligible = remainingPlayers.filter((p) => p.primaryCategory !== 'Double')
      
      if (singlesEligible.length >= 2) {
        // Create balanced 1v1 match
        const player1 = singlesEligible[0]
        const player1Level = player1.level ?? 0
        
        // Find best match for balanced 1v1
        let bestMatchIndex = -1
        let bestBalance = Infinity
        
        for (let i = 1; i < singlesEligible.length; i++) {
          const player2 = singlesEligible[i]
          const player2Level = player2.level ?? 0
          const balance = Math.abs(player1Level - player2Level)
          if (balance < bestBalance) {
            bestBalance = balance
            bestMatchIndex = i
          }
        }
        
        if (bestMatchIndex >= 0) {
          const player2 = singlesEligible[bestMatchIndex]
          const courtIdx = availableCourtIdxs[courtIdxIndex++]
          assignments.push({
            courtIdx,
            playerIds: [player1.id, player2.id]
          })
          usedPlayerIds.add(player1.id)
          usedPlayerIds.add(player2.id)
          
          // Remove from remaining
          const idx1 = remainingPlayers.findIndex((p) => p.id === player1.id)
          const idx2 = remainingPlayers.findIndex((p) => p.id === player2.id)
          if (idx1 >= 0) remainingPlayers.splice(idx1, 1)
          if (idx2 >= 0 && idx2 !== idx1) remainingPlayers.splice(idx2 > idx1 ? idx2 - 1 : idx2, 1)
          continue
        }
      }
    }
    
    // Try to create 2v2 match if we have 4+ players
    if (remainingPlayers.length >= 4) {
      // Take first 4 players and balance teams
      const players = remainingPlayers.splice(0, 4)
      const levels = players.map((p) => p.level ?? 0)
      
      // Find best team split to balance total levels
      let bestSplit: [number, number] = [0, 0]
      let bestDiff = Infinity
      
      for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 4; j++) {
          const team1Total = levels[i] + levels[j]
          const team2Total = levels.reduce((sum, l, idx) => sum + (idx === i || idx === j ? 0 : l), 0)
          const diff = Math.abs(team1Total - team2Total)
          if (diff < bestDiff) {
            bestDiff = diff
            bestSplit = [i, j]
          }
        }
      }
      
      const [i, j] = bestSplit
      const team1 = [players[i].id, players[j].id]
      const team2 = players.filter((_, idx) => idx !== i && idx !== j).map((p) => p.id)
      
      const courtIdx = availableCourtIdxs[courtIdxIndex++]
      assignments.push({
        courtIdx,
        playerIds: [...team1, ...team2]
      })
      
      players.forEach((p) => usedPlayerIds.add(p.id))
      continue
    }
    
    // If we have 2-3 players left and courts available, try to add them to existing matches
    // or create the best possible match
    if (remainingPlayers.length >= 2 && courtIdxIndex < availableCourtIdxs.length) {
      // Create best possible match even if not perfectly balanced
      const player1 = remainingPlayers.shift()!
      const player1Level = player1.level ?? 0
      
      let bestMatchIndex = -1
      let bestBalance = Infinity
      
      for (let i = 0; i < remainingPlayers.length; i++) {
        const player2 = remainingPlayers[i]
        const player2Level = player2.level ?? 0
        // Allow 1v1 even if one is Doubles-only if it's the only option
        const balance = Math.abs(player1Level - player2Level)
        if (balance < bestBalance) {
          bestBalance = balance
          bestMatchIndex = i
        }
      }
      
      if (bestMatchIndex >= 0) {
        const player2 = remainingPlayers.splice(bestMatchIndex, 1)[0]
        const courtIdx = availableCourtIdxs[courtIdxIndex++]
        assignments.push({
          courtIdx,
          playerIds: [player1.id, player2.id]
        })
        usedPlayerIds.add(player1.id)
        usedPlayerIds.add(player2.id)
      } else {
        break
      }
    } else {
      break
    }
  }

  const leftoverPlayerIds = benchPlayers.filter((p) => !usedPlayerIds.has(p.id)).map((p) => p.id)

  if (!assignments.length) {
    return { filledCourts: 0, benched: leftoverPlayerIds.length }
  }

  updateState((mutable: DatabaseState) => {
    const courtsByIdx = new Map(mutable.courts.map((court) => [court.idx, court]))
    assignments.forEach(({ courtIdx, playerIds }: { courtIdx: number; playerIds: string[] }) => {
      const court = courtsByIdx.get(courtIdx)
      if (!court) return
      const matchId = createId()
      mutable.matches.push({
        id: matchId,
        sessionId: session.id,
        courtId: court.id,
        startedAt: new Date().toISOString(),
        endedAt: null,
        round: round ?? null
      })
      
      // For 1v1 matches (2 players), place them in slots 1 and 2 (opposite sides of net)
      // For 2v2 matches (4 players), use slots 0, 1, 2, 3 (normal order)
      if (playerIds.length === 2) {
        // 1v1 match: place players in slots 1 and 2
        mutable.matchPlayers.push({
          id: createId(),
          matchId,
          playerId: playerIds[0],
          slot: 1
        })
        mutable.matchPlayers.push({
          id: createId(),
          matchId,
          playerId: playerIds[1],
          slot: 2
        })
      } else {
        // 2v2 match: use slots 0, 1, 2, 3
        playerIds.forEach((playerId: string, slot: number) => {
          mutable.matchPlayers.push({
            id: createId(),
            matchId,
            playerId,
            slot
          })
        })
      }
    })
  })

  return {
    filledCourts: assignments.length,
    benched: leftoverPlayerIds.length
  }
}

const movePlayer = async (payload: MatchMovePayload, round?: number): Promise<void> => {
  const parsed = z
    .object({
      playerId: z.string().min(1),
      toCourtIdx: z.number().int().min(1).max(8).optional(),
      toSlot: z.number().int().min(0).max(3).optional(),
      round: z.number().int().min(1).max(3).optional()
    })
    .superRefine((value, ctx) => {
      if (value.toCourtIdx !== undefined && value.toSlot === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'toSlot kræves når toCourtIdx er sat' })
      }
    })
    .parse({ ...payload, round: payload.round ?? round })

  const effectiveRound = parsed.round ?? round ?? 1
  const session = await ensureActiveSession()
  updateState((state: DatabaseState) => {
    const checkedIn = state.checkIns.some(
      (checkIn: CheckIn) => checkIn.sessionId === session.id && checkIn.playerId === parsed.playerId
    )
    if (!checkedIn) {
      throw new Error('Spilleren er ikke tjekket ind')
    }

    // Only check matches in the current round
    const matchesInRound = state.matches.filter(
      (match: Match) => match.sessionId === session.id && (match.round ?? 1) === effectiveRound
    )

    // Find current match player only in the current round
    const currentMatchPlayer = state.matchPlayers.find((mp) => {
      if (mp.playerId !== parsed.playerId) return false
      const match = matchesInRound.find((m: Match) => m.id === mp.matchId)
      return match !== undefined
    })
    const currentMatch = currentMatchPlayer
      ? matchesInRound.find((match: Match) => match.id === currentMatchPlayer.matchId)
      : undefined

    if (parsed.toCourtIdx === undefined) {
      if (currentMatchPlayer) {
        state.matchPlayers = state.matchPlayers.filter((mp) => mp.id !== currentMatchPlayer.id)
        const remaining = state.matchPlayers.filter((mp) => mp.matchId === currentMatchPlayer.matchId)
        if (remaining.length === 0) {
          state.matches = state.matches.filter((match) => match.id !== currentMatchPlayer.matchId)
        }
      }
      return
    }

    const court = state.courts.find((court) => court.idx === parsed.toCourtIdx)
    if (!court) {
      throw new Error('Banen findes ikke')
    }

    // Only find matches in the current round for this court
    let targetMatch = matchesInRound.find((match: Match) => match.courtId === court.id)
    if (!targetMatch) {
      targetMatch = {
        id: createId(),
        sessionId: session.id,
        courtId: court.id,
        startedAt: new Date().toISOString(),
        endedAt: null,
        round: effectiveRound
      }
      state.matches.push(targetMatch)
    }

    const existingSlots = state.matchPlayers.filter((mp) => mp.matchId === targetMatch!.id)
    const slotTaken = existingSlots.find((mp) => mp.slot === parsed.toSlot)
    if (slotTaken && slotTaken.playerId !== parsed.playerId) {
      throw new Error('Pladsen er optaget')
    }

    const effectiveCount = existingSlots.length - (currentMatch?.id === targetMatch.id ? 1 : 0)
    if (!slotTaken && effectiveCount >= 4) {
      throw new Error('Banen er fuld')
    }

    if (currentMatch && currentMatch.id !== targetMatch.id && currentMatchPlayer) {
      state.matchPlayers = state.matchPlayers.filter((mp) => mp.id !== currentMatchPlayer.id)
      const remaining = state.matchPlayers.filter((mp) => mp.matchId === currentMatch.id)
      if (remaining.length === 0) {
        state.matches = state.matches.filter((match) => match.id !== currentMatch.id)
      }
    }

    if (slotTaken && slotTaken.playerId === parsed.playerId) {
      return
    }

    if (currentMatch && currentMatch.id === targetMatch.id && currentMatchPlayer) {
      currentMatchPlayer.slot = parsed.toSlot!
      return
    }

    state.matchPlayers.push({
      id: createId(),
      matchId: targetMatch.id,
      playerId: parsed.playerId,
      slot: parsed.toSlot!
    })
  })
}

const matchesApi = {
  autoArrange: (round?: number) => autoArrangeMatches(round),
  list: (round?: number) => listMatches(round),
  reset: resetMatches,
  move: movePlayer
}

const api = {
  players: playersApi,
  session: sessionApi,
  checkIns: checkInsApi,
  matches: matchesApi
}

export default api
