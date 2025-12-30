/**
 * Custom hook for managing statistics view mode and player selection state.
 * 
 * Handles view mode switching, player selection, search state, and related UI state.
 */

import { useState, useEffect, useMemo } from 'react'
import type { Player } from '@rundeklar/common'
import type { UsePlayerStatisticsReturn } from './usePlayerStatistics'
import type { UsePlayerComparisonReturn } from './usePlayerComparison'

export type ViewMode = 'landing' | 'training' | 'player'

export interface UseStatisticsViewReturn {
  // View mode
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  
  // Player selection
  selectedPlayerId: string | null
  setSelectedPlayerId: (id: string | null) => void
  comparisonPlayerId: string | null
  setComparisonPlayerId: (id: string | null) => void
  
  // Search state
  search: string
  setSearch: (value: string) => void
  showSearch: boolean
  setShowSearch: (show: boolean) => void
  comparisonSearch: string
  setComparisonSearch: (value: string) => void
  showComparisonSearch: boolean
  setShowComparisonSearch: (show: boolean) => void
  
  // Computed values
  filteredPlayers: Player[]
  filteredComparisonPlayers: Player[]
  selectedPlayer: Player | null
  comparisonPlayer: Player | null
}

/**
 * Custom hook for managing statistics view mode and player selection.
 * 
 * @param players - Array of all players
 * @param playerStatistics - Player statistics hook (for clearing state)
 * @param playerComparison - Player comparison hook (for clearing state)
 * @returns View mode state, player selection state, search state, and computed values
 * 
 * @example
 * ```typescript
 * const { players } = usePlayers()
 * const playerStatistics = usePlayerStatistics()
 * const playerComparison = usePlayerComparison()
 * const view = useStatisticsView(players, playerStatistics, playerComparison)
 * ```
 */
export function useStatisticsView(
  players: Player[],
  playerStatistics: UsePlayerStatisticsReturn,
  playerComparison: UsePlayerComparisonReturn
): UseStatisticsViewReturn {
  const [viewMode, setViewMode] = useState<ViewMode>('landing')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [comparisonPlayerId, setComparisonPlayerId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [comparisonSearch, setComparisonSearch] = useState('')
  const [showComparisonSearch, setShowComparisonSearch] = useState(false)
  
  // Reset player selection when switching away from player view
  useEffect(() => {
    if (viewMode !== 'player') {
      setSelectedPlayerId(null)
      playerStatistics.clearStatistics()
      setComparisonPlayerId(null)
      playerComparison.clearComparison()
    }
    // Only depend on viewMode, not hook objects to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])
  
  // Load player statistics when player is selected
  useEffect(() => {
    if (selectedPlayerId) {
      void playerStatistics.loadStatistics(selectedPlayerId)
    } else {
      playerStatistics.clearStatistics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId])
  
  // Load comparison when both players are selected
  useEffect(() => {
    if (selectedPlayerId && comparisonPlayerId) {
      void playerComparison.loadComparison(selectedPlayerId, comparisonPlayerId)
    } else {
      playerComparison.clearComparison()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId, comparisonPlayerId])
  
  /** Memoized filtered players list — applies search term to name/alias. */
  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return players
    return players.filter((player) => {
      const alias = (player.alias ?? '').toLowerCase()
      return player.name.toLowerCase().includes(term) || alias.includes(term)
    })
  }, [players, search])
  
  /** Selected player object. */
  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerId) return null
    return players.find((p) => p.id === selectedPlayerId) ?? null
  }, [players, selectedPlayerId])
  
  /** Comparison player object. */
  const comparisonPlayer = useMemo(() => {
    if (!comparisonPlayerId) return null
    return players.find((p) => p.id === comparisonPlayerId) ?? null
  }, [players, comparisonPlayerId])
  
  /** Memoized filtered players list for comparison — applies search term to name/alias. */
  const filteredComparisonPlayers = useMemo(() => {
    const term = comparisonSearch.trim().toLowerCase()
    if (!term) return players.filter((p) => p.id !== selectedPlayerId)
    return players.filter((player) => {
      if (player.id === selectedPlayerId) return false
      const alias = (player.alias ?? '').toLowerCase()
      return player.name.toLowerCase().includes(term) || alias.includes(term)
    })
  }, [players, comparisonSearch, selectedPlayerId])
  
  return {
    viewMode,
    setViewMode,
    selectedPlayerId,
    setSelectedPlayerId,
    comparisonPlayerId,
    setComparisonPlayerId,
    search,
    setSearch,
    showSearch,
    setShowSearch,
    comparisonSearch,
    setComparisonSearch,
    showComparisonSearch,
    setShowComparisonSearch,
    filteredPlayers,
    filteredComparisonPlayers,
    selectedPlayer,
    comparisonPlayer
  }
}

