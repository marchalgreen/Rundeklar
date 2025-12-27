// Dynamic import argon2 only on server-side
// In browser, Vite will use the stub from vite.config.ts
async function getArgon2() {
  if (typeof window !== 'undefined') {
    throw new Error('argon2 can only be used server-side')
  }
  // Use dynamic import to avoid bundling in browser
  const argon2Module = await import('@node-rs/argon2')
  return argon2Module
}

const ARGON2_OPTIONS = {
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  outputLen: 32,
  parallelism: 4
}

/**
 * Hash a password using Argon2id
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const argon2 = await getArgon2()
  return await argon2.hash(password, ARGON2_OPTIONS)
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Stored password hash
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const argon2 = await getArgon2()
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @param checkBreach - Whether to check password against breach database (default: true)
 * @returns Object with isValid and errors array
 */
export async function validatePasswordStrength(
  password: string,
  checkBreach: boolean = true
): Promise<{
  isValid: boolean
  errors: string[]
  breachCount?: number
}> {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  // Check password breach database if enabled
  let breachCount = 0
  if (checkBreach && errors.length === 0) {
    try {
      const { checkPasswordBreach } = await import('./passwordBreach.js')
      const breachCheck = await checkPasswordBreach(password)
      if (breachCheck.isBreached) {
        breachCount = breachCheck.breachCount
        errors.push(
          `This password has been found in ${breachCount} data breach${breachCount > 1 ? 'es' : ''}. Please choose a different password.`
        )
      }
    } catch (error) {
      // Fail open: if breach check fails, don't block password
      // Log error but continue validation
      const { logger } = await import('../utils/logger.js')
      logger.warn('Password breach check failed, allowing password', error)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    breachCount: breachCount > 0 ? breachCount : undefined
  }
}

