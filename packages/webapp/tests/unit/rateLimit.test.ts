/**
 * Unit tests for rate limiting functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type postgres from 'postgres'
import { checkLoginAttempts, recordLoginAttempt } from '../../src/lib/auth/rateLimit'

// Mock postgres client - postgres uses tagged template literals (sql``)
// In tagged template literals, values array contains interpolated values in order
// Example: sql`WHERE ip_address = ${ip} AND success = ${false}`
// strings = ["WHERE ip_address = ", " AND success = ", ""]
// values = [ip, false]
// So values[i] corresponds to the value that comes after strings[i]
const createMockSql = () => {
  const attempts: Array<{
    created_at: Date
    success: boolean
    email?: string
    ip_address?: string | null
  }> = []

  const sql = ((strings: TemplateStringsArray, ...values: any[]) => {
    // Handle SELECT queries for club_login_attempts
    if (strings.some(s => s.includes('SELECT') && s.includes('club_login_attempts'))) {
      let filtered = [...attempts]

      // Extract filters - values correspond to interpolated values in order
      // In postgres tagged template literals, values[i] comes after strings[i]
      // Example: sql`WHERE ip_address = ${ip} AND success = ${false} AND created_at > ${date}`
      // strings = ["WHERE ip_address = ", "\n  AND success = ", "\n  AND created_at > ", "\n"]
      // values = [ip, false, date]
      // So when we see strings[0] with "ip_address =", values[0] is the IP value
      
      // Process all WHERE conditions - each value corresponds to the condition after its string
      for (let i = 0; i < strings.length; i++) {
        const str = strings[i]
        const value = i < values.length ? values[i] : undefined

        // Match WHERE clauses - value comes after the string containing the column name
        // Process each condition independently (not else-if, so all conditions are checked)
        if (str.includes('ip_address') && (str.includes('=') || str.includes('IS')) && value !== undefined) {
          // IP address in query is already anonymized (from checkIPRateLimit)
          // Match against stored anonymized IPs
          filtered = filtered.filter(a => a.ip_address === value)
        }
        
        if (str.includes('email') && (str.includes('=') || str.includes('IS')) && value !== undefined) {
          filtered = filtered.filter(a => a.email === value)
        }
        
        if (str.includes('success') && str.includes('=') && value !== undefined) {
          filtered = filtered.filter(a => a.success === value)
        }
        
        if (str.includes('created_at') && (str.includes('>') || str.includes('<') || str.includes('>=') || str.includes('<=')) && value !== undefined) {
          const dateValue = value as Date
          if (str.includes('>')) {
            filtered = filtered.filter(a => a.created_at > dateValue)
          } else if (str.includes('<')) {
            filtered = filtered.filter(a => a.created_at < dateValue)
          } else if (str.includes('>=')) {
            filtered = filtered.filter(a => a.created_at >= dateValue)
          } else if (str.includes('<=')) {
            filtered = filtered.filter(a => a.created_at <= dateValue)
          }
        }
        
        if (str.includes('LIMIT') && value !== undefined) {
          const limit = parseInt(value.toString(), 10)
          filtered = filtered.slice(0, limit)
        }
      }

      // Handle COUNT(*)
      if (strings.some(s => s.includes('COUNT(*)') || s.includes('count'))) {
        return Promise.resolve([{ count: filtered.length.toString() }])
      }

      // Handle ORDER BY
      if (strings.some(s => s.includes('ORDER BY created_at DESC'))) {
        filtered.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      }
      if (strings.some(s => s.includes('ORDER BY created_at ASC'))) {
        filtered.sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
      }

      return Promise.resolve(filtered)
    }

    // Handle INSERT queries
    // Template: INSERT INTO club_login_attempts (club_id, email, ip_address, success)
    //           VALUES (${clubId}, ${email}, ${anonymizedIp}, ${success})
    // values = [clubId, email, anonymizedIp, success]
    if (strings.some(s => s.includes('INSERT INTO club_login_attempts'))) {
      // Values come in order as they appear in template
      if (values.length >= 4) {
        const [clubId, email, ipAddress, success] = values
        attempts.push({
          created_at: new Date(),
          success: success as boolean,
          email: email as string | undefined,
          ip_address: ipAddress as string | null
        })
      } else if (values.length > 0) {
        // Fallback if we don't have exactly 4 values
        const email = values[0]
        const ipAddress = values[1] ?? null
        const success = values[2] ?? values[values.length - 1] ?? false
        attempts.push({
          created_at: new Date(),
          success: success as boolean,
          email: email as string | undefined,
          ip_address: ipAddress as string | null
        })
      }
      return Promise.resolve([])
    }

    // Handle DELETE queries
    if (strings.some(s => s.includes('DELETE FROM club_login_attempts'))) {
      // Find created_at < value
      for (let i = 0; i < strings.length; i++) {
        if (strings[i].includes('created_at') && strings[i].includes('<')) {
          // The value for < comes right after this string
          const cutoff = i < values.length ? (values[i] as Date) : undefined
          if (cutoff) {
            const beforeLength = attempts.length
            attempts.splice(0, attempts.length, ...attempts.filter(a => a.created_at >= cutoff))
            return Promise.resolve([{ deleted: beforeLength - attempts.length }])
          }
        }
      }
      return Promise.resolve([])
    }

    return Promise.resolve([])
  }) as unknown as ReturnType<typeof postgres>

  // Add begin method for transactions
  ;(sql as any).begin = async (fn: (sql: any) => Promise<void>) => {
    await fn(sql)
  }

  // Store attempts for test inspection
  ;(sql as any).attempts = attempts

  return sql
}

describe('Rate Limiting', () => {
  let mockSql: ReturnType<typeof postgres>
  const testEmail = 'test@example.com'
  const testIp = '192.168.1.1'

  beforeEach(() => {
    mockSql = createMockSql()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    ;(mockSql as any).attempts.splice(0)
  })

  describe('checkLoginAttempts', () => {
    it('should allow login when no previous attempts', async () => {
      const result = await checkLoginAttempts(mockSql, testEmail, testIp)
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBeGreaterThan(0)
    })

    it('should block after max attempts per account', async () => {
      // Record 5 failed attempts within time window
      // Important: These must be within the 15-minute window
      const now = Date.now()
      vi.setSystemTime(now)

      for (let i = 0; i < 5; i++) {
        await recordLoginAttempt(mockSql, null, testEmail, testIp, false)
        vi.advanceTimersByTime(1000)
      }

      // Reset system time to ensure attempts are within window
      vi.setSystemTime(now + 1000)

      const result = await checkLoginAttempts(mockSql, testEmail, testIp)
      expect(result.allowed).toBe(false)
      expect(result.remainingAttempts).toBe(0)
      expect(result.lockoutUntil).toBeDefined()
      // countRecentLockouts counts consecutive failures >= 5 as a lockout
      // When we have 5 consecutive failures, countRecentLockouts finds 1 lockout
      // So lockoutCount = 1, which means reason = 'progressive' (lockoutCount > 0)
      // This is correct behavior - the first lockout is detected as progressive
      // because countRecentLockouts already counts the current 5 failures as 1 lockout
      expect(result.reason).toBe('progressive')
    })

    it('should block after max attempts per IP', async () => {
      // Record 20 failed attempts from same IP with different emails
      // IP will be anonymized when stored (192.168.1.1 -> 192.168.1.0)
      // checkIPRateLimit now anonymizes IP before querying, so it will match
      const now = Date.now()
      vi.setSystemTime(now)

      for (let i = 0; i < 20; i++) {
        await recordLoginAttempt(mockSql, null, `test${i}@example.com`, testIp, false)
        vi.advanceTimersByTime(1000)
      }

      // Reset system time to ensure attempts are within window
      vi.setSystemTime(now + 20000)

      // Verify that attempts were stored with anonymized IP
      const attempts = (mockSql as any).attempts
      expect(attempts.length).toBe(20)
      expect(attempts[0].ip_address).toBe('192.168.1.0') // Anonymized

      // checkIPRateLimit now anonymizes the IP before querying, so it will match stored IP
      // The query will be: WHERE ip_address = ${anonymizedIp} AND success = false AND created_at > ${windowStart}
      // anonymizedIp = '192.168.1.0' (from anonymizeIP('192.168.1.1'))
      const result = await checkLoginAttempts(mockSql, testEmail, testIp)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('ip')
    })

    it('should implement progressive lockout', async () => {
      const now = Date.now()
      vi.setSystemTime(now)

      // First lockout: 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await recordLoginAttempt(mockSql, null, testEmail, testIp, false)
        vi.advanceTimersByTime(1000)
      }

      vi.setSystemTime(now + 5000)
      let result = await checkLoginAttempts(mockSql, testEmail, testIp)
      expect(result.allowed).toBe(false)
      // First lockout: countRecentLockouts finds 1 lockout (5 consecutive failures)
      // So reason = 'progressive' (lockoutCount = 1 > 0)
      expect(result.reason).toBe('progressive')

      // Wait for lockout to expire, then trigger second lockout
      vi.advanceTimersByTime(16 * 60 * 1000) // 16 minutes

      // Second set of 5 failed attempts
      const secondNow = Date.now()
      vi.setSystemTime(secondNow)
      for (let i = 0; i < 5; i++) {
        await recordLoginAttempt(mockSql, null, testEmail, testIp, false)
        vi.advanceTimersByTime(1000)
      }

      vi.setSystemTime(secondNow + 5000)
      result = await checkLoginAttempts(mockSql, testEmail, testIp)
      expect(result.allowed).toBe(false)
      // Second lockout: countRecentLockouts finds 2 lockouts
      // (first set of 5 consecutive failures + second set of 5 consecutive failures = 2 lockouts)
      // So reason = 'progressive' (lockoutCount = 2 > 0)
      expect(result.reason).toBe('progressive')
    })

    it('should allow login after lockout period expires', async () => {
      const now = Date.now()
      vi.setSystemTime(now)

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await recordLoginAttempt(mockSql, null, testEmail, testIp, false)
        vi.advanceTimersByTime(1000)
      }

      vi.setSystemTime(now + 5000)
      let result = await checkLoginAttempts(mockSql, testEmail, testIp)
      expect(result.allowed).toBe(false)

      // Advance time past lockout period (15 minutes + buffer)
      vi.advanceTimersByTime(16 * 60 * 1000) // 16 minutes

      result = await checkLoginAttempts(mockSql, testEmail, testIp)
      expect(result.allowed).toBe(true)
    })
  })

  describe('recordLoginAttempt', () => {
    it('should record successful login attempt', async () => {
      await recordLoginAttempt(mockSql, 'club-id', testEmail, testIp, true)
      const attempts = (mockSql as any).attempts
      expect(attempts.length).toBe(1)
      expect(attempts[0].success).toBe(true)
      expect(attempts[0].email).toBe(testEmail)
    })

    it('should record failed login attempt', async () => {
      await recordLoginAttempt(mockSql, null, testEmail, testIp, false)
      const attempts = (mockSql as any).attempts
      expect(attempts.length).toBe(1)
      expect(attempts[0].success).toBe(false)
      expect(attempts[0].email).toBe(testEmail)
    })

    it('should anonymize IP address', async () => {
      await recordLoginAttempt(mockSql, null, testEmail, '192.168.1.100', false)
      const attempts = (mockSql as any).attempts
      expect(attempts[0].ip_address).toBe('192.168.1.0') // Anonymized
    })

    it('should handle unknown IP address', async () => {
      await recordLoginAttempt(mockSql, null, testEmail, 'unknown', false)
      const attempts = (mockSql as any).attempts
      expect(attempts[0].ip_address).toBeNull()
    })
  })
})
