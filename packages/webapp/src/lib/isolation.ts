/**
 * Browser session isolation for demo tenant.
 * Each browser gets a unique isolation_id stored in localStorage.
 * This ensures demo users don't see each other's data.
 */

import { logger } from './utils/logger.js'

const ISOLATION_ID_KEY = 'rundeklar_isolation_id'

/**
 * Gets or creates an isolation ID for the current browser session.
 * Only used for demo tenant to provide per-browser isolation.
 * 
 * @param tenantId - Current tenant ID
 * @returns Isolation ID for demo tenant, null for other tenants
 */
export const getIsolationId = (tenantId: string): string | null => {
  // Only use isolation for demo tenant
  if (tenantId !== 'demo') {
    return null
  }

  if (typeof window === 'undefined') {
    return null
  }

  try {
    let isolationId = localStorage.getItem(ISOLATION_ID_KEY)
    
    if (!isolationId) {
      // Generate new UUID for this browser session
      isolationId = crypto.randomUUID()
      localStorage.setItem(ISOLATION_ID_KEY, isolationId)
      logger.debug('[isolation] Generated new isolation_id', isolationId)
    }
    
    return isolationId
  } catch (error) {
    logger.error('[isolation] Failed to get isolation_id', error)
    return null
  }
}

/**
 * Clears isolation ID (useful for testing or reset).
 * User will get a new isolation_id on next page load.
 */
export const clearIsolationId = (): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(ISOLATION_ID_KEY)
    logger.debug('[isolation] Cleared isolation_id')
  } catch (error) {
    logger.error('[isolation] Failed to clear isolation_id', error)
  }
}

/**
 * Gets current isolation ID without creating one.
 * Useful for checking if isolation is active.
 * 
 * @param tenantId - Current tenant ID
 * @returns Isolation ID if exists, null otherwise
 */
export const peekIsolationId = (tenantId: string): string | null => {
  if (tenantId !== 'demo') {
    return null
  }

  if (typeof window === 'undefined') {
    return null
  }

  try {
    return localStorage.getItem(ISOLATION_ID_KEY)
  } catch {
    return null
  }
}

