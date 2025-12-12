#!/usr/bin/env tsx
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

async function checkAnalytics() {
  const sql = postgres(getDatabaseUrl(), { ssl: 'require', max: 1 })

  try {
    // Get total views
    const total = await sql`SELECT COUNT(*)::int as count FROM page_views`
    console.log('📊 Total views in database:', total[0].count)

    // Get admin views
    const admin = await sql`SELECT COUNT(*)::int as count FROM page_views WHERE is_admin_view = true`
    console.log('👤 Admin views (is_admin_view=true):', admin[0].count)

    // Get all IPs with admin views
    const adminIps = await sql`
      SELECT DISTINCT ip_address, COUNT(*)::int as count
      FROM page_views
      WHERE is_admin_view = true AND ip_address IS NOT NULL
      GROUP BY ip_address
    `
    console.log('\n🔍 IPs with admin views:')
    if (adminIps.length === 0) {
      console.log('   (none)')
    } else {
      adminIps.forEach((row: any) => console.log(`   ${row.ip_address}: ${row.count} admin views`))
    }

    // Get views from these IPs
    if (adminIps.length > 0) {
      const ips = adminIps.map((r: any) => r.ip_address)
      const fromAdminIps = await sql`SELECT COUNT(*)::int as count FROM page_views WHERE ip_address = ANY(${ips})`
      console.log('\n📈 Total views from admin IPs:', fromAdminIps[0].count)
    }

    // Get views excluding admin
    const nonAdmin = await sql`SELECT COUNT(*)::int as count FROM page_views WHERE is_admin_view = false`
    console.log('\n✅ Non-admin views (is_admin_view=false):', nonAdmin[0].count)

    // Get views excluding admin IPs
    if (adminIps.length > 0) {
      const ips = adminIps.map((r: any) => r.ip_address)
      const excludingAdminIps = await sql`SELECT COUNT(*)::int as count FROM page_views WHERE ip_address IS DISTINCT FROM ALL(${ips})`
      console.log('✅ Views excluding admin IPs:', excludingAdminIps[0].count)
    }

    // Get views that should be shown (excluding admin AND admin IPs)
    if (adminIps.length > 0) {
      const ips = adminIps.map((r: any) => r.ip_address)
      const shouldShow = await sql`SELECT COUNT(*)::int as count FROM page_views WHERE is_admin_view = false AND ip_address IS DISTINCT FROM ALL(${ips})`
      console.log('\n🎯 Views that should be shown in analytics:', shouldShow[0].count)
    } else {
      const shouldShow = await sql`SELECT COUNT(*)::int as count FROM page_views WHERE is_admin_view = false`
      console.log('\n🎯 Views that should be shown in analytics:', shouldShow[0].count)
    }

    // Recent views breakdown
    console.log('\n📅 Recent views (last 10):')
    const recent = await sql`
      SELECT 
        created_at,
        tenant_id,
        path,
        is_admin_view,
        ip_address
      FROM page_views
      ORDER BY created_at DESC
      LIMIT 10
    `
    recent.forEach((row: any, i: number) => {
      console.log(`   ${i + 1}. ${row.created_at.toISOString().split('T')[0]} ${row.tenant_id} ${row.path} (admin: ${row.is_admin_view}, IP: ${row.ip_address})`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await sql.end()
  }
}

checkAnalytics()

