#!/usr/bin/env tsx
/// <reference types="node" />
/**
 * Script to send cold-call emails to club presidents
 * 
 * Usage:
 *   pnpm exec tsx scripts/send-cold-call-email.ts <email> <clubName> <presidentName>
 * 
 * Example:
 *   pnpm exec tsx scripts/send-cold-call-email.ts formand@klub.dk "Herlev Badminton" "Lars Nielsen"
 */

// IMPORTANT: Load environment variables BEFORE importing email module
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env.local FIRST
const possiblePaths = [
  join(__dirname, '../.env.local'),  // packages/webapp/.env.local
  join(__dirname, '../../.env.local'), // root/.env.local
  join(process.cwd(), '.env.local')  // current working directory
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
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '') // Remove quotes
          process.env[key.trim()] = value
        }
      }
    }
    envLoaded = true
    break
  }
}

if (!envLoaded) {
  console.warn('⚠️  No .env.local file found. Looking in:', possiblePaths)
  console.warn('⚠️  Make sure RESEND_API_KEY is set in .env.local')
}

// Fallback: Use VITE_RESEND_API_KEY if RESEND_API_KEY is not set
if (!process.env.RESEND_API_KEY && process.env.VITE_RESEND_API_KEY) {
  process.env.RESEND_API_KEY = process.env.VITE_RESEND_API_KEY
  console.log('📝 Using VITE_RESEND_API_KEY as RESEND_API_KEY')
}

// Debug: Check if RESEND_API_KEY is loaded
if (process.env.RESEND_API_KEY) {
  console.log('✅ RESEND_API_KEY loaded (starts with:', process.env.RESEND_API_KEY.substring(0, 5) + '...)')
} else {
  console.error('❌ RESEND_API_KEY not found in environment variables')
  console.error('   Make sure it exists in .env.local as: RESEND_API_KEY=re_...')
}

// NOW import email module (after environment variables are loaded)
import { sendColdCallEmail } from '../src/lib/auth/email.js'
import { logger } from '../src/lib/utils/logger.js'

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 3) {
    console.error('Usage: pnpm exec tsx scripts/send-cold-call-email.ts <email> <clubName> <presidentName>')
    console.error('')
    console.error('Example:')
    console.error('  pnpm exec tsx scripts/send-cold-call-email.ts formand@klub.dk "Herlev Badminton" "Lars Nielsen"')
    process.exit(1)
  }

  const [email, clubName, presidentName] = args

  // Basic email validation
  if (!email.includes('@')) {
    console.error('Error: Invalid email address')
    process.exit(1)
  }

  try {
    console.log(`Sending cold-call email to ${email}...`)
    console.log(`Club: ${clubName}`)
    console.log(`President: ${presidentName}`)
    console.log('')

    await sendColdCallEmail(email, clubName, presidentName)

    console.log('✅ Email sent successfully!')
    console.log('')
    console.log('You can track opens and clicks in Resend dashboard:')
    console.log('https://resend.com/emails')
  } catch (error) {
    console.error('❌ Failed to send email:', error)
    logger.error('Failed to send cold-call email', error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})

