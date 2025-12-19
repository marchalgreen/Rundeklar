/**
 * Custom hook for managing player statistics data.
 * 
 * Provides data loading and state management for individual player statistics.
 */

import { useCallback, useEffect, useState } from 'react'
import type { PlayerStatistics } from '@rundeklar/common'
import statsApi from '../../api/stats'
import { useToast } from '../../components/ui/Toast'
import { normalizeError } from '../../lib/errors'

export interface UsePlayerStatisticsReturn {
  statistics: PlayerStatistics | null
  loading: boolean
  error: string | null
  loadStatistics: (playerId: string) => Promise<void>
  clearStatistics: () => void
}

/**
 * Custom hook for managing player statistics.
 * 
 * @returns Player statistics data, loading state, error state, and load function
 * 
 * @example
 * ```typescript
 * const { statistics, loading, loadStatistics } = usePlayerStatistics()
 * 
 * useEffect(() => {
 *   if (playerId) {
 *     loadStatistics(playerId)
 *   }
 * }, [playerId, loadStatistics])
 * ```
 */
export function usePlayerStatistics(): UsePlayerStatisticsReturn {
  const [statistics, setStatistics] = useState<PlayerStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { notify } = useToast()
  
  /**
   * Loads player statistics from API.
   * 
   * @param playerId - Player ID to load statistics for
   */
  const loadStatistics = useCallback(async (playerId: string) => {
    setLoading(true)
    setError(null)
    try {
      const stats = await statsApi.getPlayerStatistics(playerId)
      setStatistics(stats)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente statistik',
        description: normalizedError.message
      })
    } finally {
      setLoading(false)
    }
  }, [notify])
  
  /**
   * Clears current statistics.
   */
  const clearStatistics = useCallback(() => {
    setStatistics(null)
    setError(null)
  }, [])
  
  return {
    statistics,
    loading,
    error,
    loadStatistics,
    clearStatistics
  }
}

