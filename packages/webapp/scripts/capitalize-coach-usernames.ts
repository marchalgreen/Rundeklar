#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * Capitalize coach usernames script
 * 
 * This script updates existing coach usernames in the database to have
 * proper capitalization (first letter uppercase). Login will still work
 * because authentication uses case-insensitive matching (LOWER() in SQL).
 * 
 * Usage:
 *   cd packages/webapp && pnpm exec tsx scripts/capitalize-coach-usernames.ts [--dry-run]
 * 
 * Example:
 *   cd packages/webapp && pnpm exec tsx scripts/capitalize-coach-usernames.ts
 *   cd packages/webapp && pnpm exec tsx scripts/capitalize-coach-usernames.ts --dry-run
 */

import postgres from 'postgres'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

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
    console.log(`📄 Loading environment from: ${envPath}`)
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
    envLoaded = true
    break
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env.local file found. Make sure DATABASE_URL is set in environment')
}

// Fallback: Use VITE_DATABASE_URL if DATABASE_URL is not set
if (!process.env.DATABASE_URL && process.env.VITE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_DATABASE_URL
  console.log('📝 Using VITE_DATABASE_URL as DATABASE_URL')
}

/**
 * Capitalizes the first letter of a string
 */
function capitalizeFirstLetter(str: string): string {
  if (!str || str.length === 0) {
    return str
  }
  return str.charAt(0).toUpperCase() + str.slice(1)
}

async function capitalizeCoachUsernames() {
  const isDryRun = process.argv.includes('--dry-run')

  try {
    const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL environment variable is not set')
      console.error('   Set it in .env.local or as environment variable')
      process.exit(1)
    }

    console.log('🔌 Connecting to database...')
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10
    })

    if (isDryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made\n')
    }

    console.log('\n📋 Finding coaches with lowercase usernames...')
    
    // Find all coaches with usernames that start with lowercase
    // We check if the first character is lowercase
    const coaches = await sql`
      SELECT 
        id,
        email,
        username,
        tenant_id,
        role
      FROM clubs
      WHERE role = 'coach'
        AND username IS NOT NULL
        AND LENGTH(username) > 0
        AND username ~ '^[a-z]'  -- Starts with lowercase letter
      ORDER BY tenant_id, username
    `

    if (coaches.length === 0) {
      console.log('✅ No coaches found with lowercase usernames')
      console.log('   All coach usernames already have proper capitalization')
      await sql.end()
      process.exit(0)
    }

    console.log(`\n📊 Found ${coaches.length} coach(es) with lowercase usernames:\n`)

    // Group by tenant
    const byTenant = new Map<string, typeof coaches>()
    coaches.forEach(coach => {
      const tenant = coach.tenant_id || 'unknown'
      if (!byTenant.has(tenant)) {
        byTenant.set(tenant, [])
      }
      byTenant.get(tenant)!.push(coach)
    })

    // Display coaches by tenant
    for (const [tenantId, tenantCoaches] of byTenant.entries()) {
      console.log(`🏢 Tenant: ${tenantId}`)
      tenantCoaches.forEach(coach => {
        const capitalized = capitalizeFirstLetter(coach.username)
        console.log(`   - ${coach.username} → ${capitalized} (${coach.email})`)
      })
      console.log('')
    }

    if (isDryRun) {
      console.log('✅ Dry run complete - no changes made')
      console.log('   Run without --dry-run to apply changes')
      await sql.end()
      process.exit(0)
    }

    // Update usernames
    console.log('🔄 Updating usernames...\n')
    let updated = 0
    let errors = 0

    for (const coach of coaches) {
      const capitalized = capitalizeFirstLetter(coach.username)
      
      try {
        await sql`
          UPDATE clubs
          SET username = ${capitalized}
          WHERE id = ${coach.id}
            AND role = 'coach'
        `
        console.log(`✅ Updated: ${coach.username} → ${capitalized}`)
        updated++
      } catch (error) {
        console.error(`❌ Failed to update ${coach.username}:`, error)
        errors++
      }
    }

    console.log('\n📊 Summary:')
    console.log(`   Total coaches found: ${coaches.length}`)
    console.log(`   Successfully updated: ${updated}`)
    if (errors > 0) {
      console.log(`   Errors: ${errors}`)
    }

    // Verify updates
    console.log('\n🔍 Verifying updates...')
    const verifyCoaches = await sql`
      SELECT 
        id,
        username,
        tenant_id
      FROM clubs
      WHERE role = 'coach'
        AND username IS NOT NULL
        AND LENGTH(username) > 0
        AND username ~ '^[a-z]'  -- Still starts with lowercase
      ORDER BY tenant_id, username
    `

    if (verifyCoaches.length === 0) {
      console.log('✅ All coach usernames now have proper capitalization!')
    } else {
      console.log(`⚠️  ${verifyCoaches.length} coach(es) still have lowercase usernames:`)
      verifyCoaches.forEach(coach => {
        console.log(`   - ${coach.username} (tenant: ${coach.tenant_id})`)
      })
    }

    console.log('\n📝 Important notes:')
    console.log('   - Login will continue to work (case-insensitive matching)')
    console.log('   - Usernames are displayed with proper capitalization in UI')
    console.log('   - New coaches will still be stored with lowercase (normalized)')
    console.log('')

    await sql.end()
    console.log('✅ Done!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

capitalizeCoachUsernames()

