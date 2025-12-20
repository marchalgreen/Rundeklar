#!/usr/bin/env tsx
/**
 * Demo data seeding script for any tenant.
 * 
 * This script seeds a Neon database with dummy data for sales demonstrations.
 * Run this script after setting up the tenant configuration.
 * 
 * Usage:
 *   cd packages/webapp && pnpm exec tsx scripts/seed-demo-data.ts [tenant-id]
 * 
 * If tenant-id is not provided, it will use "demo"
 */

import postgres from 'postgres'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { loadTenantConfig } from '../src/lib/tenant'

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

/**
 * Realistic Danish player names for seeding.
 * Total: 123 players distributed across 4 training groups (40, 35, 22, 26).
 */
const DEMO_PLAYER_NAMES = [
  // Senior A players (40 players - older, more experienced)
  'Lars Andersen', 'Mette Hansen', 'Thomas Nielsen', 'Anne Pedersen', 'Michael Jensen',
  'Camilla Larsen', 'Anders Christensen', 'Louise Madsen', 'Martin Thomsen', 'Sara Rasmussen',
  'Peter Sørensen', 'Maria Eriksen', 'Jens Knudsen', 'Helle Dahl', 'Steen Bertelsen',
  'Lise Gade', 'Henrik Frederiksen', 'Nina Iversen', 'Kim Ulriksen', 'Mia Vestergaard',
  'Bo Andersen', 'Gitte Hansen', 'Claus Nielsen', 'Dorthe Pedersen', 'Jan Jensen',
  'Lene Larsen', 'Morten Christensen', 'Pia Madsen', 'Rasmus Thomsen', 'Signe Rasmussen',
  'Søren Sørensen', 'Tina Eriksen', 'Ulrik Knudsen', 'Vibeke Dahl', 'Willy Bertelsen',
  'Yvonne Gade', 'Zacharias Frederiksen', 'Ane Iversen', 'Bent Ulriksen', 'Cecilie Vestergaard',
  
  // Senior B players (35 players - slightly less experienced)
  'Christian Holm', 'Lotte Bjerre', 'Nikolaj Dam', 'Marianne Frandsen', 'Torben Guldberg',
  'Susanne Hjorth', 'Jesper Ipsen', 'Katrine Jørgensen', 'Lars Kjeldsen', 'Mette Lund',
  'Niels Møller', 'Pernille Nørgaard', 'Ole Overgaard', 'Rikke Poulsen', 'Stefan Quist',
  'Trine Rask', 'Ulrik Skov', 'Vibeke Thomsen', 'Werner Udsen', 'Xenia Vang',
  'Yngve Winther', 'Zita Østergaard', 'Adam Aagaard', 'Birgitte Bøgh', 'Carsten Carlsen',
  'Ditte Dalsgaard', 'Erik Eriksen', 'Fie Fogh', 'Gunnar Gundersen', 'Hanne Højlund',
  'Ivan Ibsen', 'Julie Juhl', 'Kasper Kofoed', 'Lise Lyng', 'Mads Mikkelsen',
  
  // U17 players (22 players - teenagers)
  'Emil Andersen', 'Emma Hansen', 'Noah Nielsen', 'Sofia Pedersen', 'Lucas Jensen',
  'Ida Larsen', 'Oliver Christensen', 'Freja Madsen', 'Viktor Thomsen', 'Alberte Rasmussen',
  'William Sørensen', 'Clara Eriksen', 'Malthe Knudsen', 'Nora Dahl', 'Magnus Bertelsen',
  'Luna Gade', 'Elias Frederiksen', 'Sofia Iversen', 'Aksel Ulriksen', 'Ellie Vestergaard',
  'Isabella Andersen', 'Jonas Hansen',
  
  // U15 players (26 players - younger)
  'Liam Andersen', 'Alma Hansen', 'Felix Nielsen', 'Lily Pedersen', 'Hugo Jensen',
  'Maja Larsen', 'Arthur Christensen', 'Ella Madsen', 'Alfred Thomsen', 'Olivia Rasmussen',
  'Karl Sørensen', 'Agnes Eriksen', 'Asta Knudsen', 'Viggo Dahl', 'Alma Bertelsen',
  'Storm Gade', 'Lauge Frederiksen', 'Frida Iversen', 'Storm Ulriksen', 'Liv Vestergaard',
  'Theo Andersen', 'Vera Hansen', 'Wilhelm Nielsen', 'Yasmin Pedersen', 'Zander Jensen',
  'Amalie Larsen'
]

