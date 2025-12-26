#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * Sample badminton match results script.
 * 
 * This script samples existing badminton match results from the database
 * and validates them against badminton rules to check if the problem is
 * in the database or the UI.
 * 
 * Usage:
 *   pnpm exec tsx packages/webapp/scripts/sample-match-results.ts [tenant-id] [sample-size]
 * 
 * Examples:
 *   pnpm exec tsx packages/webapp/scripts/sample-match-results.ts demo 20
 *   pnpm exec tsx packages/webapp/scripts/sample-match-results.ts herlev-hjorten 50
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
 * Validates badminton score data against rules.
 */
function validateBadmintonScore(sets: Array<{ team1: number; team2: number }>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (sets.length === 0) {
    return { valid: false, errors: ['Ingen sæt fundet'] }
  }
  
  if (sets.length > 3) {
    errors.push(`For mange sæt: ${sets.length} (maks 3)`)
  }
  
  let team1Wins = 0
  let team2Wins = 0
  
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i]
    const setNum = i + 1
    
    // Check score ranges
    if (set.team1 < 0 || set.team1 > 30) {
      errors.push(`Sæt ${setNum}: Team1 score ${set.team1} er uden for gyldigt område (0-30)`)
    }
    if (set.team2 < 0 || set.team2 > 30) {
      errors.push(`Sæt ${setNum}: Team2 score ${set.team2} er uden for gyldigt område (0-30)`)
    }
    
    // Check for tie
    if (set.team1 === set.team2) {
      errors.push(`Sæt ${setNum}: Uafgjort ${set.team1}-${set.team2} (skal have en vinder)`)
      continue
    }
    
    // Determine winner and validate
    const winner = set.team1 > set.team2 ? 'team1' : 'team2'
    const winnerScore = winner === 'team1' ? set.team1 : set.team2
    const loserScore = winner === 'team1' ? set.team2 : set.team1
    const diff = winnerScore - loserScore
    
    // Check minimum winning score
    if (winnerScore < 21) {
      errors.push(`Sæt ${setNum}: Vinder har kun ${winnerScore} point (skal have mindst 21)`)
    }
    
    // Check score difference
    if (winnerScore === 30 && loserScore === 29) {
      // Special case: 30-29 is valid
      if (winner === 'team1') team1Wins++
      else team2Wins++
    } else if (diff < 2) {
      errors.push(`Sæt ${setNum}: ${set.team1}-${set.team2} har kun ${diff} point forskel (skal være mindst 2, undtagen 30-29)`)
    } else {
      if (winner === 'team1') team1Wins++
      else team2Wins++
    }
  }
  
  // Check match winner (must have 2 sets)
  if (team1Wins < 2 && team2Wins < 2) {
    errors.push(`Ingen vinder: Team1 har ${team1Wins} sæt, Team2 har ${team2Wins} sæt (skal have 2 for at vinde)`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Formats score data for display.
 */
function formatScore(scoreData: any): string {
  if (!scoreData) return 'Ingen score data'
  
  // Check if it's the old format (team1/team2 at root level)
  if (scoreData.team1 !== undefined && scoreData.team2 !== undefined && !scoreData.sets) {
    return `⚠️  GAMMEL FORMAT: team1=${scoreData.team1}, team2=${scoreData.team2}`
  }
  
  // Check if it has sets array
  if (scoreData.sets && Array.isArray(scoreData.sets)) {
    return scoreData.sets.map((s: any) => `${s.team1}-${s.team2}`).join(', ')
  }
  
  return JSON.stringify(scoreData)
}

/**
 * Main function to sample match results.
 */
async function sampleMatchResults() {
  const tenantId = process.argv[2] || 'demo'
  const sampleSize = parseInt(process.argv[3] || '20', 10)
  
  console.log('🏸 Sampling badminton match results...')
  console.log(`📋 Tenant: ${tenantId}`)
  console.log(`📊 Sample size: ${sampleSize}`)
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

    // Count total badminton match results
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

    console.log(`📊 Total badminton match results: ${totalCount}`)
    console.log(`📋 Sampling ${Math.min(sampleSize, totalCount)} results`)
    console.log('')

    // Fetch sample of badminton match results
    const matchResults = await sql`
      SELECT 
        id,
        match_id,
        score_data,
        winner_team,
        created_at
      FROM match_results
      WHERE tenant_id = ${tenantId} AND sport = 'badminton'
      ORDER BY created_at DESC
      LIMIT ${sampleSize}
    `

    let validCount = 0
    let invalidCount = 0
    let oldFormatCount = 0

    console.log('='.repeat(80))
    console.log('STIKPRØVE AF KAMPRESULTATER')
    console.log('='.repeat(80))
    console.log('')

    // Analyze each match result
    for (let i = 0; i < matchResults.length; i++) {
      const result = matchResults[i]
      // Parse score_data if it's a string, otherwise use as-is
      let scoreData: any = result.score_data
      if (typeof scoreData === 'string') {
        try {
          scoreData = JSON.parse(scoreData)
        } catch (e) {
          invalidCount++
          console.log(`\n${i + 1}. Match ID: ${result.match_id}`)
          console.log(`   Created: ${new Date(result.created_at).toLocaleString('da-DK')}`)
          console.log(`   Winner: ${result.winner_team}`)
          console.log(`   ❌ UGYLDIG JSON: ${scoreData}`)
          continue
        }
      }
      
      console.log(`\n${i + 1}. Match ID: ${result.match_id}`)
      console.log(`   Created: ${new Date(result.created_at).toLocaleString('da-DK')}`)
      console.log(`   Winner: ${result.winner_team}`)
      
      // Check for old format (team1/team2 at root without sets)
      if (scoreData.team1 !== undefined && scoreData.team2 !== undefined && !scoreData.sets) {
        oldFormatCount++
        console.log(`   ⚠️  GAMMEL FORMAT DETECTERET:`)
        console.log(`      Score data: ${JSON.stringify(scoreData)}`)
        console.log(`      Mangler 'sets' array!`)
        invalidCount++
        continue
      }
      
      // Check for mixed format (both root team1/team2 AND sets array - invalid)
      if (scoreData.team1 !== undefined && scoreData.team2 !== undefined && scoreData.sets) {
        console.log(`   ⚠️  BLANDET FORMAT DETECTERET:`)
        console.log(`      Score data har både root-level team1/team2 OG sets array`)
        console.log(`      Raw: ${JSON.stringify(scoreData)}`)
        // Continue validation with sets array
      }
      
      // Check if sets array exists
      if (!scoreData.sets || !Array.isArray(scoreData.sets)) {
        invalidCount++
        console.log(`   ❌ UGYLDIG STRUKTUR:`)
        console.log(`      Score data: ${JSON.stringify(scoreData)}`)
        console.log(`      Mangler 'sets' array!`)
        continue
      }
      
      // Format and validate
      const scoreStr = formatScore(scoreData)
      console.log(`   Score: ${scoreStr}`)
      
      // Validate against badminton rules
      const validation = validateBadmintonScore(scoreData.sets)
      
      if (validation.valid) {
        validCount++
        console.log(`   ✅ GYLDIG`)
        
        // Check if winner matches score
        const team1Wins = scoreData.sets.filter((s: any) => s.team1 > s.team2).length
        const team2Wins = scoreData.sets.filter((s: any) => s.team2 > s.team1).length
        const actualWinner = team1Wins >= 2 ? 'team1' : 'team2'
        
        if (actualWinner !== result.winner_team) {
          console.log(`   ⚠️  ADVARSEL: Winner i DB (${result.winner_team}) matcher ikke score (${actualWinner})`)
        }
        
        if (scoreData.winner && scoreData.winner !== result.winner_team) {
          console.log(`   ⚠️  ADVARSEL: winner i score_data (${scoreData.winner}) matcher ikke winner_team (${result.winner_team})`)
        }
      } else {
        invalidCount++
        console.log(`   ❌ UGYLDIG:`)
        validation.errors.forEach(err => {
          console.log(`      - ${err}`)
        })
      }
    }

    console.log('')
    console.log('='.repeat(80))
    console.log('SAMMENFATNING')
    console.log('='.repeat(80))
    console.log(`Total prøver: ${matchResults.length}`)
    console.log(`✅ Gyldige: ${validCount}`)
    console.log(`❌ Ugyldige: ${invalidCount}`)
    console.log(`⚠️  Gammel format: ${oldFormatCount}`)
    console.log('')

    if (invalidCount > 0) {
      console.log('💡 KONKLUSION: Problemet ligger i databasen - kampresultaterne følger ikke badmintonreglerne.')
      console.log('   Kør fix-badminton-scores.ts scriptet for at rette dem.')
    } else {
      console.log('💡 KONKLUSION: Alle prøver er gyldige. Problemet ligger muligvis i UI\'en.')
    }
    console.log('')

    await sql.end()
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
sampleMatchResults().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

