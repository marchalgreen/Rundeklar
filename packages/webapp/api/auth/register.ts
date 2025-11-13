import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { hashPassword, validatePasswordStrength } from '../../src/lib/auth/password'
import { sendVerificationEmail } from '../../src/lib/auth/email'
import { getPostgresClient, getDatabaseUrl } from './db-helper'
import { randomBytes } from 'crypto'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenantId: z.string().min(1, 'Tenant ID is required')
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = registerSchema.parse(req.body)

    // Validate password strength
    const passwordValidation = validatePasswordStrength(body.password)
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      })
    }

    const sql = getPostgresClient(getDatabaseUrl())

    // Check if club already exists
    const existing = await sql`
      SELECT id FROM clubs
      WHERE email = ${body.email} OR tenant_id = ${body.tenantId}
    `

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'Club with this email or tenant ID already exists'
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
      console.error('Failed to send verification email:', emailError)
      // Don't fail registration if email fails
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      club: {
        id: club.id,
        email: club.email,
        tenantId: club.tenant_id,
        emailVerified: club.email_verified
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      })
    }

    console.error('Registration error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Registration failed'
    })
  }
}

