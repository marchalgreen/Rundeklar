#!/usr/bin/env tsx
/**
 * Script to update demo players and add new training groups.
 * 
 * - Removes all nicknames from existing players
 * - Adds all existing players to "Senior A" training group
 * - Adds 15 new players to "U17" training group
 * - Adds 32 new players to "U15" training group
 * - Ensures realistic gender matching with Danish names
 * 
 * Usage:
 *   pnpm --filter webapp exec tsx scripts/update-demo-players.ts [tenant-id]
 * 
 * If tenant-id is not provided, it will use "default"
 */

import { createClient } from '@supabase/supabase-js'
import { loadTenantConfig } from '../src/lib/tenant'

/**
 * Realistic Danish first names with gender mapping
 */
const DANISH_NAMES = {
  male: [
    'Anders', 'Benjamin', 'Christian', 'Daniel', 'Emil', 'Frederik', 'Gustav', 'Henrik',
    'Jakob', 'Kristian', 'Lucas', 'Magnus', 'Nikolaj', 'Oliver', 'Patrick', 'Rasmus',
    'Sebastian', 'Thomas', 'Victor', 'William', 'Alexander', 'Anton', 'Carl', 'David',
    'Erik', 'Felix', 'Gustav', 'Hugo', 'Isak', 'Jonas', 'Karl', 'Lars', 'Marcus',
    'Noah', 'Oscar', 'Philip', 'Simon', 'Tobias', 'Viktor', 'Adam', 'Bjørn', 'Casper'
  ],
  female: [
    'Anna', 'Emma', 'Sofia', 'Ida', 'Freja', 'Clara', 'Laura', 'Alberte',
    'Mathilde', 'Olivia', 'Alma', 'Ella', 'Luna', 'Nora', 'Saga', 'Vilma',
    'Agnes', 'Ellen', 'Julie', 'Maja', 'Sara', 'Amalie', 'Caroline', 'Emilie',
    'Isabella', 'Lærke', 'Marie', 'Nanna', 'Rosa', 'Sofie', 'Victoria', 'Astrid',
    'Cecilie', 'Ditte', 'Frida', 'Hannah', 'Johanne', 'Kirsten', 'Line', 'Mette',
    'Pernille', 'Signe', 'Tine', 'Ulla', 'Vibeke', 'Yrsa', 'Zarah'
  ]
}

/**
 * Danish surnames
 */
const DANISH_SURNAMES = [
  'Andersen', 'Hansen', 'Jensen', 'Nielsen', 'Pedersen', 'Christensen', 'Larsen',
  'Sørensen', 'Rasmussen', 'Jørgensen', 'Petersen', 'Madsen', 'Kristensen',
  'Olsen', 'Thomsen', 'Christiansen', 'Poulsen', 'Johansen', 'Møller', 'Knudsen',
  'Mortensen', 'Holm', 'Mikkelsen', 'Jacobsen', 'Frederiksen', 'Schmidt', 'Andreasen',
  'Lund', 'Hedegaard', 'Dahl', 'Bertelsen', 'Eriksen', 'Vestergaard', 'Bak', 'Berg',
  'Bjerregaard', 'Bruun', 'Carlsen', 'Dalsgaard', 'Eskildsen', 'Frandsen', 'Gade',
  'Hjorth', 'Iversen', 'Kjær', 'Lassen', 'Mathiesen', 'Nørgaard', 'Overgaard'
]

/**
 * Generates a random Danish name with realistic gender matching
 */
function generateDanishName(gender: 'Herre' | 'Dame'): { name: string; gender: 'Herre' | 'Dame' } {
  const firstName = gender === 'Herre' 
    ? DANISH_NAMES.male[Math.floor(Math.random() * DANISH_NAMES.male.length)]
    : DANISH_NAMES.female[Math.floor(Math.random() * DANISH_NAMES.female.length)]
  
  const surname = DANISH_SURNAMES[Math.floor(Math.random() * DANISH_SURNAMES.length)]
  
  return {
    name: `${firstName} ${surname}`,
    gender
  }
}

/**
 * Main function
 */
