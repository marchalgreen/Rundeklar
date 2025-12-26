/**
 * Custom hook for managing training group data.
 * 
 * Handles loading and managing the list of all available training groups
 * extracted from player data.
 */

import { useCallback } from 'react'
import api from '../../api'
import type { UseStatisticsFiltersReturn } from './useStatisticsFilters'

export interface UseTrainingGroupsReturn {
  /**
   * Loads all training groups from player data.
   * Extracts unique group names from all players' trainingGroups arrays.
   */
  loadAllGroups: () => Promise<void>
}

/**
 * Custom hook for managing training groups.
 * 
 * @param filters - Filter state containing allGroups and setAllGroups
 * @returns Function to load all training groups
 * 
 * @example
 * ```typescript
 * const filters = useStatisticsFilters()
 * const { loadAllGroups } = useTrainingGroups(filters)
 * 
 * useEffect(() => {
 *   void loadAllGroups()
 * }, [loadAllGroups])
 * ```
 */
export function useTrainingGroups(
  filters: Pick<UseStatisticsFiltersReturn, 'allGroups' | 'setAllGroups'>
): UseTrainingGroupsReturn {
  /**
   * Loads all training groups from player data.
   * 
   * Extracts unique group names from all players' trainingGroups arrays,
   * sorts them alphabetically, and updates the filters state.
   * 
   * Silently fails if API call fails - groups will just be empty.
   * This is intentional as groups are optional metadata.
   */
  const loadAllGroups = useCallback(async () => {
    try {
      const allPlayers = await api.players.list()
      const groupsSet = new Set<string>()
      
      allPlayers.forEach((player) => {
        const playerGroups = player.trainingGroups || []
        playerGroups.forEach((group) => {
          if (group) {
            groupsSet.add(group)
          }
        })
      })
      
      const groups = Array.from(groupsSet).sort()
      
      // Only update if groups have changed to avoid infinite loops
      if (JSON.stringify(groups) !== JSON.stringify(filters.allGroups)) {
        filters.setAllGroups(groups)
      }
    } catch (err: unknown) {
      // Silently fail - groups will just be empty
      // Don't use console.error per guardrails
      // This is acceptable as groups are optional metadata
    }
  }, [filters.allGroups, filters.setAllGroups])

  return {
    loadAllGroups
  }
}

