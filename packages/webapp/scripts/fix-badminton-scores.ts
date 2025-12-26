#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * Fix badminton match results script.
 * 
 * This script updates all existing badminton match results to follow proper badminton rules:
 * - Minimum 2-point difference (except 30-29)
 * - Proper 2-set or 3-set matches (60% 2-set, 40% 3-set)
 * - Valid score structure with sets array only (no root-level team1/team2)
 * 
 * Usage:
 *   pnpm exec tsx packages/webapp/scripts/fix-badminton-scores.ts [tenant-id]
 * 
 * Examples:
 *   pnpm exec tsx packages/webapp/scripts/fix-badminton-scores.ts demo
 *   pnpm exec tsx packages/webapp/scripts/fix-badminton-scores.ts herlev-hjorten
 * 
 * WARNING: This will UPDATE existing match results in the database.
 */

import postgres from 'postgres'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { loadTenantConfig } from '../src/lib/tenant'
import type { BadmintonScoreData } from '@rundeklar/common'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
const possiblePaths = [
  join(__dirname, '../.env.local'),
  join(__dirname, '../../.env.local'),
  join(process.cwd(), '.env.local')
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
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
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
}

if (!process.env.DATABASE_URL && process.env.VITE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_DATABASE_URL
  console.log('📝 Using VITE_DATABASE_URL as DATABASE_URL')
}

/**
 * Generates realistic badminton scores following validation rules.
 * Rules:
 * - Maximum score: 30
 * - Minimum winning score: 21
 * - Minimum score difference: 2 points (except 30-29 is valid)
 * - Valid scores: 21-19, 22-20, 23-21, ..., 29-27, 30-29
 * - Invalid scores: 21-20, 22-21, 31-29 (not enough difference)
 * - 40% of matches are 3-set matches
 */
function generateBadmintonScore(): BadmintonScoreData {
  // Determine if 2-set or 3-set match (60% chance of 2-set, 40% chance of 3-set)
  const isThreeSet = Math.random() < 0.4
  
  // Helper to generate valid losing score (ensuring 2+ point difference)
  function generateLosingScore(winningScore: number): number {
    if (winningScore === 30) return 29 // Special case: 30-29 is valid
    
    // Ensure at least 2 point difference, max losing score is winningScore - 2
    const maxLosing = winningScore - 2
    
    // Realistic losing scores: between 15-20 for 21, or winningScore-2 for higher
    const minLosing = winningScore === 21 ? 15 : Math.max(15, winningScore - 5)
    const actualMaxLosing = Math.min(maxLosing, winningScore === 21 ? 20 : maxLosing)
    
    return Math.floor(Math.random() * (actualMaxLosing - minLosing + 1)) + minLosing
  }
  
  // Helper to generate winning score (usually 21, sometimes 22-30)
  function generateWinningScore(): number {
    if (Math.random() < 0.05) {
      // 5% chance of special scores (22-30)
      return 21 + Math.floor(Math.random() * 9) + 1 // 22-30
    }
    return 21
  }
  
  if (isThreeSet) {
    // 3-set match: team1 wins first, team2 wins second, team1 wins third
    const set1Winner = generateWinningScore()
    const set1Loser = generateLosingScore(set1Winner)
    
    const set2Winner = generateWinningScore()
    const set2Loser = generateLosingScore(set2Winner)
    
    const set3Winner = generateWinningScore()
    const set3Loser = generateLosingScore(set3Winner)
    
    return {
      sets: [
        { team1: set1Winner, team2: set1Loser },
        { team1: set2Loser, team2: set2Winner },
        { team1: set3Winner, team2: set3Loser }
      ],
      winner: 'team1'
    }
  } else {
    // 2-set match
    const team1Wins = Math.random() < 0.5
    const set1Winner = generateWinningScore()
    const set1Loser = generateLosingScore(set1Winner)
    
    const set2Winner = generateWinningScore()
    const set2Loser = generateLosingScore(set2Winner)
    
    return {
      sets: team1Wins 
        ? [
            { team1: set1Winner, team2: set1Loser },
            { team1: set2Winner, team2: set2Loser }
          ]
        : [
            { team1: set1Loser, team2: set1Winner },
            { team1: set2Loser, team2: set2Winner }
          ],
      winner: team1Wins ? 'team1' : 'team2'
    }
  }
}

/**
 * Main function to fix badminton match results.
 */
async function fixBadmintonScores() {
  const tenantId = process.argv[2] || 'demo'
  console.log('🏸 Starting badminton score fix...')
  console.log(`📋 Using tenant: ${tenantId}`)
  console.log('')

  try {
    // Load tenant config
    const config = await loadTenantConfig(tenantId)
    
    if (!config.postgresUrl) {
      console.error(`❌ Tenant config for "${tenantId}" is missing postgresUrl.`)
      console.error(`Please update packages/webapp/src/config/tenants/${tenantId}.json with your Neon postgresUrl,`)
      console.error(`or set DATABASE_URL environment variable.`)
      process.exit(1)
    }

    // Create Postgres client
    const sql = postgres(config.postgresUrl, {
      ssl: 'require',
      max: 1
    })

    // Test connection
    console.log('🔌 Testing database connection...')
    await sql`SELECT 1`
    console.log('✅ Connected to database')
    console.log('')

    // Count existing badminton match results
    const [stats] = await sql`
      SELECT COUNT(*) as count
      FROM match_results
      WHERE tenant_id = ${tenantId} AND sport = 'badminton'
    `
    const totalCount = Number(stats.count)
    
    if (totalCount === 0) {
      console.log('ℹ️  No badminton match results found for this tenant.')
      await sql.end()
      process.exit(0)
    }

    console.log(`📊 Found ${totalCount} badminton match results to update`)
    console.log('')

    // Fetch all badminton match results
    const matchResults = await sql`
      SELECT id, match_id, score_data, winner_team
      FROM match_results
      WHERE tenant_id = ${tenantId} AND sport = 'badminton'
      ORDER BY created_at ASC
    `

    console.log(`🔄 Updating ${matchResults.length} match results...`)
    console.log('')

    let updated = 0
    let errors = 0

    // Update each match result
    for (const matchResult of matchResults) {
      try {
        // Generate new correct score
        const newScoreData = generateBadmintonScore()
        
        // Update the match result - only include sets and winner, remove any root-level team1/team2
        await sql`
          UPDATE match_results
          SET 
            score_data = ${JSON.stringify(newScoreData)}::jsonb,
            winner_team = ${newScoreData.winner},
            updated_at = NOW()
          WHERE id = ${matchResult.id} AND tenant_id = ${tenantId}
        `
        
        updated++
        
        if (updated % 100 === 0) {
          console.log(`  ✅ Updated ${updated}/${matchResults.length}...`)
        }
      } catch (error) {
        console.error(`  ❌ Error updating match result ${matchResult.id}:`, error)
        errors++
      }
    }

    console.log('')
    console.log('🎉 Badminton score fix completed!')
    console.log(`   ✅ Updated: ${updated}`)
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors}`)
    }
    console.log('')

    // Verify the update
    console.log('🔍 Verifying updates...')
    const [verifyStats] = await sql`
      SELECT COUNT(*) as count
      FROM match_results
      WHERE tenant_id = ${tenantId} AND sport = 'badminton'
    `
    console.log(`   Total badminton match results: ${verifyStats.count}`)
    console.log('')

    await sql.end()
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
fixBadmintonScores().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

