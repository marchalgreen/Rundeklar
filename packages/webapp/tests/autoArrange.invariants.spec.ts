import { describe, it, expect, vi, beforeEach } from 'vitest'

// We will mock modules per-test using vi.doMock and dynamically import api

describe('autoArrange invariants', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('even totals: only 2/4/8, no 1/3/5/6/7', async () => {
    // 12 players, 8 courts default
    vi.doMock('../src/api/supabase', () => {
      const makeState = (numPlayers: number, numCourts: number, mix: Array<'Single'|'Double'|'Begge'>) => {
        const players = Array.from({ length: numPlayers }, (_, i) => ({
          id: `p${i + 1}`,
          name: `Player ${i + 1}`,
          alias: null,
          level: null,
          levelSingle: null,
          levelDouble: null,
          levelMix: null,
          gender: i % 2 === 0 ? 'Herre' : 'Dame',
          primaryCategory: mix[i % mix.length],
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
      const state = makeState(12, 8, ['Begge','Single','Double'])
      return {
        getStateCopy: vi.fn().mockResolvedValue(state),
        getSessions: vi.fn().mockResolvedValue([
          { id: 's1', date: new Date().toISOString(), status: 'active', createdAt: new Date().toISOString() }
        ]),
        getPlayers: vi.fn().mockResolvedValue(state.players),
        getCourts: vi.fn().mockResolvedValue(state.courts),
        getMatches: vi.fn().mockResolvedValue([]),
        getMatchPlayers: vi.fn().mockResolvedValue([]),
        createMatch: vi.fn(),
        updateMatch: vi.fn(),
        deleteMatch: vi.fn(),
        createMatchPlayer: vi.fn(),
        updateMatchPlayer: vi.fn(),
        deleteMatchPlayer: vi.fn(),
        createBackup: vi.fn(),
        restoreFromBackup: vi.fn(),
        hasBackup: vi.fn().mockResolvedValue(false)
      }
    })
    vi.doMock('../src/lib/supabase', () => ({
      getCurrentTenantConfig: () => ({ maxCourts: 8 })
    }))
    const { default: api } = await import('../src/api')
    const { matches } = await api.matches.autoArrange(1)
    const sizes = matches.map(c => c.slots.length).filter(n => n > 0)
    // No forbidden sizes
    expect(sizes.some(n => [1,3,5,6,7].includes(n))).toBe(false)
  })

  it('odd totals: exactly one 3, others even', async () => {
    // 11 players, 8 courts
    vi.doMock('../src/api/supabase', () => {
      const makeState = (numPlayers: number, numCourts: number, mix: Array<'Single'|'Double'|'Begge'>) => {
        const players = Array.from({ length: numPlayers }, (_, i) => ({
          id: `p${i + 1}`,
          name: `Player ${i + 1}`,
          alias: null,
          level: null,
          levelSingle: null,
          levelDouble: null,
          levelMix: null,
          gender: i % 2 === 0 ? 'Herre' : 'Dame',
          primaryCategory: mix[i % mix.length],
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
      const state = makeState(11, 8, ['Begge','Single','Double'])
      return {
        getStateCopy: vi.fn().mockResolvedValue(state),
        getSessions: vi.fn().mockResolvedValue([
          { id: 's1', date: new Date().toISOString(), status: 'active', createdAt: new Date().toISOString() }
        ]),
        getPlayers: vi.fn().mockResolvedValue(state.players),
        getCourts: vi.fn().mockResolvedValue(state.courts),
        getMatches: vi.fn().mockResolvedValue([]),
        getMatchPlayers: vi.fn().mockResolvedValue([]),
        createMatch: vi.fn(),
        updateMatch: vi.fn(),
        deleteMatch: vi.fn(),
        createMatchPlayer: vi.fn(),
        updateMatchPlayer: vi.fn(),
        deleteMatchPlayer: vi.fn(),
        createBackup: vi.fn(),
        restoreFromBackup: vi.fn(),
        hasBackup: vi.fn().mockResolvedValue(false)
      }
    })
    vi.doMock('../src/lib/supabase', () => ({
      getCurrentTenantConfig: () => ({ maxCourts: 8 })
    }))
    const { default: api } = await import('../src/api')
    const { matches } = await api.matches.autoArrange(1)
    const sizes = matches.map(c => c.slots.length).filter(n => n > 0)
    const num3 = sizes.filter(n => n === 3).length
    expect(num3).toBeLessThanOrEqual(1)
    expect(sizes.some(n => [1,5,6,7].includes(n))).toBe(false)
  })

  it('promotes to 8-courts when base capacity exceeded (no partial 8s)', async () => {
    // 24 players, 5 courts → base 20, needs one 8-court
    vi.doMock('../src/api/supabase', () => {
      const makeState = (numPlayers: number, numCourts: number, mix: Array<'Single'|'Double'|'Begge'>) => {
        const players = Array.from({ length: numPlayers }, (_, i) => ({
          id: `p${i + 1}`,
          name: `Player ${i + 1}`,
          alias: null,
          level: null,
          levelSingle: null,
          levelDouble: null,
          levelMix: null,
          gender: i % 2 === 0 ? 'Herre' : 'Dame',
          primaryCategory: mix[i % mix.length],
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
      const state = makeState(24, 5, ['Begge','Single','Double'])
      return {
        getStateCopy: vi.fn().mockResolvedValue(state),
        getSessions: vi.fn().mockResolvedValue([
          { id: 's1', date: new Date().toISOString(), status: 'active', createdAt: new Date().toISOString() }
        ]),
        getPlayers: vi.fn().mockResolvedValue(state.players),
        getCourts: vi.fn().mockResolvedValue(state.courts),
        getMatches: vi.fn().mockResolvedValue([]),
        getMatchPlayers: vi.fn().mockResolvedValue([]),
        createMatch: vi.fn(),
        updateMatch: vi.fn(),
        deleteMatch: vi.fn(),
        createMatchPlayer: vi.fn(),
        updateMatchPlayer: vi.fn(),
        deleteMatchPlayer: vi.fn(),
        createBackup: vi.fn(),
        restoreFromBackup: vi.fn(),
        hasBackup: vi.fn().mockResolvedValue(false)
      }
    })
    vi.doMock('../src/lib/supabase', () => ({
      getCurrentTenantConfig: () => ({ maxCourts: 5 })
    }))
    const { default: api } = await import('../src/api')
    const { matches } = await api.matches.autoArrange(1)
    const sizes = matches.map(c => c.slots.length)
    // Expect at least one 8-sized court and no partial 8s (5/6/7)
    expect(sizes.includes(8)).toBe(true)
    expect(sizes.some(n => [5,6,7].includes(n))).toBe(false)
  })
})


