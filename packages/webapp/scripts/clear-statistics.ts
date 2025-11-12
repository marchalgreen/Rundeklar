#!/usr/bin/env tsx
/**
 * Clear statistics data script.
 * 
 * This script removes all statistics snapshots and related ended training sessions
 * from the database, providing a clean slate for statistics.
 * 
 * Usage:
 *   pnpm exec tsx packages/webapp/scripts/clear-statistics.ts [tenant-id]
 * 
 * Examples:
 *   pnpm exec tsx packages/webapp/scripts/clear-statistics.ts default
 *   pnpm exec tsx packages/webapp/scripts/clear-statistics.ts demo
 * 
 * WARNING: This will permanently delete all historical statistics data!
 */

import { createClient } from '@supabase/supabase-js'
import { loadTenantConfig } from '../src/lib/tenant'

/**
 * Clears all statistics data from the database.
 */
async function clearStatistics() {
  const tenantId = process.argv[2] || 'default'
  console.log(`🧹 Starting statistics cleanup for tenant: ${tenantId}...`)

  try {
    // Load tenant config
    const config = await loadTenantConfig(tenantId)
    
    if (!config.supabaseUrl || !config.supabaseKey) {
      console.error('❌ Tenant config is missing Supabase credentials.')
      console.error(`Please update packages/webapp/src/config/tenants/${tenantId}.json with your Supabase credentials.`)
      process.exit(1)
    }

    const supabase = createClient(config.supabaseUrl, config.supabaseKey)

    // Test connection
    console.log('🔌 Testing Supabase connection...')
    const { error: testError } = await supabase.from('statistics_snapshots').select('id').limit(1)
    if (testError) {
      console.error('❌ Failed to connect to Supabase:', testError.message)
      process.exit(1)
    }
    console.log('✅ Connected to Supabase')

    // Count existing statistics snapshots
    const { count: snapshotCount } = await supabase
      .from('statistics_snapshots')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 Found ${snapshotCount || 0} statistics snapshots`)

    if (snapshotCount === 0) {
      console.log('✅ No statistics data to clear')
      return
    }

    // Delete all statistics snapshots
    // Note: This will also cascade delete related ended sessions due to ON DELETE CASCADE
    // But we'll also explicitly delete ended sessions to be thorough
    console.log('🗑️  Deleting statistics snapshots...')
    const { error: deleteSnapshotsError } = await supabase
      .from('statistics_snapshots')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using neq trick)
    
    if (deleteSnapshotsError) {
      console.error('❌ Failed to delete statistics snapshots:', deleteSnapshotsError.message)
      process.exit(1)
    }
    console.log('✅ Deleted all statistics snapshots')

    // Also delete all ended training sessions (they're only used for statistics)
    // Active sessions are preserved
    console.log('🗑️  Deleting ended training sessions...')
    const { error: deleteSessionsError } = await supabase
      .from('training_sessions')
      .delete()
      .eq('status', 'ended')
    
    if (deleteSessionsError) {
      console.error('❌ Failed to delete ended sessions:', deleteSessionsError.message)
      process.exit(1)
    }
    console.log('✅ Deleted all ended training sessions')

    // Verify cleanup
    const { count: remainingCount } = await supabase
      .from('statistics_snapshots')
      .select('*', { count: 'exact', head: true })
    
    if (remainingCount === 0) {
      console.log('')
      console.log('🎉 Statistics cleanup completed successfully!')
      console.log('')
      console.log('📊 Summary:')
      console.log(`   - Statistics snapshots deleted: ${snapshotCount}`)
      console.log('   - Ended training sessions deleted')
      console.log('   - Active sessions preserved')
      console.log('')
      console.log('💡 You can now regenerate dummy statistics data using:')
      console.log('   api.stats.generateDummyHistoricalData()')
      console.log('')
    } else {
      console.error(`⚠️  Warning: ${remainingCount} statistics snapshots still remain`)
    }
    
  } catch (error) {
    console.error('❌ Error clearing statistics:', error)
    process.exit(1)
  }
}

// Run the cleanup
clearStatistics()

