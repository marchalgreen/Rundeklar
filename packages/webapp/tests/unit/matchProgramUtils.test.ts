/**
 * Unit tests for match program utilities
 */

import { describe, it, expect } from 'vitest'
import {
  getCategoryLetter,
  getFirstFreeSlot,
  calculateGenderBreakdown,
  getAssignedPlayerIds,
  sortPlayersForDisplay,
  ensureAllCourtsPresent
} from '../../src/lib/matchProgramUtils'
import type { CourtWithPlayers, Player } from '@rundeklar/common'

describe('getCategoryLetter', () => {
  it('should return "S" for Single', () => {
    expect(getCategoryLetter('Single')).toBe('S')
  })

  it('should return "D" for Double', () => {
    expect(getCategoryLetter('Double')).toBe('D')
  })

  it('should return "B" for Begge', () => {
    expect(getCategoryLetter('Begge')).toBe('B')
  })

  it('should return null for null', () => {
    expect(getCategoryLetter(null)).toBe(null)
  })

  it('should return null for undefined', () => {
    expect(getCategoryLetter(undefined)).toBe(null)
  })
})

describe('getFirstFreeSlot', () => {
  it('should return 0 for empty court', () => {
    const court: CourtWithPlayers = {
      courtIdx: 1,
      slots: []
    }
    expect(getFirstFreeSlot(court)).toBe(0)
  })

  it('should return first free slot', () => {
    const court: CourtWithPlayers = {
      courtIdx: 1,
      slots: [
        { slot: 0, player: { id: '1', name: 'Player 1' } as Player }
      ]
    }
    expect(getFirstFreeSlot(court)).toBe(1)
  })

  it('should return undefined when court is full', () => {
    const court: CourtWithPlayers = {
      courtIdx: 1,
      slots: [
        { slot: 0, player: { id: '1', name: 'Player 1' } as Player },
        { slot: 1, player: { id: '2', name: 'Player 2' } as Player },
        { slot: 2, player: { id: '3', name: 'Player 3' } as Player },
        { slot: 3, player: { id: '4', name: 'Player 4' } as Player }
      ]
    }
    expect(getFirstFreeSlot(court)).toBe(undefined)
  })

  it('should respect custom maxSlots', () => {
    const court: CourtWithPlayers = {
      courtIdx: 1,
      slots: [
        { slot: 0, player: { id: '1', name: 'Player 1' } as Player },
        { slot: 1, player: { id: '2', name: 'Player 2' } as Player }
      ]
    }
    expect(getFirstFreeSlot(court, 2)).toBe(undefined)
    expect(getFirstFreeSlot(court, 3)).toBe(2)
  })

  it('should find slot in middle', () => {
    const court: CourtWithPlayers = {
      courtIdx: 1,
      slots: [
        { slot: 0, player: { id: '1', name: 'Player 1' } as Player },
        { slot: 2, player: { id: '2', name: 'Player 2' } as Player }
      ]
    }
    expect(getFirstFreeSlot(court)).toBe(1)
  })
})

describe('calculateGenderBreakdown', () => {
  it('should count men and women correctly', () => {
    const players: Player[] = [
      { id: '1', name: 'Player 1', gender: 'Herre' } as Player,
      { id: '2', name: 'Player 2', gender: 'Herre' } as Player,
      { id: '3', name: 'Player 3', gender: 'Dame' } as Player
    ]
    const result = calculateGenderBreakdown(players)
    expect(result.men).toBe(2)
    expect(result.women).toBe(1)
    expect(result.total).toBe(3)
  })

  it('should handle empty array', () => {
    const result = calculateGenderBreakdown([])
    expect(result.men).toBe(0)
    expect(result.women).toBe(0)
    expect(result.total).toBe(0)
  })

  it('should ignore players without gender', () => {
    const players: Player[] = [
      { id: '1', name: 'Player 1', gender: 'Herre' } as Player,
      { id: '2', name: 'Player 2', gender: null } as Player,
      { id: '3', name: 'Player 3', gender: 'Dame' } as Player
    ]
    const result = calculateGenderBreakdown(players)
    expect(result.men).toBe(1)
    expect(result.women).toBe(1)
    expect(result.total).toBe(3)
  })
})

