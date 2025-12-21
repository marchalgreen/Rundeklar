#!/usr/bin/env tsx
/**
 * Script to automatically match players with BadmintonPlayer.dk IDs
 * 
 * This script searches for players on BadmintonPlayer.dk and updates
 * their badmintonplayer_id in the database.
 * 
 * Usage:
 *   pnpm --filter webapp exec tsx scripts/match-players-badmintonplayer.ts [tenant-id] [--dry-run] [--min-confidence=high|medium|low]
 * 
 * Options:
 *   --dry-run: Don't update database, just show what would be updated
 *   --min-confidence: Minimum confidence level to update (default: medium)
 */

import { getPostgresClient, getDatabaseUrl } from '../api/auth/db-helper.js'
import { getAllTenantConfigs, getTenantConfig } from '../src/lib/admin/tenant-utils.js'
import { matchPlayer } from '../src/lib/rankings/player-matcher.js'

interface Player {
  id: string
  name: string
  badmintonplayer_id: string | null
  gender: string | null
}

async function matchPlayersForTenant(
  tenantId: string,
  options: {
    dryRun: boolean
    minConfidence: 'high' | 'medium' | 'low'
  }
) {
  console.log('')
  console.log('🔍 Matching Players with BadmintonPlayer.dk')
  console.log('==========================================')
  console.log('')

  try {
    const config = await getTenantConfig(tenantId)
    if (!config) {
      console.error(`❌ Tenant config not found for: "${tenantId}"`)
      process.exit(1)
    }

    console.log(`📋 Tenant: "${config.name}" (${tenantId})`)
    console.log(`   Dry run: ${options.dryRun ? 'YES' : 'NO'}`)
    console.log(`   Min confidence: ${options.minConfidence}`)
    console.log('')

    const sql = getPostgresClient(getDatabaseUrl())

    // Get all players without badmintonplayer_id
    const players = await sql`
      SELECT id, name, badmintonplayer_id, gender
      FROM players
      WHERE tenant_id = ${tenantId}
        AND (badmintonplayer_id IS NULL OR badmintonplayer_id = '')
        AND active = true
      ORDER BY name
    ` as Player[]

    if (players.length === 0) {
      console.log('✅ All players already have badmintonplayer_id set')
      console.log('')
      return
    }

    console.log(`📊 Found ${players.length} players without badmintonplayer_id`)
    console.log('')

    const results = {
      matched: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ playerName: string; error: string }>
    }

    // Get club name from tenant config (might be in config.name or elsewhere)
    const clubName = config.name

    // Match each player
    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      console.log(`[${i + 1}/${players.length}] Matching: ${player.name}`)

      try {
        const match = await matchPlayer(player.id, player.name, clubName)

        if (!match) {
          results.skipped++
          console.log(`   ⏭️  No match found`)
          continue
        }

        if (!match.badmintonplayerId) {
          results.skipped++
          console.log(`   ⏭️  No ID found (confidence: ${match.confidence})`)
          continue
        }

        // Check confidence level
        const confidenceLevels = { low: 1, medium: 2, high: 3 }
        const minLevel = confidenceLevels[options.minConfidence]
        const matchLevel = confidenceLevels[match.confidence]

        if (matchLevel < minLevel) {
          results.skipped++
          console.log(`   ⏭️  Confidence too low: ${match.confidence} (min: ${options.minConfidence})`)
          console.log(`      Matched name: ${match.matchedName || 'N/A'}`)
          continue
        }

        results.matched++

        if (options.dryRun) {
          console.log(`   ✅ Would update: ${match.badmintonplayerId}`)
          console.log(`      Confidence: ${match.confidence}`)
          console.log(`      Matched name: ${match.matchedName || 'N/A'}`)
          if (match.club) {
            console.log(`      Club: ${match.club}`)
          }
        } else {
          // Update player
          await sql`
            UPDATE players
            SET badmintonplayer_id = ${match.badmintonplayerId}
            WHERE id = ${player.id}
              AND tenant_id = ${tenantId}
          `

          results.updated++
          console.log(`   ✅ Updated: ${match.badmintonplayerId}`)
          console.log(`      Confidence: ${match.confidence}`)
          console.log(`      Matched name: ${match.matchedName || 'N/A'}`)
        }

        // Add delay between requests to be polite
        if (i < players.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        results.failed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push({ playerName: player.name, error: errorMessage })
        console.log(`   ❌ Error: ${errorMessage}`)
      }

      console.log('')
    }

    // Summary
    console.log('📊 Summary:')
    console.log(`   ✅ Matched: ${results.matched}`)
    if (!options.dryRun) {
      console.log(`   ✅ Updated: ${results.updated}`)
    }
    console.log(`   ⏭️  Skipped: ${results.skipped}`)
    console.log(`   ❌ Failed: ${results.failed}`)

    if (results.errors.length > 0) {
      console.log('')
      console.log('⚠️  Errors:')
      results.errors.forEach(({ playerName, error }) => {
        console.log(`   - ${playerName}: ${error}`)
      })
    }

    console.log('')
    if (options.dryRun) {
      console.log('💡 This was a dry run. Run without --dry-run to update the database.')
    } else {
      console.log('🎉 Player matching completed!')
    }
    console.log('')
  } catch (error) {
    console.error('')
    console.error('❌ Error matching players:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const tenantId = args.find(arg => !arg.startsWith('--')) || 'herlev-hjorten'
const dryRun = args.includes('--dry-run')
const minConfidenceArg = args.find(arg => arg.startsWith('--min-confidence='))
const minConfidence = (minConfidenceArg?.split('=')[1] || 'medium') as 'high' | 'medium' | 'low'

// Run matching
matchPlayersForTenant(tenantId, { dryRun, minConfidence })

