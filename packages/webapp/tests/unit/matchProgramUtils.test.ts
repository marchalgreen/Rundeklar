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
  sortPlayersAlphabetically,
  sortPlayersByGenderAlphabetically,
  sortPlayers,
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

describe('sortPlayersAlphabetically', () => {
  it('should sort players alphabetically by name', () => {
    const players: Player[] = [
      { id: '1', name: 'Zimmermann' } as Player,
      { id: '2', name: 'Andersen' } as Player,
      { id: '3', name: 'Bøgh' } as Player
    ]
    const result = sortPlayersAlphabetically(players)
    expect(result[0].name).toBe('Andersen')
    expect(result[1].name).toBe('Bøgh')
    expect(result[2].name).toBe('Zimmermann')
  })

  it('should handle Danish characters correctly (æ, ø, å)', () => {
    const players: Player[] = [
      { id: '1', name: 'Åberg' } as Player,
      { id: '2', name: 'Østergaard' } as Player,
      { id: '3', name: 'Ærø' } as Player,
      { id: '4', name: 'Andersen' } as Player
    ]
    const result = sortPlayersAlphabetically(players)
    expect(result[0].name).toBe('Andersen')
    expect(result[1].name).toBe('Ærø')
    expect(result[2].name).toBe('Østergaard')
    expect(result[3].name).toBe('Åberg')
  })

  it('should be case-insensitive', () => {
    const players: Player[] = [
      { id: '1', name: 'andersen' } as Player,
      { id: '2', name: 'BØGH' } as Player,
      { id: '3', name: 'Zimmermann' } as Player
    ]
    const result = sortPlayersAlphabetically(players)
    expect(result[0].name).toBe('andersen')
    expect(result[1].name).toBe('BØGH')
    expect(result[2].name).toBe('Zimmermann')
  })

  it('should handle players without names (sort last)', () => {
    const players: Player[] = [
      { id: '1', name: 'Andersen' } as Player,
      { id: '2', name: null } as Player,
      { id: '3', name: 'Bøgh' } as Player,
      { id: '4', name: undefined } as Player
    ]
    const result = sortPlayersAlphabetically(players)
    expect(result[0].name).toBe('Andersen')
    expect(result[1].name).toBe('Bøgh')
    // Players without names should be sorted last
    expect(result[2].name).toBeNull()
    expect(result[3].name).toBeUndefined()
  })

  it('should handle empty array', () => {
    const result = sortPlayersAlphabetically([])
    expect(result).toEqual([])
  })

  it('should preserve input type', () => {
    const players: Player[] = [
      { id: '1', name: 'Player 1' } as Player
    ]
    const result = sortPlayersAlphabetically(players)
    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBe(1)
  })

  it('should not mutate original array', () => {
    const players: Player[] = [
      { id: '1', name: 'Zimmermann' } as Player,
      { id: '2', name: 'Andersen' } as Player
    ]
    const originalOrder = players.map(p => p.id)
    sortPlayersAlphabetically(players)
    expect(players.map(p => p.id)).toEqual(originalOrder)
  })

  it('should handle names with leading/trailing whitespace', () => {
    const players: Player[] = [
      { id: '1', name: '  Bøgh  ' } as Player,
      { id: '2', name: 'Andersen' } as Player
    ]
    const result = sortPlayersAlphabetically(players)
    expect(result[0].name).toBe('Andersen')
    expect(result[1].name).toBe('  Bøgh  ')
  })
})

