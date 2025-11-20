import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { requireAuth, requireSuperAdmin, AuthenticatedRequest } from '../../src/lib/auth/middleware.js'
import { sendColdCallEmail } from '../../src/lib/auth/email.js'
import { getPostgresClient, getDatabaseUrl } from '../auth/db-helper.js'
import { logger } from '../../src/lib/utils/logger.js'
import { setCorsHeaders } from '../../src/lib/utils/cors.js'

const sendEmailSchema = z.object({
  email: z.string().email('Valid email is required'),
  clubName: z.string().min(1, 'Club name is required'),
  presidentName: z.string().min(1, 'President name is required')
})

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  setCorsHeaders(res)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    await requireAuth(req)
    requireSuperAdmin(req)
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    // Get email history
    try {
      const sql = getPostgresClient(getDatabaseUrl())
      
      // Check if table exists first
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'cold_call_emails'
        )
      `
      
      if (!tableExists[0]?.exists) {
        // Table doesn't exist - return empty array
        return res.status(200).json({
          history: []
        })
      }
      
      const result = await sql`
        SELECT 
          id,
          email,
          club_name as "clubName",
          president_name as "presidentName",
          sent_at as "sentAt",
          status,
          resend_id as "resendId"
        FROM cold_call_emails
        ORDER BY sent_at DESC
        LIMIT 100
      `

      return res.status(200).json({
        history: result || []
      })
    } catch (error) {
      logger.error('Failed to fetch email history', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch email history'
      
      // If table doesn't exist, return empty array instead of error
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorMessage.includes('cold_call_emails')) {
        return res.status(200).json({
          history: []
        })
      }
      
      return res.status(500).json({ error: errorMessage })
    }
  }

  if (req.method === 'POST') {
    // Send email
    try {
      const body = sendEmailSchema.parse(req.body)
      
      // Send email
      await sendColdCallEmail(
        body.email,
        body.clubName,
        body.presidentName
      )

      // Store in database for tracking (if table exists)
      try {
        const sql = getPostgresClient(getDatabaseUrl())
        
        // Check if table exists first
        const tableExists = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'cold_call_emails'
          )
        `
        
        if (tableExists[0]?.exists) {
          const result = await sql`
            INSERT INTO cold_call_emails (email, club_name, president_name, status, sent_at)
            VALUES (${body.email}, ${body.clubName}, ${body.presidentName}, 'sent', NOW())
            RETURNING id, email, club_name as "clubName", president_name as "presidentName", sent_at as "sentAt", status
          `
          
          logger.info(`Cold-call email sent and tracked: ${body.email} for ${body.clubName}`)
          
          return res.status(200).json({
            success: true,
            email: result[0]
          })
        } else {
          // Table doesn't exist - email sent but not tracked
          logger.warn(`Cold-call email sent but table doesn't exist: ${body.email} for ${body.clubName}`)
          return res.status(200).json({
            success: true,
            email: {
              email: body.email,
              clubName: body.clubName,
              presidentName: body.presidentName,
              status: 'sent',
              sentAt: new Date().toISOString()
            },
            warning: 'Email sent but tracking table not found. Please run migration 014_add_cold_call_emails_tracking.sql'
          })
        }
      } catch (dbError) {
        // Database error - email was sent but tracking failed
        logger.error('Failed to track email in database', dbError)
        return res.status(200).json({
          success: true,
          email: {
            email: body.email,
            clubName: body.clubName,
            presidentName: body.presidentName,
            status: 'sent',
            sentAt: new Date().toISOString()
          },
          warning: 'Email sent but tracking failed. Please check database migration.'
        })
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message })
      }

      logger.error('Failed to send cold-call email', error)
      
      // Try to store failed attempt
      try {
        const sql = getPostgresClient(getDatabaseUrl())
        await sql`
          INSERT INTO cold_call_emails (email, club_name, president_name, status, sent_at)
          VALUES (${req.body.email}, ${req.body.clubName}, ${req.body.presidentName}, 'failed', NOW())
        `
      } catch (dbError) {
        logger.error('Failed to store failed email attempt', dbError)
      }

      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default handler

