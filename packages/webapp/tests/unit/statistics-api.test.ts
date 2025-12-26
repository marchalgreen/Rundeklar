/**
 * Unit tests for statistics API functions.
 * 
 * Tests statistics data fetching and transformation functions with mocked database.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getTrainingGroupAttendance,
  getGroupAttendanceOverTime
} from '../../src/api/statistics/attendance'
import { getStatisticsSnapshots, getStateCopy } from '../../src/api/postgres'

// Define types locally to avoid module resolution issues in tests
interface Player {
  id: string
  name: string
  trainingGroups?: string[]
}

// Mock postgres module
vi.mock('../../src/api/postgres', () => ({
  getStatisticsSnapshots: vi.fn(),
  getStateCopy: vi.fn()
}))

describe('getTrainingGroupAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty array when no statistics available', async () => {
    vi.mocked(getStatisticsSnapshots).mockResolvedValue([])
    vi.mocked(getStateCopy).mockResolvedValue({
      players: [],
      sessions: [],
      checkIns: [],
      courts: [],
      matches: [],
      matchPlayers: []
    })

    const result = await getTrainingGroupAttendance()
    expect(result).toHaveLength(0)
    expect(Array.isArray(result)).toBe(true)
  })

  it('should handle check-ins with camelCase playerId', async () => {
    const mockStatistics = [
      {
        sessionId: 'session-1',
        sessionDate: '2024-01-15',
        checkIns: [
          {
            playerId: 'player-1',
            sessionId: 'session-1'
          }
        ]
      }
    ]

    const mockPlayers: Player[] = [
      {
        id: 'player-1',
        name: 'Test Player',
        trainingGroups: ['U15']
      } as Player
    ]

    vi.mocked(getStatisticsSnapshots).mockResolvedValue(mockStatistics as any)
    vi.mocked(getStateCopy).mockResolvedValue({
      players: mockPlayers,
      sessions: [],
      checkIns: [],
      courts: [],
      matches: [],
      matchPlayers: []
    })

    const result = await getTrainingGroupAttendance()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].groupName).toBe('U15')
  })

  it('should handle check-ins with snake_case player_id', async () => {
    const mockStatistics = [
      {
        sessionId: 'session-1',
        sessionDate: '2024-01-15',
        checkIns: [
          {
            player_id: 'player-1', // snake_case format
            sessionId: 'session-1'
          }
        ]
      }
    ]

    const mockPlayers: Player[] = [
      {
        id: 'player-1',
        name: 'Test Player',
        trainingGroups: ['U15']
      } as Player
    ]

    vi.mocked(getStatisticsSnapshots).mockResolvedValue(mockStatistics as any)
    vi.mocked(getStateCopy).mockResolvedValue({
      players: mockPlayers,
      sessions: [],
      checkIns: [],
      courts: [],
      matches: [],
      matchPlayers: []
    })

    const result = await getTrainingGroupAttendance()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].groupName).toBe('U15')
    expect(result[0].uniquePlayers).toBe(1)
  })

  it('should filter by date range', async () => {
    const mockStatistics = [
      {
        sessionId: 'session-1',
        sessionDate: '2024-01-15',
        checkIns: [
          {
            playerId: 'player-1',
            sessionId: 'session-1'
          }
        ]
      },
      {
        sessionId: 'session-2',
        sessionDate: '2024-02-15',
        checkIns: [
          {
            playerId: 'player-1',
            sessionId: 'session-2'
          }
        ]
      }
    ]

    const mockPlayers: Player[] = [
      {
        id: 'player-1',
        name: 'Test Player',
        trainingGroups: ['U15']
      } as Player
    ]

    vi.mocked(getStatisticsSnapshots).mockResolvedValue(mockStatistics as any)
    vi.mocked(getStateCopy).mockResolvedValue({
      players: mockPlayers,
      sessions: [],
      checkIns: [],
      courts: [],
      matches: [],
      matchPlayers: []
    })

    const result = await getTrainingGroupAttendance('2024-01-01', '2024-01-31')
    
    // Should only include sessions from January
    expect(result.length).toBeGreaterThan(0)
  })

  it('should filter by group names', async () => {
    const mockStatistics = [
      {
        sessionId: 'session-1',
        sessionDate: '2024-01-15',
        checkIns: [
          {
            playerId: 'player-1',
            sessionId: 'session-1'
          },
          {
            playerId: 'player-2',
            sessionId: 'session-1'
          }
        ]
      }
    ]

    const mockPlayers: Player[] = [
      {
        id: 'player-1',
        name: 'Player 1',
        trainingGroups: ['U15']
      } as Player,
      {
        id: 'player-2',
        name: 'Player 2',
        trainingGroups: ['U17']
      } as Player
    ]

    vi.mocked(getStatisticsSnapshots).mockResolvedValue(mockStatistics as any)
    vi.mocked(getStateCopy).mockResolvedValue({
      players: mockPlayers,
      sessions: [],
      checkIns: [],
      courts: [],
      matches: [],
      matchPlayers: []
    })

    const result = await getTrainingGroupAttendance(undefined, undefined, ['U15'])
    
    // Should only include U15 group
    const u15Groups = result.filter(r => r.groupName === 'U15')
    const u17Groups = result.filter(r => r.groupName === 'U17')
    
    expect(u15Groups.length).toBeGreaterThan(0)
    expect(u17Groups.length).toBe(0)
  })

  it('should handle check-ins without playerId', async () => {
    const mockStatistics = [
      {
        sessionId: 'session-1',
        sessionDate: '2024-01-15',
        checkIns: [
          {
            // Missing playerId
            sessionId: 'session-1'
          },
          {
            playerId: 'player-1',
            sessionId: 'session-1'
          }
        ]
      }
    ]

    const mockPlayers: Player[] = [
      {
        id: 'player-1',
        name: 'Test Player',
        trainingGroups: ['U15']
      } as Player
    ]

    vi.mocked(getStatisticsSnapshots).mockResolvedValue(mockStatistics as any)
    vi.mocked(getStateCopy).mockResolvedValue({
      players: mockPlayers,
      sessions: [],
      checkIns: [],
      courts: [],
      matches: [],
      matchPlayers: []
    })

    const result = await getTrainingGroupAttendance()
    
    // Should only count check-ins with valid playerId
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].checkInCount).toBe(1) // Only one valid check-in
  })

  it('should handle players without training groups', async () => {
    const mockStatistics = [
      {
        sessionId: 'session-1',
        sessionDate: '2024-01-15',
        checkIns: [
          {
            playerId: 'player-1',
            sessionId: 'session-1'
          }
        ]
      }
    ]

    const mockPlayers: Player[] = [
      {
        id: 'player-1',
        name: 'Test Player',
        trainingGroups: [] // No groups
      } as Player
    ]

    vi.mocked(getStatisticsSnapshots).mockResolvedValue(mockStatistics as any)
    vi.mocked(getStateCopy).mockResolvedValue({
      players: mockPlayers,
      sessions: [],
      checkIns: [],
      courts: [],
      matches: [],
      matchPlayers: []
    })

    const result = await getTrainingGroupAttendance()
    
    // Should return empty array when no groups
    expect(result).toHaveLength(0)
    expect(Array.isArray(result)).toBe(true)
  })

  it('should calculate average attendance correctly', async () => {
    const mockStatistics = [
      {
        sessionId: 'session-1',
        sessionDate: '2024-01-15',
        checkIns: [
          { playerId: 'player-1', sessionId: 'session-1' },
          { playerId: 'player-2', sessionId: 'session-1' },
          { playerId: 'player-3', sessionId: 'session-1' }
        ]
      },
      {
        sessionId: 'session-2',
        sessionDate: '2024-01-16',
        checkIns: [
          { playerId: 'player-1', sessionId: 'session-2' },
          { playerId: 'player-2', sessionId: 'session-2' }
        ]
      }
    ]

    const mockPlayers: Player[] = [
      {
        id: 'player-1',
        name: 'Player 1',
        trainingGroups: ['U15']
      } as Player,
      {
        id: 'player-2',
        name: 'Player 2',
        trainingGroups: ['U15']
      } as Player,
      {
        id: 'player-3',
        name: 'Player 3',
        trainingGroups: ['U15']
      } as Player
    ]

    vi.mocked(getStatisticsSnapshots).mockResolvedValue(mockStatistics as any)
    vi.mocked(getStateCopy).mockResolvedValue({
      players: mockPlayers,
      sessions: [],
      checkIns: [],
      courts: [],
      matches: [],
      matchPlayers: []
    })

    const result = await getTrainingGroupAttendance()
    
    expect(result.length).toBeGreaterThan(0)
    const u15Group = result.find(r => r.groupName === 'U15')
    expect(u15Group).toBeDefined()
    
    if (u15Group) {
      // 5 check-ins across 2 sessions = 2.5 average
      expect(u15Group.averageAttendance).toBe(2.5)
      expect(u15Group.checkInCount).toBe(5)
      expect(u15Group.sessions).toBe(2)
    }
  })
})

describe('getGroupAttendanceOverTime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should group attendance by month', async () => {
    const mockStatistics = [
      {
        sessionId: 'session-1',
        sessionDate: '2024-01-15',
        checkIns: [
          { playerId: 'player-1', sessionId: 'session-1' }
        ]
      },
      {
        sessionId: 'session-2',
        sessionDate: '2024-02-15',
        checkIns: [
          { playerId: 'player-1', sessionId: 'session-2' }
        ]
      }
    ]

    const mockPlayers: Player[] = [
      {
        id: 'player-1',
        name: 'Test Player',
        trainingGroups: ['U15']
      } as Player
    ]

    vi.mocked(getStatisticsSnapshots).mockResolvedValue(mockStatistics as any)
    vi.mocked(getStateCopy).mockResolvedValue({
      players: mockPlayers,
      sessions: [],
      checkIns: [],
      courts: [],
      matches: [],
      matchPlayers: []
    })

    const result = await getGroupAttendanceOverTime('2024-01-01', '2024-02-28')
    
    expect(result.length).toBeGreaterThan(0)
    
    // Should have entries for both months
    const january = result.find(r => r.month === '2024-01')
    const february = result.find(r => r.month === '2024-02')
    
    expect(january).toBeDefined()
    expect(february).toBeDefined()
  })

  it('should deduplicate group-month combinations', async () => {
    const mockStatistics = [
      {
        sessionId: 'session-1',
        sessionDate: '2024-01-15',
        checkIns: [
          { playerId: 'player-1', sessionId: 'session-1' }
        ]
      }
    ]

    const mockPlayers: Player[] = [
      {
        id: 'player-1',
        name: 'Test Player',
        trainingGroups: ['U15']
      } as Player
    ]

    vi.mocked(getStatisticsSnapshots).mockResolvedValue(mockStatistics as any)
    vi.mocked(getStateCopy).mockResolvedValue({
      players: mockPlayers,
      sessions: [],
      checkIns: [],
      courts: [],
      matches: [],
      matchPlayers: []
    })

    const result = await getGroupAttendanceOverTime('2024-01-01', '2024-01-31')
    
    // Should not have duplicates
    const u15Jan = result.filter(r => r.groupName === 'U15' && r.month === '2024-01')
    expect(u15Jan.length).toBe(1)
  })
})

