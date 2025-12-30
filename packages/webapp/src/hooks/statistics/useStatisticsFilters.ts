/**
 * Custom hook for managing statistics filter state.
 * 
 * Provides state management for date range filters, training group filters,
 * and related filter operations.
 */

import { useState, useMemo, useEffect } from 'react'
import type { AttendancePeriod } from '../../lib/statistics/dateRange'
import { calculateDateRange } from '../../lib/statistics/dateRange'
import { MAX_COMPARISON_PERIOD_DAYS } from '../../lib/statistics/constants'

export interface UseStatisticsFiltersReturn {
  // Period filter state
  attendancePeriod: AttendancePeriod
  setAttendancePeriod: (period: AttendancePeriod) => void
  customDateFrom: string
  setCustomDateFrom: (date: string) => void
  customDateTo: string
  setCustomDateTo: (date: string) => void
  
  // Comparison period state (automatic: same period last year)
  enableComparison: boolean
  setEnableComparison: (enable: boolean) => void
  
  // Group filter state
  selectedGroups: string[]
  setSelectedGroups: (groups: string[]) => void
  allGroups: string[]
  setAllGroups: (groups: string[]) => void
  
  // Computed values
  dateRange: { dateFrom?: string; dateTo?: string }
  comparisonDateRange: { dateFrom?: string; dateTo?: string }
  groupNames: string[] | undefined
  isComparisonDisabled: boolean
}

/**
 * Custom hook for managing statistics filters.
 * 
 * @returns Filter state and computed values
 * 
 * @example
 * ```typescript
 * const {
 *   attendancePeriod,
 *   setAttendancePeriod,
 *   selectedGroups,
 *   setSelectedGroups,
 *   dateRange,
 *   groupNames
 * } = useStatisticsFilters()
 * ```
 */
export function useStatisticsFilters(): UseStatisticsFiltersReturn {
  const [attendancePeriod, setAttendancePeriod] = useState<AttendancePeriod>('currentSeason')
  const [customDateFrom, setCustomDateFrom] = useState<string>('')
  const [customDateTo, setCustomDateTo] = useState<string>('')
  const [enableComparison, setEnableComparison] = useState<boolean>(false)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [allGroups, setAllGroups] = useState<string[]>([])
  
  // Auto-select all groups when groups are loaded (if none selected yet)
  useEffect(() => {
    if (allGroups.length > 0 && selectedGroups.length === 0) {
      setSelectedGroups([...allGroups])
    }
  }, [allGroups, selectedGroups.length])
  
  // Calculate date range based on current filter state
  const dateRange = useMemo(() => {
    return calculateDateRange({
      period: attendancePeriod,
      customDateFrom,
      customDateTo
    })
  }, [attendancePeriod, customDateFrom, customDateTo])
  
  // Calculate comparison date range - automatically same period last year
  const comparisonDateRange = useMemo(() => {
    if (!enableComparison) {
      return { dateFrom: undefined, dateTo: undefined }
    }
    
    // Get current period dates
    const currentRange = calculateDateRange({
      period: attendancePeriod,
      customDateFrom,
      customDateTo
    })
    
    if (!currentRange.dateFrom || !currentRange.dateTo) {
      return { dateFrom: undefined, dateTo: undefined }
    }
    
    // Calculate same period last year
    const currentFrom = new Date(currentRange.dateFrom)
    const currentTo = new Date(currentRange.dateTo)
    
    // Subtract one year
    const lastYearFrom = new Date(currentFrom)
    lastYearFrom.setFullYear(currentFrom.getFullYear() - 1)
    
    const lastYearTo = new Date(currentTo)
    lastYearTo.setFullYear(currentTo.getFullYear() - 1)
    
    return {
      dateFrom: lastYearFrom.toISOString().split('T')[0],
      dateTo: lastYearTo.toISOString().split('T')[0]
    }
  }, [enableComparison, attendancePeriod, customDateFrom, customDateTo])
  
  // Get group names for filtering (undefined if all groups are selected, meaning no filter)
  const groupNames = useMemo(() => {
    // If all groups are selected, return undefined to show all data (no filter)
    if (selectedGroups.length === allGroups.length && allGroups.length > 0) {
      return undefined
    }
    return selectedGroups.length > 0 ? selectedGroups : undefined
  }, [selectedGroups, allGroups])
  
  // Check if comparison should be disabled
  const isComparisonDisabled = useMemo(() => {
    // Disable if "Alle sæsoner" is selected
    if (attendancePeriod === 'allSeasons') {
      return true
    }
    
    // Disable if custom period is more than maximum allowed days
    if (attendancePeriod === 'custom' && customDateFrom && customDateTo) {
      const from = new Date(customDateFrom)
      const to = new Date(customDateTo)
      const diffTime = Math.abs(to.getTime() - from.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays > MAX_COMPARISON_PERIOD_DAYS) {
        return true
      }
    }
    
    return false
  }, [attendancePeriod, customDateFrom, customDateTo])
  
  // Auto-disable comparison if it becomes invalid
  useEffect(() => {
    if (isComparisonDisabled && enableComparison) {
      setEnableComparison(false)
    }
  }, [isComparisonDisabled, enableComparison])
  
  return {
    attendancePeriod,
    setAttendancePeriod,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    enableComparison,
    setEnableComparison,
    selectedGroups,
    setSelectedGroups,
    allGroups,
    setAllGroups,
    dateRange,
    comparisonDateRange,
    groupNames,
    isComparisonDisabled
  }
}

