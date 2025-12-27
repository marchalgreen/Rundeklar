/**
 * Fetch wrapper that automatically handles token refresh on 401 errors
 * 
 * This utility intercepts 401 responses, attempts to refresh the access token,
 * and retries the original request with the new token.
 * 
 * @param url - Request URL
 * @param options - Fetch options (will have Authorization header added automatically)
 * @param refreshTokenFn - Function to refresh the access token
 * @param getAccessTokenFn - Function to get the current access token
 * @returns Promise with Response
 * 
 * @example
 * ```tsx
 * import { useAuth } from '../contexts/AuthContext'
 * 
 * const { refreshToken, getAccessToken } = useAuth()
 * const response = await fetchWithAuth('/api/data', { method: 'GET' }, refreshToken, getAccessToken)
 * ```
 */
import { logger } from '../utils/logger'

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  refreshTokenFn: (retryCount?: number) => Promise<boolean>,
  getAccessTokenFn: () => string | null
): Promise<Response> {
  const token = getAccessTokenFn()
  
  // Add Authorization header if token exists
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  
  let response: Response
  try {
    response = await fetch(url, {
    ...options,
    headers
  })
  } catch (fetchError) {
    // Handle network errors (connection refused, etc.)
    const isConnectionRefused = fetchError instanceof TypeError && 
      (fetchError.message.includes('fetch') || fetchError.message.includes('Failed to fetch'))
    
    if (isConnectionRefused && import.meta.env.DEV && url.includes('127.0.0.1:3000')) {
      logger.warn('[fetchWithAuth] Vercel dev server not running', {
        url,
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        hint: 'Please run "vercel dev" in a separate terminal to start the API server'
      })
      // Return a mock response to prevent crashes, but mark it as failed
      return new Response(
        JSON.stringify({ error: 'API server ikke tilgængelig. Kør "vercel dev" i en separat terminal.' }),
        { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'application/json' } }
      )
    }
    throw fetchError
  }

  // If 401, try to refresh and retry once
  if (response.status === 401 && token) {
    logger.debug('[fetchWithAuth] Got 401, attempting token refresh before retry...')
    
    const refreshSuccess = await refreshTokenFn()
    
    if (refreshSuccess) {
      // Small delay to ensure token is written to localStorage
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const newToken = getAccessTokenFn()
      if (!newToken) {
        logger.warn('[fetchWithAuth] Refresh succeeded but no new token found')
        return response // Return original 401 response
      }
      
      logger.debug('[fetchWithAuth] Retrying request with new token...')
      
      // Retry original request with new token
      const retryHeaders = new Headers(options.headers)
      retryHeaders.set('Authorization', `Bearer ${newToken}`)
      
      const retryResponse = await fetch(url, {
        ...options,
        headers: retryHeaders
      })
      
      logger.debug(
        '[fetchWithAuth] Retry result',
        retryResponse.status,
        retryResponse.ok ? 'success' : 'failed'
      )
      
      return retryResponse
    } else {
      logger.warn('[fetchWithAuth] Token refresh failed, returning original 401 response')
    }
  }

  return response
}

