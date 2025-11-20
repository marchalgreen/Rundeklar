import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAuth, requireSuperAdmin, AuthenticatedRequest } from '../../src/lib/auth/middleware.js'
import { getPostgresClient, getDatabaseUrl } from '../auth/db-helper.js'
import { getAllTenantConfigs } from '../../src/lib/admin/tenant-utils.js'
import { logger } from '../../src/lib/utils/logger.js'
import { setCorsHeaders } from '../../src/lib/utils/cors.js'

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
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
    try {
      const sql = getPostgresClient(getDatabaseUrl())
      
      // Get all coaches across all tenants
      const coaches = await sql`
        SELECT 
          id,
          email,
          username,
          role,
          email_verified,
          created_at,
          last_login,
          tenant_id
        FROM clubs
        WHERE role = 'coach'
        ORDER BY created_at DESC
      `

      // Get tenant configs to map tenant IDs to names
      const tenantConfigs = await getAllTenantConfigs()
      const tenantMap = new Map(tenantConfigs.map(t => [t.id, t.name]))

      return res.status(200).json({
        success: true,
        coaches: coaches.map((coach) => ({
          id: coach.id,
          email: coach.email,
          username: coach.username,
          role: coach.role,
          emailVerified: coach.email_verified,
          createdAt: coach.created_at,
          lastLogin: coach.last_login,
          tenantId: coach.tenant_id,
          tenantName: tenantMap.get(coach.tenant_id) || coach.tenant_id
        }))
      })
    } catch (error) {
      logger.error('Failed to fetch all coaches', error)
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch coaches' 
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

