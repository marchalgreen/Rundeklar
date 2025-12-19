import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CheckIn, Match, Player, TrainingSession } from '@rundeklar/common'

vi.mock('../../src/api/postgres', async () => {
  const actual = await vi.importActual<typeof import('../../src/api/postgres')>('../../src/api/postgres')

  return {
    ...actual,
    getSessions: vi.fn(),
    updateSession: vi.fn(),
    getMatches: vi.fn(),
    updateMatch: vi.fn(),
    getPlayers: vi.fn(),
    getCheckIns: vi.fn(),
    createCheckIn: vi.fn(),
    invalidateCache: vi.fn()
  }
})

vi.mock('../../src/api/stats', async () => {
  const actual = await vi.importActual<typeof import('../../src/api/stats')>('../../src/api/stats')

  return {
    ...actual,
    default: {
      ...actual.default,
      snapshotSession: vi.fn(),
      getPlayerStatistics: vi.fn(),
      getPlayerComparison: vi.fn()
    }
  }
})

import api from '../../src/api'
import { ERROR_CODES } from '../../src/constants'
import { ValidationError } from '../../src/lib/errors'
import {
  createCheckIn as createCheckInInDb,
  getCheckIns,
  getMatches,
  getPlayers,
  getSessions,
  invalidateCache,
  updateMatch as updateMatchInDb,
  updateSession as updateSessionInDb
} from '../../src/api/postgres'
import statsApi from '../../src/api/stats'

const mockedGetSessions = vi.mocked(getSessions)
const mockedUpdateSession = vi.mocked(updateSessionInDb)
const mockedGetMatches = vi.mocked(getMatches)
const mockedUpdateMatch = vi.mocked(updateMatchInDb)
const mockedInvalidateCache = vi.mocked(invalidateCache)
const mockedGetPlayers = vi.mocked(getPlayers)
const mockedGetCheckIns = vi.mocked(getCheckIns)
const mockedCreateCheckIn = vi.mocked(createCheckInInDb)
const mockedSnapshotSession = vi.mocked(statsApi.snapshotSession)

describe('api.session', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('auto-ends expired active session and returns null from getActive', async () => {
    const now = new Date('2025-01-01T12:00:00.000Z')
    vi.setSystemTime(now)

    const activeSession: TrainingSession = {
      id: 's1',
      date: now.toISOString(),
      status: 'active',
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
    }

    mockedGetSessions.mockResolvedValue([activeSession])

    const matches: Match[] = [
      {
        id: 'm1',
        sessionId: activeSession.id,
        courtId: 'c1',
        startedAt: now.toISOString(),
        endedAt: null,
        round: 1
      }
    ]
    mockedGetMatches.mockResolvedValue(matches)
    mockedUpdateSession.mockResolvedValue(activeSession)
    mockedUpdateMatch.mockResolvedValue(matches[0])
    mockedInvalidateCache.mockReturnValue(undefined)
    mockedSnapshotSession.mockResolvedValue(undefined)

    const promise = api.session.getActive()

    // The implementation waits 200ms before snapshotting.
    await vi.runAllTimersAsync()

    const result = await promise
    expect(result).toBeNull()

    expect(updateSessionInDb).toHaveBeenCalledWith(activeSession.id, { status: 'ended' })
    expect(updateMatchInDb).toHaveBeenCalledTimes(1)
    expect(invalidateCache).toHaveBeenCalledWith('matches')
    expect(invalidateCache).toHaveBeenCalledWith('sessions')
    expect(statsApi.snapshotSession).toHaveBeenCalledWith(activeSession.id)
  })

  it('endActive does not throw if snapshot creation fails', async () => {
    const now = new Date('2025-01-01T12:00:00.000Z')
    vi.setSystemTime(now)

    const activeSession: TrainingSession = {
      id: 's1',
      date: now.toISOString(),
      status: 'active',
      createdAt: now.toISOString()
    }

    mockedGetSessions.mockResolvedValue([activeSession])
    mockedGetMatches.mockResolvedValue([])
    mockedUpdateSession.mockResolvedValue(activeSession)
    mockedUpdateMatch.mockResolvedValue({} as any)
    mockedInvalidateCache.mockReturnValue(undefined)
    mockedSnapshotSession.mockRejectedValue(new Error('snapshot failed'))

    const promise = api.session.endActive()

    await vi.runAllTimersAsync()

    await expect(promise).resolves.toBeUndefined()
    expect(updateSessionInDb).toHaveBeenCalledWith(activeSession.id, { status: 'ended' })
  })
})

describe('api.checkIns', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('rejects notes over 500 chars with ValidationError', async () => {
    const now = new Date().toISOString()
    const activeSession: TrainingSession = {
      id: 's1',
      date: now,
      status: 'active',
      createdAt: now
    }

    const player: Player = {
      id: 'p1',
      name: 'Test Player',
      active: true,
      createdAt: now
    }

    mockedGetSessions.mockResolvedValue([activeSession])
    mockedGetPlayers.mockResolvedValue([player])
    mockedGetCheckIns.mockResolvedValue([])

    const tooLong = 'a'.repeat(501)

    await expect(api.checkIns.add({ playerId: player.id, notes: tooLong })).rejects.toBeInstanceOf(
      ValidationError
    )

    await expect(api.checkIns.add({ playerId: player.id, notes: tooLong })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION_ERROR
    })

    expect(createCheckInInDb).not.toHaveBeenCalled()
  })

  it('creates a check-in with notes when valid', async () => {
    const now = new Date().toISOString()
    const activeSession: TrainingSession = {
      id: 's1',
      date: now,
      status: 'active',
      createdAt: now
    }

    const player: Player = {
      id: 'p1',
      name: 'Test Player',
      active: true,
      createdAt: now
    }

    const created: CheckIn = {
      id: 'ci1',
      sessionId: activeSession.id,
      playerId: player.id,
      createdAt: now,
      maxRounds: null,
      notes: 'Jeg vil helst spille double'
    }

    mockedGetSessions.mockResolvedValue([activeSession])
    mockedGetPlayers.mockResolvedValue([player])
    mockedGetCheckIns.mockResolvedValue([])
    mockedCreateCheckIn.mockResolvedValue(created)

    const result = await api.checkIns.add({
      playerId: player.id,
      maxRounds: 1,
      notes: created.notes
    })

    expect(result).toEqual(created)
    expect(createCheckInInDb).toHaveBeenCalledWith({
      sessionId: activeSession.id,
      playerId: player.id,
      maxRounds: 1,
      notes: created.notes
    })
  })
})
