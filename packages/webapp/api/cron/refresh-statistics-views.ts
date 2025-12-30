/**
 * Vercel API Route - Statistics Views Refresh Cron Job
 * 
 * Refreshes materialized views for statistics performance optimization.
 * Runs nightly at 2 AM via Vercel Cron Job.
 * 
 * This endpoint can also be called manually for testing.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import postgres from 'postgres'
import { logger } from '../../src/lib/utils/logger.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json')

  // Verify cron secret (Vercel automatically adds this header for cron jobs)
  // For manual testing, you can skip this check or use the CRON_SECRET env var
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  
  // Allow manual calls without auth in development, but require it in production
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[cron/refresh-statistics-views] Unauthorized refresh attempt', {
        hasAuthHeader: !!authHeader,
        hasCronSecret: !!cronSecret
      })
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  const startTime = Date.now()
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL

  if (!databaseUrl) {
    logger.error('[cron/refresh-statistics-views] DATABASE_URL not configured')
    return res.status(500).json({ error: 'Database URL not configured' })
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: 'require'
  })

  try {
    logger.info('[cron/refresh-statistics-views] Starting statistics views refresh')
    
    // Use CONCURRENTLY for zero-downtime refresh
    await sql`SELECT refresh_statistics_views()`
    
    const duration = Date.now() - startTime
    
    // Get row counts for verification
    const viewCounts = await sql`
      SELECT 
        'training_group_attendance_view' as view_name,
        COUNT(*) as row_count
      FROM training_group_attendance_view
      UNION ALL
      SELECT 
        'weekday_attendance_view' as view_name,
        COUNT(*) as row_count
      FROM weekday_attendance_view
      UNION ALL
      SELECT 
        'training_group_attendance_aggregated_view' as view_name,
        COUNT(*) as row_count
      FROM training_group_attendance_aggregated_view
    `
    
    logger.info('[cron/refresh-statistics-views] Statistics views refreshed successfully', {
      duration: `${duration}ms`,
      viewCounts: viewCounts.reduce((acc: Record<string, number>, row: any) => {
        acc[row.view_name] = Number(row.row_count)
        return acc
      }, {})
    })
    
    return res.status(200).json({
      success: true,
      duration: `${duration}ms`,
      viewCounts: viewCounts.reduce((acc: Record<string, number>, row: any) => {
        acc[row.view_name] = Number(row.row_count)
        return acc
      }, {})
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('[cron/refresh-statistics-views] Statistics views refresh failed', {
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`
    })
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`
    })
  } finally {
    await sql.end()
  }
}

