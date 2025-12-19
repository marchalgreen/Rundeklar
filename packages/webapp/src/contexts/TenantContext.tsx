import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react'
import type { TenantConfig } from '@rundeklar/common'
import type { PostgresClient } from '../lib/postgres'
import { loadTenantConfig, buildTenantPath } from '../lib/tenant'
import { createTenantPostgresClient, setCurrentTenantPostgresClient, setCurrentTenantConfig } from '../lib/postgres'
import { invalidateCache } from '../api/postgres'
import { peekIsolationId } from '../lib/isolation'
import { logger } from '../lib/utils/logger'

interface TenantContextValue {
  tenantId: string
  config: TenantConfig
  postgres: PostgresClient // Non-null when context is provided (guarded by null check)
  buildPath: (path: string) => string
}

const TenantContext = createContext<TenantContextValue | null>(null)

interface TenantProviderProps {
  tenantId: string
  children: React.ReactNode
}

/**
 * Tenant context provider that supplies tenant configuration and Postgres client.
 * @remarks Loads tenant config and creates tenant-specific Postgres client.
 */
export const TenantProvider: React.FC<TenantProviderProps> = ({ tenantId, children }) => {
  const [config, setConfig] = useState<TenantConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadConfig = async () => {
      try {
        setLoading(true)
        setError(null)
        const tenantConfig = await loadTenantConfig(tenantId)
        
        if (!cancelled) {
          setConfig(tenantConfig)
        }
      } catch (err) {
        if (!cancelled) {
          logger.error(`Failed to load tenant config for "${tenantId}"`, err)
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadConfig()

    return () => {
      cancelled = true
    }
  }, [tenantId])

  const postgres = useMemo(() => {
    if (!config) {
      // Don't create a client during loading - return null and handle in render
      // The loading state will prevent children from rendering anyway
      return null
    }
    const client = createTenantPostgresClient(config)
    // Update module-level client and config for API access
    setCurrentTenantPostgresClient(client)
    setCurrentTenantConfig(config)
    // Invalidate cache when tenant changes to prevent stale data from previous tenant
    invalidateCache()
    return client
  }, [config])

  // Clean up module-level client and config when component unmounts
  useEffect(() => {
    return () => {
      setCurrentTenantPostgresClient(null)
      setCurrentTenantConfig(null)
      // Invalidate cache when tenant unmounts to prevent stale data
      invalidateCache()
    }
  }, [])

  const buildPath = useMemo(() => {
    return (path: string) => buildTenantPath(tenantId, path)
  }, [tenantId])

  // Track isolation_id changes and invalidate cache when it changes
  const previousIsolationIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!config) return
    
    const currentIsolationId = peekIsolationId(tenantId)
    
    if (currentIsolationId !== previousIsolationIdRef.current) {
      // Isolation ID changed - invalidate cache to prevent stale data
      invalidateCache()
      previousIsolationIdRef.current = currentIsolationId
    }
  }, [config, tenantId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-[hsl(var(--foreground))]">Loading tenant configuration...</p>
        </div>
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-red-500">Failed to load tenant configuration</p>
          <p className="text-sm text-[hsl(var(--muted))] mt-2">{error || 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  // Ensure postgres client is available before providing context
  if (!postgres) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-[hsl(var(--foreground))]">Loading tenant configuration...</p>
        </div>
      </div>
    )
  }

  const value: TenantContextValue = {
    tenantId,
    config,
    postgres,
    buildPath
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

/**
 * Hook to access tenant context.
 * @returns Tenant context value
 * @throws Error if used outside TenantProvider
 */
export const useTenant = (): TenantContextValue => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}

