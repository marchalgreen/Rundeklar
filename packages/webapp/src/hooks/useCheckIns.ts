/**
 * Custom hook for managing player check-ins for training sessions.
 * 
 * Provides a clean interface for checking players in/out with loading states,
 * error handling, and automatic refetching.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CheckedInPlayer, Player } from '@rundeklar/common'
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
  
  // Operation locking: prevent concurrent operations on the same player
  const pendingOperationsRef = useRef<Set<string>>(new Set())
  // Track if we're in the middle of a check-in operation to prevent unnecessary reloads
  const isCheckingInRef = useRef<Set<string>>(new Set())

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
      // Only update state if the data actually changed to prevent unnecessary re-renders
      setCheckedIn(prev => {
        // Skip update if we're currently checking in players (optimistic update already handled it)
        if (isCheckingInRef.current.size > 0) {
          // Check if all checking-in players are already in the result
          const allPresent = [...isCheckingInRef.current].every(id => 
            result.some(p => p.id === id)
          )
          if (allPresent) {
            // All players we're checking in are already in result, skip update to prevent blink
            return prev
          }
        }
        
        // Compare arrays by IDs to avoid unnecessary updates
        const prevIds = new Set(prev.map(p => p.id))
        const resultIds = new Set(result.map(p => p.id))
        const idsMatch = prevIds.size === resultIds.size && 
                         [...prevIds].every(id => resultIds.has(id))
        
        // If IDs match and no pending operations, skip update to prevent blinking
        if (idsMatch && pendingOperationsRef.current.size === 0) {
          // Still check if any player data changed (e.g., maxRounds, checkInAt)
          const hasChanges = result.some(newPlayer => {
            const oldPlayer = prev.find(p => p.id === newPlayer.id)
            return !oldPlayer || 
                   oldPlayer.maxRounds !== newPlayer.maxRounds ||
                   oldPlayer.checkInAt !== newPlayer.checkInAt
          })
          if (!hasChanges) {
            return prev // Return same reference to prevent re-render
          }
        }
        
        return result
      })
    } catch (err) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente fremmøde',
        description: normalizedError.message
      })
    } finally {
      setLoading(false)
    }
  }, [sessionId, notify])

  /**
   * Checks in a player for the active session.
   * Optimistic update: UI updates immediately, database sync happens in background.
   * 
   * @param playerId - ID of player to check in
   * @param maxRounds - Optional maximum rounds (1 for "kun 1 runde")
   * @returns True if successful, false otherwise
   */
  const checkIn = useCallback(async (
    playerId: string,
    maxRounds?: number
  ): Promise<boolean> => {
    // Operation locking: prevent concurrent operations on same player
    if (pendingOperationsRef.current.has(playerId)) {
      // Operation already in progress for this player
      return false
    }
    
    // Check if already checked in locally (prevent duplicate optimistic updates)
    const alreadyCheckedIn = checkedIn.some(p => p.id === playerId)
    if (alreadyCheckedIn) {
      return true // Already checked in, treat as success
    }
    
    pendingOperationsRef.current.add(playerId)
    isCheckingInRef.current.add(playerId)
    setError(null)
    
    try {
      // Fetch player data immediately for optimistic update
      let playerData: Player | null = null
      try {
        const players = await api.players.list({ active: true })
        playerData = players.find(p => p.id === playerId) || null
      } catch (err) {
        // If we can't get player data, continue anyway - will be loaded on sync
        console.warn('[useCheckIns] Failed to fetch player data for optimistic update:', err)
      }
      
      // Optimistic update: Add player to UI immediately with real data if available
      setCheckedIn(prev => {
        // Double-check if already checked in (prevent duplicates)
        if (prev.some(p => p.id === playerId)) {
          return prev
        }
        
        // Create checked-in player with real data if available
        const checkedInPlayer: CheckedInPlayer = playerData ? {
          ...playerData,
          checkInAt: new Date().toISOString(),
          maxRounds: maxRounds ?? null
        } : {
          id: playerId,
          name: 'Loading...', // Fallback if player data not available
          active: true,
          checkInAt: new Date().toISOString(),
          maxRounds: maxRounds ?? null
        } as CheckedInPlayer
        
        return [...prev, checkedInPlayer]
      })
      
      // Sync with database in background
      try {
        await api.checkIns.add({ playerId, maxRounds })
        // Don't reload - the optimistic update already has the correct data
        // Reloading would cause unnecessary re-renders and UI blinking
        // Only reload if player data was missing (shouldn't happen in normal flow)
        if (!playerData) {
          await loadCheckIns()
        }
        // Remove from checking-in ref after successful API call
        isCheckingInRef.current.delete(playerId)
        return true
      } catch (err) {
        // Rollback optimistic update on error
        setCheckedIn(prev => prev.filter(p => p.id !== playerId))
        isCheckingInRef.current.delete(playerId)
        
        // Check if it's a duplicate key error - if so, reload to sync state
        const errorMessage = err instanceof Error ? err.message : String(err)
        const isDuplicateError = errorMessage.includes('duplicate key') || 
                                 errorMessage.includes('already checked in') ||
                                 errorMessage.includes('unique constraint')
        
        if (isDuplicateError) {
          // Race condition occurred - reload to sync with database state
          await loadCheckIns()
          // Don't show error toast for duplicate - it's already handled by reload
          return true
        }
        
        const normalizedError = normalizeError(err)
        setError(normalizedError.message)
        notify({
          variant: 'danger',
          title: 'Kunne ikke tjekke ind',
          description: normalizedError.message
        })
        return false
      }
    } finally {
      pendingOperationsRef.current.delete(playerId)
    }
  }, [checkedIn, loadCheckIns, notify])

  /**
   * Checks out a player from the active session.
   * Optimistic update: UI updates immediately, database sync happens in background.
   * 
   * @param playerId - ID of player to check out
   * @returns True if successful, false otherwise
   */
  const checkOut = useCallback(async (playerId: string): Promise<boolean> => {
    // Operation locking: prevent concurrent operations on same player
    if (pendingOperationsRef.current.has(playerId)) {
      // Operation already in progress for this player
      return false
    }
    
    // Check if not checked in locally
    const isCheckedIn = checkedIn.some(p => p.id === playerId)
    if (!isCheckedIn) {
      return true // Not checked in, treat as success
    }
    
    pendingOperationsRef.current.add(playerId)
    setError(null)
    
    try {
      // Optimistic update: Remove player from UI immediately
      const removedPlayer = checkedIn.find(p => p.id === playerId)
      setCheckedIn(prev => prev.filter(p => p.id !== playerId))
      
      // Sync with database in background
      try {
        await api.checkIns.remove({ playerId })
        // No need to reload - we already updated UI
        return true
      } catch (err) {
        // Rollback optimistic update on error
        if (removedPlayer) {
          setCheckedIn(prev => [...prev, removedPlayer].sort((a, b) => 
            a.checkInAt.localeCompare(b.checkInAt)
          ))
        }
        const normalizedError = normalizeError(err)
        setError(normalizedError.message)
        notify({
          variant: 'danger',
          title: 'Kunne ikke tjekke ud',
          description: normalizedError.message
        })
        return false
      }
    } finally {
      pendingOperationsRef.current.delete(playerId)
    }
  }, [checkedIn, notify])

  /**
   * Clears the current error state.
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Load check-ins when session ID changes
  useEffect(() => {
    void loadCheckIns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

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

