import React, { useMemo } from 'react'
import { EChartsBarChart, type EChartsBarChartData } from '../charts/EChartsBarChart'
import type { GroupAttendanceOverTime } from '@rundeklar/common'

interface GroupTrendsChartProps {
  data: GroupAttendanceOverTime[]
  loading?: boolean
  height?: number
}

/**
 * GroupTrendsChart component — displays group attendance trends over time as a grouped bar chart.
 * 
 * Shows how each training group's attendance develops over months as grouped bars,
 * allowing easy comparison of group performance side-by-side for each month.
 * 
 * @remarks Follows design tokens and provides consistent styling. Mobile-first responsive design.
 */
export const GroupTrendsChart: React.FC<GroupTrendsChartProps> = ({
  data,
  loading = false,
  height = 300
}) => {
  // Transform data for grouped bar chart
  const chartData = useMemo((): EChartsBarChartData[] => {
    if (data.length === 0) return []

    // Get all unique months and group names
    const months = Array.from(new Set(data.map(d => d.month))).sort()
    const groupNames = Array.from(new Set(data.map(d => d.groupName))).sort()

    // Create data points for each month with bars for each group
    return months.map((month): EChartsBarChartData => {
      const monthData = data.find(d => d.month === month)
      const monthName = monthData?.monthName || month

      const result: EChartsBarChartData = {
        name: monthName
      }

      // Add data for each group as separate bars
      groupNames.forEach((groupName) => {
        const groupData = data.find(d => d.month === month && d.groupName === groupName)
        result[groupName] = groupData?.averageAttendance || 0
      })

      return result
    })
  }, [data])

  // Create bars for each group
  // Colors will be assigned automatically by EChartsBarChart from CSS variables
  const bars = useMemo(() => {
    const groupNames = Array.from(new Set(data.map(d => d.groupName))).sort()
    return groupNames.map((groupName) => ({
      dataKey: groupName,
      name: groupName
      // color is omitted - EChartsBarChart will assign colors automatically
    }))
  }, [data])

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
    <EChartsBarChart
      data={chartData}
      bars={bars}
      xAxisLabel="Måned"
      yAxisLabel="Gennemsnitligt fremmøde"
      height={height}
      showLegend={true}
      showGrid={true}
      showValueLabels={false}
    />
  )
}

