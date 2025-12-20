#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * Diagnostic script to identify statistics data issues.
 * 
 * Checks for:
 * - Sessions without snapshots
 * - Check-ins without snapshots
 * - Mismatched data counts
 * 
 * Usage: cd packages/webapp && pnpm exec tsx scripts/diagnose-statistics.ts [tenantId]
 */

import postgres from 'postgres'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
const possiblePaths = [
  join(__dirname, '../.env.local'),  // packages/webapp/.env.local
  join(__dirname, '../../.env.local'), // root/.env.local
  join(process.cwd(), '.env.local')  // current working directory
]

let envLoaded = false
for (const envPath of possiblePaths) {
  if (existsSync(envPath)) {
    console.log(`📄 Loading environment from: ${envPath}`)
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '') // Remove quotes
          process.env[key.trim()] = value
        }
      }
    }
    envLoaded = true
    break
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env.local file found. Looking in:', possiblePaths)
  console.warn('⚠️  Make sure DATABASE_URL is set in environment or .env.local')
}

// Fallback: Use VITE_DATABASE_URL if DATABASE_URL is not set (for compatibility)
if (!process.env.DATABASE_URL && process.env.VITE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_DATABASE_URL
  console.log('📝 Using VITE_DATABASE_URL as DATABASE_URL')
}

const tenantId = process.argv[2] || 'demo'

const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED
if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL environment variable not set')
  console.error('   Please set DATABASE_URL or VITE_DATABASE_URL in .env.local')
  process.exit(1)
}

const sql = postgres(databaseUrl, {
  max: 1
})

async function diagnoseStatistics() {
  console.log(`\n🔍 Diagnosing statistics for tenant: ${tenantId}\n`)

  try {
    // Count total sessions
    const [sessionsCount] = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'ended') as ended_sessions,
        COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
        COUNT(*) as total_sessions
      FROM training_sessions
      WHERE tenant_id = ${tenantId}
    `

    // Count total snapshots
    const [snapshotsCount] = await sql`
      SELECT COUNT(*) as total_snapshots
      FROM statistics_snapshots
      WHERE tenant_id = ${tenantId}
    `

    // Count total check-ins
    const [checkInsCount] = await sql`
      SELECT COUNT(*) as total_check_ins
      FROM check_ins ci
      INNER JOIN training_sessions ts ON ci.session_id = ts.id
      WHERE ci.tenant_id = ${tenantId}
        AND ts.tenant_id = ${tenantId}
    `

    // Find sessions without snapshots
    const sessionsWithoutSnapshots = await sql`
      SELECT 
        ts.id,
        ts.date,
        ts.status,
        ts.created_at,
        (SELECT COUNT(*) FROM check_ins WHERE session_id = ts.id AND tenant_id = ${tenantId}) as check_in_count
      FROM training_sessions ts
      LEFT JOIN statistics_snapshots ss ON ts.id = ss.session_id
      WHERE ts.tenant_id = ${tenantId}
        AND ts.status = 'ended'
        AND ss.id IS NULL
      ORDER BY ts.date DESC
      LIMIT 20
    `

    // Find check-ins from sessions without snapshots
    const checkInsWithoutSnapshots = await sql`
      SELECT 
        ci.id,
        ci.session_id,
        ts.date as session_date,
        ci.player_id,
        ci.created_at
      FROM check_ins ci
      INNER JOIN training_sessions ts ON ci.session_id = ts.id
      LEFT JOIN statistics_snapshots ss ON ts.id = ss.session_id
      WHERE ci.tenant_id = ${tenantId}
        AND ts.tenant_id = ${tenantId}
        AND ts.status = 'ended'
        AND ss.id IS NULL
      ORDER BY ts.date DESC
      LIMIT 50
    `

    // Count check-ins in snapshots
    const [checkInsInSnapshots] = await sql`
      SELECT 
        SUM(jsonb_array_length(check_ins)) as total_check_ins_in_snapshots
      FROM statistics_snapshots
      WHERE tenant_id = ${tenantId}
    `

    // Count sessions in snapshots
    const [sessionsInSnapshots] = await sql`
      SELECT COUNT(DISTINCT session_id) as unique_sessions_in_snapshots
      FROM statistics_snapshots
      WHERE tenant_id = ${tenantId}
    `

    console.log('📊 Statistics Summary:')
    console.log(`   - Ended sessions: ${sessionsCount.ended_sessions}`)
    console.log(`   - Active sessions: ${sessionsCount.active_sessions}`)
    console.log(`   - Total sessions: ${sessionsCount.total_sessions}`)
    console.log(`   - Statistics snapshots: ${snapshotsCount.total_snapshots}`)
    console.log(`   - Unique sessions in snapshots: ${sessionsInSnapshots.unique_sessions_in_snapshots || 0}`)
    console.log(`   - Total check-ins: ${checkInsCount.total_check_ins}`)
    console.log(`   - Check-ins in snapshots: ${checkInsInSnapshots.total_check_ins_in_snapshots || 0}`)
    console.log('')

    // Calculate discrepancies
    const missingSnapshots = Number(sessionsCount.ended_sessions) - Number(snapshotsCount.total_snapshots)
    const missingCheckIns = Number(checkInsCount.total_check_ins) - Number(checkInsInSnapshots.total_check_ins_in_snapshots || 0)

    if (missingSnapshots > 0) {
      console.log(`⚠️  WARNING: ${missingSnapshots} ended sessions without snapshots!`)
      console.log('')
      console.log('📋 Sessions without snapshots (showing first 20):')
      sessionsWithoutSnapshots.forEach((session, index) => {
        console.log(`   ${index + 1}. Session ${session.id.substring(0, 8)}...`)
        console.log(`      Date: ${new Date(session.date).toLocaleDateString('da-DK')}`)
        console.log(`      Status: ${session.status}`)
        console.log(`      Check-ins: ${session.check_in_count}`)
        console.log(`      Created: ${new Date(session.created_at).toLocaleString('da-DK')}`)
        console.log('')
      })
    } else {
      console.log('✅ All ended sessions have snapshots')
    }

    if (missingCheckIns > 0) {
      console.log(`⚠️  WARNING: ${missingCheckIns} check-ins from sessions without snapshots!`)
      console.log('')
      console.log('📋 Check-ins without snapshots (showing first 50):')
      checkInsWithoutSnapshots.forEach((checkIn, index) => {
        console.log(`   ${index + 1}. Check-in ${checkIn.id.substring(0, 8)}...`)
        console.log(`      Session: ${checkIn.session_id.substring(0, 8)}...`)
        console.log(`      Session date: ${new Date(checkIn.session_date).toLocaleDateString('da-DK')}`)
        console.log(`      Player: ${checkIn.player_id.substring(0, 8)}...`)
        console.log('')
      })
    } else {
      console.log('✅ All check-ins are in snapshots')
    }

    // Summary
    console.log('\n📈 Data Consistency:')
    if (missingSnapshots === 0 && missingCheckIns === 0) {
      console.log('✅ All data is consistent - snapshots match sessions and check-ins')
    } else {
      console.log('❌ Data inconsistency detected!')
      console.log(`   - Missing snapshots: ${missingSnapshots}`)
      console.log(`   - Missing check-ins in snapshots: ${missingCheckIns}`)
      console.log('')
      console.log('💡 Recommendation:')
      console.log('   Run the fix script to create missing snapshots:')
      console.log('   pnpm tsx packages/webapp/scripts/fix-missing-snapshots.ts')
    }

  } catch (error) {
    console.error('❌ Error diagnosing statistics:', error)
    throw error
  } finally {
    await sql.end()
  }
}

diagnoseStatistics().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

