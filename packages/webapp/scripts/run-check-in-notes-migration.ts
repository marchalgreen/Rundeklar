#!/usr/bin/env tsx
/**
 * Script to run the check-in notes migration (016_add_check_in_notes.sql)
 * 
 * This script executes the SQL migration to add the notes column to check_ins table
 * in your Neon/Postgres database.
 * 
 * Usage:
 * 1. Make sure DATABASE_URL is set in .env.local
 * 2. Run: pnpm tsx scripts/run-check-in-notes-migration.ts
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
const migrationPath = join(__dirname, '../../../database/migrations/016_add_check_in_notes.sql')
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
  console.log('🚀 Running check-in notes migration...\n')
  console.log(`📄 Migration file: ${migrationPath}\n`)
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...')
    await sql`SELECT 1`
    console.log('✅ Connected to database\n')
    
    // Check if column already exists
    console.log('🔍 Checking if notes column already exists...')
    const existingColumn = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'check_ins'
        AND column_name = 'notes'
      )
    `
    
    if (existingColumn[0]?.exists) {
      console.log('⚠️  Column notes already exists in check_ins table!')
      console.log('   The migration may have already been run.')
      console.log('   Skipping migration.\n')
      
      // Verify the column
      const columnInfo = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'check_ins'
        AND column_name = 'notes'
      `
      
      if (columnInfo.length > 0) {
        console.log('✅ Column verification:')
        console.log(`   - Column: ${columnInfo[0].column_name}`)
        console.log(`   - Type: ${columnInfo[0].data_type}`)
        console.log(`   - Nullable: ${columnInfo[0].is_nullable}`)
        console.log('\n🎉 Migration already applied - nothing to do!')
      }
      
      await sql.end()
      return
    } else {
      console.log('✅ Column does not exist - safe to proceed\n')
    }
    
    // Execute migration
    console.log('🔄 Executing migration SQL...\n')
    
    // Execute the SQL
    await sql.unsafe(migrationSQL)
    
    console.log('✅ Migration executed successfully!\n')
    
    // Verify migration
    console.log('🔍 Verifying migration...')
    const columnCheck = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'check_ins'
      AND column_name = 'notes'
    `
    
    if (columnCheck.length > 0) {
      console.log('✅ Column created successfully:')
      console.log(`   - Column: ${columnCheck[0].column_name}`)
      console.log(`   - Type: ${columnCheck[0].data_type}`)
      console.log(`   - Nullable: ${columnCheck[0].is_nullable}`)
      
      // Check comment
      const commentCheck = await sql`
        SELECT obj_description(
          (SELECT oid FROM pg_class WHERE relname = 'check_ins'),
          'pg_class'
        ) as table_comment,
        col_description(
          (SELECT oid FROM pg_class WHERE relname = 'check_ins'),
          (SELECT attnum FROM pg_attribute WHERE attrelid = (SELECT oid FROM pg_class WHERE relname = 'check_ins') AND attname = 'notes')
        ) as column_comment
      `
      
      if (commentCheck[0]?.column_comment) {
        console.log(`   - Comment: ${commentCheck[0].column_comment}`)
      }
      
      console.log('\n🎉 Migration completed successfully!')
      console.log('   The notes column is ready to use in check_ins table.')
    } else {
      console.log('⚠️  Warning: Column verification failed - column may not have been created')
    }
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    if (error.message.includes('already exists')) {
      console.error('\n💡 Tip: The migration may have already been run.')
      console.error('   Check if the notes column exists in check_ins table.')
    } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('\n💡 Tip: The check_ins table may not exist.')
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

