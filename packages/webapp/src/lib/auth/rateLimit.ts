import type postgres from 'postgres'

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15
const WINDOW_MINUTES = 15

/**
 * Check if club has exceeded login attempt limit
 * @param sql - Postgres client
 * @param email - Club email
 * @param ipAddress - IP address of login attempt
 * @returns Object with allowed status and remaining attempts
 */
export async function checkLoginAttempts(
  sql: ReturnType<typeof postgres>,
  email: string,
  _ipAddress?: string
): Promise<{
  allowed: boolean
  remainingAttempts: number
  lockoutUntil?: Date
}> {

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)

  // Get recent failed attempts
  const attempts = await sql`
    SELECT created_at, success
    FROM club_login_attempts
    WHERE email = ${email}
      AND created_at > ${windowStart}
    ORDER BY created_at DESC
    LIMIT ${MAX_LOGIN_ATTEMPTS}
  `

  const failedAttempts = attempts.filter(a => !a.success)
  const recentFailedCount = failedAttempts.length

  if (recentFailedCount >= MAX_LOGIN_ATTEMPTS) {
    // Check if lockout period has passed
    const oldestFailedAttempt = failedAttempts[failedAttempts.length - 1]
    const lockoutUntil = new Date(
      new Date(oldestFailedAttempt.created_at).getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000
    )

    if (new Date() < lockoutUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutUntil
      }
    }
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - recentFailedCount)
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

  await sql`
    INSERT INTO club_login_attempts (club_id, email, ip_address, success)
    VALUES (${clubId}, ${email}, ${ipAddress || null}, ${success})
  `

  // Clean up old attempts (older than 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  await sql`
    DELETE FROM club_login_attempts
    WHERE created_at < ${oneDayAgo}
  `
}

