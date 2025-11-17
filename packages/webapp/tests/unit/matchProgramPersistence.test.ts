/**
 * Unit tests for match program persistence functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadPersistedState,
  savePersistedState,
  clearPersistedState
} from '../../src/lib/matchProgramPersistence'
import type { PersistedMatchProgramState } from '../../src/lib/matchProgramPersistence'

// Mock localStorage for Node.js environment
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

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Also set window.localStorage for browser-like environment
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock
  },
  writable: true,
  configurable: true
})

describe('loadPersistedState', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear()
  })

  it('should return null when no persisted state exists', () => {
    const result = loadPersistedState('session-123')
    expect(result).toBe(null)
  })

  it('should return persisted state for matching session', () => {
    const state: PersistedMatchProgramState = {
      inMemoryMatches: { 1: [] },
      lockedCourts: {},
      hasRunAutoMatch: [],
      extendedCapacityCourts: [],
      sessionId: 'session-123'
    }
    localStorageMock.setItem('herlev-hjorten-match-program-state', JSON.stringify(state))
    
    const result = loadPersistedState('session-123')
    expect(result).toEqual(state)
  })

  it('should return null for different session', () => {
    const state: PersistedMatchProgramState = {
      inMemoryMatches: {},
      lockedCourts: {},
      hasRunAutoMatch: [],
      extendedCapacityCourts: [],
      sessionId: 'session-123'
    }
    localStorageMock.setItem('herlev-hjorten-match-program-state', JSON.stringify(state))
    
    const result = loadPersistedState('session-456')
    expect(result).toBe(null)
    // Should clear stale state
    expect(localStorageMock.getItem('herlev-hjorten-match-program-state')).toBe(null)
  })

  it('should return null when sessionId is null', () => {
    const state: PersistedMatchProgramState = {
      inMemoryMatches: {},
      lockedCourts: {},
      hasRunAutoMatch: [],
      extendedCapacityCourts: [],
      sessionId: 'session-123'
    }
    localStorage.setItem('herlev-hjorten-match-program-state', JSON.stringify(state))
    
    const result = loadPersistedState(null)
    expect(result).toBe(null)
  })

  it('should handle invalid JSON gracefully', () => {
    localStorage.setItem('herlev-hjorten-match-program-state', 'invalid json')
    
    const result = loadPersistedState('session-123')
    expect(result).toBe(null)
  })

  it('should return null in non-browser environment', () => {
    // Mock window as undefined
    const originalWindow = global.window
    // @ts-expect-error - intentionally removing window for test
    delete (global as any).window
    
    const result = loadPersistedState('session-123')
    expect(result).toBe(null)
    
    global.window = originalWindow
  })
})

describe('savePersistedState', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('should save state to localStorage', () => {
    const state: PersistedMatchProgramState = {
      inMemoryMatches: { 1: [] },
      lockedCourts: {},
      hasRunAutoMatch: [],
      extendedCapacityCourts: [],
      sessionId: 'session-123'
    }
    
    savePersistedState(state)
    
    const saved = localStorageMock.getItem('herlev-hjorten-match-program-state')
    expect(saved).toBeTruthy()
    expect(JSON.parse(saved!)).toEqual(state)
  })

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage.setItem to throw error
    const originalSetItem = localStorage.setItem
    localStorage.setItem = vi.fn(() => {
      throw new Error('Storage quota exceeded')
    })
    
    const state: PersistedMatchProgramState = {
      inMemoryMatches: {},
      lockedCourts: {},
      hasRunAutoMatch: [],
      extendedCapacityCourts: [],
      sessionId: 'session-123'
    }
    
    // Should not throw
    expect(() => savePersistedState(state)).not.toThrow()
    
    localStorage.setItem = originalSetItem
  })

  it('should return null in non-browser environment', () => {
    const originalWindow = global.window
    // @ts-expect-error - intentionally removing window for test
    delete (global as any).window
    
    const state: PersistedMatchProgramState = {
      inMemoryMatches: {},
      lockedCourts: {},
      hasRunAutoMatch: [],
      extendedCapacityCourts: [],
      sessionId: 'session-123'
    }
    
    // Should not throw
    expect(() => savePersistedState(state)).not.toThrow()
    
    global.window = originalWindow
  })
})

describe('clearPersistedState', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('should remove persisted state from localStorage', () => {
    const state: PersistedMatchProgramState = {
      inMemoryMatches: {},
      lockedCourts: {},
      hasRunAutoMatch: [],
      extendedCapacityCourts: [],
      sessionId: 'session-123'
    }
    localStorageMock.setItem('herlev-hjorten-match-program-state', JSON.stringify(state))
    
    clearPersistedState()
    
    expect(localStorageMock.getItem('herlev-hjorten-match-program-state')).toBe(null)
  })

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage.removeItem to throw error
    const originalRemoveItem = localStorage.removeItem
    localStorage.removeItem = vi.fn(() => {
      throw new Error('Storage error')
    })
    
    // Should not throw
    expect(() => clearPersistedState()).not.toThrow()
    
    localStorage.removeItem = originalRemoveItem
  })

  it('should return null in non-browser environment', () => {
    const originalWindow = global.window
    // @ts-expect-error - intentionally removing window for test
    delete (global as any).window
    
    // Should not throw
    expect(() => clearPersistedState()).not.toThrow()
    
    global.window = originalWindow
  })
})

