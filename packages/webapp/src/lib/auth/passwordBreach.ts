/**
 * Password breach detection using Have I Been Pwned API
 * Checks if password has been found in data breaches
 */

const HIBP_API_URL = 'https://api.pwnedpasswords.com/range/'

/**
 * Hash password using SHA-1 (required by HIBP API)
 * @param password - Password to hash
 * @returns SHA-1 hash as hex string
 */
async function sha1Hash(password: string): Promise<string> {
  if (typeof window !== 'undefined') {
    // Browser: use Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  } else {
    // Node.js: use crypto module
    const cryptoModule = await import('node:crypto')
    return cryptoModule.createHash('sha1').update(password).digest('hex').toUpperCase()
  }
}

/**
 * Check if password has been found in data breaches
 * Uses k-anonymity model: only sends first 5 chars of hash to API
 * @param password - Password to check
 * @returns Object with isBreached flag and count of breaches
 */
export async function checkPasswordBreach(password: string): Promise<{
  isBreached: boolean
  breachCount: number
}> {
  try {
    // Hash password with SHA-1
    const hash = await sha1Hash(password)
    const prefix = hash.substring(0, 5)
    const suffix = hash.substring(5)

    // Fetch range from HIBP API (k-anonymity: only send prefix)
    const response = await fetch(`${HIBP_API_URL}${prefix}`, {
      headers: {
        'User-Agent': 'Rundeklar-Password-Checker'
      }
    })

    if (!response.ok) {
      // If API fails, allow password (fail open for availability)
      logger.warn('HIBP API request failed', { status: response.status })
      return { isBreached: false, breachCount: 0 }
    }

    const text = await response.text()
    const lines = text.split('\n')

    // Check if our hash suffix is in the results
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':')
      if (hashSuffix === suffix) {
        const breachCount = parseInt(count.trim(), 10)
        return {
          isBreached: breachCount > 0,
          breachCount
        }
      }
    }

    // Hash suffix not found = password not breached
    return { isBreached: false, breachCount: 0 }
  } catch (error) {
    // Fail open: if check fails, allow password (availability over perfect security)
    logger.error('Password breach check failed', error)
    return { isBreached: false, breachCount: 0 }
  }
}

// Import logger
import { logger } from '../utils/logger.js'