/**
 * Determine gender based on first name (Danish standard).
 * Returns 'Herre' for male names, 'Dame' for female names.
 */
const getGenderFromName = (fullName: string): 'Herre' | 'Dame' => {
  const firstName = fullName.split(' ')[0].toLowerCase()
  
  // Common Danish male first names
  const maleNames = [
    'lars', 'thomas', 'michael', 'anders', 'martin', 'peter', 'jens', 'steen', 'henrik', 'kim',
    'bo', 'claus', 'jan', 'morten', 'rasmus', 'søren', 'ulrik', 'willy', 'zacharias', 'bent',
    'christian', 'nikolaj', 'torben', 'jesper', 'niels', 'ole', 'stefan', 'werner', 'yngve',
    'adam', 'carsten', 'erik', 'gunnar', 'ivan', 'kasper', 'mads',
    'emil', 'noah', 'lucas', 'oliver', 'viktor', 'william', 'malthe', 'magnus', 'elias', 'aksel',
    'jonas', 'liam', 'felix', 'hugo', 'alfred', 'karl', 'viggo', 'storm', 'lauge', 'theo',
    'wilhelm', 'zander'
  ]
  
  // Common Danish female first names
  const femaleNames = [
    'mette', 'anne', 'camilla', 'louise', 'sara', 'maria', 'helle', 'lise', 'nina', 'mia',
    'gitte', 'dorthe', 'lene', 'pia', 'signe', 'tina', 'vibeke', 'yvonne', 'ane', 'cecilie',
    'lotte', 'marianne', 'susanne', 'katrine', 'pernille', 'rikke', 'trine', 'xenia', 'zita',
    'birgitte', 'ditte', 'fie', 'hanne', 'julie', 'lise',
    'emma', 'sofia', 'ida', 'freja', 'alberte', 'clara', 'nora', 'luna', 'ellie', 'isabella',
    'alma', 'lily', 'maja', 'ella', 'olivia', 'agnes', 'asta', 'frida', 'liv', 'vera',
    'yasmin', 'amalie'
  ]
  
  if (maleNames.includes(firstName)) {
    return 'Herre'
  } else if (femaleNames.includes(firstName)) {
    return 'Dame'
  }
  
  // Fallback: if name not recognized, use a simple heuristic
  // Most Danish names ending in 'a', 'e', 'i' are female
  if (firstName.endsWith('a') || firstName.endsWith('e') || firstName.endsWith('i')) {
    return 'Dame'
  }
  
  // Default to male for unrecognized names (more common in Danish)
  return 'Herre'
}

/**
 * Get random category with realistic distribution.
 * Distribution: 35% Single, 50% Double, 15% Begge
 */
const getRandomCategory = (): string => {
  const random = Math.random()
  if (random < 0.35) {
    return 'Single'
  } else if (random < 0.85) { // 0.35 + 0.50 = 0.85
    return 'Double'
  } else {
    return 'Begge' // Remaining 15%
  }
}

/**
 * Danish holidays and school breaks (approximate dates).
 * These dates should not have training sessions.
 */
const HOLIDAYS_2024_2025 = [
  // Christmas/New Year 2024-2025
  new Date('2024-12-23'),
  new Date('2024-12-24'),
  new Date('2024-12-25'),
  new Date('2024-12-26'),
  new Date('2024-12-27'),
  new Date('2024-12-28'),
  new Date('2024-12-29'),
  new Date('2024-12-30'),
  new Date('2024-12-31'),
  new Date('2025-01-01'),
  new Date('2025-01-02'),
  
  // Easter 2025
  new Date('2025-04-17'), // Maundy Thursday
  new Date('2025-04-18'), // Good Friday
  new Date('2025-04-19'), // Easter Saturday
  new Date('2025-04-20'), // Easter Sunday
  new Date('2025-04-21'), // Easter Monday
  
  // Summer break (July - no training in July)
  // We'll handle this in the date generation logic
]

/**
 * Check if a date falls on a holiday.
 */
const isHoliday = (date: Date): boolean => {
  const dateStr = date.toISOString().split('T')[0]
  return HOLIDAYS_2024_2025.some(holiday => holiday.toISOString().split('T')[0] === dateStr)
}

/**
 * Get the next training day (Tuesday or Thursday).
 * Alternates between Tuesday and Thursday.
 */
