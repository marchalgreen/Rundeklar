#!/usr/bin/env tsx
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import postgres from 'postgres'
import { getDatabaseUrl } from '../api/auth/db-helper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load env
const envPath = join(__dirname, '../.env.local')
if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf-8')
  env.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
      }
    }
  })
}

if (!process.env.DATABASE_URL && process.env.VITE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_DATABASE_URL
}

async function testAnalyticsQueries() {
  const sql = postgres(getDatabaseUrl(), { ssl: 'require', max: 1 })

  try {
    // Simulate what analytics API does
    const adminIpAddresses: string[] = [] // Empty since all admin views are deleted
    
    // Build WHERE clause like the API does
    const where = 'WHERE is_admin_view = false'
    const params: any[] = []
    
    // Test total views query (what API should return)
    console.log('Testing total views query...')
    const query1 = `SELECT COUNT(*)::int as count FROM page_views ${where}`
    console.log('Query:', query1)
    console.log('Params:', params)
    
    const result1 = await sql.unsafe(query1, params)
    console.log('Result:', JSON.stringify(result1, null, 2))
    console.log('Count value:', result1[0]?.count, 'Type:', typeof result1[0]?.count)
    console.log('Parsed:', Number(result1[0]?.count || 0))
    console.log('')
    
    // Test views by tenant query
    console.log('Testing views by tenant query...')
    const tenantIpWhere = `${where} AND ip_address IS NOT NULL`
    const query2 = `
      SELECT 
        tenant_id,
        COUNT(*)::int as total_views,
        COUNT(DISTINCT ip_address)::int as unique_visitors
      FROM page_views
      ${tenantIpWhere}
      GROUP BY tenant_id
      ORDER BY total_views DESC
    `
    console.log('Query:', query2)
    console.log('Params:', params)
    
    const result2 = await sql.unsafe(query2, params)
    console.log('Result:', JSON.stringify(result2, null, 2))
    result2.forEach((row: any) => {
      console.log(`Tenant: ${row.tenant_id}, Views: ${row.total_views} (type: ${typeof row.total_views}), Parsed: ${Number(row.total_views || 0)}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await sql.end()
  }
}

testAnalyticsQueries()


