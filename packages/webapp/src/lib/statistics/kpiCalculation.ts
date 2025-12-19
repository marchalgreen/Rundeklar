/**
 * KPI calculation utilities for statistics.
 * 
 * Provides functions to calculate key performance indicators from attendance data.
 */

import type { TrainingGroupAttendance } from '@rundeklar/common'

export interface KPIMetrics {
  totalCheckIns: number
  totalSessions: number
  averageAttendance: number
  uniquePlayers: number
}

/**
 * Calculates KPI metrics from training group attendance data.
 * 
 * @param attendance - Array of training group attendance data
 * @returns Calculated KPI metrics
 * 
 * @example
 * ```ts
 * const kpis = calculateKPIs(trainingGroupAttendance)
 * // Returns: { totalCheckIns: 1372, totalSessions: 48, averageAttendance: 28.6, uniquePlayers: 76 }
 * ```
 */
export function calculateKPIs(attendance: TrainingGroupAttendance[]): KPIMetrics {
  if (attendance.length === 0) {
    return {
      totalCheckIns: 0,
      totalSessions: 0,
      averageAttendance: 0,
      uniquePlayers: 0
    }
  }
  
  const totalCheckIns = attendance.reduce((sum, group) => sum + group.checkInCount, 0)
  
  // Calculate unique sessions across all groups
  // Note: group.sessions is a number (count), not an array of IDs
  // Since sessions can overlap between groups, we approximate by creating a set
  // This matches the original implementation in Statistics.tsx
  const totalSessions = new Set(
    attendance.flatMap(group => Array.from({ length: group.sessions }, (_, i) => `session-${i}`))
  ).size
  
  const averageAttendance = attendance.reduce((sum, group) => sum + group.averageAttendance, 0) / attendance.length
  const uniquePlayers = attendance.reduce((sum, group) => sum + group.uniquePlayers, 0)
  
  return {
    totalCheckIns,
    totalSessions,
    averageAttendance: Math.round(averageAttendance * 10) / 10,
    uniquePlayers
  }
}

