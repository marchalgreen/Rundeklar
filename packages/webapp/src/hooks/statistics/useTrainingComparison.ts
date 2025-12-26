/**
 * Custom hook for managing training attendance period comparisons.
 * 
 * Handles loading of period comparison data and comparison group trends over time
 * for year-over-year analysis.
 */

import { useCallback, useEffect, useState } from 'react'
import type {
  PeriodComparison,
  GroupAttendanceOverTime
} from '@rundeklar/common'
import statsApi from '../../api/stats'
import { useToast } from '../../components/ui/Toast'
import { normalizeError } from '../../lib/errors'
import type { UseStatisticsFiltersReturn } from './useStatisticsFilters'

export interface UseTrainingComparisonReturn {
  // Comparison group trends over time
  comparisonGroupAttendanceOverTime: GroupAttendanceOverTime[]
  comparisonGroupTrendsLoading: boolean
  
  // Period comparison
  periodComparison: PeriodComparison | null
  periodComparisonLoading: boolean
  
  // Error state
  error: string | null
  clearError: () => void
  
  // Actions
  refetch: () => Promise<void>
}

/**
 * Custom hook for managing training attendance period comparisons.
 * 
 * @param filters - Filter state from useStatisticsFilters hook
 * @param enabled - Whether to load data (e.g., when view is active)
 * @returns Comparison data, loading states, error state, and refetch function
 * 
 * @example
 * ```typescript
 * const filters = useStatisticsFilters()
 * const { periodComparison, comparisonGroupAttendanceOverTime } = useTrainingComparison(filters, true)
 * ```
 */
export function useTrainingComparison(
  filters: UseStatisticsFiltersReturn,
  enabled: boolean = true
): UseTrainingComparisonReturn {
  const { notify } = useToast()
  
  // Comparison group trends over time state
  const [comparisonGroupAttendanceOverTime, setComparisonGroupAttendanceOverTime] = useState<GroupAttendanceOverTime[]>([])
  const [comparisonGroupTrendsLoading, setComparisonGroupTrendsLoading] = useState(false)
  
  // Period comparison state
  const [periodComparison, setPeriodComparison] = useState<PeriodComparison | null>(null)
  const [periodComparisonLoading, setPeriodComparisonLoading] = useState(false)
  
  // Error state
  const [error, setError] = useState<string | null>(null)
  
  /**
   * Clears the current error state.
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  // Load comparison group attendance over time (if comparison is enabled)
  const loadComparisonGroupAttendanceOverTime = useCallback(async () => {
    if (!filters.comparisonDateRange.dateFrom || !filters.comparisonDateRange.dateTo) {
      setComparisonGroupAttendanceOverTime([])
      return
    }
    
    setComparisonGroupTrendsLoading(true)
    setError(null)
    try {
      const comparisonTrends = await statsApi.getGroupAttendanceOverTime(
        filters.comparisonDateRange.dateFrom,
        filters.comparisonDateRange.dateTo,
        filters.groupNames
      )
      setComparisonGroupAttendanceOverTime(comparisonTrends)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente sammenligningsgruppetrends',
        description: normalizedError.message
      })
    } finally {
      setComparisonGroupTrendsLoading(false)
    }
  }, [filters.comparisonDateRange.dateFrom, filters.comparisonDateRange.dateTo, filters.groupNames, notify])
  
  // Load period comparison (only if comparison period is set)
  const loadPeriodComparison = useCallback(async () => {
    if (!filters.comparisonDateRange.dateFrom || !filters.comparisonDateRange.dateTo) {
      setPeriodComparison(null)
      return
    }
    
    setPeriodComparisonLoading(true)
    setError(null)
    try {
      const comparison = await statsApi.getPeriodComparison(
        filters.dateRange.dateFrom || '',
        filters.dateRange.dateTo || '',
        filters.comparisonDateRange.dateFrom,
        filters.comparisonDateRange.dateTo,
        filters.groupNames
      )
      setPeriodComparison(comparison)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente periodesammenligning',
        description: normalizedError.message
      })
    } finally {
      setPeriodComparisonLoading(false)
    }
  }, [filters.dateRange.dateFrom, filters.dateRange.dateTo, filters.comparisonDateRange.dateFrom, filters.comparisonDateRange.dateTo, filters.groupNames, notify])
  
  // Refetch all data
  const refetch = useCallback(async () => {
    if (!enabled) return
    
    await Promise.all([
      loadComparisonGroupAttendanceOverTime(),
      loadPeriodComparison()
    ])
  }, [
    enabled,
    loadComparisonGroupAttendanceOverTime,
    loadPeriodComparison
  ])
  
  // Load data when enabled and filters change
  useEffect(() => {
    if (enabled) {
      void loadComparisonGroupAttendanceOverTime()
      void loadPeriodComparison()
    }
    // Only depend on filter values, not callbacks - callbacks are stable and don't need to trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    filters.dateRange.dateFrom,
    filters.dateRange.dateTo,
    filters.comparisonDateRange.dateFrom,
    filters.comparisonDateRange.dateTo,
    filters.groupNames,
    filters.enableComparison
  ])
  
  return {
    comparisonGroupAttendanceOverTime,
    comparisonGroupTrendsLoading,
    periodComparison,
    periodComparisonLoading,
    error,
    clearError,
    refetch
  }
}

