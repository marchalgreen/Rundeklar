/**
 * Date range calculation utilities for statistics filtering.
 * 
 * Provides functions to calculate date ranges based on different period types
 * (last 7 days, last month, current season, custom range, etc.).
 */

export type AttendancePeriod = 'currentSeason' | 'last7days' | 'last30days' | 'custom' | 'allSeasons'

export interface DateRangeParams {
  period: AttendancePeriod
  customDateFrom?: string
  customDateTo?: string
}

export interface DateRange {
  dateFrom?: string
  dateTo?: string
}

/**
 * Calculates date range based on period selection.
 * 
 * @param params - Date range parameters
 * @returns Date range with optional dateFrom and dateTo ISO strings
 * 
 * @example
 * ```ts
 * const range = calculateDateRange({
 *   period: 'lastSeason',
 *   selectedMonth: '2024-01',
 *   customDateFrom: undefined,
 *   customDateTo: undefined
 * })
 * ```
 */
export function calculateDateRange(params: DateRangeParams): DateRange {
  const { period, customDateFrom, customDateTo } = params
  const now = new Date()
  
  switch (period) {
    case 'currentSeason': {
      // Season runs from August to July
      // "Denne sæson" = current season from August 1st to now
      const currentMonth = now.getMonth() + 1 // 1-12
      let seasonStartYear: number
      if (currentMonth >= 8) {
        // August-December: current year is start
        seasonStartYear = now.getFullYear()
      } else {
        // January-July: previous year is start
        seasonStartYear = now.getFullYear() - 1
      }
      const dateFrom = new Date(seasonStartYear, 7, 1) // August 1st
      return { dateFrom: dateFrom.toISOString(), dateTo: now.toISOString() }
    }
    
    case 'last7days': {
      const dateFrom = new Date(now)
      dateFrom.setDate(dateFrom.getDate() - 7)
      return { dateFrom: dateFrom.toISOString(), dateTo: now.toISOString() }
    }
    
    case 'last30days': {
      const dateFrom = new Date(now)
      dateFrom.setDate(dateFrom.getDate() - 30)
      return { dateFrom: dateFrom.toISOString(), dateTo: now.toISOString() }
    }
    
    case 'custom': {
      return {
        dateFrom: customDateFrom || undefined,
        dateTo: customDateTo || undefined
      }
    }
    
    case 'allSeasons': {
      // No date filter - return empty to show all data
      return {}
    }
    
    default:
      return {}
  }
}


