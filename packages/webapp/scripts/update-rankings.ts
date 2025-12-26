#!/usr/bin/env tsx
/**
 * Manual script to update player rankings from BadmintonPlayer.dk
 * 
 * Usage:
 *   pnpm --filter webapp exec tsx scripts/update-rankings.ts [tenant-id]
 * 
 * If tenant-id is not provided, it will update all tenants.
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getPostgresClient, getDatabaseUrl } from '../api/auth/db-helper.js'
import { updatePlayerRankings } from '../src/lib/rankings/ranking-service.js'
import { getAllTenantConfigs, getTenantConfig } from '../src/lib/admin/tenant-utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
function loadEnv() {
  const envPath = join(__dirname, '../.env.local')
  const env: Record<string, string> = {}
  
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    const lines = content.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const equalIndex = trimmed.indexOf('=')
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim()
          const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '')
          if (key && value) {
            env[key] = value
          }
        }
      }
    }
  }
  
  // Also check process.env (for Vercel/CI environments)
  return { ...process.env, ...env }
}

// Load environment variables
const env = loadEnv()
Object.assign(process.env, env)

async function updateRankings(tenantId?: string) {
  console.log('')
  console.log('🔄 Updating Player Rankings from BadmintonPlayer.dk')
  console.log('==================================================')
  console.log('')

  try {
    const sql = getPostgresClient(getDatabaseUrl())

    if (tenantId) {
      // Update single tenant
      console.log(`📋 Updating rankings for tenant: "${tenantId}"`)
      const config = await getTenantConfig(tenantId)
      if (!config) {
        console.error(`❌ Tenant config not found for: "${tenantId}"`)
        process.exit(1)
      }
      console.log(`✅ Found tenant: "${config.name}"`)
      console.log('')
      console.log('🔄 Starting ranking update...')
      if (config.badmintonplayerRankingLists) {
        console.log('   Using fast ranking list scraper (6 lists)')
      } else {
        console.log('   (This may take several minutes as it scrapes each player individually)')
      }
      console.log('')

      const startTime = Date.now()
      const result = await updatePlayerRankings(sql, tenantId, config)
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)

      console.log('')
      console.log('📊 Results:')
      console.log(`   ✅ Updated: ${result.updated}`)
      console.log(`   ❌ Failed: ${result.failed}`)
      console.log(`   ⏭️  Skipped: ${result.skipped}`)
      console.log(`   ⏱️  Duration: ${duration}s`)
      if (result.errors.length > 0) {
        console.log('')
        console.log('⚠️  Errors:')
        result.errors.forEach(({ playerId, error }) => {
          console.log(`   - Player ${playerId}: ${error}`)
        })
      }
      console.log('')
      console.log('🎉 Ranking update completed!')
      console.log('')
    } else {
      // Update all tenants
      console.log('📋 Updating rankings for all tenants...')
      const tenants = await getAllTenantConfigs()
      console.log(`✅ Found ${tenants.length} tenants`)
      console.log('')

      const results: Array<{ tenantId: string; tenantName: string; result: Awaited<ReturnType<typeof updatePlayerRankings>> }> = []

      for (const tenant of tenants) {
        console.log(`🔄 Processing tenant: "${tenant.name}" (${tenant.id})`)
        try {
          const result = await updatePlayerRankings(sql, tenant.id, tenant)
          results.push({ tenantId: tenant.id, tenantName: tenant.name, result })
          console.log(`   ✅ Updated: ${result.updated}, Failed: ${result.failed}, Skipped: ${result.skipped}`)
        } catch (error) {
          console.error(`   ❌ Failed to update tenant ${tenant.name}:`, error)
          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            result: {
              updated: 0,
              failed: 0,
              skipped: 0,
              errors: [{ playerId: '', error: error instanceof Error ? error.message : 'Unknown error' }]
            }
          })
        }
      }

      console.log('')
      console.log('📊 Summary:')
      const summary = {
        totalTenants: tenants.length,
        totalUpdated: results.reduce((sum, r) => sum + r.result.updated, 0),
        totalFailed: results.reduce((sum, r) => sum + r.result.failed, 0),
        totalSkipped: results.reduce((sum, r) => sum + r.result.skipped, 0)
      }
      console.log(`   Tenants processed: ${summary.totalTenants}`)
      console.log(`   ✅ Total updated: ${summary.totalUpdated}`)
      console.log(`   ❌ Total failed: ${summary.totalFailed}`)
      console.log(`   ⏭️  Total skipped: ${summary.totalSkipped}`)
      console.log('')
      console.log('🎉 Ranking update completed for all tenants!')
      console.log('')
    }
  } catch (error) {
    console.error('')
    console.error('❌ Error updating rankings:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
    }
    process.exit(1)
  }
}

// Get tenant ID from command line args
const tenantId = process.argv[2]

// Run the update
updateRankings(tenantId)

