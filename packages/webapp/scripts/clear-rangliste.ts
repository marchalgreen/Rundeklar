#!/usr/bin/env tsx
/**
 * Script to clear all rangliste (level) entries from a tenant database.
 * 
 * This sets level_single, level_double, and level_mix to NULL for all players.
 * 
 * Usage:
 *   pnpm --filter webapp exec tsx scripts/clear-rangliste.ts [tenant-id]
 * 
 * If tenant-id is not provided, it will use "default"
 */

import { createClient } from '@supabase/supabase-js'
import { loadTenantConfig } from '../src/lib/tenant'

/**
 * Clears all rangliste entries from the database.
 */
async function clearRangliste(tenantId: string = 'default') {
  console.log('')
  console.log('🧹 Clearing Rangliste Entries')
  console.log('==============================')
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

    // Count players with rangliste entries
    console.log('📊 Checking players with rangliste entries...')
    const { data: playersWithLevels, error: countError } = await supabase
      .from('players')
      .select('id, level_single, level_double, level_mix')
      .or('level_single.not.is.null,level_double.not.is.null,level_mix.not.is.null')
    
    if (countError) {
      console.error('❌ Failed to count players:', countError.message)
      process.exit(1)
    }

    const count = playersWithLevels?.length || 0
    console.log(`   Found ${count} players with rangliste entries`)
    console.log('')

    if (count === 0) {
      console.log('✅ No rangliste entries to clear. Nothing to do!')
      console.log('')
      return
    }

    // Clear all rangliste entries
    console.log('🧹 Clearing all rangliste entries...')
    const { error: updateError } = await supabase
      .from('players')
      .update({
        level_single: null,
        level_double: null,
        level_mix: null
      })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Update all players
    
    if (updateError) {
      console.error('❌ Failed to clear rangliste entries:', updateError.message)
      process.exit(1)
    }

    console.log(`✅ Successfully cleared rangliste entries for all players`)
    console.log('')

    // Verify final state
    const { data: playersAfter, error: verifyError } = await supabase
      .from('players')
      .select('id, level_single, level_double, level_mix')
      .or('level_single.not.is.null,level_double.not.is.null,level_mix.not.is.null')
    
    if (verifyError) {
      console.error('❌ Failed to verify:', verifyError.message)
      process.exit(1)
    }

    const remainingCount = playersAfter?.length || 0
    console.log('📊 Final state:')
    console.log(`   Players with rangliste entries: ${remainingCount}`)
    console.log('')
    console.log('🎉 Rangliste clearing completed!')
    console.log('')

  } catch (error) {
    console.error('')
    console.error('❌ Error clearing rangliste:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    process.exit(1)
  }
}

// Get tenant ID from command line args
const tenantId = process.argv[2] || 'default'

// Run the clearing
clearRangliste(tenantId)

