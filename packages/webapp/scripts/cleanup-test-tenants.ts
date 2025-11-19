/**
 * Script to find and delete test tenants and users
 * 
 * Usage:
 *   cd packages/webapp
 *   npx tsx scripts/cleanup-test-tenants.ts
 * 
 * Or with environment variables:
 *   DATABASE_URL=your_db_url npx tsx scripts/cleanup-test-tenants.ts
 * 
 * This script will:
 * 1. Find all test tenant config files
 * 2. Find all users in database with test tenant IDs or test email patterns
 * 3. Show a list of what will be deleted
 * 4. Wait for confirmation before deleting
 */

import postgres from 'postgres'
import { getDatabaseUrl } from '../api/auth/db-helper'
import { readdir, unlink } from 'fs/promises'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local
// Try multiple possible locations
const possiblePaths = [
  join(__dirname, '../.env.local'),  // packages/webapp/.env.local
  join(__dirname, '../../.env.local'), // root/.env.local
  join(process.cwd(), '.env.local')  // current working directory
]

let envLoaded = false
for (const envPath of possiblePaths) {
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '') // Remove quotes
          process.env[key.trim()] = value
        }
      }
    })
    envLoaded = true
    break
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env.local file found. Looking in:', possiblePaths)
}

// Use VITE_DATABASE_URL as fallback for DATABASE_URL
if (!process.env.DATABASE_URL && process.env.VITE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_DATABASE_URL
}

// Test tenant patterns to identify test tenants
const TEST_TENANT_PATTERNS = [
  /^penny\d+$/,           // penny5, penny7, penny8, etc.
  /^pennybadminton\d*$/,  // pennybadminton, pennybadminton2, etc.
  /^kbk-test/,            // kbk-test, kbktest2
  /^ny-test-tenant$/,     // ny-test-tenant
  /test/i,                // Any tenant with "test" in the name
]

// Test email patterns
const TEST_EMAIL_PATTERNS = [
  /marchalgreen\+penny\d+@gmail\.com/i,
  /penny\d+@/i,
  /test@/i,
]

async function findTestTenantFiles(): Promise<string[]> {
  // Script is in packages/webapp/scripts/, so go up one level to packages/webapp/
  const tenantsDir = join(__dirname, '../src/config/tenants')
  const files = await readdir(tenantsDir)
  
  const testFiles: string[] = []
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    
    const tenantId = file.replace('.json', '')
    
    // Skip production tenants
    if (['default', 'demo', 'herlev-hjorten', 'marketing'].includes(tenantId)) {
      continue
    }
    
    // Check if it matches test patterns
    const isTestTenant = TEST_TENANT_PATTERNS.some(pattern => pattern.test(tenantId))
    
    if (isTestTenant) {
      testFiles.push(file)
    }
  }
  
  return testFiles.sort()
}

async function findTestUsers(sql: postgres.Sql) {
  // Get all users
  const allUsers = await sql`
    SELECT 
      id,
      email,
      username,
      role,
      tenant_id,
      email_verified,
      created_at
    FROM clubs
    ORDER BY tenant_id, created_at DESC
  `
  
  const testUsers: typeof allUsers = []
  
  for (const user of allUsers) {
    // Check if tenant_id matches test patterns
    const isTestTenant = TEST_TENANT_PATTERNS.some(pattern => pattern.test(user.tenant_id))
    
    // Check if email matches test patterns
    const isTestEmail = user.email && TEST_EMAIL_PATTERNS.some(pattern => pattern.test(user.email))
    
    // Skip production tenants
    if (['default', 'demo', 'herlev-hjorten', 'marketing'].includes(user.tenant_id)) {
      continue
    }
    
    if (isTestTenant || isTestEmail) {
      testUsers.push(user)
    }
  }
  
  return testUsers
}

async function main() {
  try {
    console.log('🔍 Finding test tenants and users...\n')
    
    // Find test tenant config files
    const testTenantFiles = await findTestTenantFiles()
    
    // Connect to database
    const databaseUrl = getDatabaseUrl()
    console.log('Connecting to database...')
    
    const sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10
    })
    
    // Find test users
    const testUsers = await findTestUsers(sql)
    
    // Group users by tenant_id
    const usersByTenant = new Map<string, typeof testUsers>()
    testUsers.forEach(user => {
      if (!usersByTenant.has(user.tenant_id)) {
        usersByTenant.set(user.tenant_id, [])
      }
      usersByTenant.get(user.tenant_id)!.push(user)
    })
    
    // Display what will be deleted
    console.log('📋 TEST TENANTS AND USERS TO DELETE:\n')
    console.log('=' .repeat(60))
    
    if (testTenantFiles.length === 0 && testUsers.length === 0) {
      console.log('✅ No test tenants or users found!')
      await sql.end()
      return
    }
    
    // Show tenant config files
    if (testTenantFiles.length > 0) {
      console.log(`\n📁 Tenant Config Files (${testTenantFiles.length}):`)
      testTenantFiles.forEach(file => {
        console.log(`   - ${file}`)
      })
    }
    
    // Show users grouped by tenant
    if (testUsers.length > 0) {
      console.log(`\n👥 Database Users (${testUsers.length}):`)
      usersByTenant.forEach((users, tenantId) => {
        console.log(`\n   Tenant: ${tenantId} (${users.length} user(s))`)
        users.forEach(user => {
          console.log(`     - ${user.email || user.username || 'no email/username'}`)
          console.log(`       ID: ${user.id}, Role: ${user.role || 'none'}, Verified: ${user.email_verified}`)
          console.log(`       Created: ${user.created_at}`)
        })
      })
    }
    
    console.log('\n' + '='.repeat(60))
    console.log(`\n⚠️  WARNING: This will delete:`)
    console.log(`   - ${testTenantFiles.length} tenant config file(s)`)
    console.log(`   - ${testUsers.length} user(s) from database`)
    console.log(`\n❌ This action CANNOT be undone!\n`)
    
    // Wait for confirmation
    const readline = await import('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise<string>((resolve) => {
      rl.question('Type "DELETE" to confirm deletion: ', (answer) => {
        rl.close()
        resolve(answer)
      })
    })
    
    if (answer !== 'DELETE') {
      console.log('\n❌ Deletion cancelled.')
      await sql.end()
      return
    }
    
    console.log('\n🗑️  Deleting...\n')
    
    // Delete users from database
    if (testUsers.length > 0) {
      const userIds = testUsers.map(u => u.id)
      const result = await sql`
        DELETE FROM clubs
        WHERE id = ANY(${userIds})
      `
      console.log(`✅ Deleted ${testUsers.length} user(s) from database`)
    }
    
    // Delete tenant config files
    if (testTenantFiles.length > 0) {
      const tenantsDir = join(__dirname, '../src/config/tenants')
      let deletedCount = 0
      
      for (const file of testTenantFiles) {
        try {
          await unlink(join(tenantsDir, file))
          deletedCount++
          console.log(`✅ Deleted tenant config: ${file}`)
        } catch (error) {
          console.error(`❌ Failed to delete ${file}:`, error)
        }
      }
      
      console.log(`\n✅ Deleted ${deletedCount} tenant config file(s)`)
    }
    
    await sql.end()
    console.log('\n✅ Cleanup complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()

