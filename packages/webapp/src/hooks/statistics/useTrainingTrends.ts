/**
 * Custom hook for managing training attendance trends over time.
 * 
 * Handles loading of monthly attendance trends and group attendance trends over time.
 */

import { useCallback, useEffect, useState } from 'react'
import type {
  MonthlyAttendanceTrend,
  GroupAttendanceOverTime
} from '@rundeklar/common'
import statsApi from '../../api/stats'
import { useToast } from '../../components/ui/Toast'
import { normalizeError } from '../../lib/errors'
import type { UseStatisticsFiltersReturn } from './useStatisticsFilters'

export interface UseTrainingTrendsReturn {
  // Monthly trends
  monthlyAttendanceTrends: MonthlyAttendanceTrend[]
  monthlyTrendsLoading: boolean
  
  // Group trends over time
  groupAttendanceOverTime: GroupAttendanceOverTime[]
  groupTrendsLoading: boolean
  
  // Error state
  error: string | null
  clearError: () => void
  
  // Actions
  refetch: () => Promise<void>
}

/**
 * Custom hook for managing training attendance trends over time.
 * 
 * @param filters - Filter state from useStatisticsFilters hook
 * @param enabled - Whether to load data (e.g., when view is active)
 * @returns Trend data, loading states, error state, and refetch function
 * 
 * @example
 * ```typescript
 * const filters = useStatisticsFilters()
 * const { monthlyAttendanceTrends, groupAttendanceOverTime, monthlyTrendsLoading } = useTrainingTrends(filters, true)
 * ```
 */
export function useTrainingTrends(
  filters: UseStatisticsFiltersReturn,
  enabled: boolean = true
): UseTrainingTrendsReturn {
  const { notify } = useToast()
  
  // Monthly trends state
  const [monthlyAttendanceTrends, setMonthlyAttendanceTrends] = useState<MonthlyAttendanceTrend[]>([])
  const [monthlyTrendsLoading, setMonthlyTrendsLoading] = useState(false)
  
  // Group trends over time state
  const [groupAttendanceOverTime, setGroupAttendanceOverTime] = useState<GroupAttendanceOverTime[]>([])
  const [groupTrendsLoading, setGroupTrendsLoading] = useState(false)
  
  // Error state
  const [error, setError] = useState<string | null>(null)
  
  /**
   * Clears the current error state.
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  // Load monthly attendance trends
  const loadMonthlyAttendanceTrends = useCallback(async () => {
    setMonthlyTrendsLoading(true)
    setError(null)
    try {
      const trends = await statsApi.getMonthlyAttendanceTrends(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setMonthlyAttendanceTrends(trends)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente månedlige trends',
        description: normalizedError.message
      })
    } finally {
      setMonthlyTrendsLoading(false)
    }
  }, [filters.dateRange.dateFrom, filters.dateRange.dateTo, filters.groupNames, notify])
  
  // Load group attendance over time
  const loadGroupAttendanceOverTime = useCallback(async () => {
    setGroupTrendsLoading(true)
    setError(null)
    try {
      const trends = await statsApi.getGroupAttendanceOverTime(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setGroupAttendanceOverTime(trends)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente gruppetrends',
        description: normalizedError.message
      })
    } finally {
      setGroupTrendsLoading(false)
    }
  }, [filters.dateRange.dateFrom, filters.dateRange.dateTo, filters.groupNames, notify])
  
  // Refetch all data
  const refetch = useCallback(async () => {
    if (!enabled) return
    
    await Promise.all([
      loadMonthlyAttendanceTrends(),
      loadGroupAttendanceOverTime()
    ])
  }, [
    enabled,
    loadMonthlyAttendanceTrends,
    loadGroupAttendanceOverTime
  ])
  
  // Load data when enabled and filters change
  useEffect(() => {
    if (enabled) {
      void loadMonthlyAttendanceTrends()
      void loadGroupAttendanceOverTime()
    }
    // Only depend on filter values, not callbacks - callbacks are stable and don't need to trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    filters.dateRange.dateFrom,
    filters.dateRange.dateTo,
    filters.groupNames
  ])
  
  return {
    monthlyAttendanceTrends,
    monthlyTrendsLoading,
    groupAttendanceOverTime,
    groupTrendsLoading,
    error,
    clearError,
    refetch
  }
}

