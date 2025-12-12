#!/usr/bin/env tsx
/**
 * Script to run the match_results migration (015_add_match_results.sql)
 * 
 * This script executes the SQL migration to create the match_results table
 * in your Neon database.
 * 
 * Usage:
 * 1. Make sure DATABASE_URL is set in .env.local
 * 2. Run: pnpm tsx scripts/run-match-results-migration.ts
 */

import postgres from 'postgres'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
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

const env = loadEnv()
const databaseUrl = env.DATABASE_URL || env.POSTGRES_URL || env.NEON_DATABASE_URL

if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL not found in environment variables')
  console.error('   Please set DATABASE_URL in .env.local or as an environment variable')
  console.error('   Example: DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"')
  process.exit(1)
}

// Read migration file
const migrationPath = join(__dirname, '../../../database/migrations/015_add_match_results.sql')
if (!existsSync(migrationPath)) {
  console.error(`❌ Error: Migration file not found at ${migrationPath}`)
  process.exit(1)
}

const migrationSQL = readFileSync(migrationPath, 'utf-8')

// Initialize Postgres client
const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
})

async function runMigration() {
  console.log('🚀 Running match_results migration...\n')
  console.log(`📄 Migration file: ${migrationPath}\n`)
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...')
    await sql`SELECT 1`
    console.log('✅ Connected to database\n')
    
    // Check if table already exists
    console.log('🔍 Checking if match_results table already exists...')
    const existingTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'match_results'
      )
    `
    
    if (existingTable[0]?.exists) {
      console.log('⚠️  Table match_results already exists!')
      console.log('   The migration may have already been run.')
      console.log('   Do you want to continue anyway? (This will fail if objects already exist)')
      console.log('   If you want to re-run, you may need to drop the table first.\n')
    } else {
      console.log('✅ Table does not exist - safe to proceed\n')
    }
    
    // Execute migration
    console.log('🔄 Executing migration SQL...\n')
    
    // Split SQL into statements (handling multi-line statements)
    // We'll execute the entire SQL as-is since postgres.js handles it well
    await sql.unsafe(migrationSQL)
    
    console.log('✅ Migration executed successfully!\n')
    
    // Verify migration
    console.log('🔍 Verifying migration...')
    const tableCheck = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'match_results'
      ORDER BY ordinal_position
    `
    
    if (tableCheck.length > 0) {
      console.log('✅ Table created successfully with columns:')
      tableCheck.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`)
      })
      
      // Check indexes
      const indexes = await sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'match_results'
      `
      if (indexes.length > 0) {
        console.log('\n✅ Indexes created:')
        indexes.forEach(idx => {
          console.log(`   - ${idx.indexname}`)
        })
      }
      
      // Check triggers
      const triggers = await sql`
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'match_results'
      `
      if (triggers.length > 0) {
        console.log('\n✅ Triggers created:')
        triggers.forEach(trg => {
          console.log(`   - ${trg.trigger_name}`)
        })
      }
      
      console.log('\n🎉 Migration completed successfully!')
      console.log('   The match_results table is ready to use.')
    } else {
      console.log('⚠️  Warning: Table verification failed - table may not have been created')
    }
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    if (error.message.includes('already exists')) {
      console.error('\n💡 Tip: The migration may have already been run.')
      console.error('   Check if the match_results table exists in your database.')
    } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('\n💡 Tip: A referenced table may not exist.')
      console.error('   Make sure you have run the initial schema migration first.')
    }
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigration().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})

