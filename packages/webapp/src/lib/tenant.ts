import type { TenantConfig } from '@herlev-hjorten/common'

/**
 * Extracts tenant ID from URL path.
 * @param pathname - Current pathname (e.g., "/demo/check-in" or "/check-in")
 * @returns Tenant ID or "default" if no tenant in path
 * @example
 * extractTenantId("/demo/check-in") // "demo"
 * extractTenantId("/check-in") // "default"
 */
export const extractTenantId = (pathname: string): string => {
  // Remove leading slash and split by "/"
  const parts = pathname.replace(/^\/+/, '').split('/')
  
  // First part is tenant ID if it exists and is not a known route
  const knownRoutes = ['check-in', 'match-program', 'players', 'statistics']
  const firstPart = parts[0]
  
  // If first part is a known route, it's the default tenant
  if (knownRoutes.includes(firstPart)) {
    return 'default'
  }
  
  // Otherwise, first part is the tenant ID
  return firstPart || 'default'
}

/**
 * Loads tenant configuration from config file.
 * @param tenantId - Tenant ID to load config for
 * @returns Tenant configuration
 * @throws Error if tenant config not found
 */
export const loadTenantConfig = async (tenantId: string): Promise<TenantConfig> => {
  try {
    // In development, use dynamic import
    // In production, config files are copied to dist
    const config = await import(`../config/tenants/${tenantId}.json`)
    return config.default as TenantConfig
  } catch (error) {
    // Fallback to default if tenant not found
    if (tenantId !== 'default') {
      console.warn(`Tenant config not found for "${tenantId}", falling back to default`)
      return loadTenantConfig('default')
    }
    throw new Error(`Failed to load tenant config for "${tenantId}": ${error}`)
  }
}

/**
 * Gets tenant ID from current location.
 * Works with both HashRouter and BrowserRouter.
 * @returns Tenant ID
 */
export const getCurrentTenantId = (): string => {
  if (typeof window === 'undefined') {
    return 'default'
  }
  
  // For HashRouter, pathname is like "/#/demo/check-in" or "/#/check-in"
  // For BrowserRouter, pathname is like "/demo/check-in" or "/check-in"
  const pathname = window.location.pathname
  const hash = window.location.hash
  
  // Extract path from hash if using HashRouter
  const actualPath = hash ? hash.replace(/^#/, '') : pathname
  
  return extractTenantId(actualPath)
}

/**
 * Builds a tenant-aware path.
 * @param tenantId - Tenant ID
 * @param path - Route path (e.g., "/check-in")
 * @returns Full path with tenant prefix (e.g., "/demo/check-in" or "/check-in" for default)
 */
export const buildTenantPath = (tenantId: string, path: string): string => {
  // Remove leading slash from path
  const cleanPath = path.replace(/^\/+/, '')
  
  // For default tenant, don't add prefix
  if (tenantId === 'default') {
    return `/${cleanPath}`
  }
  
  // For other tenants, add tenant prefix
  return `/${tenantId}/${cleanPath}`
}


