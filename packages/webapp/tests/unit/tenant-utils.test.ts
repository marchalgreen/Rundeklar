/**
 * Unit tests for tenant utilities
 */

import { describe, it, expect } from 'vitest'
import { nameToSubdomain, validateSubdomain } from '../../src/lib/admin/tenant-utils'

describe('nameToSubdomain', () => {
  it('should convert name to lowercase', () => {
    expect(nameToSubdomain('Herlev/Hjorten')).toBe('herlev-hjorten')
  })

  it('should replace spaces with hyphens', () => {
    expect(nameToSubdomain('Test Tenant')).toBe('test-tenant')
  })

  it('should remove special characters', () => {
    expect(nameToSubdomain('Test@Tenant!')).toBe('testtenant')
    expect(nameToSubdomain('Test#Tenant$')).toBe('testtenant')
  })

  it('should replace multiple spaces with single hyphen', () => {
    expect(nameToSubdomain('Test   Tenant')).toBe('test-tenant')
  })

  it('should replace multiple hyphens with single hyphen', () => {
    expect(nameToSubdomain('Test---Tenant')).toBe('test-tenant')
  })

  it('should remove leading and trailing hyphens', () => {
    expect(nameToSubdomain('-Test Tenant-')).toBe('test-tenant')
  })

  it('should trim whitespace', () => {
    expect(nameToSubdomain('  Test Tenant  ')).toBe('test-tenant')
  })

  it('should handle numbers', () => {
    expect(nameToSubdomain('Tenant 123')).toBe('tenant-123')
  })

  it('should handle already valid subdomain', () => {
    expect(nameToSubdomain('herlev-hjorten')).toBe('herlev-hjorten')
  })
})

describe('validateSubdomain', () => {
  it('should return valid for correct subdomain', () => {
    const result = validateSubdomain('herlev-hjorten')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should return error for empty subdomain', () => {
    const result = validateSubdomain('')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('required'))).toBe(true)
  })

  it('should return error for subdomain shorter than 3 characters', () => {
    const result = validateSubdomain('ab')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('3 characters'))).toBe(true)
  })

  it('should return error for subdomain longer than 63 characters', () => {
    const longSubdomain = 'a'.repeat(64)
    const result = validateSubdomain(longSubdomain)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('63 characters'))).toBe(true)
  })

  it('should return error for subdomain with uppercase letters', () => {
    const result = validateSubdomain('Test-Tenant')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('lowercase'))).toBe(true)
  })

  it('should return error for subdomain with special characters', () => {
    const result = validateSubdomain('test@tenant')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('lowercase letters'))).toBe(true)
  })

  it('should return error for subdomain starting with hyphen', () => {
    const result = validateSubdomain('-test-tenant')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('start or end'))).toBe(true)
  })

  it('should return error for subdomain ending with hyphen', () => {
    const result = validateSubdomain('test-tenant-')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('start or end'))).toBe(true)
  })

  it('should return error for reserved subdomains', () => {
    const reserved = ['www', 'demo', 'api', 'admin', 'mail', 'ftp', 'localhost', 'marketing']
    reserved.forEach(subdomain => {
      const result = validateSubdomain(subdomain)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('reserved'))).toBe(true)
    })
  })

  it('should allow subdomain with numbers', () => {
    const result = validateSubdomain('tenant123')
    expect(result.isValid).toBe(true)
  })

  it('should allow subdomain with hyphens in middle', () => {
    const result = validateSubdomain('test-tenant-name')
    expect(result.isValid).toBe(true)
  })

  it('should return multiple errors when multiple rules are violated', () => {
    const result = validateSubdomain('-TEST@')
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})

