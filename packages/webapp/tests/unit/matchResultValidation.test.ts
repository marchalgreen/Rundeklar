/**
 * Unit tests for match result validation utilities
 */

import { describe, it, expect } from 'vitest'
import {
  validateBadmintonScore,
  validateMatchResult,
  isBadmintonScoreData,
  type ValidationResult
} from '../../src/lib/matchResultValidation'
import type { BadmintonScoreData } from '@rundeklar/common'

describe('validateBadmintonScore', () => {
  describe('empty sets', () => {
    it('should return error for empty sets array', () => {
      const result = validateBadmintonScore([])
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Mindst ét sæt skal indtastes')
    })

    it('should skip empty sets (both null)', () => {
      const sets = [
        { team1: null, team2: null },
        { team1: 21, team2: 19 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(false) // Still invalid because only 1 set won
    })
  })

  describe('set count limits', () => {
    it('should return error for more than 3 sets', () => {
      const sets = [
        { team1: 21, team2: 19 },
        { team1: 21, team2: 19 },
        { team1: 21, team2: 19 },
        { team1: 21, team2: 19 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Maksimum 3 sæt tilladt')
    })
  })

  describe('score validation', () => {
    it('should return error for negative scores', () => {
      const sets = [{ team1: -1, team2: 21 }]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Score kan ikke være negativ')
    })

    it('should return error for scores above 30', () => {
      const sets = [{ team1: 31, team2: 21 }]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Maksimum score er 30 point')
    })

    it('should accept scores up to 30', () => {
      const sets = [
        { team1: 30, team2: 29 },
        { team1: 21, team2: 19 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(true)
    })
  })

  describe('incomplete sets', () => {
    it('should return error if one team has no score', () => {
      const sets = [{ team1: 21, team2: null }]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(false)
      expect(result.errorKey).toBe('BOTH_PLAYERS_MUST_HAVE_SCORE')
    })

    it('should use dynamic label for incomplete sets', () => {
      const sets = [{ team1: 21, team2: null }]
      const result = validateBadmintonScore(sets, {
        playerLabelPlural: 'Begge par'
      })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Begge par skal have en score')
    })

    it('should return error for tied sets', () => {
      const sets = [{ team1: 21, team2: 21 }]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Sæt skal have en vinder')
    })
  })

  describe('minimum winning score', () => {
    it('should return error if winner has less than 21 points', () => {
      const sets = [{ team1: 20, team2: 18 }]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Vinder skal have mindst 21 point')
    })

    it('should accept winner with 21 points', () => {
      const sets = [
        { team1: 21, team2: 19 },
        { team1: 21, team2: 19 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(true)
    })
  })

  describe('score difference validation', () => {
    it('should return error if difference is less than 2 (except 30-29)', () => {
      const sets = [{ team1: 21, team2: 20 }]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Vinder skal have mindst 2 point mere end modstanderen (undtagen 30-29)')
    })

    it('should accept 2 point difference', () => {
      const sets = [
        { team1: 21, team2: 19 },
        { team1: 21, team2: 19 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(true)
    })

    it('should accept 30-29 as valid', () => {
      const sets = [
        { team1: 30, team2: 29 },
        { team1: 21, team2: 19 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(true)
    })

    it('should accept larger differences', () => {
      const sets = [
        { team1: 29, team2: 27 },
        { team1: 21, team2: 19 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(true)
    })
  })

  describe('match completion', () => {
    it('should return error if no team has won 2 sets', () => {
      const sets = [{ team1: 21, team2: 19 }]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(false)
      expect(result.errorKey).toBe('PLAYER_MUST_WIN_2_SETS')
    })

    it('should use dynamic label for 2 sets requirement', () => {
      const sets = [{ team1: 21, team2: 19 }]
      const result = validateBadmintonScore(sets, {
        playerLabelDefinite: 'Et par'
      })
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Et par skal have vundet mindst 2 sæt')
    })

    it('should accept valid 2-0 match', () => {
      const sets = [
        { team1: 21, team2: 19 },
        { team1: 21, team2: 19 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(true)
    })

    it('should accept valid 2-1 match', () => {
      const sets = [
        { team1: 21, team2: 19 },
        { team1: 19, team2: 21 },
        { team1: 21, team2: 19 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(true)
    })

    it('should accept valid match with 30-29 set', () => {
      const sets = [
        { team1: 30, team2: 29 },
        { team1: 21, team2: 19 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle team2 winning', () => {
      const sets = [
        { team1: 19, team2: 21 },
        { team1: 19, team2: 21 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(true)
    })

    it('should handle mixed winners', () => {
      const sets = [
        { team1: 21, team2: 19 },
        { team1: 19, team2: 21 },
        { team1: 21, team2: 19 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(true)
    })

    it('should handle sets with zero scores (treated as empty)', () => {
      const sets = [
        { team1: 0, team2: 0 },
        { team1: 21, team2: 19 }
      ]
      const result = validateBadmintonScore(sets)
      expect(result.valid).toBe(false) // Only 1 valid set
    })
  })
})

describe('validateMatchResult', () => {
  it('should delegate to validateBadmintonScore for badminton', () => {
    const scoreData: BadmintonScoreData = {
      sets: [
        { team1: 21, team2: 19 },
        { team1: 21, team2: 19 }
      ],
      winner: 'team1'
    }
    const result = validateMatchResult('badminton', scoreData)
    expect(result.valid).toBe(true)
  })

  it('should return error for invalid badminton format', () => {
    const scoreData = { invalid: 'data' }
    const result = validateMatchResult('badminton', scoreData as any)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid badminton score data format')
  })

  it('should return error for tennis (not implemented)', () => {
    const result = validateMatchResult('tennis', {} as any)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Tennis scoring not yet implemented')
  })

  it('should return error for padel (not implemented)', () => {
    const result = validateMatchResult('padel', {} as any)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Padel scoring not yet implemented')
  })

  it('should return error for unknown sport', () => {
    const result = validateMatchResult('unknown' as any, {} as any)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unknown sport')
  })
})

describe('isBadmintonScoreData', () => {
  it('should return true for valid BadmintonScoreData', () => {
    const scoreData: BadmintonScoreData = {
      sets: [{ team1: 21, team2: 19 }],
      winner: 'team1'
    }
    expect(isBadmintonScoreData(scoreData)).toBe(true)
  })

  it('should return false for object without sets', () => {
    const scoreData = { winner: 'team1' }
    expect(isBadmintonScoreData(scoreData)).toBe(false)
  })

  it('should return false for object without winner', () => {
    const scoreData = { sets: [{ team1: 21, team2: 19 }] }
    expect(isBadmintonScoreData(scoreData)).toBe(false)
  })

  it('should return false for null', () => {
    expect(isBadmintonScoreData(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isBadmintonScoreData(undefined)).toBe(false)
  })

  it('should return false for non-object', () => {
    expect(isBadmintonScoreData('string')).toBe(false)
    expect(isBadmintonScoreData(123)).toBe(false)
    expect(isBadmintonScoreData([])).toBe(false)
  })
})

