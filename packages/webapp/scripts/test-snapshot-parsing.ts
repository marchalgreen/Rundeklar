#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * Test script to verify how snapshots are parsed from database.
 * 
 * This helps identify root cause of why statistics show 0 values.
 */

import postgres from 'postgres'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const possiblePaths = [
  join(__dirname, '../.env.local'),
  join(__dirname, '../../.env.local'),
  join(process.cwd(), '.env.local')
]

for (const envPath of possiblePaths) {
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
          process.env[key.trim()] = value
        }
      }
    }
    break
  }
}

if (!process.env.DATABASE_URL && process.env.VITE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_DATABASE_URL
}

const tenantId = process.argv[2] || 'demo'
const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED

if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL not set')
  process.exit(1)
}

const sql = postgres(databaseUrl, { max: 1 })

// Simulate rowToStatisticsSnapshot function
function ensureArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

async function testSnapshotParsing() {
  console.log(`\n🔍 Testing snapshot parsing for tenant: ${tenantId}\n`)

  try {
    // Get a sample snapshot directly from Postgres
    const [snapshot] = await sql`
      SELECT 
        id,
        session_id,
        check_ins,
        jsonb_typeof(check_ins) as check_ins_type,
        CASE 
          WHEN jsonb_typeof(check_ins) = 'array' THEN jsonb_array_length(check_ins)
          WHEN jsonb_typeof(check_ins) = 'string' THEN 
            CASE 
              WHEN jsonb_typeof((check_ins #>> '{}')::jsonb) = 'array' 
              THEN jsonb_array_length((check_ins #>> '{}')::jsonb)
              ELSE 0
            END
          ELSE 0
        END as db_check_ins_count
      FROM statistics_snapshots
      WHERE tenant_id = ${tenantId}
      LIMIT 1
    `

    if (!snapshot) {
      console.log('❌ No snapshots found')
      return
    }

    console.log('📊 Raw database values:')
    console.log(`   check_ins type (from DB): ${snapshot.check_ins_type}`)
    console.log(`   check_ins count (from DB): ${snapshot.db_check_ins_count}`)
    console.log(`   check_ins JavaScript type: ${typeof snapshot.check_ins}`)
    console.log(`   check_ins is Array: ${Array.isArray(snapshot.check_ins)}`)
    
    if (typeof snapshot.check_ins === 'string') {
      console.log(`   check_ins string length: ${snapshot.check_ins.length}`)
      console.log(`   check_ins preview: ${snapshot.check_ins.substring(0, 100)}...`)
    }

    console.log('\n📋 After ensureArray parsing:')
    const parsedCheckIns = ensureArray(snapshot.check_ins)
    console.log(`   Parsed type: ${Array.isArray(parsedCheckIns) ? 'array' : typeof parsedCheckIns}`)
    console.log(`   Parsed length: ${parsedCheckIns.length}`)
    
    if (parsedCheckIns.length > 0) {
      console.log(`   First check-in:`, JSON.stringify(parsedCheckIns[0]).substring(0, 100))
    }

    // Test what happens when we serialize/deserialize (like API does)
    console.log('\n📋 After JSON serialization (simulating API):')
    const serialized = JSON.stringify(snapshot.check_ins)
    const deserialized = JSON.parse(serialized)
    console.log(`   After JSON round-trip type: ${typeof deserialized}`)
    console.log(`   After JSON round-trip is Array: ${Array.isArray(deserialized)}`)
    
    const parsedAfterRoundTrip = ensureArray(deserialized)
    console.log(`   After ensureArray: length = ${parsedAfterRoundTrip.length}`)

    // Test with isolation_id filtering
    console.log('\n📋 Testing with isolation_id filter:')
    const isolationId = await sql`
      SELECT isolation_id FROM training_sessions 
      WHERE id = ${snapshot.session_id} AND tenant_id = ${tenantId}
      LIMIT 1
    `.then(rows => rows[0]?.isolation_id || null)

    console.log(`   Session isolation_id: ${isolationId || 'NULL'}`)

    const filteredSnapshots = isolationId
      ? await sql`
          SELECT ss.* FROM statistics_snapshots ss
          INNER JOIN training_sessions ts ON ss.session_id = ts.id
          WHERE ss.tenant_id = ${tenantId} AND ts.isolation_id = ${isolationId}
          LIMIT 1
        `
      : await sql`
          SELECT ss.* FROM statistics_snapshots ss
          INNER JOIN training_sessions ts ON ss.session_id = ts.id
          WHERE ss.tenant_id = ${tenantId} AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
          LIMIT 1
        `

    if (filteredSnapshots.length > 0) {
      const filtered = filteredSnapshots[0]
      const filteredParsed = ensureArray(filtered.check_ins)
      console.log(`   Filtered snapshot check_ins length: ${filteredParsed.length}`)
    } else {
      console.log(`   ⚠️  No snapshots found with isolation_id filter!`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await sql.end()
  }
}

testSnapshotParsing().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

