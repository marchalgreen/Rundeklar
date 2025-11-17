/**
 * Unit tests for coach adapter functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resolveCoachId, resolveCoach } from '../../src/lib/coachAdapter'
import type { CoachInput } from '../../src/lib/coachAdapter'

describe('resolveCoachId', () => {
  beforeEach(() => {
    // Reset environment
    vi.resetModules()
  })

  it('should return coach id from input when provided', () => {
    const input: CoachInput = {
      coach: { id: 'coach-123', displayName: 'Test Coach' }
    }
    expect(resolveCoachId(input)).toBe('coach-123')
  })

  it('should return default coach id when no input provided', () => {
    const result = resolveCoachId(undefined)
    expect(result).toBe('coach-default')
  })

  it('should return default coach id when coach is null', () => {
    const input: CoachInput = { coach: null }
    expect(resolveCoachId(input)).toBe('coach-default')
  })

  it('should return default coach id when coach object is missing', () => {
    const input: CoachInput = {}
    expect(resolveCoachId(input)).toBe('coach-default')
  })

  it('should return default when coach id is empty string', () => {
    const input: CoachInput = {
      coach: { id: '', displayName: 'Test' }
    }
    // Empty string falls back to default
    expect(resolveCoachId(input)).toBe('coach-default')
  })
})

describe('resolveCoach', () => {
  it('should return coach object with id and displayName when provided', () => {
    const input: CoachInput = {
      coach: { id: 'coach-123', displayName: 'Test Coach' }
    }
    const result = resolveCoach(input)
    expect(result.id).toBe('coach-123')
    expect(result.displayName).toBe('Test Coach')
  })

  it('should return coach object with id only when displayName not provided', () => {
    const input: CoachInput = {
      coach: { id: 'coach-123' }
    }
    const result = resolveCoach(input)
    expect(result.id).toBe('coach-123')
    expect(result.displayName).toBeUndefined()
  })

  it('should return default coach id when no input provided', () => {
    const result = resolveCoach(undefined)
    expect(result.id).toBe('coach-default')
    expect(result.displayName).toBeUndefined()
  })

  it('should preserve displayName from input even when using default id', () => {
    const input: CoachInput = {
      coach: { id: '', displayName: 'Custom Name' }
    }
    const result = resolveCoach(input)
    expect(result.displayName).toBe('Custom Name')
  })
})

