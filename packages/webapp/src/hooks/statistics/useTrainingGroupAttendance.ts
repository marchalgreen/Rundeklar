/**
 * Custom hook for managing basic training group attendance data.
 * 
 * Handles loading of core attendance metrics including group attendance,
 * weekday attendance, player check-in long-tail, and training day comparisons.
 */

import { useCallback, useEffect, useState } from 'react'
import type {
  TrainingGroupAttendance,
  WeekdayAttendance,
  PlayerCheckInLongTail,
  WeekdayAttendanceOverTime,
  TrainingDayComparison
} from '@rundeklar/common'
import statsApi from '../../api/stats'
import { useToast } from '../../components/ui/Toast'
import { normalizeError } from '../../lib/errors'
import { logger } from '../../lib/utils/logger'
import type { UseStatisticsFiltersReturn } from './useStatisticsFilters'

export interface UseTrainingGroupAttendanceReturn {
  // Training group attendance
  trainingGroupAttendance: TrainingGroupAttendance[]
  attendanceLoading: boolean
  
  // Weekday attendance
  weekdayAttendance: WeekdayAttendance[]
  weekdayLoading: boolean
  
  // Long-tail view
  playerCheckInLongTail: PlayerCheckInLongTail[]
  longTailLoading: boolean
  
  // Attendance over time
  weekdayAttendanceOverTime: WeekdayAttendanceOverTime[]
  attendanceOverTimeLoading: boolean
  
  // Training day comparison
  trainingDayComparison: TrainingDayComparison | null
  comparisonLoading: boolean
  
  // Error state
  error: string | null
  clearError: () => void
  
  // Actions
  refetch: () => Promise<void>
}

/**
 * Custom hook for managing basic training group attendance data.
 * 
 * @param filters - Filter state from useStatisticsFilters hook
 * @param enabled - Whether to load data (e.g., when view is active)
 * @returns Basic attendance data, loading states, error state, and refetch function
 * 
 * @example
 * ```typescript
 * const filters = useStatisticsFilters()
 * const { trainingGroupAttendance, attendanceLoading, error } = useTrainingGroupAttendance(filters, true)
 * ```
 */
export function useTrainingGroupAttendance(
  filters: UseStatisticsFiltersReturn,
  enabled: boolean = true
): UseTrainingGroupAttendanceReturn {
  const { notify } = useToast()
  
  // Training group attendance state
  const [trainingGroupAttendance, setTrainingGroupAttendance] = useState<TrainingGroupAttendance[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  
  // Weekday attendance state
  const [weekdayAttendance, setWeekdayAttendance] = useState<WeekdayAttendance[]>([])
  const [weekdayLoading, setWeekdayLoading] = useState(false)
  
  // Long-tail view state
  const [playerCheckInLongTail, setPlayerCheckInLongTail] = useState<PlayerCheckInLongTail[]>([])
  const [longTailLoading, setLongTailLoading] = useState(false)
  
  // Attendance over time state
  const [weekdayAttendanceOverTime, setWeekdayAttendanceOverTime] = useState<WeekdayAttendanceOverTime[]>([])
  const [attendanceOverTimeLoading, setAttendanceOverTimeLoading] = useState(false)
  
  // Training day comparison state
  const [trainingDayComparison, setTrainingDayComparison] = useState<TrainingDayComparison | null>(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  
  // Error state
  const [error, setError] = useState<string | null>(null)
  
  /**
   * Clears the current error state.
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  // Load training group attendance
  const loadTrainingGroupAttendance = useCallback(async () => {
    setAttendanceLoading(true)
    setError(null)
    try {
      const attendance = await statsApi.getTrainingGroupAttendance(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setTrainingGroupAttendance(attendance)
    } catch (err: unknown) {
      logger.error('[useTrainingGroupAttendance] loadTrainingGroupAttendance failed', { error: err })
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente fremmøde',
        description: normalizedError.message
      })
    } finally {
      setAttendanceLoading(false)
    }
  }, [filters.dateRange.dateFrom, filters.dateRange.dateTo, filters.groupNames, notify])
  
  // Load weekday attendance
  const loadWeekdayAttendance = useCallback(async () => {
    setWeekdayLoading(true)
    setError(null)
    try {
      const weekdayData = await statsApi.getWeekdayAttendance(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setWeekdayAttendance(weekdayData)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente ugedagsanalyse',
        description: normalizedError.message
      })
    } finally {
      setWeekdayLoading(false)
    }
  }, [filters.dateRange.dateFrom, filters.dateRange.dateTo, filters.groupNames, notify])
  
  // Load player check-in long-tail
  const loadPlayerCheckInLongTail = useCallback(async () => {
    setLongTailLoading(true)
    setError(null)
    try {
      const longTailData = await statsApi.getPlayerCheckInLongTail(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setPlayerCheckInLongTail(longTailData)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente spillerdata',
        description: normalizedError.message
      })
    } finally {
      setLongTailLoading(false)
    }
  }, [filters.dateRange.dateFrom, filters.dateRange.dateTo, filters.groupNames, notify])
  
  // Load weekday attendance over time
  const loadWeekdayAttendanceOverTime = useCallback(async () => {
    setAttendanceOverTimeLoading(true)
    setError(null)
    try {
      const overTimeData = await statsApi.getWeekdayAttendanceOverTime(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setWeekdayAttendanceOverTime(overTimeData)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente tidsdata',
        description: normalizedError.message
      })
    } finally {
      setAttendanceOverTimeLoading(false)
    }
  }, [filters.dateRange.dateFrom, filters.dateRange.dateTo, filters.groupNames, notify])
  
  // Load training day comparison
  const loadTrainingDayComparison = useCallback(async () => {
    setComparisonLoading(true)
    setError(null)
    try {
      const comparison = await statsApi.getTrainingDayComparison(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setTrainingDayComparison(comparison)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente sammenligning',
        description: normalizedError.message
      })
    } finally {
      setComparisonLoading(false)
    }
  }, [filters.dateRange.dateFrom, filters.dateRange.dateTo, filters.groupNames, notify])
  
  // Refetch all data
  const refetch = useCallback(async () => {
    if (!enabled) return
    
    await Promise.all([
      loadTrainingGroupAttendance(),
      loadWeekdayAttendance(),
      loadPlayerCheckInLongTail(),
      loadWeekdayAttendanceOverTime(),
      loadTrainingDayComparison()
    ])
  }, [
    enabled,
    loadTrainingGroupAttendance,
    loadWeekdayAttendance,
    loadPlayerCheckInLongTail,
    loadWeekdayAttendanceOverTime,
    loadTrainingDayComparison
  ])
  
  // Load data when enabled and filters change
  useEffect(() => {
    if (enabled) {
      void loadTrainingGroupAttendance()
      void loadWeekdayAttendance()
      void loadPlayerCheckInLongTail()
      void loadWeekdayAttendanceOverTime()
      void loadTrainingDayComparison()
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
    trainingGroupAttendance,
    attendanceLoading,
    weekdayAttendance,
    weekdayLoading,
    playerCheckInLongTail,
    longTailLoading,
    weekdayAttendanceOverTime,
    attendanceOverTimeLoading,
    trainingDayComparison,
    comparisonLoading,
    error,
    clearError,
    refetch
  }
}