describe('sortPlayersByGenderAlphabetically', () => {
  it('should sort by gender first (Dame before Herre)', () => {
    const players: Player[] = [
      { id: '1', name: 'Zimmermann', gender: 'Herre' } as Player,
      { id: '2', name: 'Andersen', gender: 'Dame' } as Player,
      { id: '3', name: 'Bøgh', gender: 'Herre' } as Player
    ]
    const result = sortPlayersByGenderAlphabetically(players)
    expect(result[0].gender).toBe('Dame')
    expect(result[0].name).toBe('Andersen')
    expect(result[1].gender).toBe('Herre')
    expect(result[1].name).toBe('Bøgh')
    expect(result[2].gender).toBe('Herre')
    expect(result[2].name).toBe('Zimmermann')
  })

  it('should sort alphabetically within each gender group', () => {
    const players: Player[] = [
      { id: '1', name: 'Zimmermann', gender: 'Dame' } as Player,
      { id: '2', name: 'Andersen', gender: 'Dame' } as Player,
      { id: '3', name: 'Bøgh', gender: 'Dame' } as Player,
      { id: '4', name: 'Østergaard', gender: 'Herre' } as Player,
      { id: '5', name: 'Åberg', gender: 'Herre' } as Player
    ]
    const result = sortPlayersByGenderAlphabetically(players)
    // Dame group should be alphabetical
    expect(result[0].gender).toBe('Dame')
    expect(result[0].name).toBe('Andersen')
    expect(result[1].gender).toBe('Dame')
    expect(result[1].name).toBe('Bøgh')
    expect(result[2].gender).toBe('Dame')
    expect(result[2].name).toBe('Zimmermann')
    // Herre group should be alphabetical
    expect(result[3].gender).toBe('Herre')
    expect(result[3].name).toBe('Østergaard')
    expect(result[4].gender).toBe('Herre')
    expect(result[4].name).toBe('Åberg')
  })

  it('should handle Danish characters correctly within gender groups', () => {
    const players: Player[] = [
      { id: '1', name: 'Åberg', gender: 'Dame' } as Player,
      { id: '2', name: 'Østergaard', gender: 'Dame' } as Player,
      { id: '3', name: 'Ærø', gender: 'Dame' } as Player,
      { id: '4', name: 'Andersen', gender: 'Dame' } as Player
    ]
    const result = sortPlayersByGenderAlphabetically(players)
    expect(result[0].name).toBe('Andersen')
    expect(result[1].name).toBe('Ærø')
    expect(result[2].name).toBe('Østergaard')
    expect(result[3].name).toBe('Åberg')
  })

  it('should handle players without gender (sorted last)', () => {
    const players: Player[] = [
      { id: '1', name: 'Andersen', gender: 'Dame' } as Player,
      { id: '2', name: 'Bøgh', gender: null } as Player,
      { id: '3', name: 'Zimmermann', gender: 'Herre' } as Player,
      { id: '4', name: 'Åberg', gender: undefined } as Player
    ]
    const result = sortPlayersByGenderAlphabetically(players)
    expect(result[0].gender).toBe('Dame')
    expect(result[1].gender).toBe('Herre')
    // Players without gender should be last
    expect(result[2].gender).toBeNull()
    expect(result[3].gender).toBeUndefined()
  })

  it('should handle empty array', () => {
    const result = sortPlayersByGenderAlphabetically([])
    expect(result).toEqual([])
  })

  it('should preserve input type', () => {
    const players: Player[] = [
      { id: '1', name: 'Player 1', gender: 'Dame' } as Player
    ]
    const result = sortPlayersByGenderAlphabetically(players)
    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBe(1)
  })

  it('should not mutate original array', () => {
    const players: Player[] = [
      { id: '1', name: 'Zimmermann', gender: 'Herre' } as Player,
      { id: '2', name: 'Andersen', gender: 'Dame' } as Player
    ]
    const originalOrder = players.map(p => p.id)
    sortPlayersByGenderAlphabetically(players)
    expect(players.map(p => p.id)).toEqual(originalOrder)
  })
})

describe('sortPlayers', () => {
  it('should use gender-category sorting by default', () => {
    const players: Player[] = [
      { id: '1', name: 'Player 1', gender: 'Herre' } as Player,
      { id: '2', name: 'Player 2', gender: 'Dame' } as Player
    ]
    const result = sortPlayers(players)
    expect(result[0].gender).toBe('Dame')
    expect(result[1].gender).toBe('Herre')
  })

  it('should use gender-category sorting when specified', () => {
    const players: Player[] = [
      { id: '1', name: 'Player 1', gender: 'Herre' } as Player,
      { id: '2', name: 'Player 2', gender: 'Dame' } as Player
    ]
    const result = sortPlayers(players, 'gender-category')
    expect(result[0].gender).toBe('Dame')
    expect(result[1].gender).toBe('Herre')
  })

  it('should use gender-alphabetical sorting when specified', () => {
    const players: Player[] = [
      { id: '1', name: 'Zimmermann', gender: 'Herre' } as Player,
      { id: '2', name: 'Andersen', gender: 'Dame' } as Player,
      { id: '3', name: 'Bøgh', gender: 'Herre' } as Player
    ]
    const result = sortPlayers(players, 'gender-alphabetical')
    expect(result[0].gender).toBe('Dame')
    expect(result[0].name).toBe('Andersen')
    expect(result[1].gender).toBe('Herre')
    expect(result[1].name).toBe('Bøgh')
    expect(result[2].gender).toBe('Herre')
    expect(result[2].name).toBe('Zimmermann')
  })

  it('should use alphabetical sorting when specified', () => {
    const players: Player[] = [
      { id: '1', name: 'Zimmermann' } as Player,
      { id: '2', name: 'Andersen' } as Player
    ]
    const result = sortPlayers(players, 'alphabetical')
    expect(result[0].name).toBe('Andersen')
    expect(result[1].name).toBe('Zimmermann')
  })

  it('should preserve input type', () => {
    const players: Player[] = [
      { id: '1', name: 'Player 1' } as Player
    ]
    const result = sortPlayers(players, 'alphabetical')
    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBe(1)
  })

  it('should not mutate original array', () => {
    const players: Player[] = [
      { id: '1', name: 'Zimmermann' } as Player,
      { id: '2', name: 'Andersen' } as Player
    ]
    const originalOrder = players.map(p => p.id)
    sortPlayers(players, 'alphabetical')
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

