import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '../src/api'

// Mock tenant config (maxCourts)
vi.mock('../src/lib/supabase', () => ({
  getCurrentTenantConfig: () => ({ maxCourts: 8 })
}))

// Mock supabase API used by src/api/index.ts
vi.mock('../src/api/supabase', () => {
  // Define helper inside the mock factory to avoid hoisting issues
  const makeState = (numPlayers: number, numCourts: number) => {
    const players = Array.from({ length: numPlayers }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      alias: null,
      level: null,
      levelSingle: null,
      levelDouble: null,
      levelMix: null,
      gender: i % 2 === 0 ? 'Herre' : 'Dame',
      primaryCategory: 'Begge',
      active: true,
      createdAt: new Date().toISOString()
    }))
    const courts = Array.from({ length: numCourts }, (_, i) => ({
      id: `c${i + 1}`,
      idx: i + 1,
      name: `Bane ${i + 1}`
    }))
    const checkIns = players.map((p, idx) => ({
      id: `ci${idx + 1}`,
      sessionId: 's1',
      playerId: p.id,
      createdAt: new Date(Date.now() - (numPlayers - idx) * 1000).toISOString(),
      maxRounds: null
    }))
    return { players, courts, checkIns, matches: [], matchPlayers: [] }
  }
  let state = makeState(12, 4)
  return {
    getStateCopy: vi.fn().mockImplementation(async () => state),
    // Sessions
    getSessions: vi.fn().mockResolvedValue([
      { id: 's1', date: new Date().toISOString(), status: 'active', createdAt: new Date().toISOString() }
    ]),
    // No-ops for match mutations in this unit test
    getPlayers: vi.fn().mockResolvedValue(makeState(12, 4).players),
    getCourts: vi.fn().mockResolvedValue(makeState(12, 4).courts),
    getMatches: vi.fn().mockResolvedValue([]),
    getMatchPlayers: vi.fn().mockResolvedValue([]),
    createMatch: vi.fn(),
    updateMatch: vi.fn(),
    deleteMatch: vi.fn(),
    createMatchPlayer: vi.fn(),
    updateMatchPlayer: vi.fn(),
    deleteMatchPlayer: vi.fn(),
    // Backup utilities referenced by api client
    createBackup: vi.fn(),
    restoreFromBackup: vi.fn(),
    hasBackup: vi.fn().mockResolvedValue(false),
    createPlayer: vi.fn(),
    updatePlayer: vi.fn()
  }
})

describe('autoArrange - avoids multiple 1-player courts while bench has players', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not produce multiple single-player courts while benched > 0', async () => {
    const { matches, result } = await api.matches.autoArrange(1)
    const onePlayerCourts = matches.filter(c => c.slots.length === 1)
    // If we still have benched players, we must not end up with multiple single-player courts
    if (result.benched > 0) {
      expect(onePlayerCourts.length).toBeLessThanOrEqual(1)
    }
  })
})