const getNextTrainingDay = (currentDate: Date, preferTuesday: boolean): Date => {
  const nextDate = new Date(currentDate)
  const currentDay = nextDate.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  if (preferTuesday) {
    // Find next Tuesday
    const daysUntilTuesday = (2 - currentDay + 7) % 7 || 7
    nextDate.setDate(nextDate.getDate() + daysUntilTuesday)
  } else {
    // Find next Thursday
    const daysUntilThursday = (4 - currentDay + 7) % 7 || 7
    nextDate.setDate(nextDate.getDate() + daysUntilThursday)
  }
  
  return nextDate
}

/**
 * Generate session dates for seasons 24/25 and 25/26.
 * Each training group gets 2 sessions per week (Tuesday and Thursday), excluding holidays.
 * Each session belongs to ONE specific training group.
 */
function generateSessionDates(trainingGroups: string[]): Array<{ date: Date; season: string; trainingGroup: string }> {
  const sessions: Array<{ date: Date; season: string; trainingGroup: string }> = []
  
  // Season 24/25: August 1, 2024 - July 31, 2025
  // Season 25/26: August 1, 2025 - December 20, 2025 (current date)
  const seasonStart2024 = new Date('2024-08-01')
  const seasonEnd2025 = new Date('2025-07-31')
  const seasonEnd2026 = new Date('2025-12-20') // Current date (or end of visible period)
  
  // Generate sessions for each training group
  for (const trainingGroup of trainingGroups) {
    let currentDate = new Date(seasonStart2024)
    let preferTuesday = true // Alternate between Tuesday and Thursday
    
    // Generate sessions for season 24/25 for this group
    while (currentDate <= seasonEnd2025) {
      // Skip July (summer break)
      if (currentDate.getMonth() !== 6) { // Month 6 = July (0-indexed)
        if (!isHoliday(currentDate)) {
          const month = currentDate.getMonth() + 1
          const year = currentDate.getFullYear()
          const season = month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`
          
          // Set realistic training time (18:00-20:00)
          const sessionDate = new Date(currentDate)
          const hour = 18 + Math.floor(Math.random() * 3) // 18, 19, or 20
          const minute = Math.floor(Math.random() * 4) * 15 // 0, 15, 30, 45
          sessionDate.setHours(hour, minute, 0, 0)
          
          sessions.push({ date: sessionDate, season, trainingGroup })
        }
      }
      
      // Move to next training day
      currentDate = getNextTrainingDay(currentDate, preferTuesday)
      preferTuesday = !preferTuesday // Alternate
    }
    
    // Generate sessions for season 25/26 for this group (until current date)
    currentDate = new Date('2025-08-01')
    preferTuesday = true
    
    while (currentDate <= seasonEnd2026) {
      // Skip July (summer break)
      if (currentDate.getMonth() !== 6) { // Month 6 = July (0-indexed)
        if (!isHoliday(currentDate)) {
          const month = currentDate.getMonth() + 1
          const year = currentDate.getFullYear()
          const season = month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`
          
          const sessionDate = new Date(currentDate)
          const hour = 18 + Math.floor(Math.random() * 3)
          const minute = Math.floor(Math.random() * 4) * 15
          sessionDate.setHours(hour, minute, 0, 0)
          
          sessions.push({ date: sessionDate, season, trainingGroup })
        }
      }
      
      currentDate = getNextTrainingDay(currentDate, preferTuesday)
      preferTuesday = !preferTuesday
    }
  }
  
  return sessions.sort((a, b) => a.date.getTime() - b.date.getTime())
}

/**
 * Generate matches for a training session.
 * Creates 2 rounds of matches (6 courts), using only checked-in players.
 * 70% of matches have results, but ALL matches count in statistics.
 */
