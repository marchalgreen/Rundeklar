import React, { useMemo, memo } from 'react'
import { LineChart, type LineChartData } from '../charts'
import type { GroupAttendanceOverTime } from '@rundeklar/common'
import { deduplicateGroupAttendance } from '../../lib/statistics/deduplication'
import { darkenHSLColor, getChartColorPalette } from '../../lib/statistics/colorUtils'

interface GroupTrendsChartProps {
  data: GroupAttendanceOverTime[]
  comparisonData?: GroupAttendanceOverTime[]
  enableComparison?: boolean
  loading?: boolean
  height?: number
}

/**
 * GroupTrendsChart component — displays group attendance trends over time as a multi-line chart.
 * 
 * Shows how each training group's attendance develops over months as separate lines,
 * allowing easy comparison of group performance trends over time.
 * 
 * @remarks Follows design tokens and provides consistent styling. Mobile-first responsive design.
 */
export const GroupTrendsChart: React.FC<GroupTrendsChartProps> = memo(({
  data,
  comparisonData,
  enableComparison = false,
  loading = false,
  height = 300
}) => {
  const hasComparison = enableComparison && comparisonData && comparisonData.length > 0
  
  // Transform data for multi-line chart
  const chartData = useMemo((): LineChartData[] => {
    if (data.length === 0 && !hasComparison) return []

    // Deduplicate current period data using utility function
    const uniqueData = deduplicateGroupAttendance(data)

    // Deduplicate comparison data using utility function
    const uniqueComparisonData = comparisonData
      ? deduplicateGroupAttendance(comparisonData)
      : []

    // Get all unique months from both periods (union) - show comparison even if current period doesn't have data for that month
    const currentMonths = Array.from(new Set(uniqueData.map(d => d.month))).sort()
    const comparisonMonths = Array.from(new Set(uniqueComparisonData.map(d => d.month))).sort()
    const allMonths = Array.from(new Set([...currentMonths, ...comparisonMonths])).sort()

    // Get all unique group names from both periods
    const currentGroupNames = Array.from(new Set(uniqueData.map(d => d.groupName))).sort()
    const comparisonGroupNames = Array.from(new Set(uniqueComparisonData.map(d => d.groupName))).sort()
    const allGroupNames = Array.from(new Set([...currentGroupNames, ...comparisonGroupNames])).sort()

    // Create data points for all months (union of both periods)
    return allMonths.map((month): LineChartData => {
      const monthData = uniqueData.find(d => d.month === month)
      const monthName = monthData?.monthName || month

      const result: LineChartData = {
        name: monthName
      }

      // Add current period data for each group (only if > 0)
      allGroupNames.forEach((groupName) => {
        const groupData = uniqueData.find(d => d.month === month && d.groupName === groupName)
        const attendance = groupData?.averageAttendance || 0
        // Only add if > 0 to avoid cluttering chart with zero values
        if (attendance > 0) {
          result[groupName] = attendance
        }
        
        // Add comparison period data only if it exists and > 0
        if (hasComparison) {
          const comparisonGroupData = uniqueComparisonData.find(d => d.month === month && d.groupName === groupName)
          const comparisonAttendance = comparisonGroupData?.averageAttendance || 0
          // Only add comparison data if > 0
          if (comparisonAttendance > 0) {
            result[`${groupName} (sidste år)`] = comparisonAttendance
          }
        }
      })

      return result
    })
  }, [data, hasComparison])

  // Create lines for each group with distinct colors
  // Only include lines that have at least one non-zero data point
  const lines = useMemo(() => {
    // Get all unique group names from current period only
    const currentGroupNames = Array.from(new Set(data.map(item => item.groupName))).sort()
    
    // Use design token-based color palette
    const colorPalette = getChartColorPalette()
    
    const result: Array<{ dataKey: string; name: string; color: string; strokeDasharray?: string }> = []
    
    currentGroupNames.forEach((groupName, index) => {
      // Check if this group has any non-zero data points in chartData
      const hasData = chartData.some((monthData) => {
        const value = monthData[groupName]
        return value !== undefined && value !== null && typeof value === 'number' && value > 0
      })
      
      // Only add line if it has data
      if (hasData) {
        // Get color from palette (cycle through if more groups than colors)
        const baseColor = colorPalette[index % colorPalette.length]
        
        // Current period - solid line
        result.push({
          dataKey: groupName,
          name: groupName,
          color: baseColor
        })
      }
      
        // Check if comparison group has any non-zero data points
        if (hasComparison) {
          const comparisonKey = `${groupName} (sidste år)`
          const hasComparisonData = chartData.some((monthData) => {
            const value = monthData[comparisonKey]
            return value !== undefined && value !== null && typeof value === 'number' && value > 0
          })
        
        // Only add comparison line if it has data
        if (hasComparisonData) {
          const baseColor = colorPalette[index % colorPalette.length]
          result.push({
            dataKey: comparisonKey,
            name: comparisonKey,
            color: darkenHSLColor(baseColor),
            strokeDasharray: '5 5' // Dashed line
          })
        }
      }
    })
    
    return result
  }, [data, chartData, hasComparison])

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="space-y-2 w-full px-4">
          <div className="h-3 w-32 bg-[hsl(var(--surface-2))] rounded animate-pulse mx-auto" />
          <div className="h-40 bg-[hsl(var(--surface-2))] rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (data.length === 0 || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center py-8" style={{ height }}>
        <p className="text-sm text-[hsl(var(--foreground)/0.6)]">Ingen gruppetrends data tilgængelig</p>
      </div>
    )
  }

  return (
    <LineChart
      data={chartData}
      lines={lines}
      xAxisLabel="Måned"
      yAxisLabel="Gennemsnitligt fremmøde"
      height={height}
      showLegend={true}
      showGrid={true}
    />
  )
})

GroupTrendsChart.displayName = 'GroupTrendsChart'

