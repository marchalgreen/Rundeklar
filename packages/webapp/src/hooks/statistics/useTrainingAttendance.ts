/**
 * Custom hook for managing training attendance data.
 * 
 * Composes multiple focused hooks to provide a unified interface for training attendance statistics.
 * This hook acts as a facade, delegating to specialized hooks for different concerns.
 * 
 * @remarks This hook is intentionally thin - it composes other hooks rather than
 * implementing all logic itself. This improves maintainability and testability.
 */

import { useMemo, useEffect } from 'react'
import type {
  TrainingGroupAttendance,
  WeekdayAttendance,
  PlayerCheckInLongTail,
  WeekdayAttendanceOverTime,
  TrainingDayComparison,
  MonthlyAttendanceTrend,
  GroupAttendanceOverTime,
  PeriodComparison
} from '@rundeklar/common'
import type { KPIMetricsWithDeltas } from '../../lib/statistics/kpiCalculation'
import type { UseStatisticsFiltersReturn } from './useStatisticsFilters'
import { useTrainingGroups } from './useTrainingGroups'
import { useTrainingGroupAttendance } from './useTrainingGroupAttendance'
import { useTrainingTrends } from './useTrainingTrends'
import { useTrainingComparison } from './useTrainingComparison'
import { useTrainingKPIs } from './useTrainingKPIs'

export interface UseTrainingAttendanceReturn {
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
  
  // Monthly trends
  monthlyAttendanceTrends: MonthlyAttendanceTrend[]
  monthlyTrendsLoading: boolean
  
  // Group trends over time
  groupAttendanceOverTime: GroupAttendanceOverTime[]
  groupTrendsLoading: boolean
  
  // Comparison group trends over time
  comparisonGroupAttendanceOverTime: GroupAttendanceOverTime[]
  comparisonGroupTrendsLoading: boolean
  
  // Period comparison
  periodComparison: PeriodComparison | null
  periodComparisonLoading: boolean
  
  // KPIs
  kpis: KPIMetricsWithDeltas
  kpisLoading: boolean
  
  // Error state (aggregated from all hooks)
  error: string | null
  clearError: () => void
  
  // Actions
  loadAllGroups: () => Promise<void>
  refetch: () => Promise<void>
}

/**
 * Custom hook for managing training attendance data.
 * 
 * Composes multiple focused hooks to provide comprehensive training attendance statistics.
 * This hook acts as a facade, providing a unified interface while delegating to specialized hooks.
 * 
 * @param filters - Filter state from useStatisticsFilters hook
 * @param enabled - Whether to load data (e.g., when view is active)
 * @returns Training attendance data, loading states, KPIs, error state, and actions
 * 
 * @example
 * ```typescript
 * const filters = useStatisticsFilters()
 * const { trainingGroupAttendance, kpis, attendanceLoading } = useTrainingAttendance(filters, viewMode === 'training')
 * ```
 */
export function useTrainingAttendance(
  filters: UseStatisticsFiltersReturn,
  enabled: boolean = true
): UseTrainingAttendanceReturn {
  // Compose specialized hooks
  const groups = useTrainingGroups(filters)
  const attendance = useTrainingGroupAttendance(filters, enabled)
  const trends = useTrainingTrends(filters, enabled)
  const comparison = useTrainingComparison(filters, enabled)
  const kpis = useTrainingKPIs(
    attendance.trainingGroupAttendance,
    attendance.attendanceLoading,
    filters,
    enabled
  )
  
  // Load groups when enabled (only once, not on every render)
  // This is handled here to maintain backward compatibility
  useEffect(() => {
    if (enabled && filters.allGroups.length === 0) {
      void groups.loadAllGroups()
    }
    // Only depend on enabled, not loadAllGroups to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
  
  // Aggregate error state from all hooks
  const error = useMemo(() => {
    return attendance.error || trends.error || comparison.error || kpis.error || null
  }, [attendance.error, trends.error, comparison.error, kpis.error])
  
  /**
   * Clears error state from all composed hooks.
   */
  const clearError = () => {
    attendance.clearError()
    trends.clearError()
    comparison.clearError()
    kpis.clearError()
  }
  
  /**
   * Refetches all data from all composed hooks.
   */
  const refetch = async () => {
    await Promise.all([
      attendance.refetch(),
      trends.refetch(),
      comparison.refetch()
    ])
    // KPIs will automatically recalculate when attendance data updates
  }
  
  return {
    // Training group attendance
    trainingGroupAttendance: attendance.trainingGroupAttendance,
    attendanceLoading: attendance.attendanceLoading,
    
    // Weekday attendance
    weekdayAttendance: attendance.weekdayAttendance,
    weekdayLoading: attendance.weekdayLoading,
    
    // Long-tail view
    playerCheckInLongTail: attendance.playerCheckInLongTail,
    longTailLoading: attendance.longTailLoading,
    
    // Attendance over time
    weekdayAttendanceOverTime: attendance.weekdayAttendanceOverTime,
    attendanceOverTimeLoading: attendance.attendanceOverTimeLoading,
    
    // Training day comparison
    trainingDayComparison: attendance.trainingDayComparison,
    comparisonLoading: attendance.comparisonLoading,
    
    // Monthly trends
    monthlyAttendanceTrends: trends.monthlyAttendanceTrends,
    monthlyTrendsLoading: trends.monthlyTrendsLoading,
    
    // Group trends over time
    groupAttendanceOverTime: trends.groupAttendanceOverTime,
    groupTrendsLoading: trends.groupTrendsLoading,
    
    // Comparison group trends over time
    comparisonGroupAttendanceOverTime: comparison.comparisonGroupAttendanceOverTime,
    comparisonGroupTrendsLoading: comparison.comparisonGroupTrendsLoading,
    
    // Period comparison
    periodComparison: comparison.periodComparison,
    periodComparisonLoading: comparison.periodComparisonLoading,
    
    // KPIs
    kpis: kpis.kpis,
    kpisLoading: kpis.kpisLoading,
    
    // Error state
    error,
    clearError,
    
    // Actions
    loadAllGroups: groups.loadAllGroups,
    refetch
  }
}
