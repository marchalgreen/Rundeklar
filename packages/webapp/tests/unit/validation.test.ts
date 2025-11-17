/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest'
import {
  validatePlayerName,
  validatePlayerAlias,
  validateLevel,
  validateGender,
  validateCategory,
  validateCourtIdx,
  validateSlot,
  validateRound,
  validateEmail,
  validateRequired,
  validateRange
} from '../../src/lib/validation'

describe('validatePlayerName', () => {
  it('should return null for valid name', () => {
    expect(validatePlayerName('John Doe')).toBe(null)
  })

  it('should return error for empty name', () => {
    expect(validatePlayerName('')).toBeTruthy()
    expect(validatePlayerName('   ')).toBeTruthy()
  })

  it('should return error for name shorter than minimum', () => {
    const result = validatePlayerName('')
    expect(result).toContain('mindst 1 tegn')
  })

  it('should return error for name longer than maximum', () => {
    const longName = 'A'.repeat(101)
    const result = validatePlayerName(longName)
    expect(result).toContain('maksimalt')
  })

  it('should trim whitespace before validation', () => {
    expect(validatePlayerName('  John  ')).toBe(null)
  })
})

describe('validatePlayerAlias', () => {
  it('should return null for valid alias', () => {
    expect(validatePlayerAlias('JD')).toBe(null)
  })

  it('should return null for null alias (optional)', () => {
    expect(validatePlayerAlias(null)).toBe(null)
  })

  it('should return null for undefined alias (optional)', () => {
    expect(validatePlayerAlias(undefined)).toBe(null)
  })

  it('should return error for alias longer than maximum', () => {
    const longAlias = 'A'.repeat(101)
    const result = validatePlayerAlias(longAlias)
    expect(result).toContain('maksimalt')
  })

  it('should trim whitespace before validation', () => {
    expect(validatePlayerAlias('  JD  ')).toBe(null)
  })
})

describe('validateLevel', () => {
  it('should return null for valid level', () => {
    expect(validateLevel(5)).toBe(null)
    expect(validateLevel(0)).toBe(null)
  })

  it('should return null for null (optional)', () => {
    expect(validateLevel(null)).toBe(null)
  })

  it('should return null for undefined (optional)', () => {
    expect(validateLevel(undefined)).toBe(null)
  })

  it('should return error for non-integer', () => {
    const result = validateLevel(5.5)
    expect(result).toContain('heltal')
  })

  it('should return error for negative number', () => {
    const result = validateLevel(-1)
    expect(result).toContain('negativ')
  })
})

describe('validateGender', () => {
  it('should return null for valid gender "Herre"', () => {
    expect(validateGender('Herre')).toBe(null)
  })

  it('should return null for valid gender "Dame"', () => {
    expect(validateGender('Dame')).toBe(null)
  })

  it('should return null for null (optional)', () => {
    expect(validateGender(null)).toBe(null)
  })

  it('should return null for undefined (optional)', () => {
    expect(validateGender(undefined)).toBe(null)
  })

  it('should return error for invalid gender', () => {
    const result = validateGender('Invalid' as any)
    expect(result).toContain('Ugyldigt køn')
  })
})

describe('validateCategory', () => {
  it('should return null for valid category "Single"', () => {
    expect(validateCategory('Single')).toBe(null)
  })

  it('should return null for valid category "Double"', () => {
    expect(validateCategory('Double')).toBe(null)
  })

  it('should return null for valid category "Begge"', () => {
    expect(validateCategory('Begge')).toBe(null)
  })

  it('should return null for null (optional)', () => {
    expect(validateCategory(null)).toBe(null)
  })

  it('should return null for undefined (optional)', () => {
    expect(validateCategory(undefined)).toBe(null)
  })

  it('should return error for invalid category', () => {
    const result = validateCategory('Invalid' as any)
    expect(result).toContain('Ugyldig kategori')
  })
})

