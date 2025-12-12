#!/usr/bin/env tsx
/**
 * Clear analytics data (page_views)
 * 
 * Options:
 *   --all          Delete ALL page views data
 *   --admin-only   Delete only admin/sysadmin views (recommended)
 * 
 * Usage (from packages/webapp directory): 
 *   cd packages/webapp
 *   pnpm exec tsx scripts/clear-analytics-data.ts --admin-only
 *   pnpm exec tsx scripts/clear-analytics-data.ts --all
 * 
 * Or from root using pnpm filter:
 *   pnpm --filter webapp exec tsx scripts/clear-analytics-data.ts --admin-only
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import postgres from 'postgres'
import { getDatabaseUrl } from '../api/auth/db-helper.js'

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
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
          process.env[key.trim()] = value
        }
      }
    })
    envLoaded = true
    break
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env.local file found.')
}

if (!process.env.DATABASE_URL && process.env.VITE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_DATABASE_URL
}

/**
 * Anonymize IP address (remove last octet for privacy)
 * Matches the anonymization logic in track.ts and analytics.ts
 */
function anonymizeIp(ip: string | string[] | undefined | null): string | null {
  if (!ip) return null
  let ipStr = Array.isArray(ip) ? ip[0] : ip
  ipStr = ipStr.split(',')[0].trim()
  const parts = ipStr.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`
  }
  return null
}

async function clearAdminAnalyticsData() {
  try {
    const databaseUrl = getDatabaseUrl()
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 1
    })

    console.log('🔍 Analyzing admin views in database...\n')

    // Find all IP addresses that have admin views
    const adminIpAddressesResult = await sql`
      SELECT DISTINCT ip_address
      FROM page_views
      WHERE is_admin_view = true
        AND ip_address IS NOT NULL
    `
    const adminIpAddresses = adminIpAddressesResult.map((row: any) => row.ip_address).filter(Boolean)

    if (adminIpAddresses.length === 0) {
      console.log('✅ No admin IP addresses found. Nothing to delete.')
      await sql.end()
      return
    }

    console.log(`📊 Found ${adminIpAddresses.length} unique IP address(es) with admin views:`)
    adminIpAddresses.forEach((ip, index) => {
      console.log(`   ${index + 1}. ${ip}`)
    })
    console.log('')

    // Count views from admin IPs
    const adminViewsCountResult = await sql`
      SELECT COUNT(*)::int as count
      FROM page_views
      WHERE ip_address = ANY(${adminIpAddresses})
    `
    const adminViewsCount = adminViewsCountResult[0]?.count || 0

    // Count admin views (is_admin_view = true)
    const isAdminViewsCountResult = await sql`
      SELECT COUNT(*)::int as count
      FROM page_views
      WHERE is_admin_view = true
    `
    const isAdminViewsCount = isAdminViewsCountResult[0]?.count || 0

    // Count total views
    const totalViewsResult = await sql`SELECT COUNT(*)::int as count FROM page_views`
    const totalViews = totalViewsResult[0]?.count || 0

    console.log('📈 Current statistics:')
    console.log(`   - Total page views: ${totalViews.toLocaleString()}`)
    console.log(`   - Views from admin IPs: ${adminViewsCount.toLocaleString()}`)
    console.log(`   - Views with is_admin_view=true: ${isAdminViewsCount.toLocaleString()}`)
    console.log(`   - Views to be deleted: ${adminViewsCount.toLocaleString()}`)
    console.log(`   - Views to remain: ${(totalViews - adminViewsCount).toLocaleString()}`)
    console.log('')

    if (adminViewsCount === 0) {
      console.log('✅ No admin views to delete.')
      await sql.end()
      return
    }

    console.log('⚠️  WARNING: This will delete all page views from admin IP addresses!')
    console.log('   This includes both admin views (is_admin_view=true) and regular views from admin IPs.')
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')
    
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('🗑️  Deleting admin views...')
    
    // Delete all views from admin IP addresses
    const deleteResult = await sql`
      DELETE FROM page_views
      WHERE ip_address = ANY(${adminIpAddresses})
    `
    
    console.log(`✅ Deleted ${adminViewsCount.toLocaleString()} page views from admin IP addresses`)

    // Verify deletion
    const verifyResult = await sql`SELECT COUNT(*)::int as count FROM page_views`
    const remainingCount = verifyResult[0]?.count || 0
    console.log(`✅ Verification: ${remainingCount.toLocaleString()} page views remaining`)
    console.log(`   (Deleted ${adminViewsCount.toLocaleString()}, kept ${remainingCount.toLocaleString()})`)

    await sql.end()
    console.log('\n🎉 Admin analytics data cleared successfully!')
    console.log('\n💡 Your analytics statistics are now clean and only show real visitor data.')
  } catch (error) {
    console.error('❌ Error clearing admin analytics data:', error)
    process.exit(1)
  }
}

async function clearAllAnalyticsData() {
  try {
    const databaseUrl = getDatabaseUrl()
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 1
    })

    console.log('🔍 Checking current page views count...')
    const countResult = await sql`SELECT COUNT(*)::int as count FROM page_views`
    const currentCount = countResult[0]?.count || 0

    console.log(`📊 Found ${currentCount.toLocaleString()} page views in database`)

    if (currentCount === 0) {
      console.log('✅ No data to clear')
      await sql.end()
      return
    }

    console.log('\n⚠️  WARNING: This will delete ALL page views data!')
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')
    
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('🗑️  Deleting all page views...')
    const deleteResult = await sql`DELETE FROM page_views`
    console.log('✅ All page views deleted successfully')

    // Verify deletion
    const verifyResult = await sql`SELECT COUNT(*)::int as count FROM page_views`
    const remainingCount = verifyResult[0]?.count || 0
    console.log(`✅ Verification: ${remainingCount} page views remaining`)

    await sql.end()
    console.log('\n🎉 All analytics data cleared successfully!')
  } catch (error) {
    console.error('❌ Error clearing analytics data:', error)
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const deleteAll = args.includes('--all')
const deleteAdminOnly = args.includes('--admin-only')

if (deleteAll) {
  clearAllAnalyticsData()
} else if (deleteAdminOnly) {
  clearAdminAnalyticsData()
} else {
  console.log('❌ Please specify an option:')
  console.log('   --admin-only   Delete only admin/sysadmin views (recommended)')
  console.log('   --all          Delete ALL page views data')
  console.log('\nUsage (from packages/webapp directory):')
  console.log('   cd packages/webapp')
  console.log('   pnpm exec tsx scripts/clear-analytics-data.ts --admin-only')
  console.log('   pnpm exec tsx scripts/clear-analytics-data.ts --all')
  console.log('\nOr from root:')
  console.log('   pnpm --filter webapp exec tsx scripts/clear-analytics-data.ts --admin-only')
  process.exit(1)
}

