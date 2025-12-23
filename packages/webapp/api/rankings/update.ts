/**
 * Vercel API Route - Ranking Update
 * 
 * Updates player rankings from BadmintonPlayer.dk.
 * Can be called manually or via Vercel Cron.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPostgresClient, getDatabaseUrl } from '../auth/db-helper.js'
import { updatePlayerRankings } from '../../src/lib/rankings/ranking-service.js'
import { getAllTenantConfigs, getTenantConfig } from '../../src/lib/admin/tenant-utils.js'
import { logger } from '../../src/lib/utils/logger.js'
import { setCorsHeaders } from '../../src/lib/utils/cors.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin)
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get tenantId from query params (for manual calls) or process all tenants (for cron)
    // Vercel cron jobs will call without tenantId, which triggers update for all tenants
    const tenantId = req.query.tenantId as string | undefined

    const sql = getPostgresClient(getDatabaseUrl())

    if (tenantId) {
      // Update single tenant
      logger.info(`[Ranking Update API] Updating rankings for tenant: ${tenantId}`)
      const tenantConfig = await getTenantConfig(tenantId)
      const result = await updatePlayerRankings(sql, tenantId, tenantConfig || undefined)

      return res.status(200).json({
        success: true,
        tenantId,
        result
      })
    } else {
      // Update all tenants (for cron job)
      logger.info('[Ranking Update API] Updating rankings for all tenants')
      const tenants = await getAllTenantConfigs()
      const results: Array<{ tenantId: string; result: Awaited<ReturnType<typeof updatePlayerRankings>> }> = []

      for (const tenant of tenants) {
        try {
          const result = await updatePlayerRankings(sql, tenant.id, tenant)
          results.push({ tenantId: tenant.id, result })
        } catch (error) {
          logger.error(`[Ranking Update API] Failed to update tenant ${tenant.id}`, error)
          results.push({
            tenantId: tenant.id,
            result: {
              updated: 0,
              failed: 0,
              skipped: 0,
              errors: [{ playerId: '', error: error instanceof Error ? error.message : 'Unknown error' }]
            }
          })
        }
      }

      const summary = {
        totalTenants: tenants.length,
        totalUpdated: results.reduce((sum, r) => sum + r.result.updated, 0),
        totalFailed: results.reduce((sum, r) => sum + r.result.failed, 0),
        totalSkipped: results.reduce((sum, r) => sum + r.result.skipped, 0)
      }

      return res.status(200).json({
        success: true,
        summary,
        results
      })
    }
  } catch (error) {
    logger.error('[Ranking Update API] Fatal error', error)
    return res.status(500).json({
      error: 'Failed to update rankings',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

