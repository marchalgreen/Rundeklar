/**
 * Cookie utilities for secure token storage
 * Provides HttpOnly cookie support as alternative to localStorage
 */

const ACCESS_TOKEN_COOKIE = 'auth_access_token'
const REFRESH_TOKEN_COOKIE = 'auth_refresh_token'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

/**
 * Set a secure HttpOnly cookie
 * @param name - Cookie name
 * @param value - Cookie value
 * @param maxAge - Max age in seconds
 * @param res - Response object (server-side only)
 */
export function setSecureCookie(
  name: string,
  value: string,
  maxAge: number,
  res?: { setHeader: (name: string, value: string) => void }
): void {
  if (typeof window === 'undefined' && res) {
    // Server-side: set HttpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOptions = [
      `${name}=${value}`,
      `Max-Age=${maxAge}`,
      'Path=/',
      'SameSite=Strict',
      ...(isProduction ? ['Secure', 'HttpOnly'] : [])
    ].join('; ')

    res.setHeader('Set-Cookie', cookieOptions)
  } else if (typeof window !== 'undefined') {
    // Client-side: fallback to regular cookie (not HttpOnly, but better than localStorage for XSS)
    const isProduction = window.location.protocol === 'https:'
    document.cookie = [
      `${name}=${value}`,
      `max-age=${maxAge}`,
      'path=/',
      'SameSite=Strict',
      ...(isProduction ? ['secure'] : [])
    ].join('; ')
  }
}

/**
 * Get cookie value
 * @param name - Cookie name
 * @returns Cookie value or null
 */
export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') {
    return null // Server-side: cookies are in request headers, not accessible here
  }

  const cookies = document.cookie.split('; ')
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split('=')
    if (cookieName === name) {
      return decodeURIComponent(cookieValue)
    }
  }
  return null
}

/**
 * Delete cookie
 * @param name - Cookie name
 * @param res - Response object (server-side only)
 */
export function deleteCookie(
  name: string,
  res?: { setHeader: (name: string, value: string) => void }
): void {
  if (typeof window === 'undefined' && res) {
    // Server-side: clear cookie
    res.setHeader(
      'Set-Cookie',
      `${name}=; Path=/; Max-Age=0; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure; HttpOnly' : ''}`
    )
  } else if (typeof window !== 'undefined') {
    // Client-side: clear cookie
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Strict${window.location.protocol === 'https:' ? '; Secure' : ''}`
  }
}

/**
 * Set access token cookie
 */
export function setAccessTokenCookie(
  token: string,
  res?: { setHeader: (name: string, value: string) => void }
): void {
  // Access token expires in 2 hours
  setSecureCookie(ACCESS_TOKEN_COOKIE, token, 2 * 60 * 60, res)
}

/**
 * Set refresh token cookie
 */
export function setRefreshTokenCookie(
  token: string,
  res?: { setHeader: (name: string, value: string) => void }
): void {
  // Refresh token expires in 7 days
  setSecureCookie(REFRESH_TOKEN_COOKIE, token, COOKIE_MAX_AGE, res)
}

/**
 * Get access token from cookie
 */
export function getAccessTokenCookie(): string | null {
  return getCookie(ACCESS_TOKEN_COOKIE)
}

/**
 * Get refresh token from cookie
 */
export function getRefreshTokenCookie(): string | null {
  return getCookie(REFRESH_TOKEN_COOKIE)
}

/**
 * Clear all auth cookies
 */
export function clearAuthCookies(res?: { setHeader: (name: string, value: string) => void }): void {
  deleteCookie(ACCESS_TOKEN_COOKIE, res)
  deleteCookie(REFRESH_TOKEN_COOKIE, res)
}

/**
 * Extract token from Authorization header or cookie
 * @param req - Request object with headers and cookies
 * @returns Token or null
 */
export function extractTokenFromRequest(req: {
  headers?: { authorization?: string; cookie?: string }
  cookies?: Record<string, string>
}): string | null {
  // Try Authorization header first
  const authHeader = req.headers?.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Fallback to cookie (for HttpOnly cookies, this would be server-side only)
  if (req.cookies && req.cookies[ACCESS_TOKEN_COOKIE]) {
    return req.cookies[ACCESS_TOKEN_COOKIE]
  }

  // Parse cookie header manually if cookies object not available
  if (req.headers?.cookie) {
    const cookies = req.headers.cookie.split('; ')
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=')
      if (name === ACCESS_TOKEN_COOKIE) {
        return decodeURIComponent(value)
      }
    }
  }

  return null
}



