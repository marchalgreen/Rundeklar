/**
 * Date range calculation utilities for statistics filtering.
 * 
 * Provides functions to calculate date ranges based on different period types
 * (last 7 days, last month, current season, custom range, etc.).
 */

export type AttendancePeriod = 'all' | 'last7days' | 'lastMonth' | 'lastSeason' | 'month' | 'custom'

export interface DateRangeParams {
  period: AttendancePeriod
  selectedMonth?: string
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
  const { period, selectedMonth, customDateFrom, customDateTo } = params
  const now = new Date()
  
  switch (period) {
    case 'last7days': {
      const dateFrom = new Date(now)
      dateFrom.setDate(dateFrom.getDate() - 7)
      return { dateFrom: dateFrom.toISOString(), dateTo: now.toISOString() }
    }
    
    case 'lastMonth': {
      const dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const dateTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      return { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() }
    }
    
    case 'lastSeason': {
      // Season runs from August to July
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
    
    case 'custom': {
      return {
        dateFrom: customDateFrom || undefined,
        dateTo: customDateTo || undefined
      }
    }
    
    case 'month': {
      if (!selectedMonth) {
        return {}
      }
      const [year, month] = selectedMonth.split('-').map(Number)
      const dateFrom = new Date(year, month - 1, 1).toISOString()
      const dateTo = new Date(year, month, 0, 23, 59, 59).toISOString()
      return { dateFrom, dateTo }
    }
    
    default:
      return {}
  }
}

/**
 * Gets the default selected month (current month).
 * 
 * @returns ISO month string (YYYY-MM)
 */
export function getDefaultSelectedMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

