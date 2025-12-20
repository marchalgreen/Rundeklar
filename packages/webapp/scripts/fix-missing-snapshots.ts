#!/usr/bin/env tsx
/**
 * Fix script to create missing statistics snapshots for ended sessions.
 * 
 * This script finds all ended sessions without snapshots and creates snapshots for them.
 * 
 * Usage: pnpm tsx packages/webapp/scripts/fix-missing-snapshots.ts [tenantId]
 */

import postgres from 'postgres'
import { createId } from '@paralleldrive/cuid2'

const tenantId = process.argv[2] || 'demo'

const sql = postgres(process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || '', {
  max: 1
})

function getSeasonFromDate(date: string): string {
  const d = new Date(date)
  const month = d.getMonth() + 1 // 1-12
  const year = d.getFullYear()
  // Seasons run from August to July
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

async function fixMissingSnapshots() {
  console.log(`\n🔧 Fixing missing snapshots for tenant: ${tenantId}\n`)

  try {
    // Find sessions without snapshots
    const sessionsWithoutSnapshots = await sql`
      SELECT 
        ts.id,
        ts.date,
        ts.status,
        ts.created_at
      FROM training_sessions ts
      LEFT JOIN statistics_snapshots ss ON ts.id = ss.session_id
      WHERE ts.tenant_id = ${tenantId}
        AND ts.status = 'ended'
        AND ss.id IS NULL
      ORDER BY ts.date ASC
    `

    if (sessionsWithoutSnapshots.length === 0) {
      console.log('✅ No missing snapshots found - all sessions have snapshots!')
      return
    }

    console.log(`Found ${sessionsWithoutSnapshots.length} sessions without snapshots`)
    console.log('')

    let created = 0
    let skipped = 0
    let errors = 0

    for (const session of sessionsWithoutSnapshots) {
      try {
        // Get check-ins for this session
        const checkIns = await sql`
          SELECT * FROM check_ins
          WHERE session_id = ${session.id}
            AND tenant_id = ${tenantId}
        `

        // Get matches for this session
        const matches = await sql`
          SELECT * FROM matches
          WHERE session_id = ${session.id}
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

        // Check if snapshot already exists (race condition check)
        const [existing] = await sql`
          SELECT id FROM statistics_snapshots
          WHERE session_id = ${session.id}
            AND tenant_id = ${tenantId}
        `

        if (existing) {
          console.log(`⏭️  Skipping session ${session.id.substring(0, 8)}... (snapshot already exists)`)
          skipped++
          continue
        }

        // Create snapshot
        const season = getSeasonFromDate(session.date)
        const snapshotId = createId()

        await sql`
          INSERT INTO statistics_snapshots (
            id,
            session_id,
            session_date,
            season,
            matches,
            match_players,
            check_ins,
            tenant_id,
            created_at
          )
          VALUES (
            ${snapshotId},
            ${session.id},
            ${session.date},
            ${season},
            ${JSON.stringify(matches)},
            ${JSON.stringify(matchPlayers)},
            ${JSON.stringify(checkIns)},
            ${tenantId},
            NOW()
          )
        `

        console.log(`✅ Created snapshot for session ${session.id.substring(0, 8)}...`)
        console.log(`   Date: ${new Date(session.date).toLocaleDateString('da-DK')}`)
        console.log(`   Check-ins: ${checkIns.length}`)
        console.log(`   Matches: ${matches.length}`)
        console.log(`   Match players: ${matchPlayers.length}`)
        console.log('')
        created++

      } catch (error) {
        console.error(`❌ Error creating snapshot for session ${session.id.substring(0, 8)}...:`, error)
        errors++
      }
    }

    console.log('\n📊 Summary:')
    console.log(`   - Created: ${created}`)
    console.log(`   - Skipped: ${skipped}`)
    console.log(`   - Errors: ${errors}`)
    console.log('')

    if (created > 0) {
      console.log('✅ Successfully created missing snapshots!')
    }

  } catch (error) {
    console.error('❌ Error fixing missing snapshots:', error)
    throw error
  } finally {
    await sql.end()
  }
}

fixMissingSnapshots().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

