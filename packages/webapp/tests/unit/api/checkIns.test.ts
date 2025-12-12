/**
 * Unit tests for check-in API endpoints with notes functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CheckIn } from '@rundeklar/common'

// Mock the API module
vi.mock('../../src/api/postgres', () => ({
  getPostgres: vi.fn(),
  getCheckIns: vi.fn(),
  createCheckIn: vi.fn(),
  updateCheckIn: vi.fn(),
  deleteCheckIn: vi.fn(),
  getPlayers: vi.fn(),
  getSessions: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  getTenantId: vi.fn(() => 'test-tenant'),
  getIsolationIdForCurrentTenant: vi.fn(() => Promise.resolve(null))
}))

vi.mock('../../src/lib/errors', () => ({
  normalizeError: vi.fn((err) => ({
    message: err instanceof Error ? err.message : String(err),
    code: 'UNKNOWN_ERROR'
  })),
  ValidationError: class extends Error {
    code = 'VALIDATION_ERROR'
  },
  createPlayerNotFoundError: vi.fn((id) => new Error(`Player not found: ${id}`)),
  createPlayerInactiveError: vi.fn((name) => new Error(`Player inactive: ${name}`)),
  createCheckInExistsError: vi.fn((name) => new Error(`Already checked in: ${name}`)),
  createCheckInNotFoundError: vi.fn((name) => new Error(`Check-in not found: ${name}`)),
  createSessionNotFoundError: vi.fn(() => new Error('Session not found'))
}))

describe('Check-in API with notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addCheckIn with notes', () => {
    it('should create check-in with notes', async () => {
      const { default: api } = await import('../../src/api')
      const { createCheckIn: createCheckInInDb, getCheckIns, getPlayers, getSessions } = await import('../../src/api/postgres')
      
      const mockPlayer = {
        id: 'player-1',
        name: 'Test Player',
        active: true
      }
      
      const mockSession = {
        id: 'session-1',
        date: new Date().toISOString(),
        status: 'active' as const
      }
      
      const mockCheckIn: CheckIn = {
        id: 'checkin-1',
        sessionId: 'session-1',
        playerId: 'player-1',
        createdAt: new Date().toISOString(),
        maxRounds: null,
        notes: 'Gerne træne med Player 2'
      }
      
      vi.mocked(getSessions).mockResolvedValue([mockSession] as any)
      vi.mocked(getPlayers).mockResolvedValue([mockPlayer] as any)
      vi.mocked(getCheckIns).mockResolvedValue([])
      vi.mocked(createCheckInInDb).mockResolvedValue(mockCheckIn)
      
      const result = await api.checkIns.add({
        playerId: 'player-1',
        notes: 'Gerne træne med Player 2'
      })
      
      expect(result).toEqual(mockCheckIn)
      expect(createCheckInInDb).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 'player-1',
          notes: 'Gerne træne med Player 2'
        })
      )
    })

    it('should validate notes max length', async () => {
      const { default: api } = await import('../../src/api')
      const { ValidationError } = await import('../../src/lib/errors')
      
      const longNotes = 'a'.repeat(501) // 501 characters
      
      await expect(
        api.checkIns.add({
          playerId: 'player-1',
          notes: longNotes
        })
      ).rejects.toThrow(ValidationError)
    })

    it('should allow null notes', async () => {
      const { default: api } = await import('../../src/api')
      const { createCheckIn: createCheckInInDb, getCheckIns, getPlayers, getSessions } = await import('../../src/api/postgres')
      
      const mockPlayer = {
        id: 'player-1',
        name: 'Test Player',
        active: true
      }
      
      const mockSession = {
        id: 'session-1',
        date: new Date().toISOString(),
        status: 'active' as const
      }
      
      const mockCheckIn: CheckIn = {
        id: 'checkin-1',
        sessionId: 'session-1',
        playerId: 'player-1',
        createdAt: new Date().toISOString(),
        maxRounds: null,
        notes: null
      }
      
      vi.mocked(getSessions).mockResolvedValue([mockSession] as any)
      vi.mocked(getPlayers).mockResolvedValue([mockPlayer] as any)
      vi.mocked(getCheckIns).mockResolvedValue([])
      vi.mocked(createCheckInInDb).mockResolvedValue(mockCheckIn)
      
      const result = await api.checkIns.add({
        playerId: 'player-1',
        notes: null
      })
      
      expect(result.notes).toBeNull()
    })
  })

  describe('updateCheckIn with notes', () => {
    it('should update check-in notes', async () => {
      const { default: api } = await import('../../src/api')
      const { updateCheckIn: updateCheckInInDb, getCheckIns, getPlayers, getSessions } = await import('../../src/api/postgres')
      
      const mockSession = {
        id: 'session-1',
        date: new Date().toISOString(),
        status: 'active' as const
      }
      
      const existingCheckIn: CheckIn = {
        id: 'checkin-1',
        sessionId: 'session-1',
        playerId: 'player-1',
        createdAt: new Date().toISOString(),
        maxRounds: null,
        notes: null
      }
      
      const updatedCheckIn: CheckIn = {
        ...existingCheckIn,
        notes: 'Opdateret note'
      }
      
      vi.mocked(getSessions).mockResolvedValue([mockSession] as any)
      vi.mocked(getCheckIns).mockResolvedValue([existingCheckIn])
      vi.mocked(getPlayers).mockResolvedValue([{ id: 'player-1', name: 'Test Player' }] as any)
      vi.mocked(updateCheckInInDb).mockResolvedValue(updatedCheckIn)
      
      const result = await api.checkIns.update({
        playerId: 'player-1',
        notes: 'Opdateret note'
      })
      
      expect(result.notes).toBe('Opdateret note')
      expect(updateCheckInInDb).toHaveBeenCalledWith(
        'checkin-1',
        expect.objectContaining({
          notes: 'Opdateret note'
        })
      )
    })

    it('should validate notes when updating', async () => {
      const { default: api } = await import('../../src/api')
      const { ValidationError } = await import('../../src/lib/errors')
      
      const longNotes = 'a'.repeat(501)
      
      await expect(
        api.checkIns.update({
          playerId: 'player-1',
          notes: longNotes
        })
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('listActiveCheckIns with notes', () => {
    it('should return checked-in players with notes', async () => {
      const { default: api } = await import('../../src/api')
      const { getCheckIns, getPlayers, getSessions } = await import('../../src/api/postgres')
      
      const mockSession = {
        id: 'session-1',
        date: new Date().toISOString(),
        status: 'active' as const
      }
      
      const mockCheckIn: CheckIn = {
        id: 'checkin-1',
        sessionId: 'session-1',
        playerId: 'player-1',
        createdAt: new Date().toISOString(),
        maxRounds: null,
        notes: 'Gerne træne med Player 2'
      }
      
      const mockPlayer = {
        id: 'player-1',
        name: 'Test Player',
        active: true
      }
      
      vi.mocked(getSessions).mockResolvedValue([mockSession] as any)
      vi.mocked(getCheckIns).mockResolvedValue([mockCheckIn])
      vi.mocked(getPlayers).mockResolvedValue([mockPlayer] as any)
      
      const result = await api.checkIns.listActive()
      
      expect(result).toHaveLength(1)
      expect(result[0].notes).toBe('Gerne træne med Player 2')
    })
  })
})

