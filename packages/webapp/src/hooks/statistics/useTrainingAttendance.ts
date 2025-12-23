/**
 * Custom hook for managing training attendance data.
 * 
 * Provides data loading, state management, and KPI calculations for training attendance statistics.
 */

import { useCallback, useEffect, useState, useMemo } from 'react'
import type { TrainingGroupAttendance, WeekdayAttendance, PlayerCheckInLongTail, WeekdayAttendanceOverTime, TrainingDayComparison, MonthlyAttendanceTrend, GroupAttendanceOverTime, PeriodComparison } from '@rundeklar/common'
import statsApi from '../../api/stats'
import api from '../../api'
import { useToast } from '../../components/ui/Toast'
import { normalizeError } from '../../lib/errors'
import { calculateKPIs, calculateKPIsWithDeltas, type KPIMetrics, type KPIMetricsWithDeltas } from '../../lib/statistics/kpiCalculation'
import type { UseStatisticsFiltersReturn } from './useStatisticsFilters'
import { logger } from '../../lib/utils/logger'

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
  
  // Actions
  loadAllGroups: () => Promise<void>
  refetch: () => Promise<void>
}

/**
 * Custom hook for managing training attendance data.
 * 
 * @param filters - Filter state from useStatisticsFilters hook
 * @param enabled - Whether to load data (e.g., when view is active)
 * @returns Training attendance data, loading states, and KPIs
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
  
  // Monthly trends state
  const [monthlyAttendanceTrends, setMonthlyAttendanceTrends] = useState<MonthlyAttendanceTrend[]>([])
  const [monthlyTrendsLoading, setMonthlyTrendsLoading] = useState(false)
  
  // Group trends over time state
  const [groupAttendanceOverTime, setGroupAttendanceOverTime] = useState<GroupAttendanceOverTime[]>([])
  const [groupTrendsLoading, setGroupTrendsLoading] = useState(false)
  
  // Comparison group trends over time state
  const [comparisonGroupAttendanceOverTime, setComparisonGroupAttendanceOverTime] = useState<GroupAttendanceOverTime[]>([])
  const [comparisonGroupTrendsLoading, setComparisonGroupTrendsLoading] = useState(false)
  
  // Period comparison state
  const [periodComparison, setPeriodComparison] = useState<PeriodComparison | null>(null)
  const [periodComparisonLoading, setPeriodComparisonLoading] = useState(false)
  
  // KPI state - calculated from training group attendance and statistics snapshots
  const [kpis, setKpis] = useState<KPIMetricsWithDeltas>({
    totalCheckIns: 0,
    totalSessions: 0,
    averageAttendance: 0,
    uniquePlayers: 0
  })
  const [kpisLoading, setKpisLoading] = useState(false)
  
  // Calculate KPIs when attendance data or filters change
  useEffect(() => {
    if (!enabled) {
      setKpis({
        totalCheckIns: 0,
        totalSessions: 0,
        averageAttendance: 0,
        uniquePlayers: 0
      })
      return
    }
    
    // Don't reset KPIs if we're currently loading - wait for data to arrive
    // This prevents race conditions where KPIs are reset to 0 while new data is being fetched
    // Only reset if we have no data AND we're not loading (meaning loading completed with no data)
    if (trainingGroupAttendance.length === 0) {
      if (!attendanceLoading) {
        // Loading completed but no data - reset KPIs
        setKpis({
          totalCheckIns: 0,
          totalSessions: 0,
          averageAttendance: 0,
          uniquePlayers: 0
        })
      }
      // If loading, keep existing KPIs to avoid flickering
      return
    }
    
    let cancelled = false
    setKpisLoading(true)
    
    void (async () => {
      try {
        const calculated = await calculateKPIs(
          trainingGroupAttendance,
          filters.dateRange.dateFrom,
          filters.dateRange.dateTo
        )
        
        // Calculate deltas if we have date range
        // Pass groupNames and attendancePeriod to ensure same filtering logic is applied
        const withDeltas = await calculateKPIsWithDeltas(
          calculated,
          filters.dateRange.dateFrom,
          filters.dateRange.dateTo,
          filters.groupNames,
          filters.attendancePeriod
        )
        
        if (!cancelled) {
          setKpis(withDeltas)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          logger.error('[useTrainingAttendance] KPI calculation failed', { error: err })
          const normalizedError = normalizeError(err)
          notify({
            variant: 'danger',
            title: 'Kunne ikke beregne KPI',
            description: normalizedError.message
          })
        }
      } finally {
        if (!cancelled) {
          setKpisLoading(false)
        }
      }
    })()
    
    return () => {
      cancelled = true
    }
  }, [enabled, trainingGroupAttendance, attendanceLoading, filters.dateRange.dateFrom, filters.dateRange.dateTo, filters.groupNames, filters.attendancePeriod, notify])
  
  // Load all training groups
  const loadAllGroups = useCallback(async () => {
    try {
      const allPlayers = await api.players.list()
      const groupsSet = new Set<string>()
      allPlayers.forEach((player) => {
        const playerGroups = player.trainingGroups || []
        playerGroups.forEach((group) => {
          if (group) groupsSet.add(group)
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
    }
  }, [filters.allGroups, filters.setAllGroups])
  
  // Load training group attendance
  const loadTrainingGroupAttendance = useCallback(async () => {
    setAttendanceLoading(true)
    try {
      const attendance = await statsApi.getTrainingGroupAttendance(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setTrainingGroupAttendance(attendance)
    } catch (err: unknown) {
      logger.error('[useTrainingAttendance] loadTrainingGroupAttendance failed', { error: err })
      const normalizedError = normalizeError(err)
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
    try {
      const weekdayData = await statsApi.getWeekdayAttendance(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setWeekdayAttendance(weekdayData)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
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
    try {
      const longTailData = await statsApi.getPlayerCheckInLongTail(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setPlayerCheckInLongTail(longTailData)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
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
    try {
      const overTimeData = await statsApi.getWeekdayAttendanceOverTime(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setWeekdayAttendanceOverTime(overTimeData)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
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
    try {
      const comparison = await statsApi.getTrainingDayComparison(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setTrainingDayComparison(comparison)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente sammenligning',
        description: normalizedError.message
      })
    } finally {
      setComparisonLoading(false)
    }
  }, [filters.dateRange.dateFrom, filters.dateRange.dateTo, filters.groupNames, notify])

  // Load monthly attendance trends
  const loadMonthlyAttendanceTrends = useCallback(async () => {
    setMonthlyTrendsLoading(true)
    try {
      const trends = await statsApi.getMonthlyAttendanceTrends(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setMonthlyAttendanceTrends(trends)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
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
    try {
      const trends = await statsApi.getGroupAttendanceOverTime(
        filters.dateRange.dateFrom,
        filters.dateRange.dateTo,
        filters.groupNames
      )
      setGroupAttendanceOverTime(trends)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente gruppetrends',
        description: normalizedError.message
      })
    } finally {
      setGroupTrendsLoading(false)
    }
  }, [filters.dateRange.dateFrom, filters.dateRange.dateTo, filters.groupNames, notify])
  
  // Load comparison group attendance over time (if comparison is enabled)
  const loadComparisonGroupAttendanceOverTime = useCallback(async () => {
    if (!filters.comparisonDateRange.dateFrom || !filters.comparisonDateRange.dateTo) {
      setComparisonGroupAttendanceOverTime([])
      return
    }
    
    setComparisonGroupTrendsLoading(true)
    try {
      const comparisonTrends = await statsApi.getGroupAttendanceOverTime(
        filters.comparisonDateRange.dateFrom,
        filters.comparisonDateRange.dateTo,
        filters.groupNames
      )
      setComparisonGroupAttendanceOverTime(comparisonTrends)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
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
      loadTrainingGroupAttendance(),
      loadWeekdayAttendance(),
      loadPlayerCheckInLongTail(),
      loadWeekdayAttendanceOverTime(),
      loadTrainingDayComparison(),
      loadMonthlyAttendanceTrends(),
      loadGroupAttendanceOverTime(),
      loadComparisonGroupAttendanceOverTime(),
      loadPeriodComparison()
    ])
  }, [
    enabled,
    loadTrainingGroupAttendance,
    loadWeekdayAttendance,
    loadPlayerCheckInLongTail,
    loadWeekdayAttendanceOverTime,
    loadTrainingDayComparison,
    loadMonthlyAttendanceTrends,
    loadGroupAttendanceOverTime,
    loadComparisonGroupAttendanceOverTime,
    loadPeriodComparison
  ])
  
  // Load data when enabled and filters change
  // Use filter values directly instead of callbacks to prevent infinite loops
  useEffect(() => {
    if (enabled) {
      void loadTrainingGroupAttendance()
      void loadWeekdayAttendance()
      void loadPlayerCheckInLongTail()
      void loadWeekdayAttendanceOverTime()
      void loadTrainingDayComparison()
      void loadMonthlyAttendanceTrends()
      void loadGroupAttendanceOverTime()
      void loadComparisonGroupAttendanceOverTime()
      void loadPeriodComparison()
    }
    // Only depend on filter values, not callbacks - callbacks are stable and don't need to trigger re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    filters.dateRange.dateFrom,
    filters.dateRange.dateTo,
    filters.groupNames,
    filters.comparisonDateRange.dateFrom,
    filters.comparisonDateRange.dateTo,
    filters.enableComparison
  ])
  
  // Load groups when enabled (only once, not on every render)
  useEffect(() => {
    if (enabled && filters.allGroups.length === 0) {
      void loadAllGroups()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]) // Only depend on enabled, not loadAllGroups to avoid infinite loops
  
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
    monthlyAttendanceTrends,
    monthlyTrendsLoading,
    groupAttendanceOverTime,
    groupTrendsLoading,
    comparisonGroupAttendanceOverTime,
    comparisonGroupTrendsLoading,
    periodComparison,
    periodComparisonLoading,
    kpis,
    kpisLoading,
    loadAllGroups,
    refetch
  }
}

