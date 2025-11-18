#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * Update user role script
 * 
 * This script updates a user's role in the database.
 * 
 * Usage:
 *   cd packages/webapp && pnpm exec tsx scripts/update-user-role.ts [email] [role]
 * 
 * Example:
 *   cd packages/webapp && pnpm exec tsx scripts/update-user-role.ts marchalgreen@gmail.com sysadmin
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

async function updateUserRole() {
  const email = process.argv[2]
  const role = process.argv[3]

  if (!email || !role) {
    console.error('❌ Usage: pnpm exec tsx scripts/update-user-role.ts [email] [role]')
    console.error('')
    console.error('Valid roles: sysadmin, admin, coach')
    console.error('')
    console.error('Example:')
    console.error('  pnpm exec tsx scripts/update-user-role.ts marchalgreen@gmail.com sysadmin')
    process.exit(1)
  }

  const validRoles = ['sysadmin', 'admin', 'coach']
  if (!validRoles.includes(role)) {
    console.error(`❌ Invalid role: ${role}`)
    console.error(`Valid roles are: ${validRoles.join(', ')}`)
    process.exit(1)
  }

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

    console.log(`\n🔍 Looking for user: ${email}`)
    
    // First, check if user exists
    const [user] = await sql`
      SELECT 
        id,
        email,
        username,
        role,
        tenant_id,
        password_hash IS NOT NULL as has_password,
        pin_hash IS NOT NULL as has_pin,
        email_verified
      FROM clubs
      WHERE email = ${email}
    `

    if (!user) {
      console.error(`❌ User not found: ${email}`)
      console.error('   Make sure the email address is correct')
      await sql.end()
      process.exit(1)
    }

    console.log('\n📋 Current user details:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Username: ${user.username || 'none'}`)
    console.log(`   Current role: ${user.role || 'none'}`)
    console.log(`   Tenant: ${user.tenant_id}`)
    console.log(`   Has password: ${user.has_password}`)
    console.log(`   Has PIN: ${user.has_pin}`)
    console.log(`   Email verified: ${user.email_verified}`)

    // Validate role requirements
    if (role === 'sysadmin' || role === 'admin') {
      if (!user.has_password) {
        console.error(`\n❌ Cannot set role to '${role}' - user must have a password`)
        console.error('   Admin and sysadmin roles require password authentication')
        await sql.end()
        process.exit(1)
      }
    }

    if (role === 'coach') {
      if (!user.has_pin || !user.username) {
        console.error(`\n❌ Cannot set role to 'coach' - user must have username and PIN`)
        console.error('   Coach role requires username and PIN authentication')
        await sql.end()
        process.exit(1)
      }
      if (user.has_password) {
        console.warn(`\n⚠️  Warning: User has password_hash but role will be 'coach'`)
        console.warn('   Coaches should not have password_hash (will be set to NULL)')
      }
    }

    // Update role
    console.log(`\n🔄 Updating role from '${user.role || 'none'}' to '${role}'...`)
    
    if (role === 'coach') {
      // For coaches, ensure password_hash is NULL
      await sql`
        UPDATE clubs
        SET role = ${role}, password_hash = NULL
        WHERE email = ${email}
      `
    } else {
      // For admin/sysadmin, ensure password_hash is NOT NULL
      await sql`
        UPDATE clubs
        SET role = ${role}
        WHERE email = ${email}
      `
    }

    // Verify update
    const [updatedUser] = await sql`
      SELECT 
        id,
        email,
        username,
        role,
        tenant_id,
        password_hash IS NOT NULL as has_password,
        pin_hash IS NOT NULL as has_pin
      FROM clubs
      WHERE email = ${email}
    `

    console.log('\n✅ Role updated successfully!')
    console.log('\n📋 Updated user details:')
    console.log(`   Email: ${updatedUser.email}`)
    console.log(`   Username: ${updatedUser.username || 'none'}`)
    console.log(`   Role: ${updatedUser.role}`)
    console.log(`   Tenant: ${updatedUser.tenant_id}`)
    console.log(`   Has password: ${updatedUser.has_password}`)
    console.log(`   Has PIN: ${updatedUser.has_pin}`)

    console.log('\n📝 Next steps:')
    console.log('   1. Log out and log back in to refresh your session')
    console.log('   2. You should now see admin features in the UI')
    console.log('')

    await sql.end()
    console.log('✅ Done!')
  } catch (error) {
    console.error('❌ Error updating user role:', error)
    process.exit(1)
  }
}

updateUserRole()