function generateMatchesForSession(
  sessionId: string,
  sessionDate: Date,
  attendingPlayerIds: string[], // Only players who checked in
  courts: Array<{ id: string }>,
  tenantId: string,
  isolationId: string | null = null // isolation_id for demo tenant (NULL for production)
): Array<{
  match: { id: string; session_id: string; court_id: string; started_at: Date; ended_at: Date; round: number; tenant_id: string; isolation_id: string | null }
  matchPlayers: Array<{ id: string; match_id: string; player_id: string; slot: number; tenant_id: string; isolation_id: string | null }>
  matchResult?: { id: string; match_id: string; sport: string; score_data: any; winner_team: string; tenant_id: string }
}> {
  const matches: Array<{
    match: any
    matchPlayers: any[]
    matchResult?: any
  }> = []
  
  // Need at least 8 players for matches (4 matches per round minimum for 2v2)
  if (attendingPlayerIds.length < 8) {
    return matches
  }
  
  // Shuffle players for each round (different shuffle per round)
  const shuffledPlayersRound1 = [...attendingPlayerIds].sort(() => Math.random() - 0.5)
  const shuffledPlayersRound2 = [...attendingPlayerIds].sort(() => Math.random() - 0.5)
  
  // Generate 2 rounds
  for (let round = 1; round <= 2; round++) {
    const roundStartTime = new Date(sessionDate)
    roundStartTime.setMinutes(roundStartTime.getMinutes() + (round - 1) * 60) // 60 min per round
    
    // Use up to 6 courts (or available courts, whichever is less)
    const courtsToUse = courts.slice(0, Math.min(6, courts.length))
    const shuffledPlayers = round === 1 ? shuffledPlayersRound1 : shuffledPlayersRound2
    
    for (let i = 0; i < courtsToUse.length; i++) {
      const court = courtsToUse[i]
      const matchStartTime = new Date(roundStartTime)
      matchStartTime.setMinutes(matchStartTime.getMinutes() + i * 2) // Stagger start times by 2 min
      
      // Determine match type: prefer 2v2 (uses 4 players), but mix in some 1v1
      const is2v2 = Math.random() > 0.3 // 70% 2v2, 30% 1v1
      const playersNeeded = is2v2 ? 4 : 2
      
      // Get players for this match (circular assignment to distribute evenly)
      const matchPlayerIds: string[] = []
      for (let j = 0; j < playersNeeded; j++) {
        const playerIndex = (i * playersNeeded + j) % shuffledPlayers.length
        matchPlayerIds.push(shuffledPlayers[playerIndex])
      }
      
      const matchId = crypto.randomUUID()
      const matchEndTime = new Date(matchStartTime)
      matchEndTime.setMinutes(matchEndTime.getMinutes() + 20) // 20 min match duration
      
      const match = {
        id: matchId,
        session_id: sessionId,
        court_id: court.id,
        started_at: matchStartTime,
        ended_at: matchEndTime,
        round,
        tenant_id: tenantId,
        isolation_id: isolationId // NULL for demo tenant seed data (visible to all demo users)
      }
      
      // Create match players
      const matchPlayers = matchPlayerIds.map((playerId, slotIndex) => ({
        id: crypto.randomUUID(),
        match_id: matchId,
        player_id: playerId,
        slot: slotIndex,
        tenant_id: tenantId,
        isolation_id: isolationId // NULL for demo tenant seed data
      }))
      
      // 70% of matches have results, but ALL matches count in statistics
      let matchResult: any = undefined
      if (Math.random() < 0.7) {
        const winnerTeam = Math.random() < 0.5 ? 'team1' : 'team2'
        const sport = 'badminton'
        
        // Generate realistic score (21-19, 21-17, etc.)
        const team1Score = Math.floor(Math.random() * 3) + 19 // 19-21
        const team2Score = winnerTeam === 'team1' 
          ? Math.max(15, team1Score - Math.floor(Math.random() * 4) - 1) // Loser score
          : Math.max(15, team1Score - Math.floor(Math.random() * 4) - 1)
        
        matchResult = {
          id: crypto.randomUUID(),
          match_id: matchId,
          sport,
          score_data: {
            team1: team1Score,
            team2: team2Score,
            sets: [
              { team1: team1Score, team2: team2Score }
            ]
          },
          winner_team: winnerTeam,
          tenant_id: tenantId
        }
      }
      
      matches.push({ match, matchPlayers, matchResult })
    }
  }
  
  return matches
}

/**
 * Main seeding function.
 */
