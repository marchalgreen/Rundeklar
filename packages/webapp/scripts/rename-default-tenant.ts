/**
 * Script to rename the "default" tenant to "Default"
 * This fixes the confusing display name "HERLEV/HJORTEN ()" in the tenant dropdown
 * 
 * Usage: pnpm exec tsx packages/webapp/scripts/rename-default-tenant.ts
 */

import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function renameDefaultTenant() {
  try {
    // Path to tenant configs directory
    const configPath = join(__dirname, '../src/config/tenants/default.json')
    
    console.log('📝 Reading default tenant config...')
    const configContent = await readFile(configPath, 'utf-8')
    const config = JSON.parse(configContent)
    
    console.log('📋 Current config:')
    console.log(`   ID: ${config.id}`)
    console.log(`   Name: ${config.name}`)
    console.log(`   Subdomain: ${config.subdomain || '(none)'}`)
    console.log('')
    
    // Update name to "Default"
    const updatedConfig = {
      ...config,
      name: 'Default'
    }
    
    console.log('✏️  Updating tenant name to "Default"...')
    await writeFile(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8')
    
    console.log('')
    console.log('✅ Successfully renamed default tenant!')
    console.log('')
    console.log('📋 Updated config:')
    console.log(`   ID: ${updatedConfig.id}`)
    console.log(`   Name: ${updatedConfig.name}`)
    console.log(`   Subdomain: ${updatedConfig.subdomain || '(none)'}`)
    console.log('')
    console.log('💡 The tenant will now appear as "Default" in the admin dropdown')
    console.log('   instead of "HERLEV/HJORTEN ()"')
    
  } catch (error) {
    console.error('❌ Error renaming default tenant:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      if (error.stack) {
        console.error('   Stack:', error.stack)
      }
    }
    process.exit(1)
  }
}

// Run the script
renameDefaultTenant()