describe('getAssignedPlayerIds', () => {
  it('should extract all assigned player IDs', () => {
    const matches: CourtWithPlayers[] = [
      {
        courtIdx: 1,
        slots: [
          { slot: 0, player: { id: '1', name: 'Player 1' } as Player },
          { slot: 1, player: { id: '2', name: 'Player 2' } as Player }
        ]
      },
      {
        courtIdx: 2,
        slots: [
          { slot: 0, player: { id: '3', name: 'Player 3' } as Player }
        ]
      }
    ]
    const result = getAssignedPlayerIds(matches)
    expect(result.size).toBe(3)
    expect(result.has('1')).toBe(true)
    expect(result.has('2')).toBe(true)
    expect(result.has('3')).toBe(true)
  })

  it('should ignore empty slots', () => {
    const matches: CourtWithPlayers[] = [
      {
        courtIdx: 1,
        slots: [
          { slot: 0, player: { id: '1', name: 'Player 1' } as Player },
          { slot: 1, player: null }
        ]
      }
    ]
    const result = getAssignedPlayerIds(matches)
    expect(result.size).toBe(1)
    expect(result.has('1')).toBe(true)
  })

  it('should handle empty matches array', () => {
    const result = getAssignedPlayerIds([])
    expect(result.size).toBe(0)
  })

  it('should handle matches with no slots', () => {
    const matches: CourtWithPlayers[] = [
      { courtIdx: 1, slots: [] }
    ]
    const result = getAssignedPlayerIds(matches)
    expect(result.size).toBe(0)
  })
})

describe('sortPlayersForDisplay', () => {
  it('should sort by gender (Dame first, Herre second)', () => {
    const players: Player[] = [
      { id: '1', name: 'Player 1', gender: 'Herre' } as Player,
      { id: '2', name: 'Player 2', gender: 'Dame' } as Player,
      { id: '3', name: 'Player 3', gender: 'Herre' } as Player
    ]
    const result = sortPlayersForDisplay(players)
    expect(result[0].gender).toBe('Dame')
    expect(result[1].gender).toBe('Herre')
    expect(result[2].gender).toBe('Herre')
  })

  it('should sort by category as secondary sort (Double, Begge, Single)', () => {
    const players: Player[] = [
      { id: '1', name: 'Player 1', gender: 'Dame', primaryCategory: 'Single' } as Player,
      { id: '2', name: 'Player 2', gender: 'Dame', primaryCategory: 'Double' } as Player,
      { id: '3', name: 'Player 3', gender: 'Dame', primaryCategory: 'Begge' } as Player
    ]
    const result = sortPlayersForDisplay(players)
    expect(result[0].primaryCategory).toBe('Double')
    expect(result[1].primaryCategory).toBe('Begge')
    expect(result[2].primaryCategory).toBe('Single')
  })

  it('should handle players without gender or category', () => {
    const players: Player[] = [
      { id: '1', name: 'Player 1', gender: 'Dame' } as Player,
      { id: '2', name: 'Player 2', gender: null } as Player,
      { id: '3', name: 'Player 3', gender: 'Herre' } as Player
    ]
    const result = sortPlayersForDisplay(players)
    expect(result.length).toBe(3)
    expect(result[0].gender).toBe('Dame')
    expect(result[1].gender).toBe('Herre')
  })

  it('should preserve input type', () => {
    const players: Player[] = [
      { id: '1', name: 'Player 1', gender: 'Herre' } as Player
    ]
    const result = sortPlayersForDisplay(players)
    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBe(1)
  })

  it('should not mutate original array', () => {
    const players: Player[] = [
      { id: '1', name: 'Player 1', gender: 'Herre' } as Player,
      { id: '2', name: 'Player 2', gender: 'Dame' } as Player
    ]
    const originalOrder = players.map(p => p.id)
    sortPlayersForDisplay(players)
    expect(players.map(p => p.id)).toEqual(originalOrder)
  })
})

describe('ensureAllCourtsPresent', () => {
  it('should fill in missing courts', () => {
    const matches: CourtWithPlayers[] = [
      { courtIdx: 1, slots: [] },
      { courtIdx: 3, slots: [] }
    ]
    const result = ensureAllCourtsPresent(matches, 4)
    expect(result.length).toBe(4)
    expect(result[0].courtIdx).toBe(1)
    expect(result[1].courtIdx).toBe(2)
    expect(result[2].courtIdx).toBe(3)
    expect(result[3].courtIdx).toBe(4)
  })

  it('should preserve existing court data', () => {
    const matches: CourtWithPlayers[] = [
      {
        courtIdx: 2,
        slots: [{ slot: 0, player: { id: '1', name: 'Player 1' } as Player }]
      }
    ]
    const result = ensureAllCourtsPresent(matches, 3)
    const court2 = result.find(c => c.courtIdx === 2)
    expect(court2?.slots.length).toBe(1)
  })

  it('should handle empty matches array', () => {
    const result = ensureAllCourtsPresent([], 3)
    expect(result.length).toBe(3)
    expect(result[0].courtIdx).toBe(1)
    expect(result[1].courtIdx).toBe(2)
    expect(result[2].courtIdx).toBe(3)
  })

  it('should handle non-array input safely', () => {
    const result = ensureAllCourtsPresent(null as any, 2)
    expect(result.length).toBe(2)
    expect(result[0].courtIdx).toBe(1)
    expect(result[1].courtIdx).toBe(2)
  })

  it('should handle maxCourts of 1', () => {
    const result = ensureAllCourtsPresent([], 1)
    expect(result.length).toBe(1)
    expect(result[0].courtIdx).toBe(1)
  })
})

