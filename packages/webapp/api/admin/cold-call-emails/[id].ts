import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth, requireSuperAdmin, AuthenticatedRequest } from '../../../src/lib/auth/middleware.js'
import { getPostgresClient, getDatabaseUrl } from '../../auth/db-helper.js'
import { logger } from '../../../src/lib/utils/logger.js'
import { setCorsHeaders } from '../../../src/lib/utils/cors.js'

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

  if (req.method === 'DELETE') {
    try {
      const id = req.query.id as string
      
      if (!id) {
        return res.status(400).json({ error: 'Email ID is required' })
      }

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
        return res.status(404).json({ error: 'Email tracking table not found' })
      }

      // Delete the email record
      const result = await sql`
        DELETE FROM cold_call_emails
        WHERE id = ${id}
        RETURNING id
      `

      if (result.length === 0) {
        return res.status(404).json({ error: 'Email not found' })
      }

      logger.info(`Cold-call email deleted from history: ${id}`)

      return res.status(200).json({
        success: true,
        message: 'Email deleted successfully'
      })
    } catch (error) {
      logger.error('Failed to delete email from history', error)
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to delete email' 
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default handler

