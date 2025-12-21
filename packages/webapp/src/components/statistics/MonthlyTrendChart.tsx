import React from 'react'
import { LineChart } from '../charts'
import type { MonthlyAttendanceTrend } from '@rundeklar/common'

interface MonthlyTrendChartProps {
  data: MonthlyAttendanceTrend[]
  loading?: boolean
  height?: number
}

/**
 * MonthlyTrendChart component — displays monthly attendance trends as a line chart.
 * 
 * Shows how attendance develops over months, providing insights into seasonal patterns
 * and long-term trends.
 * 
 * @remarks Follows design tokens and provides consistent styling. Mobile-first responsive design.
 */
export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  data,
  loading = false,
  height = 300
}) => {
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

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8" style={{ height }}>
        <p className="text-sm text-[hsl(var(--foreground)/0.6)]">Ingen månedlige data tilgængelig</p>
      </div>
    )
  }

  // Transform data for LineChart component
  const chartData = data.map((trend) => ({
    name: trend.monthName,
    'Gennemsnitligt fremmøde': trend.averageAttendance,
    'Indtjekninger': trend.checkInCount,
    'Unikke spillere': trend.uniquePlayers
  }))

  return (
    <LineChart
      data={chartData}
      lines={[
        {
          dataKey: 'Gennemsnitligt fremmøde',
          name: 'Gennemsnitligt fremmøde',
          color: 'hsl(var(--primary))'
        }
      ]}
      xAxisLabel="Måned"
      yAxisLabel="Gennemsnitligt antal spillere"
      height={height}
      showLegend={false}
      showGrid={true}
    />
  )
}


