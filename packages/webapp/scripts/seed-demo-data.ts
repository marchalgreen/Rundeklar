#!/usr/bin/env tsx
/**
 * Demo data seeding script for any tenant.
 * 
 * This script seeds a Neon database with dummy data for sales demonstrations.
 * Run this script after setting up the tenant configuration.
 * 
 * Usage:
 *   pnpm --filter webapp exec tsx scripts/seed-demo-data.ts [tenant-id]
 * 
 * If tenant-id is not provided, it will use "demo"
 */

import postgres from 'postgres'
import { loadTenantConfig } from '../src/lib/tenant'

/**
 * Generates a random date within the last 30 days.
 */
const randomDate = (): string => {
  const now = Date.now()
  const daysAgo = Math.floor(Math.random() * 30)
  return new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Generates a random date in the future (next 7 days).
 */
const randomFutureDate = (): string => {
  const now = Date.now()
  const daysAhead = Math.floor(Math.random() * 7) + 1
  return new Date(now + daysAhead * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Demo player names for seeding.
 */
const DEMO_PLAYER_NAMES = [
  'Anna Andersen', 'Bo Bertelsen', 'Clara Christensen', 'David Dahl', 'Emma Eriksen',
  'Frederik Frederiksen', 'Gitte Gade', 'Henrik Hansen', 'Ida Iversen', 'Jens Jensen',
  'Karen Knudsen', 'Lars Larsen', 'Maria Madsen', 'Niels Nielsen', 'Ole Olsen',
  'Pia Pedersen', 'Rasmus Rasmussen', 'Sofie Sørensen', 'Thomas Thomsen', 'Ulla Ulriksen',
  'Viktor Vestergaard', 'Winnie Winther', 'Xenia Xylophone', 'Yvonne Yde', 'Zacharias Zander'
]

/**
 * Demo player levels (1-10).
 */
const DEMO_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * Demo genders.
 */
const DEMO_GENDERS = ['Herre', 'Dame'] as const

/**
 * Demo categories.
 */
const DEMO_CATEGORIES = ['Single', 'Double', 'Begge'] as const

/**
 * Main seeding function.
 */
async function seedDemoData(tenantId: string = 'demo') {
  console.log('🌱 Starting demo data seeding...')
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
    console.log('🔌 Testing Neon database connection...')
    await sql`SELECT 1`
    console.log('✅ Connected to Neon database')

    // Clear existing data for this tenant only (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data for tenant...')
    await sql`DELETE FROM match_players WHERE tenant_id = ${tenantId}`
    await sql`DELETE FROM matches WHERE tenant_id = ${tenantId}`
    await sql`DELETE FROM check_ins WHERE tenant_id = ${tenantId}`
    await sql`DELETE FROM training_sessions WHERE tenant_id = ${tenantId}`
    await sql`DELETE FROM players WHERE tenant_id = ${tenantId}`
    await sql`DELETE FROM courts WHERE tenant_id = ${tenantId}`
    console.log('✅ Cleared existing data')

    // Seed courts (based on tenant maxCourts)
    console.log(`🏸 Seeding ${config.maxCourts} courts...`)
    const courtData = Array.from({ length: config.maxCourts }, (_, i) => ({
      idx: i + 1,
      tenant_id: tenantId
    }))
    await sql`INSERT INTO courts ${sql(courtData)}`
    console.log(`✅ Seeded ${config.maxCourts} courts`)

    // Seed players with 3 training groups: Senior A, U17, U15
    console.log(`👥 Seeding players with 3 training groups...`)
    
    // Split players into 3 groups
    const totalPlayers = DEMO_PLAYER_NAMES.length
    const seniorACount = Math.floor(totalPlayers * 0.4) // ~40% to Senior A
    const u17Count = Math.floor(totalPlayers * 0.3) // ~30% to U17
    const u15Count = totalPlayers - seniorACount - u17Count // Rest to U15
    
    const playerData = DEMO_PLAYER_NAMES.map((name, index) => {
      const level = DEMO_LEVELS[Math.floor(Math.random() * DEMO_LEVELS.length)]
      let trainingGroup: string[] = []
      
      // Assign to training groups
      if (index < seniorACount) {
        trainingGroup = ['Senior A']
      } else if (index < seniorACount + u17Count) {
        trainingGroup = ['U17']
      } else {
        trainingGroup = ['U15']
      }
      
      return {
        name,
        alias: index % 3 === 0 ? name.split(' ')[0] : null,
        level_single: level,
        level_double: level,
        level_mix: level,
        gender: DEMO_GENDERS[Math.floor(Math.random() * DEMO_GENDERS.length)],
        primary_category: DEMO_CATEGORIES[Math.floor(Math.random() * DEMO_CATEGORIES.length)],
        active: Math.random() > 0.1, // 90% active
        training_group: trainingGroup,
        tenant_id: tenantId
      }
    })
    const players = await sql`
      INSERT INTO players ${sql(playerData)}
      RETURNING id, name, training_group
    `
    
    const seniorACountActual = players.filter(p => p.training_group?.includes('Senior A')).length || 0
    const u17CountActual = players.filter(p => p.training_group?.includes('U17')).length || 0
    const u15CountActual = players.filter(p => p.training_group?.includes('U15')).length || 0
    
    console.log(`✅ Seeded ${players.length} players`)
    console.log(`   - Senior A: ${seniorACountActual} players`)
    console.log(`   - U17: ${u17CountActual} players`)
    console.log(`   - U15: ${u15CountActual} players`)

    // Seed training sessions (last 10 days)
    console.log('📅 Seeding training sessions...')
    const sessionData = Array.from({ length: 10 }, (_, i) => ({
      date: randomDate(),
      status: i === 0 ? 'active' : 'ended' as const,
      tenant_id: tenantId
    }))
    const sessions = await sql`
      INSERT INTO training_sessions ${sql(sessionData)}
      RETURNING id, status
    `
    console.log(`✅ Seeded ${sessions.length} training sessions`)

    // Seed check-ins for active session
    if (sessions && sessions.length > 0) {
      const activeSession = sessions.find(s => s.status === 'active') || sessions[0]
      console.log(`✅ Seeding check-ins for active session...`)
      const checkInData = players.slice(0, 15).map((player) => ({
        session_id: activeSession.id,
        player_id: player.id,
        max_rounds: Math.random() > 0.7 ? 1 : null, // 30% want only 1 round
        tenant_id: tenantId
      }))
      
      await sql`INSERT INTO check_ins ${sql(checkInData)}`
      console.log(`✅ Seeded ${checkInData.length} check-ins`)
    }
    
    // Close connection
    await sql.end()

    console.log('')
    console.log('🎉 Demo data seeding completed successfully!')
    console.log('')
    console.log('📊 Summary:')
    console.log(`   - Courts: ${config.maxCourts}`)
    console.log(`   - Players: ${players.length}`)
    console.log(`   - Training Groups: Senior A, U17, U15`)
    console.log(`   - Training Sessions: ${sessions.length}`)
    console.log(`   - Check-ins: ${sessions && sessions.length > 0 ? players.slice(0, 15).length : 0}`)
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


