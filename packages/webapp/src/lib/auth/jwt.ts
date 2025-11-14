import jwt from 'jsonwebtoken'
import crypto from 'crypto'

function getJWTSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET || process.env.VITE_AUTH_JWT_SECRET
  if (!secret) {
    throw new Error('AUTH_JWT_SECRET environment variable is required')
  }
  return secret
}

const JWT_SECRET = getJWTSecret()

export interface JWTPayload {
  clubId: string
  tenantId: string
  type: 'access' | 'refresh'
}

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

/**
 * Generate an access token for a club
 * @param clubId - Club UUID
 * @param tenantId - Tenant ID
 * @returns JWT access token (15min expiry)
 */
export function generateAccessToken(clubId: string, tenantId: string): string {
  const payload: JWTPayload = {
    clubId,
    tenantId,
    type: 'access'
  }
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'herlev-hjorten-auth'
  })
}

/**
 * Generate a refresh token string (random, not JWT)
 * @returns Random token string
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Verify and decode an access token
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as JWTPayload
    if (decoded.type !== 'access') {
      return null
    }
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Hash a refresh token for storage
 * @param token - Refresh token to hash
 * @returns Hashed token
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Verify a refresh token against its hash
 * @param token - Plain refresh token
 * @param hash - Stored hash
 * @returns True if token matches hash
 */
export function verifyRefreshTokenHash(token: string, hash: string): boolean {
  const tokenHash = hashRefreshToken(token)
  return tokenHash === hash
}