describe('validateCourtIdx', () => {
  it('should return null for valid court index', () => {
    expect(validateCourtIdx(1)).toBe(null)
    expect(validateCourtIdx(8)).toBe(null)
  })

  it('should return error for non-integer', () => {
    const result = validateCourtIdx(1.5)
    expect(result).toContain('heltal')
  })

  it('should return error for court index below minimum', () => {
    const result = validateCourtIdx(0)
    expect(result).toContain('mellem')
  })

  it('should return error for court index above maximum', () => {
    const result = validateCourtIdx(20)
    expect(result).toContain('mellem')
  })
})

describe('validateSlot', () => {
  it('should return null for valid slot', () => {
    expect(validateSlot(0)).toBe(null)
    expect(validateSlot(3)).toBe(null)
  })

  it('should return error for non-integer', () => {
    const result = validateSlot(1.5)
    expect(result).toContain('heltal')
  })

  it('should return error for slot below minimum', () => {
    const result = validateSlot(-1)
    expect(result).toContain('mellem')
  })

  it('should return error for slot above maximum', () => {
    const result = validateSlot(10)
    expect(result).toContain('mellem')
  })
})

describe('validateRound', () => {
  it('should return null for valid round', () => {
    expect(validateRound(1)).toBe(null)
    expect(validateRound(4)).toBe(null)
  })

  it('should return error for non-integer', () => {
    const result = validateRound(1.5)
    expect(result).toContain('heltal')
  })

  it('should return error for round below minimum', () => {
    const result = validateRound(0)
    expect(result).toContain('mellem')
  })

  it('should return error for round above maximum', () => {
    const result = validateRound(5)
    expect(result).toContain('mellem')
  })
})

describe('validateEmail', () => {
  it('should return null for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(null)
    expect(validateEmail('user.name@domain.co.uk')).toBe(null)
  })

  it('should return error for empty email', () => {
    const result = validateEmail('')
    expect(result).toContain('påkrævet')
  })

  it('should return error for invalid email format', () => {
    expect(validateEmail('invalid')).toContain('Ugyldig')
    expect(validateEmail('invalid@')).toContain('Ugyldig')
    expect(validateEmail('@example.com')).toContain('Ugyldig')
    expect(validateEmail('invalid@example')).toContain('Ugyldig')
  })

  it('should return error for email without @', () => {
    const result = validateEmail('invalidemail.com')
    expect(result).toContain('Ugyldig')
  })
})

describe('validateRequired', () => {
  it('should return null for valid value', () => {
    expect(validateRequired('value', 'Field')).toBe(null)
    expect(validateRequired(0, 'Field')).toBe(null)
    expect(validateRequired(false, 'Field')).toBe(null)
  })

  it('should return error for null', () => {
    const result = validateRequired(null, 'Field')
    expect(result).toContain('påkrævet')
    expect(result).toContain('Field')
  })

  it('should return error for undefined', () => {
    const result = validateRequired(undefined, 'Field')
    expect(result).toContain('påkrævet')
  })

  it('should return error for empty string', () => {
    const result = validateRequired('', 'Field')
    expect(result).toContain('påkrævet')
  })

  it('should return error for whitespace-only string', () => {
    const result = validateRequired('   ', 'Field')
    expect(result).toContain('påkrævet')
  })

  it('should include field name in error message', () => {
    const result = validateRequired('', 'Email')
    expect(result).toContain('Email')
  })
})

describe('validateRange', () => {
  it('should return null for value within range', () => {
    expect(validateRange(5, 0, 10, 'Field')).toBe(null)
    expect(validateRange(0, 0, 10, 'Field')).toBe(null)
    expect(validateRange(10, 0, 10, 'Field')).toBe(null)
  })

  it('should return error for value below minimum', () => {
    const result = validateRange(-1, 0, 10, 'Field')
    expect(result).toContain('mellem')
    expect(result).toContain('Field')
  })

  it('should return error for value above maximum', () => {
    const result = validateRange(11, 0, 10, 'Field')
    expect(result).toContain('mellem')
  })

  it('should include field name in error message', () => {
    const result = validateRange(15, 0, 10, 'Age')
    expect(result).toContain('Age')
  })
})

