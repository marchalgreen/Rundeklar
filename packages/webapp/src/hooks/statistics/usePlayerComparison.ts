/**
 * Custom hook for managing player comparison data.
 * 
 * Provides data loading and state management for comparing two players.
 */

import { useCallback, useEffect, useState } from 'react'
import type { PlayerComparison } from '@rundeklar/common'
import statsApi from '../../api/stats'
import { useToast } from '../../components/ui/Toast'
import { normalizeError } from '../../lib/errors'

export interface UsePlayerComparisonReturn {
  comparisonStats: PlayerComparison | null
  loading: boolean
  error: string | null
  loadComparison: (playerId1: string, playerId2: string) => Promise<void>
  clearComparison: () => void
}

/**
 * Custom hook for managing player comparison.
 * 
 * @returns Comparison data, loading state, error state, and load function
 * 
 * @example
 * ```typescript
 * const { comparisonStats, loading, loadComparison } = usePlayerComparison()
 * 
 * useEffect(() => {
 *   if (playerId1 && playerId2) {
 *     loadComparison(playerId1, playerId2)
 *   }
 * }, [playerId1, playerId2, loadComparison])
 * ```
 */
export function usePlayerComparison(): UsePlayerComparisonReturn {
  const [comparisonStats, setComparisonStats] = useState<PlayerComparison | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { notify } = useToast()
  
  /**
   * Loads comparison statistics between two players.
   * 
   * @param playerId1 - First player ID
   * @param playerId2 - Second player ID
   */
  const loadComparison = useCallback(async (playerId1: string, playerId2: string) => {
    setLoading(true)
    setError(null)
    try {
      const stats = await statsApi.getPlayerComparison(playerId1, playerId2)
      setComparisonStats(stats)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente sammenligning',
        description: normalizedError.message
      })
    } finally {
      setLoading(false)
    }
  }, [notify])
  
  /**
   * Clears current comparison data.
   */
  const clearComparison = useCallback(() => {
    setComparisonStats(null)
    setError(null)
  }, [])
  
  return {
    comparisonStats,
    loading,
    error,
    loadComparison,
    clearComparison
  }
}

