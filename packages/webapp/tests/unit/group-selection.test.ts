/**
 * Unit tests for group selection utilities
 */

import { describe, it, expect } from 'vitest'
import { toggleGroupId, normalizeGroupIds, validateGroupIds } from '../../src/lib/groupSelection'

describe('toggleGroupId', () => {
  it('should add group ID when not present', () => {
    const result = toggleGroupId(['A', 'B'], 'C')
    expect(result).toEqual(['A', 'B', 'C'])
  })

  it('should remove group ID when present', () => {
    const result = toggleGroupId(['A', 'B', 'C'], 'B')
    expect(result).toEqual(['A', 'C'])
  })

  it('should handle empty array', () => {
    const result = toggleGroupId([], 'A')
    expect(result).toEqual(['A'])
  })

  it('should handle single element array', () => {
    const result = toggleGroupId(['A'], 'A')
    expect(result).toEqual([])
  })

  it('should not modify original array', () => {
    const original = ['A', 'B']
    toggleGroupId(original, 'C')
    expect(original).toEqual(['A', 'B'])
  })
})

describe('normalizeGroupIds', () => {
  it('should return empty array for null', () => {
    expect(normalizeGroupIds(null)).toEqual([])
  })

  it('should return empty array for undefined', () => {
    expect(normalizeGroupIds(undefined)).toEqual([])
  })

  it('should return empty array for empty string', () => {
    expect(normalizeGroupIds('')).toEqual([])
  })

  it('should convert single string to array', () => {
    expect(normalizeGroupIds('A')).toEqual(['A'])
  })

  it('should trim whitespace from single string', () => {
    expect(normalizeGroupIds('  A  ')).toEqual(['A'])
  })

  it('should return array as-is when already array', () => {
    expect(normalizeGroupIds(['A', 'B'])).toEqual(['A', 'B'])
  })

  it('should filter out empty strings from array', () => {
    expect(normalizeGroupIds(['A', '', 'B', '  '])).toEqual(['A', 'B'])
  })

  it('should filter out null values from array', () => {
    expect(normalizeGroupIds(['A', null as any, 'B'])).toEqual(['A', 'B'])
  })

  it('should trim whitespace from array elements', () => {
    expect(normalizeGroupIds(['  A  ', '  B  '])).toEqual(['A', 'B'])
  })
})

describe('validateGroupIds', () => {
  it('should return true for valid non-empty array', () => {
    expect(validateGroupIds(['A', 'B'])).toBe(true)
  })

  it('should return false for empty array', () => {
    expect(validateGroupIds([])).toBe(false)
  })

  it('should return false for non-array', () => {
    expect(validateGroupIds('A' as any)).toBe(false)
    expect(validateGroupIds(null as any)).toBe(false)
    expect(validateGroupIds(undefined as any)).toBe(false)
  })

  it('should return false for array with empty strings', () => {
    expect(validateGroupIds(['A', ''])).toBe(false)
    expect(validateGroupIds([''])).toBe(false)
  })

  it('should return false for array with whitespace-only strings', () => {
    expect(validateGroupIds(['A', '   '])).toBe(false)
  })

  it('should return true for array with valid strings', () => {
    expect(validateGroupIds(['A', 'B', 'C'])).toBe(true)
  })

  it('should return true for single valid string', () => {
    expect(validateGroupIds(['A'])).toBe(true)
  })
})


