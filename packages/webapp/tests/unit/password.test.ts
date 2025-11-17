/**
 * Unit tests for password utilities
 */

import { describe, it, expect, vi } from 'vitest'
import { validatePasswordStrength } from '../../src/lib/auth/password'

// Note: hashPassword and verifyPassword require server-side argon2
// These are tested in integration tests or skipped in unit tests

describe('validatePasswordStrength', () => {
  it('should accept valid password', () => {
    const result = validatePasswordStrength('Password123!')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject password shorter than 8 characters', () => {
    const result = validatePasswordStrength('Pass1!')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('8 characters'))).toBe(true)
  })

  it('should reject password longer than 128 characters', () => {
    const longPassword = 'A'.repeat(129) + 'a1!'
    const result = validatePasswordStrength(longPassword)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('128 characters'))).toBe(true)
  })

  it('should reject password without lowercase letter', () => {
    const result = validatePasswordStrength('PASSWORD123!')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('lowercase'))).toBe(true)
  })

  it('should reject password without uppercase letter', () => {
    const result = validatePasswordStrength('password123!')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('uppercase'))).toBe(true)
  })

  it('should reject password without number', () => {
    const result = validatePasswordStrength('Password!')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('number'))).toBe(true)
  })

  it('should reject password without special character', () => {
    const result = validatePasswordStrength('Password123')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('special character'))).toBe(true)
  })

  it('should return multiple errors for password with multiple issues', () => {
    const result = validatePasswordStrength('short')
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })

  it('should accept password with exactly 8 characters', () => {
    const result = validatePasswordStrength('Pass123!')
    expect(result.isValid).toBe(true)
  })

  it('should accept password with exactly 128 characters', () => {
    const password = 'A'.repeat(125) + 'a1!'
    const result = validatePasswordStrength(password)
    expect(result.isValid).toBe(true)
  })

  it('should accept password with various special characters', () => {
    const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '=']
    specialChars.forEach(char => {
      const password = `Password123${char}`
      const result = validatePasswordStrength(password)
      expect(result.isValid).toBe(true)
    })
  })
})

