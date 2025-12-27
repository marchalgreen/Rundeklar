/**
 * Unit tests for password utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validatePasswordStrength } from '../../src/lib/auth/password'

// Mock password breach check
vi.mock('../../src/lib/auth/passwordBreach', () => ({
  checkPasswordBreach: vi.fn()
}))

// Mock logger
vi.mock('../../src/lib/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Note: hashPassword and verifyPassword require server-side argon2
// These are tested in integration tests or skipped in unit tests

describe('validatePasswordStrength', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should accept valid password', async () => {
    const result = await validatePasswordStrength('Password123!', false) // Skip breach check for speed
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject password shorter than 8 characters', async () => {
    const result = await validatePasswordStrength('Pass1!', false)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('8 characters'))).toBe(true)
  })

  it('should reject password longer than 128 characters', async () => {
    const longPassword = 'A'.repeat(129) + 'a1!'
    const result = await validatePasswordStrength(longPassword, false)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('128 characters'))).toBe(true)
  })

  it('should reject password without lowercase letter', async () => {
    const result = await validatePasswordStrength('PASSWORD123!', false)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('lowercase'))).toBe(true)
  })

  it('should reject password without uppercase letter', async () => {
    const result = await validatePasswordStrength('password123!', false)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('uppercase'))).toBe(true)
  })

  it('should reject password without number', async () => {
    const result = await validatePasswordStrength('Password!', false)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('number'))).toBe(true)
  })

  it('should reject password without special character', async () => {
    const result = await validatePasswordStrength('Password123', false)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('special character'))).toBe(true)
  })

  it('should return multiple errors for password with multiple issues', async () => {
    const result = await validatePasswordStrength('short', false)
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })

  it('should accept password with exactly 8 characters', async () => {
    const result = await validatePasswordStrength('Pass123!', false)
    expect(result.isValid).toBe(true)
  })

  it('should accept password with exactly 128 characters', async () => {
    const password = 'A'.repeat(125) + 'a1!'
    const result = await validatePasswordStrength(password, false)
    expect(result.isValid).toBe(true)
  })

  it('should accept password with various special characters', async () => {
    const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '=']
    for (const char of specialChars) {
      const password = `Password123${char}`
      const result = await validatePasswordStrength(password, false)
      expect(result.isValid).toBe(true)
    }
  })

  it('should check password breach when enabled', async () => {
    const { checkPasswordBreach } = await import('../../src/lib/auth/passwordBreach')
    vi.mocked(checkPasswordBreach).mockResolvedValue({
      isBreached: true,
      breachCount: 1234
    })

    const result = await validatePasswordStrength('Password123!', true)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('data breach'))).toBe(true)
    expect(result.breachCount).toBe(1234)
  })

  it('should allow password if breach check fails (fail-open)', async () => {
    const { checkPasswordBreach } = await import('../../src/lib/auth/passwordBreach')
    vi.mocked(checkPasswordBreach).mockRejectedValue(new Error('API error'))

    const result = await validatePasswordStrength('Password123!', true)
    // Should still be valid because breach check failed (fail-open)
    expect(result.isValid).toBe(true)
  })
})

