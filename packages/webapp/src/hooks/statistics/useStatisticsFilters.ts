/**
 * Custom hook for managing statistics filter state.
 * 
 * Provides state management for date range filters, training group filters,
 * and related filter operations.
 */

import { useCallback, useState, useMemo } from 'react'
import type { AttendancePeriod } from '../../lib/statistics/dateRange'
import { calculateDateRange } from '../../lib/statistics/dateRange'

export interface UseStatisticsFiltersReturn {
  // Period filter state
  attendancePeriod: AttendancePeriod
  setAttendancePeriod: (period: AttendancePeriod) => void
  customDateFrom: string
  setCustomDateFrom: (date: string) => void
  customDateTo: string
  setCustomDateTo: (date: string) => void
  
  // Group filter state
  selectedGroups: string[]
  setSelectedGroups: (groups: string[]) => void
  allGroups: string[]
  setAllGroups: (groups: string[]) => void
  
  // Computed values
  dateRange: { dateFrom?: string; dateTo?: string }
  groupNames: string[] | undefined
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
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [allGroups, setAllGroups] = useState<string[]>([])
  
  // Calculate date range based on current filter state
  const dateRange = useMemo(() => {
    return calculateDateRange({
      period: attendancePeriod,
      customDateFrom,
      customDateTo
    })
  }, [attendancePeriod, customDateFrom, customDateTo])
  
  // Get group names for filtering (undefined if no groups selected)
  const groupNames = useMemo(() => {
    return selectedGroups.length > 0 ? selectedGroups : undefined
  }, [selectedGroups])
  
  return {
    attendancePeriod,
    setAttendancePeriod,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    selectedGroups,
    setSelectedGroups,
    allGroups,
    setAllGroups,
    dateRange,
    groupNames
  }
}

