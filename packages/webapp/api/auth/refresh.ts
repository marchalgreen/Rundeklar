import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken
} from '../../src/lib/auth/jwt.js'
import { getPostgresClient, getDatabaseUrl } from './db-helper.js'
import { logger } from '../../src/lib/utils/logger.js'
import { setCorsHeaders } from '../../src/lib/utils/cors.js'
import { setAccessTokenCookie, setRefreshTokenCookie } from '../../src/lib/auth/cookies.js'

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always set JSON content type and CORS headers first
  res.setHeader('Content-Type', 'application/json')
  setCorsHeaders(res, req.headers.origin)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = refreshSchema.parse(req.body)

    // Get database connection safely
    let sql
    try {
      const databaseUrl = getDatabaseUrl()
      if (!databaseUrl) {
        return res.status(500).json({
          error: 'Database configuration error'
        })
      }
      sql = getPostgresClient(databaseUrl)
    } catch (dbError) {
      logger.error('Database connection failed', dbError)
      return res.status(500).json({
        error: 'Database connection failed',
        message: dbError instanceof Error ? dbError.message : 'Unknown database error'
      })
    }

    const tokenHash = await hashRefreshToken(body.refreshToken)

    // Find session with club details
    const sessions = await sql`
      SELECT cs.id, cs.club_id, cs.expires_at, c.tenant_id, c.role, c.email
      FROM club_sessions cs
      JOIN clubs c ON cs.club_id = c.id
      WHERE cs.token_hash = ${tokenHash}
        AND cs.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token'
      })
    }

    const session = sessions[0]

    // Ensure we have required fields
    if (!session.role || !session.email) {
      logger.error('Missing required fields for token generation', { session })
      return res.status(500).json({
        error: 'User data incomplete',
        message: 'Missing role or email'
      })
    }

    // Token rotation: Generate new refresh token and invalidate old one
    const newRefreshToken = await generateRefreshToken()
    const newRefreshTokenHash = await hashRefreshToken(newRefreshToken)

    // Calculate new expiry (7 days from now)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Use transaction to ensure atomicity: delete old token and create new one
    await sql.begin(async (sql) => {
      // Delete old session (invalidate old refresh token)
      await sql`
        DELETE FROM club_sessions
        WHERE token_hash = ${tokenHash}
      `

      // Create new session with new refresh token
      await sql`
        INSERT INTO club_sessions (club_id, token_hash, expires_at)
        VALUES (${session.club_id}, ${newRefreshTokenHash}, ${expiresAt})
      `
    })

    // Generate new access token
    const accessToken = generateAccessToken(
      session.club_id,
      session.tenant_id,
      session.role,
      session.email
    )

    // Set secure HttpOnly cookies if enabled
    const useHttpOnlyCookies = process.env.USE_HTTPONLY_COOKIES === 'true'
    if (useHttpOnlyCookies) {
      setAccessTokenCookie(accessToken, res)
      setRefreshTokenCookie(newRefreshToken, res)
    }

    return res.status(200).json({
      success: true,
      accessToken: useHttpOnlyCookies ? undefined : accessToken,
      refreshToken: useHttpOnlyCookies ? undefined : newRefreshToken
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      })
    }

    // Log error but don't expose internal details
    try {
      logger.error('Token refresh error', error)
      if (error instanceof Error) {
        console.error('[ERROR] Refresh handler error:', error.message)
        console.error('[ERROR] Error stack:', error.stack)
      }
    } catch {
      // If even logging fails, we're in deep trouble
    }
    
    // Always return JSON, never HTML - even for import/runtime errors
    try {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Access-Control-Allow-Origin', '*')
      return res.status(500).json({
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      })
    } catch {
      // If even setting headers fails, return minimal JSON
      return res.status(500).json({ error: 'Server error' })
    }
  }
}

