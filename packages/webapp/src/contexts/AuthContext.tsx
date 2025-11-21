import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useTenant } from './TenantContext'

export interface Club {
  id: string
  email: string
  username?: string
  role: string
  tenantId: string
  emailVerified: boolean
  twoFactorEnabled: boolean
}

interface AuthContextValue {
  club: Club | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, totpCode?: string) => Promise<void>
  loginWithPIN: (username: string, pin: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string) => Promise<void>
  refreshToken: (retryCount?: number) => Promise<boolean>
  getAccessToken: () => string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

const ACCESS_TOKEN_KEY = 'auth_access_token'
const REFRESH_TOKEN_KEY = 'auth_refresh_token'

/**
 * Auth context provider that manages authentication state
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenantId } = useTenant()
  const [club, setClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)

  const getApiUrl = useCallback((path: string) => {
    return import.meta.env.DEV 
      ? `http://127.0.0.1:3000/api/auth${path}`
      : `/api/auth${path}`
  }, [])

  const getAccessToken = useCallback(() => {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  }, [])

  const getRefreshToken = useCallback(() => {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }, [])

  const setTokens = useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }, [])

  const clearTokens = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }, [])

  // Refresh access token with retry logic
  const refreshToken = useCallback(async (retryCount = 0): Promise<boolean> => {
    const isDev = import.meta.env.DEV
    const MAX_RETRIES = 3
    const RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff in ms
    
    const refresh = getRefreshToken()
    if (!refresh) {
      if (isDev) {
        console.warn('[Auth] No refresh token available')
      }
      setClub(null)
      clearTokens()
      return false
    }

    if (isDev && retryCount === 0) {
      console.log('[Auth] Attempting token refresh...')
    }

    try {
      const response = await fetch(getApiUrl('/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: refresh })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
        if (isDev) {
          console.log('[Auth] Token refresh successful', retryCount > 0 ? `(after ${retryCount} retries)` : '')
        }
        return true
      } else if (response.status === 401 && retryCount < MAX_RETRIES) {
        // Temporary failure - retry with exponential backoff
        if (isDev) {
          console.warn(`[Auth] Refresh failed (401), retrying in ${RETRY_DELAYS[retryCount]}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]))
        return refreshToken(retryCount + 1)
      } else {
        // Permanent failure (401 after retries, or other error)
        if (isDev) {
          console.error('[Auth] Token refresh permanently failed:', response.status, response.statusText)
        }
        setClub(null)
        clearTokens()
        return false
      }
    } catch (error) {
      // Network error - retry if we haven't exceeded max retries
      if (retryCount < MAX_RETRIES) {
        if (isDev) {
          console.warn(`[Auth] Network error, retrying in ${RETRY_DELAYS[retryCount]}ms (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error)
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]))
        return refreshToken(retryCount + 1)
      }
      
      console.error('[Auth] Token refresh failed after retries:', error)
      setClub(null)
      clearTokens()
      return false
    }
  }, [getRefreshToken, getApiUrl, clearTokens])

  // Fetch current club info
  const fetchClubInfo = useCallback(async () => {
    const isDev = import.meta.env.DEV
    const token = getAccessToken()
    if (!token) {
      if (isDev) {
        console.log('[Auth] No access token found, skipping fetchClubInfo')
      }
      setClub(null)
      setLoading(false)
      return
    }

    try {
      const { fetchWithAuth } = await import('../lib/api/fetchWithAuth')
      
      const meUrl = getApiUrl('/me')
      if (isDev) {
        console.log('[Auth] Fetching club info from:', meUrl)
      }
      
      const response = await fetchWithAuth(
        meUrl,
        {
          method: 'GET',
          headers: {}
        },
        refreshToken,
        getAccessToken
      )

      if (response.ok) {
        const data = await response.json()
        setClub(data.club)
        if (isDev) {
          console.log('[Auth] Club info fetched successfully')
        }
      } else {
        // Token refresh failed or other error
        if (isDev) {
          console.warn('[Auth] Failed to fetch club info:', response.status, response.statusText)
        }
        setClub(null)
        clearTokens()
      }
    } catch (error) {
      console.error('[Auth] Failed to fetch club info:', error)
      setClub(null)
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, getApiUrl, refreshToken, clearTokens])

  // Login with email/password (for admins)
  const login = useCallback(async (email: string, password: string, totpCode?: string) => {
    const response = await fetch(getApiUrl('/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        tenantId,
        totpCode
      })
    })

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      await response.text() // Consume response body
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Invalid response from server')
    }

    if (!response.ok) {
      if (data.requires2FA) {
        // Return special error to indicate 2FA needed
        throw new Error('2FA_REQUIRED')
      }
      throw new Error(data.error || data.message || 'Login failed')
    }

    setTokens(data.accessToken, data.refreshToken)
    setClub(data.club)
  }, [tenantId, getApiUrl, setTokens])

  // Login with username/PIN (for coaches)
  const loginWithPIN = useCallback(async (username: string, pin: string) => {
    // Normalize username to lowercase for case-insensitive matching
    const normalizedUsername = username.toLowerCase().trim()
    
    const response = await fetch(getApiUrl('/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: normalizedUsername,
        pin,
        tenantId
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    setTokens(data.accessToken, data.refreshToken)
    setClub(data.club)
  }, [tenantId, getApiUrl, setTokens])

  // Logout
  const logout = useCallback(async () => {
    const refresh = getRefreshToken()
    if (refresh) {
      try {
        await fetch(getApiUrl('/logout'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken: refresh })
        })
      } catch (error) {
        console.error('Logout request failed:', error)
      }
    }

    clearTokens()
    setClub(null)
  }, [getRefreshToken, getApiUrl, clearTokens])

  // Register
  const register = useCallback(async (email: string, password: string) => {
    const response = await fetch(getApiUrl('/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        tenantId
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed')
    }
  }, [tenantId, getApiUrl])

  // Initialize: check for existing token
  useEffect(() => {
    let cancelled = false
    
    const init = async () => {
      await fetchClubInfo()
      if (!cancelled && import.meta.env.DEV) {
        console.log('[Auth] Initialization complete')
      }
    }
    
    init()
    
    return () => {
      cancelled = true
    }
  }, [fetchClubInfo])

  // Auto-refresh token before expiry (every 110 minutes for 2h token)
  // In development, use shorter interval for testing (1 minute)
  useEffect(() => {
    if (!club) return

    const isDev = import.meta.env.DEV
    const intervalMs = isDev 
      ? 1 * 60 * 1000  // 1 minute in dev for testing
      : 110 * 60 * 1000  // 110 minutes in production (refresh before 2h expiry)

    if (isDev) {
      console.log('[Auth] Auto-refresh interval set to 1 minute (dev mode)')
    }

    const interval = setInterval(() => {
      if (isDev) {
        console.log('[Auth] Auto-refresh triggered (interval-based)')
      }
      refreshToken().then(success => {
        if (isDev) {
          console.log('[Auth] Auto-refresh result:', success ? 'success' : 'failed')
        }
      })
    }, intervalMs)

    return () => clearInterval(interval)
  }, [club, refreshToken])

  // Activity-based refresh: refresh token on user activity (mouse/keyboard)
  useEffect(() => {
    if (!club) return

    const isDev = import.meta.env.DEV
    let lastActivityTime = Date.now()
    // In dev, use shorter thresholds for testing (30 seconds instead of 5 minutes)
    const ACTIVITY_THRESHOLD = isDev ? 30 * 1000 : 5 * 60 * 1000 // 30s in dev, 5 minutes in prod
    const DEBOUNCE_DELAY = isDev ? 5000 : 30000 // 5s in dev, 30s in prod
    let activityRefreshTimeout: NodeJS.Timeout | null = null

    const handleActivity = () => {
      const now = Date.now()
      const timeSinceLastActivity = now - lastActivityTime

      // Only refresh if it's been more than threshold since last activity
      // This prevents excessive refresh calls during active use
      if (timeSinceLastActivity >= ACTIVITY_THRESHOLD) {
        // Clear any pending refresh
        if (activityRefreshTimeout) {
          clearTimeout(activityRefreshTimeout)
        }

        if (isDev) {
          console.log('[Auth] Activity detected, scheduling refresh in', DEBOUNCE_DELAY / 1000, 'seconds')
        }

        // Debounce: refresh after delay
        activityRefreshTimeout = setTimeout(() => {
          if (isDev) {
            console.log('[Auth] Activity-based refresh triggered')
          }
          refreshToken().then(success => {
            if (isDev) {
              console.log('[Auth] Activity refresh result:', success ? 'success' : 'failed')
            }
          }).catch(err => {
            console.warn('[Activity refresh] Failed to refresh token:', err)
          })
          lastActivityTime = Date.now()
        }, DEBOUNCE_DELAY)
      }

      lastActivityTime = now
    }

    // Listen to user activity events
    window.addEventListener('mousedown', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    window.addEventListener('scroll', handleActivity, { passive: true })

    return () => {
      window.removeEventListener('mousedown', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      if (activityRefreshTimeout) {
        clearTimeout(activityRefreshTimeout)
      }
    }
  }, [club, refreshToken])

  const value: AuthContextValue = {
    club,
    loading,
    isAuthenticated: !!club,
    login,
    loginWithPIN,
    logout,
    register,
    refreshToken,
    getAccessToken
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to access auth context
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

