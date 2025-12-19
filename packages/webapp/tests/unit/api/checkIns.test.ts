/**
 * Unit tests for check-in API endpoints with notes functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CheckIn, Player, TrainingSession } from '@rundeklar/common'

vi.mock('../../../src/api/postgres', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/postgres')>('../../../src/api/postgres')

  return {
    ...actual,
    getCheckIns: vi.fn(),
    createCheckIn: vi.fn(),
    updateCheckIn: vi.fn(),
    deleteCheckIn: vi.fn(),
    getPlayers: vi.fn(),
    getSessions: vi.fn()
  }
})

vi.mock('../../../src/api/stats', async () => {
  const actual = await vi.importActual<typeof import('../../../src/api/stats')>('../../../src/api/stats')
  return { ...actual, snapshotSession: vi.fn() }
})

import api from '../../../src/api'
import { ValidationError } from '../../../src/lib/errors'
import { createCheckIn, getCheckIns, getPlayers, getSessions, updateCheckIn } from '../../../src/api/postgres'

describe('Check-in API with notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('addCheckIn with notes', () => {
    it('should create check-in with notes', async () => {
      const mockPlayer: Player = {
        id: 'player-1',
        name: 'Test Player',
        active: true,
        createdAt: new Date().toISOString()
      }
      
      const mockSession: TrainingSession = {
        id: 'session-1',
        date: new Date().toISOString(),
        status: 'active',
        createdAt: new Date().toISOString()
      }
      
      const mockCheckIn: CheckIn = {
        id: 'checkin-1',
        sessionId: 'session-1',
        playerId: 'player-1',
        createdAt: new Date().toISOString(),
        maxRounds: null,
        notes: 'Gerne træne med Player 2'
      }
      
      vi.mocked(getSessions).mockResolvedValue([mockSession])
      vi.mocked(getPlayers).mockResolvedValue([mockPlayer])
      vi.mocked(getCheckIns).mockResolvedValue([])
      vi.mocked(createCheckIn).mockResolvedValue(mockCheckIn)
      
      const result = await api.checkIns.add({
        playerId: 'player-1',
        notes: 'Gerne træne med Player 2'
      })
      
      expect(result).toEqual(mockCheckIn)
      expect(createCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 'player-1',
          notes: 'Gerne træne med Player 2'
        })
      )
    })

    it('should validate notes max length', async () => {
      const longNotes = 'a'.repeat(501) // 501 characters
      
      await expect(
        api.checkIns.add({
          playerId: 'player-1',
          notes: longNotes
        })
      ).rejects.toThrow(ValidationError)
    })

    it('should allow null notes', async () => {
      const mockPlayer: Player = {
        id: 'player-1',
        name: 'Test Player',
        active: true,
        createdAt: new Date().toISOString()
      }
      
      const mockSession: TrainingSession = {
        id: 'session-1',
        date: new Date().toISOString(),
        status: 'active',
        createdAt: new Date().toISOString()
      }
      
      const mockCheckIn: CheckIn = {
        id: 'checkin-1',
        sessionId: 'session-1',
        playerId: 'player-1',
        createdAt: new Date().toISOString(),
        maxRounds: null,
        notes: null
      }
      
      vi.mocked(getSessions).mockResolvedValue([mockSession])
      vi.mocked(getPlayers).mockResolvedValue([mockPlayer])
      vi.mocked(getCheckIns).mockResolvedValue([])
      vi.mocked(createCheckIn).mockResolvedValue(mockCheckIn)
      
      const result = await api.checkIns.add({
        playerId: 'player-1',
        notes: null
      })
      
      expect(result.notes).toBeNull()
    })
  })

  describe('updateCheckIn with notes', () => {
    it('should update check-in notes', async () => {
      const mockSession: TrainingSession = {
        id: 'session-1',
        date: new Date().toISOString(),
        status: 'active',
        createdAt: new Date().toISOString()
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
      
      vi.mocked(getSessions).mockResolvedValue([mockSession])
      vi.mocked(getCheckIns).mockResolvedValue([existingCheckIn])
      vi.mocked(getPlayers).mockResolvedValue([{ id: 'player-1', name: 'Test Player', active: true, createdAt: new Date().toISOString() }] as any)
      vi.mocked(updateCheckIn).mockResolvedValue(updatedCheckIn)
      
      const result = await api.checkIns.update({
        playerId: 'player-1',
        notes: 'Opdateret note'
      })
      
      expect(result.notes).toBe('Opdateret note')
      expect(updateCheckIn).toHaveBeenCalledWith(
        'checkin-1',
        expect.objectContaining({
          notes: 'Opdateret note'
        })
      )
    })

    it('should validate notes when updating', async () => {
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
      const mockSession: TrainingSession = {
        id: 'session-1',
        date: new Date().toISOString(),
        status: 'active',
        createdAt: new Date().toISOString()
      }
      
      const mockCheckIn: CheckIn = {
        id: 'checkin-1',
        sessionId: 'session-1',
        playerId: 'player-1',
        createdAt: new Date().toISOString(),
        maxRounds: null,
        notes: 'Gerne træne med Player 2'
      }
      
      const mockPlayer: Player = {
        id: 'player-1',
        name: 'Test Player',
        active: true,
        createdAt: new Date().toISOString()
      }
      
      vi.mocked(getSessions).mockResolvedValue([mockSession])
      vi.mocked(getCheckIns).mockResolvedValue([mockCheckIn])
      vi.mocked(getPlayers).mockResolvedValue([mockPlayer])
      
      const result = await api.checkIns.listActive()
      
      expect(result).toHaveLength(1)
      expect(result[0].notes).toBe('Gerne træne med Player 2')
    })
  })
})

