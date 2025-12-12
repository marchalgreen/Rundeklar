/**
 * Unit tests for coachLandingApi service layer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  persistPendingSeed,
  readAndClearPendingSeed,
  persistLastGroupId,
  readLastGroupId
} from '../../src/services/coachLandingApi'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

describe('persistPendingSeed', () => {
  beforeEach(() => {
    localStorageMock.clear()
    // Use globalThis for Node.js compatibility
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    })
  })

  it('should persist seed with groupIds array', () => {
    persistPendingSeed({ groupIds: ['A', 'B'], extraPlayerIds: ['p1', 'p2'] })
    const stored = localStorageMock.getItem('coach-landing:pending-session-seed')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed.groupIds).toEqual(['A', 'B'])
    expect(parsed.extraPlayerIds).toEqual(['p1', 'p2'])
  })

  it('should persist empty arrays', () => {
    persistPendingSeed({ groupIds: [], extraPlayerIds: [] })
    const stored = localStorageMock.getItem('coach-landing:pending-session-seed')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed.groupIds).toEqual([])
    expect(parsed.extraPlayerIds).toEqual([])
  })

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage.setItem to throw
    const originalSetItem = localStorageMock.setItem
    localStorageMock.setItem = vi.fn(() => {
      throw new Error('Quota exceeded')
    })
    
    // Should not throw
    expect(() => {
      persistPendingSeed({ groupIds: ['A'], extraPlayerIds: [] })
    }).not.toThrow()
    
    localStorageMock.setItem = originalSetItem
  })
})

describe('readAndClearPendingSeed', () => {
  beforeEach(() => {
    localStorageMock.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    })
  })

  it('should read and clear seed with new format', () => {
    localStorageMock.setItem(
      'coach-landing:pending-session-seed',
      JSON.stringify({ groupIds: ['A', 'B'], extraPlayerIds: ['p1'] })
    )
    
    const result = readAndClearPendingSeed()
    expect(result).toEqual({ groupIds: ['A', 'B'], extraPlayerIds: ['p1'] })
    
    // Should be cleared
    expect(localStorageMock.getItem('coach-landing:pending-session-seed')).toBeNull()
  })

  it('should handle backward compatibility with old groupId format', () => {
    localStorageMock.setItem(
      'coach-landing:pending-session-seed',
      JSON.stringify({ groupId: 'A', extraPlayerIds: ['p1'] })
    )
    
    const result = readAndClearPendingSeed()
    expect(result).toEqual({ groupIds: ['A'], extraPlayerIds: ['p1'] })
  })

  it('should handle backward compatibility with null groupId', () => {
    localStorageMock.setItem(
      'coach-landing:pending-session-seed',
      JSON.stringify({ groupId: null, extraPlayerIds: [] })
    )
    
    const result = readAndClearPendingSeed()
    expect(result).toEqual({ groupIds: [], extraPlayerIds: [] })
  })

  it('should return null when seed not found', () => {
    const result = readAndClearPendingSeed()
    expect(result).toBeNull()
  })

  it('should return null for invalid JSON', () => {
    localStorageMock.setItem('coach-landing:pending-session-seed', 'invalid json')
    const result = readAndClearPendingSeed()
    expect(result).toBeNull()
  })

  it('should handle missing extraPlayerIds', () => {
    localStorageMock.setItem(
      'coach-landing:pending-session-seed',
      JSON.stringify({ groupIds: ['A'] })
    )
    
    const result = readAndClearPendingSeed()
    expect(result).toEqual({ groupIds: ['A'], extraPlayerIds: [] })
  })
})

describe('persistLastGroupId', () => {
  beforeEach(() => {
    localStorageMock.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    })
  })

  it('should persist array of group IDs as JSON', () => {
    persistLastGroupId(['A', 'B'])
    const stored = localStorageMock.getItem('coach-landing:last-group-id')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed).toEqual(['A', 'B'])
  })

  it('should clear when empty array provided', () => {
    localStorageMock.setItem('coach-landing:last-group-id', JSON.stringify(['A']))
    persistLastGroupId([])
    expect(localStorageMock.getItem('coach-landing:last-group-id')).toBeNull()
  })

  it('should handle localStorage errors gracefully', () => {
    const originalSetItem = localStorageMock.setItem
    localStorageMock.setItem = vi.fn(() => {
      throw new Error('Quota exceeded')
    })
    
    expect(() => {
      persistLastGroupId(['A'])
    }).not.toThrow()
    
    localStorageMock.setItem = originalSetItem
  })
})

describe('readLastGroupId', () => {
  beforeEach(() => {
    localStorageMock.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    })
  })

  it('should read array format (new format)', () => {
    localStorageMock.setItem('coach-landing:last-group-id', JSON.stringify(['A', 'B']))
    const result = readLastGroupId()
    expect(result).toEqual(['A', 'B'])
  })

  it('should handle backward compatibility with single string (old format)', () => {
    localStorageMock.setItem('coach-landing:last-group-id', 'A')
    const result = readLastGroupId()
    expect(result).toEqual(['A'])
  })

  it('should return empty array when not found', () => {
    const result = readLastGroupId()
    expect(result).toEqual([])
  })

  it('should handle invalid JSON gracefully', () => {
    localStorageMock.setItem('coach-landing:last-group-id', 'invalid json')
    const result = readLastGroupId()
    // Should treat as old format (single string)
    expect(result).toEqual(['invalid json'])
  })

  it('should handle empty string', () => {
    localStorageMock.setItem('coach-landing:last-group-id', '')
    const result = readLastGroupId()
    expect(result).toEqual([])
  })

  it('should filter out empty strings from array', () => {
    localStorageMock.setItem('coach-landing:last-group-id', JSON.stringify(['A', '', 'B']))
    const result = readLastGroupId()
    expect(result).toEqual(['A', 'B'])
  })
})

