#!/usr/bin/env tsx
/**
 * Interactive script to create a new tenant configuration.
 * 
 * This script helps you create a new tenant config file by prompting for:
 * - Tenant ID
 * - Tenant name
 * - Logo filename
 * - Max courts
 * - Supabase URL
 * - Supabase key
 * 
 * Usage:
 *   pnpm tsx packages/webapp/scripts/create-tenant.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

/**
 * Prompts for user input.
 */
const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

/**
 * Validates tenant ID (lowercase, alphanumeric, hyphens, underscores).
 */
const validateTenantId = (id: string): boolean => {
  return /^[a-z0-9_-]+$/.test(id) && id.length > 0 && id.length <= 50
}

/**
 * Validates Supabase URL.
 */
const validateSupabaseUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return parsed.hostname.endsWith('.supabase.co') && parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validates Supabase key (JWT format).
 */
const validateSupabaseKey = (key: string): boolean => {
  return key.startsWith('eyJ') && key.length > 50
}

/**
 * Tests Supabase connection.
 */
const testSupabaseConnection = async (url: string, key: string): Promise<boolean> => {
  try {
    const supabase = createClient(url, key)
    const { error } = await supabase.from('players').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

/**
 * Main function.
 */
async function createTenant() {
  console.log('')
  console.log('🏸 Create New Tenant Configuration')
  console.log('====================================')
  console.log('')

  try {
    // Get tenant ID
    let tenantId = ''
    while (!validateTenantId(tenantId)) {
      tenantId = await question('Tenant ID (lowercase, alphanumeric, hyphens, underscores): ')
      if (!validateTenantId(tenantId)) {
        console.log('❌ Invalid tenant ID. Use lowercase letters, numbers, hyphens, and underscores only.')
      }
    }

    // Check if tenant already exists
    const configPath = path.join(__dirname, '../src/config/tenants', `${tenantId}.json`)
    if (fs.existsSync(configPath)) {
      const overwrite = await question(`⚠️  Tenant "${tenantId}" already exists. Overwrite? (y/N): `)
      if (overwrite.toLowerCase() !== 'y') {
        console.log('❌ Cancelled.')
        process.exit(0)
      }
    }

    // Get tenant name
    const name = await question('Tenant name (display name): ') || tenantId.toUpperCase()

    // Get logo filename
    const logo = await question('Logo filename (in public/ folder, e.g., logo.jpeg): ') || 'logo.jpeg'

    // Get max courts
    let maxCourts = 8
    const maxCourtsInput = await question('Max courts (default: 8): ')
    if (maxCourtsInput) {
      const parsed = parseInt(maxCourtsInput, 10)
      if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
        maxCourts = parsed
      } else {
        console.log('⚠️  Invalid number, using default: 8')
      }
    }

    // Get Supabase URL
    let supabaseUrl = ''
    while (!validateSupabaseUrl(supabaseUrl)) {
      supabaseUrl = await question('Supabase URL (https://xxxxx.supabase.co): ')
      if (!validateSupabaseUrl(supabaseUrl)) {
        console.log('❌ Invalid Supabase URL. Must be https://xxxxx.supabase.co')
      }
    }

    // Get Supabase key
    let supabaseKey = ''
    while (!validateSupabaseKey(supabaseKey)) {
      supabaseKey = await question('Supabase anon/public key: ')
      if (!validateSupabaseKey(supabaseKey)) {
        console.log('❌ Invalid Supabase key. Must be a valid JWT token.')
      }
    }

    // Test connection
    console.log('')
    console.log('🔌 Testing Supabase connection...')
    const connectionOk = await testSupabaseConnection(supabaseUrl, supabaseKey)
    if (!connectionOk) {
      const continueAnyway = await question('⚠️  Connection test failed. Continue anyway? (y/N): ')
      if (continueAnyway.toLowerCase() !== 'y') {
        console.log('❌ Cancelled.')
        process.exit(0)
      }
    } else {
      console.log('✅ Connection test successful!')
    }

    // Create config object
    const config = {
      id: tenantId,
      name: name.toUpperCase(),
      logo,
      maxCourts,
      supabaseUrl,
      supabaseKey,
      features: {}
    }

    // Write config file
    const configDir = path.dirname(configPath)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')

    console.log('')
    console.log('✅ Tenant configuration created successfully!')
    console.log('')
    console.log('📄 Config file:', configPath)
    console.log('')
    console.log('📋 Next steps:')
    console.log('   1. Make sure your Supabase database has the schema migrated')
    console.log('   2. Add your logo to packages/webapp/public/ if needed')
    console.log('   3. Test the tenant: http://127.0.0.1:5173/#/' + tenantId + '/check-in')
    console.log('   4. (Optional) Seed initial data using a seed script')
    console.log('')

  } catch (error) {
    console.error('❌ Error creating tenant:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

// Run the script
createTenant()


