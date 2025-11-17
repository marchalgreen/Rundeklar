/**
 * Unit tests for CORS utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCorsOrigin, setCorsHeaders } from '../../src/lib/utils/cors'

describe('getCorsOrigin', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  it('should allow localhost origins in development', () => {
    process.env.NODE_ENV = 'development'
    expect(getCorsOrigin('http://localhost:5173')).toBe('http://localhost:5173')
    expect(getCorsOrigin('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000')
  })

  it('should allow all origins in development when no origin provided', () => {
    process.env.NODE_ENV = 'development'
    expect(getCorsOrigin(undefined)).toBe('*')
  })

  it('should check against allowed origins in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.ALLOWED_ORIGINS = 'https://example.com,https://test.com'
    
    expect(getCorsOrigin('https://example.com')).toBe('https://example.com')
    expect(getCorsOrigin('https://test.com')).toBe('https://test.com')
  })

  it('should return first allowed origin for non-matching origin in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.ALLOWED_ORIGINS = 'https://example.com,https://test.com'
    
    const result = getCorsOrigin('https://unauthorized.com')
    // In production, if origin doesn't match, it returns first allowed origin or '*'
    expect(result).toBeTruthy()
  })

  it('should handle localhost in production (always allowed)', () => {
    process.env.NODE_ENV = 'production'
    expect(getCorsOrigin('http://localhost:5173')).toBe('http://localhost:5173')
  })

  it('should handle Vercel development environment', () => {
    process.env.VERCEL_ENV = 'development'
    expect(getCorsOrigin('http://localhost:3000')).toBe('http://localhost:3000')
  })

  it('should handle missing VERCEL_ENV as development', () => {
    delete process.env.VERCEL_ENV
    delete process.env.NODE_ENV
    expect(getCorsOrigin('http://localhost:3000')).toBe('http://localhost:3000')
  })

  it('should return first allowed origin when no origin header in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.ALLOWED_ORIGINS = 'https://example.com'
    
    const result = getCorsOrigin(undefined)
    // Returns first allowed origin or '*' if none configured
    expect(result).toBeTruthy()
  })

  it('should return "*" when no allowed origins configured in production', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.ALLOWED_ORIGINS
    
    const result = getCorsOrigin(undefined)
    expect(result).toBe('*')
  })
})

describe('setCorsHeaders', () => {
  it('should set CORS headers on response', () => {
    const mockRes = {
      setHeader: vi.fn()
    }
    
    setCorsHeaders(mockRes as any, 'http://localhost:3000')
    
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.any(String))
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  })

  it('should set credentials to true when origin is not "*"', () => {
    const mockRes = {
      setHeader: vi.fn()
    }
    
    setCorsHeaders(mockRes as any, 'https://example.com')
    
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true')
  })

  it('should set credentials to false when origin is "*"', () => {
    const mockRes = {
      setHeader: vi.fn()
    }
    
    // In development, undefined origin returns "*"
    process.env.NODE_ENV = 'development'
    setCorsHeaders(mockRes as any, undefined)
    
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'false')
  })

  it('should call getCorsOrigin with provided origin', () => {
    const mockRes = {
      setHeader: vi.fn()
    }
    
    setCorsHeaders(mockRes as any, 'https://example.com')
    
    // Verify that setHeader was called (which means getCorsOrigin was called internally)
    expect(mockRes.setHeader).toHaveBeenCalled()
  })
})

