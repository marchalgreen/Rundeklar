/**
 * Custom hook for managing player check-ins for training sessions.
 * 
 * Provides a clean interface for checking players in/out with loading states,
 * error handling, and automatic refetching.
 */

import { useCallback, useEffect, useState } from 'react'
import type { CheckedInPlayer } from '@herlev-hjorten/common'
import api from '../api'
import { normalizeError } from '../lib/errors'
import { useToast } from '../components/ui/Toast'

/**
 * Return type for useCheckIns hook.
 */
export interface UseCheckInsReturn {
  /** Array of checked-in players. */
  checkedIn: CheckedInPlayer[]
  
  /** Whether data is currently loading. */
  loading: boolean
  
  /** Error message if any error occurred. */
  error: string | null
  
  /** Function to reload check-ins data. */
  refetch: () => Promise<void>
  
  /** Function to check in a player. */
  checkIn: (playerId: string, maxRounds?: number) => Promise<boolean>
  
  /** Function to check out a player. */
  checkOut: (playerId: string) => Promise<boolean>
  
  /** Function to clear the current error. */
  clearError: () => void
}

/**
 * Custom hook for managing player check-ins.
 * 
 * @param sessionId - Active session ID (if null, check-ins won't load)
 * @returns Check-ins data, loading state, error state, and check-in operations
 * 
 * @example
 * ```typescript
 * const { checkedIn, loading, checkIn, checkOut } = useCheckIns(session?.id)
 * 
 * await checkIn(playerId, 1) // Check in with max 1 round
 * await checkOut(playerId)
 * ```
 */
export const useCheckIns = (sessionId: string | null): UseCheckInsReturn => {
  const [checkedIn, setCheckedIn] = useState<CheckedInPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { notify } = useToast()

  /**
   * Loads checked-in players from the API.
   */
  const loadCheckIns = useCallback(async () => {
    if (!sessionId) {
      setCheckedIn([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const result = await api.checkIns.listActive()
      setCheckedIn(result)
    } catch (err) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'error',
        title: 'Kunne ikke hente fremmøde',
        message: normalizedError.message
      })
    } finally {
      setLoading(false)
    }
  }, [sessionId, notify])

  /**
   * Checks in a player for the active session.
   * 
   * @param playerId - ID of player to check in
   * @param maxRounds - Optional maximum rounds (1 for "kun 1 runde")
   * @returns True if successful, false otherwise
   */
  const checkIn = useCallback(async (
    playerId: string,
    maxRounds?: number
  ): Promise<boolean> => {
    setError(null)
    
    try {
      await api.checkIns.add({ playerId, maxRounds })
      await loadCheckIns() // Reload to get updated list
      return true
    } catch (err) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'error',
        title: 'Kunne ikke tjekke ind',
        message: normalizedError.message
      })
      return false
    }
  }, [loadCheckIns, notify])

  /**
   * Checks out a player from the active session.
   * 
   * @param playerId - ID of player to check out
   * @returns True if successful, false otherwise
   */
  const checkOut = useCallback(async (playerId: string): Promise<boolean> => {
    setError(null)
    
    try {
      await api.checkIns.remove({ playerId })
      await loadCheckIns() // Reload to get updated list
      return true
    } catch (err) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'error',
        title: 'Kunne ikke tjekke ud',
        message: normalizedError.message
      })
      return false
    }
  }, [loadCheckIns, notify])

  /**
   * Clears the current error state.
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Load check-ins when session ID changes
  useEffect(() => {
    void loadCheckIns()
  }, [loadCheckIns])

  return {
    checkedIn,
    loading,
    error,
    refetch: loadCheckIns,
    checkIn,
    checkOut,
    clearError
  }
}

