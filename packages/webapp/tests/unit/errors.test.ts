/**
 * Unit tests for error handling utilities
 */

import { describe, it, expect } from 'vitest'
import {
  AppError,
  PlayerError,
  SessionError,
  ValidationError,
  DatabaseError,
  NetworkError,
  createPlayerNotFoundError,
  createPlayerInactiveError,
  createSessionNotFoundError,
  createCheckInExistsError,
  createCheckInNotFoundError,
  createCourtNotFoundError,
  createCourtFullError,
  createSlotOccupiedError,
  normalizeError,
  isErrorCode
} from '../../src/lib/errors'
import { ERROR_CODES } from '../../src/constants'

describe('AppError', () => {
  it('should create error with message and code', () => {
    const error = new AppError('Test error', 'TEST_CODE')
    expect(error.message).toBe('Test error')
    expect(error.code).toBe('TEST_CODE')
    expect(error.name).toBe('AppError')
  })

  it('should include statusCode when provided', () => {
    const error = new AppError('Test error', 'TEST_CODE', 404)
    expect(error.statusCode).toBe(404)
  })

  it('should include cause when provided', () => {
    const cause = new Error('Original error')
    const error = new AppError('Test error', 'TEST_CODE', undefined, cause)
    expect(error.cause).toBe(cause)
  })
})

describe('PlayerError', () => {
  it('should create player error with 404 status', () => {
    const error = new PlayerError('Player not found', 'PLAYER_NOT_FOUND')
    expect(error.statusCode).toBe(404)
    expect(error.name).toBe('PlayerError')
  })
})

describe('SessionError', () => {
  it('should create session error with 400 status', () => {
    const error = new SessionError('Session error', 'SESSION_ERROR')
    expect(error.statusCode).toBe(400)
    expect(error.name).toBe('SessionError')
  })
})

describe('ValidationError', () => {
  it('should create validation error with field', () => {
    const error = new ValidationError('Invalid input', 'email')
    expect(error.statusCode).toBe(400)
    expect(error.field).toBe('email')
    expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR)
  })

  it('should create validation error without field', () => {
    const error = new ValidationError('Invalid input')
    expect(error.field).toBeUndefined()
  })
})

describe('DatabaseError', () => {
  it('should create database error with 500 status', () => {
    const error = new DatabaseError('Database error')
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe(ERROR_CODES.DATABASE_ERROR)
  })
})

describe('NetworkError', () => {
  it('should create network error with 0 status', () => {
    const error = new NetworkError('Network error')
    expect(error.statusCode).toBe(0)
    expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR)
  })
})

describe('Error factory functions', () => {
  it('createPlayerNotFoundError should create correct error', () => {
    const error = createPlayerNotFoundError('player-123')
    expect(error).toBeInstanceOf(PlayerError)
    expect(error.message).toContain('player-123')
    expect(error.code).toBe(ERROR_CODES.PLAYER_NOT_FOUND)
  })

  it('createPlayerInactiveError should create correct error', () => {
    const error = createPlayerInactiveError('John Doe')
    expect(error).toBeInstanceOf(PlayerError)
    expect(error.message).toContain('John Doe')
    expect(error.code).toBe(ERROR_CODES.PLAYER_INACTIVE)
  })

  it('createSessionNotFoundError should create correct error', () => {
    const error = createSessionNotFoundError()
    expect(error).toBeInstanceOf(SessionError)
    expect(error.message).toContain('aktiv træning')
    expect(error.code).toBe(ERROR_CODES.SESSION_NOT_FOUND)
  })

  it('createCheckInExistsError should create correct error', () => {
    const error = createCheckInExistsError('John Doe')
    expect(error).toBeInstanceOf(SessionError)
    expect(error.message).toContain('John Doe')
    expect(error.code).toBe(ERROR_CODES.CHECK_IN_EXISTS)
  })

  it('createCheckInNotFoundError should create correct error', () => {
    const error = createCheckInNotFoundError('John Doe')
    expect(error).toBeInstanceOf(SessionError)
    expect(error.message).toContain('John Doe')
    expect(error.code).toBe(ERROR_CODES.CHECK_IN_NOT_FOUND)
  })

  it('createCourtNotFoundError should create correct error', () => {
    const error = createCourtNotFoundError(5)
    expect(error).toBeInstanceOf(SessionError)
    expect(error.message).toContain('5')
    expect(error.code).toBe(ERROR_CODES.COURT_NOT_FOUND)
  })

  it('createCourtFullError should create correct error', () => {
    const error = createCourtFullError(3)
    expect(error).toBeInstanceOf(SessionError)
    expect(error.message).toContain('3')
    expect(error.code).toBe(ERROR_CODES.COURT_FULL)
  })

  it('createSlotOccupiedError should create correct error', () => {
    const error = createSlotOccupiedError(2, 1)
    expect(error).toBeInstanceOf(SessionError)
    expect(error.message).toContain('2')
    expect(error.message).toContain('1')
    expect(error.code).toBe(ERROR_CODES.SLOT_OCCUPIED)
  })
})

describe('normalizeError', () => {
  it('should return AppError as-is', () => {
    const originalError = new AppError('Test', 'TEST_CODE')
    const normalized = normalizeError(originalError)
    expect(normalized).toBe(originalError)
  })

  it('should convert Error to AppError', () => {
    const originalError = new Error('Original error')
    const normalized = normalizeError(originalError)
    expect(normalized).toBeInstanceOf(AppError)
    expect(normalized.message).toBe('Original error')
    expect(normalized.code).toBe(ERROR_CODES.UNKNOWN_ERROR)
    expect(normalized.cause).toBe(originalError)
  })

  it('should convert string to AppError', () => {
    const normalized = normalizeError('String error')
    expect(normalized).toBeInstanceOf(AppError)
    expect(normalized.message).toBe('String error')
    expect(normalized.code).toBe(ERROR_CODES.UNKNOWN_ERROR)
  })

  it('should handle Error without message', () => {
    const originalError = new Error()
    const normalized = normalizeError(originalError)
    expect(normalized.message).toBe('En ukendt fejl opstod')
  })

  it('should handle unknown error type', () => {
    const normalized = normalizeError({ some: 'object' })
    expect(normalized).toBeInstanceOf(AppError)
    expect(normalized.message).toBe('En ukendt fejl opstod')
    expect(normalized.code).toBe(ERROR_CODES.UNKNOWN_ERROR)
  })

  it('should preserve cause for unknown types', () => {
    const cause = { some: 'object' }
    const normalized = normalizeError(cause)
    expect(normalized.cause).toBe(cause)
  })
})

describe('isErrorCode', () => {
  it('should return true for matching error code', () => {
    const error = new AppError('Test', ERROR_CODES.PLAYER_NOT_FOUND)
    expect(isErrorCode(error, ERROR_CODES.PLAYER_NOT_FOUND)).toBe(true)
  })

  it('should return false for non-matching error code', () => {
    const error = new AppError('Test', ERROR_CODES.PLAYER_NOT_FOUND)
    expect(isErrorCode(error, ERROR_CODES.SESSION_NOT_FOUND)).toBe(false)
  })

  it('should return false for non-AppError', () => {
    const error = new Error('Regular error')
    expect(isErrorCode(error, ERROR_CODES.PLAYER_NOT_FOUND)).toBe(false)
  })

  it('should return false for null', () => {
    expect(isErrorCode(null, ERROR_CODES.PLAYER_NOT_FOUND)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isErrorCode(undefined, ERROR_CODES.PLAYER_NOT_FOUND)).toBe(false)
  })
})

