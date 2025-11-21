import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchWithAuth } from '../lib/api/fetchWithAuth'

/**
 * Hook that provides an authenticated fetch function
 * Automatically handles token refresh on 401 errors
 * 
 * @returns Function that wraps fetch with automatic auth handling
 * 
 * @example
 * ```tsx
 * const fetchAuth = useFetchWithAuth()
 * const response = await fetchAuth('/api/data', { method: 'GET' })
 * ```
 */
export const useFetchWithAuth = () => {
  const { refreshToken, getAccessToken } = useAuth()

  return useCallback(
    (url: string, options: RequestInit = {}) => {
      return fetchWithAuth(url, options, refreshToken, getAccessToken)
    },
    [refreshToken, getAccessToken]
  )
}

