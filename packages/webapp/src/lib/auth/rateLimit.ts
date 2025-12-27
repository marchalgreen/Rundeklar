import type postgres from 'postgres'

// Rate limiting configuration - can be overridden via environment variables
const MAX_LOGIN_ATTEMPTS_PER_ACCOUNT = parseInt(
  process.env.MAX_LOGIN_ATTEMPTS_PER_ACCOUNT || '5',
  10
)
const MAX_LOGIN_ATTEMPTS_PER_IP = parseInt(
  process.env.MAX_LOGIN_ATTEMPTS_PER_IP || '20',
  10
)
const INITIAL_LOCKOUT_DURATION_MINUTES = parseInt(
  process.env.INITIAL_LOCKOUT_DURATION_MINUTES || '15',
  10
)
const MAX_LOCKOUT_DURATION_MINUTES = parseInt(
  process.env.MAX_LOCKOUT_DURATION_MINUTES || '1440', // 24 hours
  10
)
const WINDOW_MINUTES = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10)
const PROGRESSIVE_LOCKOUT_MULTIPLIER = parseFloat(
  process.env.PROGRESSIVE_LOCKOUT_MULTIPLIER || '2.0'
)

interface RateLimitResult {
  allowed: boolean
  remainingAttempts: number
  lockoutUntil?: Date
  reason?: 'account' | 'ip' | 'progressive'
}

/**
 * Calculate progressive lockout duration based on number of lockouts
 * @param lockoutCount - Number of times account has been locked out
 * @returns Lockout duration in minutes
 */
function calculateLockoutDuration(lockoutCount: number): number {
  const multiplier = Math.pow(PROGRESSIVE_LOCKOUT_MULTIPLIER, lockoutCount - 1)
  const duration = INITIAL_LOCKOUT_DURATION_MINUTES * multiplier
  return Math.min(duration, MAX_LOCKOUT_DURATION_MINUTES)
}

/**
 * Count how many times an account has been locked out in the last 24 hours
 * @param sql - Postgres client
 * @param email - Account email/username
 * @returns Number of lockouts in last 24 hours
 */
async function countRecentLockouts(
  sql: ReturnType<typeof postgres>,
  email: string
): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Count distinct lockout periods (gaps between failed attempts)
  const attempts = await sql`
    SELECT created_at, success
    FROM club_login_attempts
    WHERE email = ${email}
      AND created_at > ${oneDayAgo}
    ORDER BY created_at ASC
  `

  let lockoutCount = 0
  let consecutiveFailures = 0

  for (const attempt of attempts) {
    if (!attempt.success) {
      consecutiveFailures++
      if (consecutiveFailures >= MAX_LOGIN_ATTEMPTS_PER_ACCOUNT) {
        lockoutCount++
        consecutiveFailures = 0 // Reset after lockout
      }
    } else {
      consecutiveFailures = 0 // Reset on success
    }
  }

  return lockoutCount
}

/**
 * Anonymize IP address for GDPR compliance (keep first 3 octets)
 * @param ipAddress - Original IP address
 * @returns Anonymized IP address or null
 */
function anonymizeIP(ipAddress: string): string | null {
  if (!ipAddress || ipAddress === 'unknown') {
    return null
  }

  const parts = ipAddress.split('.')
  if (parts.length === 4) {
    // IPv4: keep first 3 octets, mask last
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`
  } else {
    // IPv6 or other: use as-is (could be improved with IPv6 anonymization)
    return ipAddress
  }
}

/**
 * Check if IP address has exceeded rate limit
 * @param sql - Postgres client
 * @param ipAddress - IP address to check (will be anonymized before querying)
 * @returns Object with allowed status and remaining attempts
 */
async function checkIPRateLimit(
  sql: ReturnType<typeof postgres>,
  ipAddress: string
): Promise<{ allowed: boolean; remainingAttempts: number }> {
  if (!ipAddress || ipAddress === 'unknown') {
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS_PER_IP }
  }

  // Anonymize IP to match what's stored in database
  const anonymizedIp = anonymizeIP(ipAddress)
  if (!anonymizedIp) {
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS_PER_IP }
  }

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)

  // Count failed attempts from this IP (using anonymized IP to match database)
  const attempts = await sql`
    SELECT COUNT(*) as count
    FROM club_login_attempts
    WHERE ip_address = ${anonymizedIp}
      AND success = false
      AND created_at > ${windowStart}
  `

  const failedCount = parseInt(attempts[0]?.count || '0', 10)
  const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS_PER_IP - failedCount)

  return {
    allowed: failedCount < MAX_LOGIN_ATTEMPTS_PER_IP,
    remainingAttempts: remaining
  }
}

/**
 * Check if club has exceeded login attempt limit
 * Implements both account-based and IP-based rate limiting with progressive lockout
 * @param sql - Postgres client
 * @param email - Club email or username
 * @param ipAddress - IP address of login attempt
 * @returns Object with allowed status and remaining attempts
 */
export async function checkLoginAttempts(
  sql: ReturnType<typeof postgres>,
  email: string,
  ipAddress?: string
): Promise<RateLimitResult> {
  // First check IP-based rate limiting
  if (ipAddress) {
    const ipCheck = await checkIPRateLimit(sql, ipAddress)
    if (!ipCheck.allowed) {
      return {
        allowed: false,
        remainingAttempts: 0,
        reason: 'ip'
      }
    }
  }

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)

  // Get recent failed attempts for this account
  const attempts = await sql`
    SELECT created_at, success
    FROM club_login_attempts
    WHERE email = ${email}
      AND created_at > ${windowStart}
    ORDER BY created_at DESC
    LIMIT ${MAX_LOGIN_ATTEMPTS_PER_ACCOUNT * 2}
  `

  const failedAttempts = attempts.filter(a => !a.success)
  const recentFailedCount = failedAttempts.length

  if (recentFailedCount >= MAX_LOGIN_ATTEMPTS_PER_ACCOUNT) {
    // Count how many times this account has been locked out recently
    const lockoutCount = await countRecentLockouts(sql, email)
    const lockoutDurationMinutes = calculateLockoutDuration(lockoutCount + 1)

    // Check if lockout period has passed
    const oldestFailedAttempt = failedAttempts[failedAttempts.length - 1]
    const lockoutUntil = new Date(
      new Date(oldestFailedAttempt.created_at).getTime() +
        lockoutDurationMinutes * 60 * 1000
    )

    if (new Date() < lockoutUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutUntil,
        reason: lockoutCount > 0 ? 'progressive' : 'account'
      }
    }
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS_PER_ACCOUNT - recentFailedCount)
  }
}

/**
 * Record a login attempt
 * @param sql - Postgres client
 * @param clubId - Club ID (null if login failed before club lookup)
 * @param email - Email used for login
 * @param ipAddress - IP address
 * @param success - Whether login was successful
 */
export async function recordLoginAttempt(
  sql: ReturnType<typeof postgres>,
  clubId: string | null,
  email: string,
  ipAddress: string | undefined,
  success: boolean
): Promise<void> {
  // Anonymize IP address for GDPR compliance (keep first 3 octets)
  const anonymizedIp = ipAddress ? anonymizeIP(ipAddress) : null

  await sql`
    INSERT INTO club_login_attempts (club_id, email, ip_address, success)
    VALUES (${clubId}, ${email}, ${anonymizedIp}, ${success})
  `

  // Clean up old attempts (older than 7 days for better forensics)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  await sql`
    DELETE FROM club_login_attempts
    WHERE created_at < ${sevenDaysAgo}
  `
}

