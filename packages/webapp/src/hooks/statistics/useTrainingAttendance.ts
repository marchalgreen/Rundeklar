/**
 * Custom hook for managing training attendance data.
 * 
 * Provides data loading, state management, and KPI calculations for training attendance statistics.
 */

import { useCallback, useEffect, useState, useMemo } from 'react'
import type { TrainingGroupAttendance, WeekdayAttendance, PlayerCheckInLongTail, WeekdayAttendanceOverTime, TrainingDayComparison } from '@rundeklar/common'
import statsApi from '../../api/stats'
import api from '../../api'
import { useToast } from '../../components/ui/Toast'
import { normalizeError } from '../../lib/errors'
import { calculateKPIs, type KPIMetrics } from '../../lib/statistics/kpiCalculation'
import type { UseStatisticsFiltersReturn } from './useStatisticsFilters'

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
  
  // KPIs
  kpis: KPIMetrics
  
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
  
  // Calculate KPIs from training group attendance
  const kpis = useMemo(() => {
    return calculateKPIs(trainingGroupAttendance)
  }, [trainingGroupAttendance])
  
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
      filters.setAllGroups(groups)
    } catch (err: unknown) {
      // Silently fail - groups will just be empty
      // Don't use console.error per guardrails
    }
  }, [filters])
  
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
  }, [
    enabled,
    loadTrainingGroupAttendance,
    loadWeekdayAttendance,
    loadPlayerCheckInLongTail,
    loadWeekdayAttendanceOverTime,
    loadTrainingDayComparison
  ])
  
  // Load groups when enabled
  useEffect(() => {
    if (enabled) {
      void loadAllGroups()
    }
  }, [enabled, loadAllGroups])
  
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
    kpis,
    loadAllGroups,
    refetch
  }
}

