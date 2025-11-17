/**
 * Script to check users in database
 * Run with: tsx packages/webapp/scripts/check-users.ts
 */

import postgres from 'postgres'
import { getDatabaseUrl } from '../api/auth/db-helper'

async function checkUsers() {
  try {
    const databaseUrl = getDatabaseUrl()
    console.log('Connecting to database...')
    
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10
    })

    console.log('\n=== Checking all users ===\n')
    
    // Get all users with their roles
    const users = await sql`
      SELECT 
        id,
        email,
        username,
        role,
        tenant_id,
        email_verified,
        password_hash IS NOT NULL as has_password,
        pin_hash IS NOT NULL as has_pin,
        created_at,
        last_login
      FROM clubs
      ORDER BY created_at DESC
    `

    if (users.length === 0) {
      console.log('❌ No users found in database!')
      return
    }

    console.log(`✅ Found ${users.length} user(s):\n`)

    // Group by role
    const byRole = {
      super_admin: [] as typeof users,
      admin: [] as typeof users,
      coach: [] as typeof users,
      null: [] as typeof users
    }

    users.forEach(user => {
      const role = user.role || 'null'
      if (role in byRole) {
        byRole[role as keyof typeof byRole].push(user)
      } else {
        byRole.null.push(user)
      }
    })

    // Print by role
    if (byRole.super_admin.length > 0) {
      console.log('🔴 SUPER_ADMINS:')
      byRole.super_admin.forEach(user => {
        console.log(`  - ${user.email} (${user.username || 'no username'})`)
        console.log(`    ID: ${user.id}, Tenant: ${user.tenant_id}`)
        console.log(`    Has password: ${user.has_password}, Has PIN: ${user.has_pin}`)
        console.log(`    Email verified: ${user.email_verified}`)
        console.log(`    Created: ${user.created_at}, Last login: ${user.last_login || 'never'}`)
        console.log('')
      })
    }

    if (byRole.admin.length > 0) {
      console.log('🟡 ADMINS:')
      byRole.admin.forEach(user => {
        console.log(`  - ${user.email} (${user.username || 'no username'})`)
        console.log(`    ID: ${user.id}, Tenant: ${user.tenant_id}`)
        console.log(`    Has password: ${user.has_password}, Has PIN: ${user.has_pin}`)
        console.log(`    Email verified: ${user.email_verified}`)
        console.log(`    Created: ${user.created_at}, Last login: ${user.last_login || 'never'}`)
        console.log('')
      })
    }

    if (byRole.coach.length > 0) {
      console.log('🟢 COACHES:')
      byRole.coach.forEach(user => {
        console.log(`  - ${user.email || 'no email'} (${user.username || 'no username'})`)
        console.log(`    ID: ${user.id}, Tenant: ${user.tenant_id}`)
        console.log(`    Has password: ${user.has_password}, Has PIN: ${user.has_pin}`)
        console.log(`    Email verified: ${user.email_verified}`)
        console.log(`    Created: ${user.created_at}, Last login: ${user.last_login || 'never'}`)
        console.log('')
      })
    }

    if (byRole.null.length > 0) {
      console.log('⚠️  USERS WITHOUT ROLE:')
      byRole.null.forEach(user => {
        console.log(`  - ${user.email || 'no email'} (${user.username || 'no username'})`)
        console.log(`    ID: ${user.id}, Tenant: ${user.tenant_id}`)
        console.log(`    Has password: ${user.has_password}, Has PIN: ${user.has_pin}`)
        console.log(`    Email verified: ${user.email_verified}`)
        console.log(`    Created: ${user.created_at}, Last login: ${user.last_login || 'never'}`)
        console.log('')
      })
    }

    // Summary
    console.log('\n=== Summary ===')
    console.log(`Total users: ${users.length}`)
    console.log(`Super admins: ${byRole.super_admin.length}`)
    console.log(`Admins: ${byRole.admin.length}`)
    console.log(`Coaches: ${byRole.coach.length}`)
    console.log(`Without role: ${byRole.null.length}`)

    // Check tenants
    console.log('\n=== Tenants ===')
    const tenants = await sql`
      SELECT DISTINCT tenant_id, COUNT(*) as user_count
      FROM clubs
      GROUP BY tenant_id
      ORDER BY tenant_id
    `
    tenants.forEach(tenant => {
      console.log(`  - ${tenant.tenant_id}: ${tenant.user_count} user(s)`)
    })

    await sql.end()
    console.log('\n✅ Done!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkUsers()