async function updateDemoPlayers(tenantId: string = 'default') {
  console.log('')
  console.log('👥 Updating Demo Players')
  console.log('=========================')
  console.log('')

  try {
    // Load tenant config
    console.log(`📋 Loading tenant config for "${tenantId}"...`)
    const config = await loadTenantConfig(tenantId)
    
    if (!config.supabaseUrl || !config.supabaseKey) {
      console.error(`❌ Tenant config for "${tenantId}" is missing Supabase credentials.`)
      console.error(`Please update packages/webapp/src/config/tenants/${tenantId}.json with your Supabase credentials.`)
      process.exit(1)
    }

    console.log(`✅ Loaded config for "${config.name}"`)
    console.log('')

    // Create Supabase client
    const supabase = createClient(config.supabaseUrl, config.supabaseKey)

    // Test connection
    console.log('🔌 Testing Supabase connection...')
    const { error: testError } = await supabase.from('players').select('id').limit(1)
    if (testError) {
      console.error('❌ Failed to connect to Supabase:', testError.message)
      process.exit(1)
    }
    console.log('✅ Connected to Supabase')
    console.log('')

    // Step 1: Update existing players (remove aliases, add to Senior A)
    console.log('📝 Step 1: Updating existing players...')
    const { data: existingPlayers, error: fetchError } = await supabase
      .from('players')
      .select('id')
    
    if (fetchError) {
      console.error('❌ Failed to fetch players:', fetchError.message)
      process.exit(1)
    }

    const existingCount = existingPlayers?.length || 0
    console.log(`   Found ${existingCount} existing players`)

    if (existingCount > 0) {
      const { error: updateError } = await supabase
        .from('players')
        .update({
          alias: null,
          training_group: ['Senior A']
        })
        .neq('id', '00000000-0000-0000-0000-000000000000')
      
      if (updateError) {
        console.error('❌ Failed to update existing players:', updateError.message)
        process.exit(1)
      }
      console.log(`✅ Updated ${existingCount} players (removed aliases, added to Senior A)`)
    }
    console.log('')

    // Step 2: Add 15 players to U17
    console.log('📝 Step 2: Adding 15 players to U17...')
    const u17Players = []
    for (let i = 0; i < 15; i++) {
      // Mix of genders (roughly 50/50)
      const gender: 'Herre' | 'Dame' = Math.random() > 0.5 ? 'Herre' : 'Dame'
      const { name } = generateDanishName(gender)
      
      u17Players.push({
        name,
        alias: null,
        level_single: null,
        level_double: null,
        level_mix: null,
        gender,
        primary_category: ['Single', 'Double', 'Begge'][Math.floor(Math.random() * 3)] as 'Single' | 'Double' | 'Begge',
        active: true,
        training_group: ['U17'],
        preferred_doubles_partners: [],
        preferred_mixed_partners: []
      })
    }

    const { error: u17Error } = await supabase
      .from('players')
      .insert(u17Players)
    
    if (u17Error) {
      console.error('❌ Failed to add U17 players:', u17Error.message)
      process.exit(1)
    }
    console.log(`✅ Added 15 players to U17 training group`)
    console.log('')

    // Step 3: Add 32 players to U15
    console.log('📝 Step 3: Adding 32 players to U15...')
    const u15Players = []
    for (let i = 0; i < 32; i++) {
      // Mix of genders (roughly 50/50)
      const gender: 'Herre' | 'Dame' = Math.random() > 0.5 ? 'Herre' : 'Dame'
      const { name } = generateDanishName(gender)
      
      u15Players.push({
        name,
        alias: null,
        level_single: null,
        level_double: null,
        level_mix: null,
        gender,
        primary_category: ['Single', 'Double', 'Begge'][Math.floor(Math.random() * 3)] as 'Single' | 'Double' | 'Begge',
        active: true,
        training_group: ['U15'],
        preferred_doubles_partners: [],
        preferred_mixed_partners: []
      })
    }

    const { error: u15Error } = await supabase
      .from('players')
      .insert(u15Players)
    
    if (u15Error) {
      console.error('❌ Failed to add U15 players:', u15Error.message)
      process.exit(1)
    }
    console.log(`✅ Added 32 players to U15 training group`)
    console.log('')

    // Verify final state
    console.log('📊 Verifying final state...')
    const { data: allPlayers, error: verifyError } = await supabase
      .from('players')
      .select('id, name, training_group, alias')
    
    if (verifyError) {
      console.error('❌ Failed to verify:', verifyError.message)
      process.exit(1)
    }

    const seniorACount = allPlayers?.filter(p => p.training_group?.includes('Senior A')).length || 0
    const u17Count = allPlayers?.filter(p => p.training_group?.includes('U17')).length || 0
    const u15Count = allPlayers?.filter(p => p.training_group?.includes('U15')).length || 0
    const withAlias = allPlayers?.filter(p => p.alias).length || 0

    console.log('')
    console.log('📊 Final Summary:')
    console.log(`   Total players: ${allPlayers?.length || 0}`)
    console.log(`   Senior A: ${seniorACount}`)
    console.log(`   U17: ${u17Count}`)
    console.log(`   U15: ${u15Count}`)
    console.log(`   Players with aliases: ${withAlias}`)
    console.log('')
    console.log('🎉 Demo players update completed!')
    console.log('')

  } catch (error) {
    console.error('')
    console.error('❌ Error updating demo players:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    process.exit(1)
  }
}

// Get tenant ID from command line args
const tenantId = process.argv[2] || 'default'

// Run the update
updateDemoPlayers(tenantId)

