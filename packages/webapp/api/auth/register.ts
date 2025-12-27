import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { hashPassword, validatePasswordStrength } from '../../src/lib/auth/password.js'
import { sendVerificationEmail } from '../../src/lib/auth/email.js'
import { getPostgresClient, getDatabaseUrl } from './db-helper.js'
import { randomBytes } from 'crypto'
import { logger } from '../../src/lib/utils/logger.js'
import { setCorsHeaders } from '../../src/lib/utils/cors.js'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenantId: z.string().min(1, 'Tenant ID is required')
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = registerSchema.parse(req.body)

    // Validate password strength (includes breach check)
    const passwordValidation = await validatePasswordStrength(body.password, true)
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
        breachCount: passwordValidation.breachCount
      })
    }

    const sql = getPostgresClient(getDatabaseUrl())

    // Check if club already exists (but don't reveal this information)
    const existing = await sql`
      SELECT id FROM clubs
      WHERE email = ${body.email} OR tenant_id = ${body.tenantId}
    `

    // Always return same response to prevent user enumeration
    // If account exists, don't create it but still return success message
    if (existing.length > 0) {
      // Log the attempt but don't reveal to user
      logger.warn('Registration attempt for existing account', {
        email: body.email,
        tenantId: body.tenantId
      })
      
      // Return generic success message (same as successful registration)
      return res.status(201).json({
        success: true,
        message: 'If an account with this email does not exist, a verification email has been sent. Please check your email to verify your account.'
      })
    }

    // Hash password
    const passwordHash = await hashPassword(body.password)

    // Generate email verification token
    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create club
    const [club] = await sql`
      INSERT INTO clubs (
        tenant_id,
        email,
        password_hash,
        email_verification_token,
        email_verification_expires
      )
      VALUES (
        ${body.tenantId},
        ${body.email},
        ${passwordHash},
        ${verificationToken},
        ${verificationExpires}
      )
      RETURNING id, email, tenant_id, email_verified
    `

    // Send verification email
    try {
      await sendVerificationEmail(body.email, verificationToken, body.tenantId)
    } catch (emailError) {
      logger.error('Failed to send verification email', emailError)
      // Don't fail registration if email fails
    }

    // Return generic success message (same format as when account exists)
    return res.status(201).json({
      success: true,
      message: 'If an account with this email does not exist, a verification email has been sent. Please check your email to verify your account.'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      })
    }

    logger.error('Registration error', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Registration failed'
    })
  }
}