async function seedDemoData(tenantId: string = 'demo') {
  console.log('🌱 Starting demo data seeding...')
  console.log(`📋 Using tenant: ${tenantId}`)
  console.log('')

  // SAFETY CHECK: Only allow seeding for demo tenant
  const PRODUCTION_TENANTS = ['default', 'herlev-hjorten']
  if (PRODUCTION_TENANTS.includes(tenantId)) {
    console.error('❌ ERROR: This script can ONLY be run for demo tenant!')
    console.error(`   Attempted to run for tenant: "${tenantId}"`)
    console.error('   Production tenants are protected to prevent data loss.')
    console.error('')
    console.error('   To seed demo data, run:')
    console.error('   cd packages/webapp && pnpm exec tsx scripts/seed-demo-data.ts demo')
    process.exit(1)
  }

  if (tenantId !== 'demo') {
    console.warn('⚠️  WARNING: This script is designed for demo tenant only!')
    console.warn(`   You are attempting to seed tenant: "${tenantId}"`)
    console.warn('   This script will DELETE all existing data for this tenant.')
    console.warn('')
    console.warn('   Press Ctrl+C to cancel, or wait 5 seconds to continue...')
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

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
    console.log('🔌 Testing Neon database connection...')
    await sql`SELECT 1`
    console.log('✅ Connected to Neon database')

    // Clear existing data for this tenant only
    // SAFETY: All DELETE statements use tenant_id filter to ensure we only delete data for this specific tenant
    console.log(`🧹 Clearing existing data for tenant "${tenantId}"...`)
    console.log('   ⚠️  Only data with tenant_id matching the specified tenant will be deleted.')
    
    // Delete in correct order to respect foreign key constraints
    // Each DELETE statement explicitly filters by tenant_id to prevent accidental deletion of other tenants' data
    const [snapshotsDeleted] = await sql`DELETE FROM statistics_snapshots WHERE tenant_id = ${tenantId} RETURNING id`
    const [resultsDeleted] = await sql`DELETE FROM match_results WHERE tenant_id = ${tenantId} RETURNING id`
    const [playersDeleted] = await sql`DELETE FROM match_players WHERE tenant_id = ${tenantId} RETURNING id`
    const [matchesDeleted] = await sql`DELETE FROM matches WHERE tenant_id = ${tenantId} RETURNING id`
    const [checkInsDeleted] = await sql`DELETE FROM check_ins WHERE tenant_id = ${tenantId} RETURNING id`
    const [sessionsDeleted] = await sql`DELETE FROM training_sessions WHERE tenant_id = ${tenantId} RETURNING id`
    const [playersTableDeleted] = await sql`DELETE FROM players WHERE tenant_id = ${tenantId} RETURNING id`
    const [courtsDeleted] = await sql`DELETE FROM courts WHERE tenant_id = ${tenantId} RETURNING id`
    
    // Log deletion counts for verification
    console.log('✅ Cleared existing data for tenant:')
    console.log(`   - statistics_snapshots: ${snapshotsDeleted?.length || 0} rows deleted`)
    console.log(`   - match_results: ${resultsDeleted?.length || 0} rows deleted`)
    console.log(`   - match_players: ${playersDeleted?.length || 0} rows deleted`)
    console.log(`   - matches: ${matchesDeleted?.length || 0} rows deleted`)
    console.log(`   - check_ins: ${checkInsDeleted?.length || 0} rows deleted`)
    console.log(`   - training_sessions: ${sessionsDeleted?.length || 0} rows deleted`)
    console.log(`   - players: ${playersTableDeleted?.length || 0} rows deleted`)
    console.log(`   - courts: ${courtsDeleted?.length || 0} rows deleted`)

    // Seed courts (based on tenant maxCourts)
    console.log(`🏸 Seeding ${config.maxCourts} courts...`)
    const courtData = Array.from({ length: config.maxCourts }, (_, i) => ({
      idx: i + 1,
      tenant_id: tenantId
    }))
    await sql`INSERT INTO courts ${sql(courtData)}`
    console.log(`✅ Seeded ${config.maxCourts} courts`)

    // Seed players with 4 training groups: Senior A (40), Senior B (35), U17 (22), U15 (26)
    console.log(`👥 Seeding players with 4 training groups...`)
    
    // Exact distribution: 40, 35, 22, 26
    const seniorACount = 40
    const seniorBCount = 35
    const u17Count = 22
    const u15Count = 26
    const totalPlayers = seniorACount + seniorBCount + u17Count + u15Count
    
    if (DEMO_PLAYER_NAMES.length !== totalPlayers) {
      console.error(`❌ Error: Expected ${totalPlayers} player names, but got ${DEMO_PLAYER_NAMES.length}`)
      process.exit(1)
    }
    
    const playerData = DEMO_PLAYER_NAMES.map((name, index) => {
      let trainingGroup: string[] = []
      
      // Assign to training groups with exact counts
      if (index < seniorACount) {
        trainingGroup = ['Senior A']
      } else if (index < seniorACount + seniorBCount) {
        trainingGroup = ['Senior B']
      } else if (index < seniorACount + seniorBCount + u17Count) {
        trainingGroup = ['U17']
      } else {
        trainingGroup = ['U15']
      }
      
      // Determine gender based on first name (Danish standard)
      const gender = getGenderFromName(name)
      
      // Most players are active (85%)
      const active = Math.random() > 0.15
      
      return {
        name,
        alias: null, // No aliases/nicknames
        level_single: null, // No ranking points
        level_double: null,  // No ranking points
        level_mix: null,     // No ranking points
        gender,
        primary_category: getRandomCategory(), // Realistic distribution: 35% Single, 50% Double, 15% Begge
        active,
        training_group: trainingGroup,
        tenant_id: tenantId
      }
    })
    const players = await sql`
      INSERT INTO players ${sql(playerData)}
      RETURNING id, name, training_group, active, primary_category
    `
    
    const seniorACountActual = players.filter(p => p.training_group?.includes('Senior A')).length || 0
    const seniorBCountActual = players.filter(p => p.training_group?.includes('Senior B')).length || 0
    const u17CountActual = players.filter(p => p.training_group?.includes('U17')).length || 0
    const u15CountActual = players.filter(p => p.training_group?.includes('U15')).length || 0
    
    console.log(`✅ Seeded ${players.length} players`)
    console.log(`   - Senior A: ${seniorACountActual} players`)
    console.log(`   - Senior B: ${seniorBCountActual} players`)
    console.log(`   - U17: ${u17CountActual} players`)
    console.log(`   - U15: ${u15CountActual} players`)
    
    // Log category distribution
    const categoryCounts = players.reduce((acc, p) => {
      const cat = p.primary_category || 'Unknown'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    console.log(`   - Categories: ${JSON.stringify(categoryCounts)}`)

    // Seed training sessions for seasons 24/25 and 25/26
    // Each training group gets 2 sessions per week (Tuesday and Thursday)
    console.log('📅 Generating training sessions for seasons 24/25 and 25/26...')
    const trainingGroups = ['Senior A', 'Senior B', 'U17', 'U15']
    const sessionDates = generateSessionDates(trainingGroups)
    const now = new Date()
    
    const sessionData = sessionDates.map(({ date, season, trainingGroup }) => {
      // Sessions in the past are 'ended', sessions today or in the future are 'scheduled'
      const status = date < now ? 'ended' : 'scheduled'
      
      return {
        date: date.toISOString(),
        status: status as 'ended' | 'scheduled',
        tenant_id: tenantId,
        isolation_id: null // NULL for demo tenant seed data (visible to all demo users)
      }
    })
    
    const sessions = await sql`
      INSERT INTO training_sessions ${sql(sessionData)}
      RETURNING id, status, date
    `
    
    // Store training group mapping for later use (map by date since sessions are created in order)
    const sessionGroupMap = new Map<string, string>()
    sessionDates.forEach(({ date, trainingGroup }) => {
      sessionGroupMap.set(date.toISOString(), trainingGroup)
    })
    
    console.log(`✅ Seeded ${sessions.length} training sessions`)
    console.log(`   - Ended sessions: ${sessions.filter(s => s.status === 'ended').length}`)
    console.log(`   - Scheduled sessions: ${sessions.filter(s => s.status === 'scheduled').length}`)
    
    // Log sessions per group
    const sessionsPerGroup = trainingGroups.map(group => {
      const count = sessionDates.filter(s => s.trainingGroup === group).length
      return `   - ${group}: ${count} sessions`
    }).join('\n')
    console.log(`   Sessions per group:\n${sessionsPerGroup}`)

    // Seed check-ins and matches for all sessions
    let totalCheckIns = 0
    let totalMatches = 0
    let totalMatchResults = 0
    
    if (sessions && sessions.length > 0) {
      const activePlayers = players.filter(p => p.active)
      console.log(`📊 Active players: ${activePlayers.length} out of ${players.length} total`)
      
      // Get courts for match generation
      const courts = await sql`
        SELECT id FROM courts WHERE tenant_id = ${tenantId} ORDER BY idx
      `
      
      console.log(`✅ Seeding check-ins and matches for all sessions...`)
      
      for (const session of sessions) {
        const sessionDate = session.date instanceof Date ? session.date : new Date(session.date)
        
        // Get the training group for this session
        const sessionTrainingGroup = sessionGroupMap.get(session.date.toISOString())
        if (!sessionTrainingGroup) {
          console.warn(`⚠️  No training group found for session ${session.id}, skipping...`)
          continue
        }
        
        // CRITICAL: Only include players from this session's training group
        const groupPlayers = activePlayers.filter(p => 
          p.training_group && Array.isArray(p.training_group) && p.training_group.includes(sessionTrainingGroup)
        )
        
        if (groupPlayers.length === 0) {
          console.warn(`⚠️  No active players found for group "${sessionTrainingGroup}" in session ${session.id}, skipping...`)
          continue
        }
        
        // Determine activity level for this session (within the group)
        // Core players: 80-90% attendance
        // Regular players: 60-75% attendance
        // Casual players: 30-50% attendance
        const corePlayers = groupPlayers.slice(0, Math.floor(groupPlayers.length * 0.3)) // Top 30%
        const regularPlayers = groupPlayers.slice(
          Math.floor(groupPlayers.length * 0.3),
          Math.floor(groupPlayers.length * 0.7)
        ) // Middle 40%
        const casualPlayers = groupPlayers.slice(Math.floor(groupPlayers.length * 0.7)) // Bottom 30%
        
        // Calculate check-ins based on activity level
        const coreCheckInRate = 0.8 + Math.random() * 0.1 // 80-90%
        const regularCheckInRate = 0.6 + Math.random() * 0.15 // 60-75%
        const casualCheckInRate = 0.3 + Math.random() * 0.2 // 30-50%
        
        const coreCheckIns = Math.floor(corePlayers.length * coreCheckInRate)
        const regularCheckIns = Math.floor(regularPlayers.length * regularCheckInRate)
        const casualCheckIns = Math.floor(casualPlayers.length * casualCheckInRate)
        
        // Shuffle and select players for check-ins (only from this group)
        const shuffledCore = [...corePlayers].sort(() => Math.random() - 0.5)
        const shuffledRegular = [...regularPlayers].sort(() => Math.random() - 0.5)
        const shuffledCasual = [...casualPlayers].sort(() => Math.random() - 0.5)
        
        const attendingPlayers = [
          ...shuffledCore.slice(0, coreCheckIns),
          ...shuffledRegular.slice(0, regularCheckIns),
          ...shuffledCasual.slice(0, casualCheckIns)
        ]
        
        // Create check-ins
        // For demo tenant seed data, isolation_id is NULL (visible to all demo users)
        const checkInData = attendingPlayers.map((player) => ({
          session_id: session.id,
          player_id: player.id,
          // Realistic: 20% want only 1 round, rest have no limit
          max_rounds: Math.random() < 0.2 ? 1 : null,
          tenant_id: tenantId,
          isolation_id: null // NULL for demo tenant seed data
        }))
        
        if (checkInData.length > 0) {
          await sql`INSERT INTO check_ins ${sql(checkInData)}`
          totalCheckIns += checkInData.length
          
          // Generate matches for this session (only for checked-in players)
          // For demo tenant seed data, isolation_id is NULL (visible to all demo users)
          const attendingPlayerIds = attendingPlayers.map(p => p.id)
          const matches = generateMatchesForSession(
            session.id,
            sessionDate,
            attendingPlayerIds,
            courts,
            tenantId,
            null // isolation_id is NULL for demo tenant seed data
          )
          
          // Insert matches, match players, and match results
          for (const { match, matchPlayers, matchResult } of matches) {
            await sql`INSERT INTO matches ${sql([match])}`
            if (matchPlayers.length > 0) {
              await sql`INSERT INTO match_players ${sql(matchPlayers)}`
            }
            if (matchResult) {
              // Use ON CONFLICT DO UPDATE to match production behavior
              await sql.unsafe(
                `INSERT INTO match_results (match_id, sport, score_data, winner_team, tenant_id)
                 VALUES ($1, $2, $3::jsonb, $4, $5)
                 ON CONFLICT (match_id, tenant_id) DO UPDATE SET
                   sport = EXCLUDED.sport,
                   score_data = EXCLUDED.score_data,
                   winner_team = EXCLUDED.winner_team,
                   updated_at = NOW()`,
                [
                  matchResult.match_id,
                  matchResult.sport,
                  JSON.stringify(matchResult.score_data),
                  matchResult.winner_team,
                  tenantId
                ]
              )
              totalMatchResults++
            }
            totalMatches++
          }
        }
      }
      
      console.log(`✅ Seeded ${totalCheckIns} check-ins across ${sessions.length} sessions`)
      console.log(`✅ Generated ${totalMatches} matches (${totalMatchResults} with results)`)
      
      // Create snapshots for ended sessions (required for statistics)
      console.log(`📊 Creating statistics snapshots for ended sessions...`)
      const endedSessions = sessions.filter(s => s.status === 'ended')
      let snapshotsCreated = 0
      
      for (const session of endedSessions) {
        // Get check-ins for this session
        const sessionCheckIns = await sql`
          SELECT * FROM check_ins
          WHERE session_id = ${session.id}
            AND tenant_id = ${tenantId}
        `
        
        // Get matches for this session
        const sessionMatches = await sql`
          SELECT * FROM matches
          WHERE session_id = ${session.id}
            AND tenant_id = ${tenantId}
        `
        
        // Get match players for all matches in this session
        const matchIds = sessionMatches.map(m => m.id)
        const sessionMatchPlayers = matchIds.length > 0
          ? await sql`
              SELECT * FROM match_players
              WHERE match_id = ANY(${matchIds})
                AND tenant_id = ${tenantId}
            `
          : []
        
        // Convert to camelCase format (matching CheckIn type)
        // Structure must match exactly what snapshotSession() creates
        const checkIns = sessionCheckIns.map(row => ({
          id: row.id,
          sessionId: row.session_id,
          playerId: row.player_id,
          createdAt: row.created_at?.toISOString() || new Date().toISOString(),
          maxRounds: row.max_rounds ?? null,
          notes: row.notes ?? null
        }))
        
        // Convert matches to camelCase format
        // Structure must match exactly what getMatches() returns (rowToMatch)
        // Match type: { id, sessionId, courtId, startedAt, endedAt, round }
        // NOTE: startedAt must be ISO string (not null), endedAt can be null
        const matches = sessionMatches.map(row => {
          const startedAt = row.started_at
          if (!startedAt) {
            throw new Error(`Match ${row.id} has null started_at - this should never happen`)
          }
          return {
            id: row.id,
            sessionId: row.session_id,
            courtId: row.court_id,
            startedAt: startedAt instanceof Date ? startedAt.toISOString() : startedAt,
            endedAt: row.ended_at ? (row.ended_at instanceof Date ? row.ended_at.toISOString() : row.ended_at) : null,
            round: row.round ?? null
          }
        })
        
        // Convert match players to camelCase format
        // Structure must match exactly what getMatchPlayers() returns (rowToMatchPlayer)
        // MatchPlayer type: { id, matchId, playerId, slot }
        const matchPlayers = sessionMatchPlayers.map(row => ({
          id: row.id,
          matchId: row.match_id,
          playerId: row.player_id,
          slot: row.slot
        }))
        
        // Calculate season (August to July)
        // session.date is a Date object from Postgres, convert to ISO string
        const sessionDate = session.date instanceof Date ? session.date : new Date(session.date)
        const month = sessionDate.getMonth() + 1 // 1-12
        const year = sessionDate.getFullYear()
        const season = month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`
        
        // Create snapshot - ensure session.date is converted to ISO string
        const sessionDateISO = sessionDate.toISOString()
        await sql.unsafe(
          `INSERT INTO statistics_snapshots (session_id, session_date, season, matches, match_players, check_ins, tenant_id)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)`,
          [
            session.id,
            sessionDateISO,
            season,
            JSON.stringify(matches),
            JSON.stringify(matchPlayers),
            JSON.stringify(checkIns),
            tenantId
          ]
        )
        
        snapshotsCreated++
      }
      
      console.log(`✅ Created ${snapshotsCreated} statistics snapshots`)
    }
    
    // Close connection
    await sql.end()

    console.log('')
    console.log('🎉 Demo data seeding completed successfully!')
    console.log('')
    console.log('📊 Summary:')
    console.log(`   - Courts: ${config.maxCourts}`)
    console.log(`   - Players: ${players.length}`)
    console.log(`   - Training Groups: Senior A (${seniorACountActual}), Senior B (${seniorBCountActual}), U17 (${u17CountActual}), U15 (${u15CountActual})`)
    console.log(`   - Training Sessions: ${sessions.length} (seasons 24/25 and 25/26)`)
    console.log(`   - Check-ins: ${totalCheckIns}`)
    console.log(`   - Matches: ${totalMatches} (${totalMatchResults} with results)`)
    console.log('')
    console.log(`💡 You can now access the ${tenantId} tenant`)
    
  } catch (error) {
    console.error('❌ Error seeding demo data:', error)
    process.exit(1)
  }
}

// Get tenant ID from command line args
const tenantId = process.argv[2] || 'demo'

// Run the seeding
seedDemoData(tenantId)


