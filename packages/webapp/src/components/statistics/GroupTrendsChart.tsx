import React, { useMemo, memo } from 'react'
import { LineChart, type LineChartData } from '../charts'
import type { GroupAttendanceOverTime } from '@rundeklar/common'
import { deduplicateGroupAttendance, createGroupMonthKey } from '../../lib/statistics/deduplication'
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

    // Get all unique months from both periods
    const currentMonths = Array.from(new Set(uniqueData.map(d => d.month))).sort()
    const comparisonMonths = Array.from(new Set(uniqueComparisonData.map(d => d.month))).sort()
    const allMonths = Array.from(new Set([...currentMonths, ...comparisonMonths])).sort()

    // Get all unique group names
    const currentGroupNames = Array.from(new Set(uniqueData.map(d => d.groupName))).sort()
    const comparisonGroupNames = Array.from(new Set(uniqueComparisonData.map(d => d.groupName))).sort()
    const allGroupNames = Array.from(new Set([...currentGroupNames, ...comparisonGroupNames])).sort()

    // Create data points for each month with lines for each group (current and comparison)
    return allMonths.map((month): LineChartData => {
      const monthData = uniqueData.find(d => d.month === month)
      const monthName = monthData?.monthName || month

      const result: LineChartData = {
        name: monthName
      }

      // Add current period data for each group
      allGroupNames.forEach((groupName) => {
        const groupData = uniqueData.find(d => d.month === month && d.groupName === groupName)
        result[groupName] = groupData?.averageAttendance || 0
        
        // Add comparison period data with suffix
        if (hasComparison) {
          const comparisonGroupData = uniqueComparisonData.find(d => d.month === month && d.groupName === groupName)
          result[`${groupName} (sidste år)`] = comparisonGroupData?.averageAttendance || 0
        }
      })

      return result
    })
  }, [data, comparisonData, enableComparison])

  // Create lines for each group with distinct colors
  const lines = useMemo(() => {
    // Get all unique group names from both periods
    const allGroupNames = new Set<string>()
    data.forEach((item) => allGroupNames.add(item.groupName))
    if (comparisonData) {
      comparisonData.forEach((item) => allGroupNames.add(item.groupName))
    }
    const groupNames = Array.from(allGroupNames).sort()
    
    // Use design token-based color palette
    const colorPalette = getChartColorPalette()
    
    const result: Array<{ dataKey: string; name: string; color: string; strokeDasharray?: string }> = []
    
    groupNames.forEach((groupName, index) => {
      // Get color from palette (cycle through if more groups than colors)
      const baseColor = colorPalette[index % colorPalette.length]
      
      // Current period - solid line
      result.push({
        dataKey: groupName,
        name: groupName,
        color: baseColor
      })
      
      // Comparison period - dashed line with darkened color for visual distinction
      if (hasComparison) {
        result.push({
          dataKey: `${groupName} (sidste år)`,
          name: `${groupName} (sidste år)`,
          color: darkenHSLColor(baseColor),
          strokeDasharray: '5 5' // Dashed line
        })
      }
    })
    
    return result
  }, [data, comparisonData, enableComparison])

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

