/**
 * Custom hook for managing training attendance KPI calculations.
 * 
 * Handles calculation of key performance indicators (KPIs) from attendance data,
 * including deltas for period comparisons.
 */

import { useCallback, useEffect, useState, useMemo } from 'react'
import type { TrainingGroupAttendance } from '@rundeklar/common'
import { calculateKPIs, calculateKPIsWithDeltas, type KPIMetricsWithDeltas } from '../../lib/statistics/kpiCalculation'
import { useToast } from '../../components/ui/Toast'
import { normalizeError } from '../../lib/errors'
import { logger } from '../../lib/utils/logger'
import type { UseStatisticsFiltersReturn } from './useStatisticsFilters'

export interface UseTrainingKPIsReturn {
  // KPIs
  kpis: KPIMetricsWithDeltas
  kpisLoading: boolean
  
  // Error state
  error: string | null
  clearError: () => void
}

/**
 * Custom hook for managing training attendance KPI calculations.
 * 
 * Calculates KPIs from training group attendance data and computes deltas
 * for period comparisons. Handles race conditions and loading states properly.
 * 
 * @param trainingGroupAttendance - Training group attendance data
 * @param attendanceLoading - Whether attendance data is currently loading
 * @param filters - Filter state for date ranges and period information
 * @param enabled - Whether to calculate KPIs (e.g., when view is active)
 * @returns KPI data, loading state, and error state
 * 
 * @example
 * ```typescript
 * const { trainingGroupAttendance, attendanceLoading } = useTrainingGroupAttendance(filters, true)
 * const { kpis, kpisLoading } = useTrainingKPIs(trainingGroupAttendance, attendanceLoading, filters, true)
 * ```
 */
export function useTrainingKPIs(
  trainingGroupAttendance: TrainingGroupAttendance[],
  attendanceLoading: boolean,
  filters: UseStatisticsFiltersReturn,
  enabled: boolean = true
): UseTrainingKPIsReturn {
  const { notify } = useToast()
  
  // KPI state - calculated from training group attendance and statistics snapshots
  const [kpis, setKpis] = useState<KPIMetricsWithDeltas>({
    totalCheckIns: 0,
    totalSessions: 0,
    averageAttendance: 0,
    uniquePlayers: 0
  })
  const [kpisLoading, setKpisLoading] = useState(false)
  
  // Error state
  const [error, setError] = useState<string | null>(null)
  
  /**
   * Clears the current error state.
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
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
    setError(null)
    
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
          logger.error('[useTrainingKPIs] KPI calculation failed', { error: err })
          const normalizedError = normalizeError(err)
          setError(normalizedError.message)
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
  }, [
    enabled,
    trainingGroupAttendance,
    attendanceLoading,
    filters.dateRange.dateFrom,
    filters.dateRange.dateTo,
    filters.groupNames,
    filters.attendancePeriod,
    notify
  ])
  
  return {
    kpis,
    kpisLoading,
    error,
    clearError
  }
}

