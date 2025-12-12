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

async function testCount() {
  const sql = postgres(getDatabaseUrl(), { ssl: 'require', max: 1 })

  try {
    // Test COUNT query with ::int
    const result1 = await sql`SELECT COUNT(*)::int as count FROM page_views WHERE is_admin_view = false`
    console.log('COUNT(*)::int result:', result1[0].count, 'Type:', typeof result1[0].count, 'Raw:', JSON.stringify(result1[0]))

    // Test COUNT query without ::int
    const result2 = await sql`SELECT COUNT(*) as count FROM page_views WHERE is_admin_view = false`
    console.log('COUNT(*) result:', result2[0].count, 'Type:', typeof result2[0].count, 'Raw:', JSON.stringify(result2[0]))

    // Test views by tenant
    const result3 = await sql`
      SELECT 
        tenant_id,
        COUNT(*)::int as total_views
      FROM page_views
      WHERE is_admin_view = false
      GROUP BY tenant_id
    `
    console.log('\nViews by tenant:')
    result3.forEach((row: any) => {
      console.log(`  ${row.tenant_id}: ${row.total_views} (type: ${typeof row.total_views})`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await sql.end()
  }
}

testCount()


