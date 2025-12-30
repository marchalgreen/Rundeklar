/**
 * Custom hook for managing player statistics data.
 * 
 * Provides data loading and state management for individual player statistics.
 */

import { useCallback, useState } from 'react'
import type { PlayerStatistics, PlayerMatchResult, HeadToHeadResult } from '@rundeklar/common'
import statsApi from '../../api/stats'
import { useToast } from '../../components/ui/Toast'
import { normalizeError } from '../../lib/errors'

export interface UsePlayerStatisticsReturn {
  statistics: PlayerStatistics | null
  loading: boolean
  error: string | null
  loadStatistics: (playerId: string) => Promise<void>
  clearStatistics: () => void
  // All matches
  allMatches: PlayerMatchResult[] | null
  allMatchesLoading: boolean
  loadAllMatches: (playerId: string) => Promise<void>
  // Head-to-head data
  headToHeadData: Map<string, { matches: HeadToHeadResult[], player1Wins: number, player2Wins: number }>
  headToHeadLoading: Set<string>
  loadHeadToHead: (playerId1: string, playerId2: string) => Promise<void>
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
  const [allMatches, setAllMatches] = useState<PlayerMatchResult[] | null>(null)
  const [allMatchesLoading, setAllMatchesLoading] = useState(false)
  const [headToHeadData, setHeadToHeadData] = useState<Map<string, { matches: HeadToHeadResult[], player1Wins: number, player2Wins: number }>>(new Map())
  const [headToHeadLoading, setHeadToHeadLoading] = useState<Set<string>>(new Set())
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
    setAllMatches(null)
    setHeadToHeadData(new Map())
    setHeadToHeadLoading(new Set())
  }, [])

  /**
   * Loads all match results for a player.
   * 
   * @param playerId - Player ID to load all matches for
   */
  const loadAllMatches = useCallback(async (playerId: string) => {
    setAllMatchesLoading(true)
    try {
      const matches = await statsApi.getPlayerAllMatches(playerId)
      setAllMatches(matches)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente kampresultater',
        description: normalizedError.message
      })
    } finally {
      setAllMatchesLoading(false)
    }
  }, [notify])

  /**
   * Loads head-to-head statistics between two players.
   * 
   * @param playerId1 - First player ID
   * @param playerId2 - Second player ID
   */
  const loadHeadToHead = useCallback(async (playerId1: string, playerId2: string) => {
    // Create a unique key for this pair (always use same order for consistency)
    const key = [playerId1, playerId2].sort().join('_')
    
    // If already loaded, don't reload
    if (headToHeadData.has(key)) {
      return
    }

    setHeadToHeadLoading(prev => new Set(prev).add(key))
    try {
      const data = await statsApi.getPlayerHeadToHead(playerId1, playerId2)
      setHeadToHeadData(prev => {
        const newMap = new Map(prev)
        // Map headToHeadMatches to matches for component compatibility
        newMap.set(key, {
          matches: data.headToHeadMatches,
          player1Wins: data.player1Wins,
          player2Wins: data.player2Wins
        })
        return newMap
      })
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente head-to-head statistik',
        description: normalizedError.message
      })
    } finally {
      setHeadToHeadLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(key)
        return newSet
      })
    }
  }, [headToHeadData, notify])
  
  return {
    statistics,
    loading,
    error,
    loadStatistics,
    clearStatistics,
    allMatches,
    allMatchesLoading,
    loadAllMatches,
    headToHeadData,
    headToHeadLoading,
    loadHeadToHead
  }
}

