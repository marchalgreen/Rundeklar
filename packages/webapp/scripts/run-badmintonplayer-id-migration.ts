#!/usr/bin/env tsx
/**
 * Script to run the badmintonplayer_id migration
 * 
 * Usage:
 *   pnpm --filter webapp exec tsx scripts/run-badmintonplayer-id-migration.ts
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

// Get migration file path (from packages/webapp/scripts to root database/migrations)
const migrationPath = join(__dirname, '../../../database/migrations/017_add_badmintonplayer_id.sql')

// Get database URL from environment
const databaseUrl = 
  env.DATABASE_URL || 
  env.DATABASE_URL_UNPOOLED ||
  env.VITE_DATABASE_URL ||
  env.VITE_DATABASE_URL_UNPOOLED ||
  env.POSTGRES_URL ||
  env.NEON_DATABASE_URL

if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL not found in environment variables')
  console.error('   Please set DATABASE_URL in .env.local or as an environment variable')
  console.error('   Example: DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"')
  process.exit(1)
}

// Read migration file
let migrationSQL: string
try {
  migrationSQL = readFileSync(migrationPath, 'utf-8')
} catch (error) {
  console.error(`❌ Error: Could not read migration file at ${migrationPath}`)
  console.error('   Error:', error)
  process.exit(1)
}

// Create Postgres client
const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
})

async function runMigration() {
  console.log('🚀 Running badmintonplayer_id migration...\n')
  console.log(`📄 Migration file: ${migrationPath}\n`)
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...')
    await sql`SELECT 1`
    console.log('✅ Connected to database\n')
    
    // Check if column already exists
    console.log('🔍 Checking if badmintonplayer_id column already exists...')
    const existingColumn = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'players'
        AND column_name = 'badmintonplayer_id'
      )
    `
    
    if (existingColumn[0]?.exists) {
      console.log('⚠️  Column badmintonplayer_id already exists!')
      console.log('   The migration may have already been run.')
      console.log('   Continuing anyway (IF NOT EXISTS will handle it)...\n')
    } else {
      console.log('✅ Column does not exist - safe to proceed\n')
    }
    
    // Execute migration
    console.log('🔄 Executing migration SQL...\n')
    
    // Execute the entire SQL as-is (postgres.js handles it well)
    await sql.unsafe(migrationSQL)
    
    console.log('✅ Migration executed successfully!\n')
    
    // Verify migration
    console.log('🔍 Verifying migration...')
    const columnCheck = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'players'
        AND column_name = 'badmintonplayer_id'
    `
    
    if (columnCheck.length > 0) {
      console.log('✅ Column verified:')
      console.log(`   - Name: ${columnCheck[0].column_name}`)
      console.log(`   - Type: ${columnCheck[0].data_type}`)
      console.log(`   - Nullable: ${columnCheck[0].is_nullable}`)
    } else {
      console.log('⚠️  Warning: Column not found after migration')
    }
    
    // Check index
    const indexCheck = await sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'players' 
        AND indexname = 'idx_players_badmintonplayer_id'
    `
    
    if (indexCheck.length > 0) {
      console.log('✅ Index verified: idx_players_badmintonplayer_id')
    } else {
      console.log('⚠️  Warning: Index not found after migration')
    }
    
    console.log('')
    console.log('🎉 Migration completed successfully!')
    console.log('')
    console.log('📝 Next steps:')
    console.log('   1. Add badmintonplayer_id to your players in the database')
    console.log('   2. Test the ranking update script:')
    console.log('      pnpm --filter webapp exec tsx scripts/update-rankings.ts [tenant-id]')
    console.log('')
    
  } catch (error) {
    console.error('')
    console.error('❌ Migration failed:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      if (error.stack) {
        console.error('   Stack:', error.stack)
      }
    }
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigration()

