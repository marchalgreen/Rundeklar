#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * Clear statistics data script.
 * 
 * This script removes all statistics snapshots and related statistics data
 * (matches, match_players, check_ins, ended training sessions) from the database
 * for a specific tenant, providing a clean slate for statistics.
 * 
 * Usage:
 *   cd packages/webapp && pnpm exec tsx scripts/clear-statistics.ts [tenant-id]
 * 
 * Examples:
 *   pnpm exec tsx scripts/clear-statistics.ts herlev-hjorten
 *   pnpm exec tsx scripts/clear-statistics.ts demo
 * 
 * WARNING: This will permanently delete all historical statistics data for the specified tenant!
 * Schema will be preserved - only rows are deleted.
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
 * Clears all statistics data for a tenant.
 */
async function clearStatistics() {
  const tenantId = process.argv[2] || 'herlev-hjorten'
  console.log('🧹 Starting statistics cleanup...')
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

    // Count existing statistics data
    const [stats] = await sql`
      SELECT 
        (SELECT COUNT(*) FROM statistics_snapshots WHERE tenant_id = ${tenantId}) as stats_count,
        (SELECT COUNT(*) FROM match_players WHERE tenant_id = ${tenantId}) as match_players_count,
        (SELECT COUNT(*) FROM matches WHERE tenant_id = ${tenantId}) as matches_count,
        (SELECT COUNT(*) FROM check_ins WHERE tenant_id = ${tenantId}) as check_ins_count,
        (SELECT COUNT(*) FROM training_sessions WHERE tenant_id = ${tenantId} AND status = 'ended') as ended_sessions_count,
        (SELECT COUNT(*) FROM training_sessions WHERE tenant_id = ${tenantId} AND status = 'active') as active_sessions_count
    `
    
    console.log('📊 Current statistics data counts:')
    console.log(`   - Statistics snapshots: ${stats.stats_count}`)
    console.log(`   - Match players: ${stats.match_players_count}`)
    console.log(`   - Matches: ${stats.matches_count}`)
    console.log(`   - Check-ins: ${stats.check_ins_count}`)
    console.log(`   - Ended training sessions: ${stats.ended_sessions_count}`)
    console.log(`   - Active training sessions: ${stats.active_sessions_count} (will be preserved)`)
    console.log('')

    const totalCount = Number(stats.stats_count) + Number(stats.match_players_count) + 
                      Number(stats.matches_count) + Number(stats.check_ins_count) + 
                      Number(stats.ended_sessions_count)

    if (totalCount === 0) {
      console.log('✅ No statistics data to clear')
      await sql.end()
      return
    }

    // Delete all statistics data in correct order (respecting foreign keys)
    console.log('🗑️  Deleting statistics data...')
    
    await sql`DELETE FROM statistics_snapshots WHERE tenant_id = ${tenantId}`
    console.log(`   ✅ Deleted ${stats.stats_count} statistics snapshots`)
    
    await sql`DELETE FROM match_players WHERE tenant_id = ${tenantId}`
    console.log(`   ✅ Deleted ${stats.match_players_count} match players`)
    
    await sql`DELETE FROM matches WHERE tenant_id = ${tenantId}`
    console.log(`   ✅ Deleted ${stats.matches_count} matches`)
    
    await sql`DELETE FROM check_ins WHERE tenant_id = ${tenantId}`
    console.log(`   ✅ Deleted ${stats.check_ins_count} check-ins`)
    
    await sql`DELETE FROM training_sessions WHERE tenant_id = ${tenantId} AND status = 'ended'`
    console.log(`   ✅ Deleted ${stats.ended_sessions_count} ended training sessions`)
    
    // Close connection
    await sql.end()

    console.log('')
    console.log('🎉 Statistics cleanup completed successfully!')
    console.log('')
    console.log('📊 Summary:')
    console.log(`   - Statistics snapshots deleted: ${stats.stats_count}`)
    console.log(`   - Match players deleted: ${stats.match_players_count}`)
    console.log(`   - Matches deleted: ${stats.matches_count}`)
    console.log(`   - Check-ins deleted: ${stats.check_ins_count}`)
    console.log(`   - Ended training sessions deleted: ${stats.ended_sessions_count}`)
    console.log(`   - Active training sessions preserved: ${stats.active_sessions_count}`)
    console.log('   - Schema preserved (only rows deleted)')
    console.log('')
    console.log('💡 You can now regenerate statistics data using:')
    console.log('   api.stats.generateDummyHistoricalData()')
    console.log('')
    
  } catch (error) {
    console.error('❌ Error clearing statistics:', error)
    process.exit(1)
  }
}

// Run the cleanup
clearStatistics()

