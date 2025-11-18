/**
 * Application error types and utilities.
 * 
 * Provides a centralized error handling system with typed error codes
 * and consistent error messages.
 */

import { ERROR_CODES } from '../constants/index.js'

/**
 * Base application error class.
 * 
 * All application errors should extend this class to ensure
 * consistent error handling and user-friendly messages.
 */
export class AppError extends Error {
  /**
   * Creates a new application error.
   * 
   * @param message - User-friendly error message
   * @param code - Error code for programmatic handling
   * @param statusCode - Optional HTTP status code
   * @param cause - Optional original error that caused this error
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

/**
 * Player-related errors.
 */
export class PlayerError extends AppError {
  constructor(message: string, code: string, cause?: unknown) {
    super(message, code, 404, cause)
    this.name = 'PlayerError'
  }
}

/**
 * Session-related errors.
 */
export class SessionError extends AppError {
  constructor(message: string, code: string, cause?: unknown) {
    super(message, code, 400, cause)
    this.name = 'SessionError'
  }
}

/**
 * Validation errors.
 */
export class ValidationError extends AppError {
  constructor(message: string, public readonly field?: string, cause?: unknown) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, cause)
    this.name = 'ValidationError'
  }
}

/**
 * Database-related errors.
 */
export class DatabaseError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, ERROR_CODES.DATABASE_ERROR, 500, cause)
    this.name = 'DatabaseError'
  }
}

/**
 * Network-related errors.
 */
export class NetworkError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, ERROR_CODES.NETWORK_ERROR, 0, cause)
    this.name = 'NetworkError'
  }
}

/**
 * Error factory functions for common error scenarios.
 */
export const createPlayerNotFoundError = (playerId: string): PlayerError => {
  return new PlayerError(
    `Spiller med ID "${playerId}" blev ikke fundet`,
    ERROR_CODES.PLAYER_NOT_FOUND
  )
}

export const createPlayerInactiveError = (playerName: string): PlayerError => {
  return new PlayerError(
    `Spilleren "${playerName}" er inaktiv`,
    ERROR_CODES.PLAYER_INACTIVE
  )
}

export const createSessionNotFoundError = (): SessionError => {
  return new SessionError(
    'Ingen aktiv træning',
    ERROR_CODES.SESSION_NOT_FOUND
  )
}

export const createCheckInExistsError = (playerName: string): SessionError => {
  return new SessionError(
    `Spilleren "${playerName}" er allerede tjekket ind`,
    ERROR_CODES.CHECK_IN_EXISTS
  )
}

export const createCheckInNotFoundError = (playerName: string): SessionError => {
  return new SessionError(
    `Spilleren "${playerName}" er ikke tjekket ind`,
    ERROR_CODES.CHECK_IN_NOT_FOUND
  )
}

export const createCourtNotFoundError = (courtIdx: number): SessionError => {
  return new SessionError(
    `Bane ${courtIdx} blev ikke fundet`,
    ERROR_CODES.COURT_NOT_FOUND
  )
}

export const createCourtFullError = (courtIdx: number): SessionError => {
  return new SessionError(
    `Bane ${courtIdx} er fuld`,
    ERROR_CODES.COURT_FULL
  )
}

export const createSlotOccupiedError = (courtIdx: number, slot: number): SessionError => {
  return new SessionError(
    `Plads ${slot} på bane ${courtIdx} er optaget`,
    ERROR_CODES.SLOT_OCCUPIED
  )
}

/**
 * Converts an unknown error to an AppError.
 * 
 * Useful for catching and normalizing errors from external libraries
 * or unexpected error types.
 * 
 * @param error - Unknown error to convert
 * @returns AppError instance
 */
export const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error
  }
  
  if (error instanceof Error) {
    return new AppError(
      error.message || 'En ukendt fejl opstod',
      ERROR_CODES.UNKNOWN_ERROR,
      undefined,
      error
    )
  }
  
  if (typeof error === 'string') {
    return new AppError(
      error,
      ERROR_CODES.UNKNOWN_ERROR
    )
  }
  
  return new AppError(
    'En ukendt fejl opstod',
    ERROR_CODES.UNKNOWN_ERROR,
    undefined,
    error
  )
}

/**
 * Checks if an error is a specific error code.
 * 
 * @param error - Error to check
 * @param code - Error code to match
 * @returns True if error matches the code
 */
export const isErrorCode = (error: unknown, code: string): boolean => {
  return error instanceof AppError && error.code === code
}

