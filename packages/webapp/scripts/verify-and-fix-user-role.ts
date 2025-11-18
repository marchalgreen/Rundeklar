#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * Verify and fix user role script
 * 
 * This script verifies a user's role and ensures it's set to sysadmin.
 * It also checks if migration 011 needs to be run.
 * 
 * Usage:
 *   cd packages/webapp && pnpm exec tsx scripts/verify-and-fix-user-role.ts [email]
 * 
 * Example:
 *   cd packages/webapp && pnpm exec tsx scripts/verify-and-fix-user-role.ts marchalgreen@gmail.com
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

async function verifyAndFixUserRole() {
  const email = process.argv[2] || 'marchalgreen@gmail.com'

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

    // Check if there are any super_admin users (migration not run)
    console.log('\n🔍 Checking for legacy super_admin users...')
    const superAdminUsers = await sql`
      SELECT email, role, password_hash IS NOT NULL as has_password
      FROM clubs
      WHERE role = 'super_admin'
    `

    if (superAdminUsers.length > 0) {
      console.log(`⚠️  Found ${superAdminUsers.length} user(s) with 'super_admin' role:`)
      superAdminUsers.forEach(user => {
        console.log(`   - ${user.email} (has password: ${user.has_password})`)
      })
      console.log('\n📝 Migration 011 needs to be run to convert super_admin to sysadmin')
      console.log('   Run this SQL in Neon SQL Editor:')
      console.log('   File: supabase/migrations/011_rename_super_admin_to_sysadmin.sql')
    } else {
      console.log('✅ No legacy super_admin users found - migration appears to be applied')
    }

    // Check the specific user
    console.log(`\n🔍 Checking user: ${email}`)
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
      await sql.end()
      process.exit(1)
    }

    console.log('\n📋 Current user details:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Username: ${user.username || 'none'}`)
    console.log(`   Role: ${user.role || 'none'}`)
    console.log(`   Tenant: ${user.tenant_id}`)
    console.log(`   Has password: ${user.has_password}`)
    console.log(`   Has PIN: ${user.has_pin}`)
    console.log(`   Email verified: ${user.email_verified}`)

    // Check if role needs to be updated
    if (user.role === 'super_admin') {
      console.log('\n🔄 User has legacy role "super_admin" - updating to "sysadmin"...')
      
      if (!user.has_password) {
        console.error('❌ Cannot update to sysadmin - user must have a password')
        await sql.end()
        process.exit(1)
      }

      await sql`
        UPDATE clubs
        SET role = 'sysadmin'
        WHERE email = ${email}
      `

      console.log('✅ Role updated from "super_admin" to "sysadmin"')
    } else if (user.role === 'sysadmin') {
      console.log('\n✅ User already has "sysadmin" role')
    } else {
      console.log(`\n⚠️  User has role "${user.role}" - not sysadmin`)
      console.log('   If you want to change it, use:')
      console.log(`   pnpm exec tsx scripts/update-user-role.ts ${email} sysadmin`)
    }

    // Verify final state
    const [finalUser] = await sql`
      SELECT role, password_hash IS NOT NULL as has_password
      FROM clubs
      WHERE email = ${email}
    `

    console.log('\n📋 Final status:')
    console.log(`   Role: ${finalUser.role}`)
    console.log(`   Has password: ${finalUser.has_password}`)

    if (finalUser.role === 'sysadmin' && finalUser.has_password) {
      console.log('\n✅ User is correctly configured as sysadmin!')
      console.log('\n📝 Next steps:')
      console.log('   1. Log out completely from the application')
      console.log('   2. Clear browser cache/localStorage if needed')
      console.log('   3. Log back in with your email and password')
      console.log('   4. You should now have full admin access')
    } else {
      console.log('\n⚠️  User may not have full admin access')
      if (!finalUser.has_password) {
        console.log('   - User needs a password to be sysadmin')
      }
    }

    await sql.end()
    console.log('\n✅ Done!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

verifyAndFixUserRole()

