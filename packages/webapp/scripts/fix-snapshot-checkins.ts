#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * Fix script to update existing snapshots with missing check-ins.
 * 
 * This script finds all snapshots that have sessions with check-ins but the snapshots
 * don't have check-ins stored, and updates the snapshots with the correct check-ins data.
 * 
 * Usage: cd packages/webapp && pnpm exec tsx scripts/fix-snapshot-checkins.ts [tenantId]
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

function getSeasonFromDate(date: string): string {
  const d = new Date(date)
  const month = d.getMonth() + 1 // 1-12
  const year = d.getFullYear()
  // Seasons run from August to July
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

async function fixSnapshotCheckIns() {
  console.log(`\n🔧 Fixing check-ins in snapshots for tenant: ${tenantId}\n`)

  try {
    // Find snapshots that have sessions with check-ins but snapshots don't have check-ins
    const snapshotsToFix = await sql`
      SELECT 
        ss.id as snapshot_id,
        ss.session_id,
        ss.session_date,
        ss.season,
        ss.check_ins as snapshot_check_ins,
        (
          SELECT COUNT(*) 
          FROM check_ins ci 
          WHERE ci.session_id = ss.session_id 
            AND ci.tenant_id = ${tenantId}
        ) as actual_check_in_count
      FROM statistics_snapshots ss
      WHERE ss.tenant_id = ${tenantId}
        AND (
          ss.check_ins IS NULL 
          OR jsonb_typeof(ss.check_ins) != 'array'
          OR jsonb_array_length(ss.check_ins) = 0
        )
        AND EXISTS (
          SELECT 1 
          FROM check_ins ci 
          WHERE ci.session_id = ss.session_id 
            AND ci.tenant_id = ${tenantId}
        )
      ORDER BY ss.session_date DESC
    `

    if (snapshotsToFix.length === 0) {
      console.log('✅ No snapshots need fixing - all snapshots have check-ins!')
      return
    }

    console.log(`Found ${snapshotsToFix.length} snapshots that need check-ins updated`)
    console.log('')

    let updated = 0
    let errors = 0

    for (const snapshot of snapshotsToFix) {
      try {
        // Get actual check-ins for this session
        const checkIns = await sql`
          SELECT * FROM check_ins
          WHERE session_id = ${snapshot.session_id}
            AND tenant_id = ${tenantId}
          ORDER BY created_at
        `

        // Get matches for this session
        const matches = await sql`
          SELECT * FROM matches
          WHERE session_id = ${snapshot.session_id}
            AND tenant_id = ${tenantId}
        `

        // Get match players for matches in this session
        const matchPlayerIds = matches.map(m => m.id)
        const matchPlayers = matchPlayerIds.length > 0
          ? await sql`
              SELECT * FROM match_players
              WHERE match_id = ANY(${matchPlayerIds})
                AND tenant_id = ${tenantId}
            `
          : []

        // Update snapshot with correct check-ins
        await sql`
          UPDATE statistics_snapshots
          SET 
            check_ins = ${JSON.stringify(checkIns)},
            matches = ${JSON.stringify(matches)},
            match_players = ${JSON.stringify(matchPlayers)}
          WHERE id = ${snapshot.snapshot_id}
            AND tenant_id = ${tenantId}
        `

        console.log(`✅ Updated snapshot for session ${snapshot.session_id.substring(0, 8)}...`)
        console.log(`   Date: ${new Date(snapshot.session_date).toLocaleDateString('da-DK')}`)
        console.log(`   Check-ins: ${checkIns.length}`)
        console.log(`   Matches: ${matches.length}`)
        console.log(`   Match players: ${matchPlayers.length}`)
        console.log('')
        updated++

      } catch (error) {
        console.error(`❌ Error updating snapshot ${snapshot.snapshot_id.substring(0, 8)}...:`, error)
        errors++
      }
    }

    console.log('\n📊 Summary:')
    console.log(`   - Updated: ${updated}`)
    console.log(`   - Errors: ${errors}`)
    console.log('')

    if (updated > 0) {
      console.log('✅ Successfully updated snapshots with check-ins!')
    }

  } catch (error) {
    console.error('❌ Error fixing snapshot check-ins:', error)
    throw error
  } finally {
    await sql.end()
  }
}

fixSnapshotCheckIns().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

