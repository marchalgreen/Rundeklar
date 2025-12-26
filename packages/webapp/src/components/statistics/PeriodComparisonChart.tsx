import React, { memo } from 'react'
import { EChartsBarChart } from '../charts/EChartsBarChart'
import type { PeriodComparison } from '@rundeklar/common'

interface PeriodComparisonChartProps {
  data: PeriodComparison
  loading?: boolean
  height?: number
}

/**
 * PeriodComparisonChart component — displays period comparison as a grouped bar chart.
 * 
 * Compares current period with a comparison period side-by-side, showing key metrics
 * like check-ins, sessions, average attendance, and unique players.
 * 
 * @remarks Follows design tokens and provides consistent styling. Mobile-first responsive design.
 */
export const PeriodComparisonChart: React.FC<PeriodComparisonChartProps> = memo(({
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

  // Transform data for grouped bar chart
  const chartData = [
    {
      name: 'Indtjekninger',
      'Nuværende periode': data.current.checkInCount,
      'Sammenligningsperiode': data.comparison.checkInCount
    },
    {
      name: 'Sessioner',
      'Nuværende periode': data.current.totalSessions,
      'Sammenligningsperiode': data.comparison.totalSessions
    },
    {
      name: 'Gennemsnit pr. session',
      'Nuværende periode': data.current.averageAttendance,
      'Sammenligningsperiode': data.comparison.averageAttendance
    },
    {
      name: 'Unikke spillere',
      'Nuværende periode': data.current.uniquePlayers,
      'Sammenligningsperiode': data.comparison.uniquePlayers
    }
  ]

  return (
    <EChartsBarChart
      data={chartData}
      bars={[
        { dataKey: 'Nuværende periode', name: 'Nuværende periode', color: 'hsl(var(--primary))' },
        { dataKey: 'Sammenligningsperiode', name: 'Sammenligningsperiode', color: 'hsl(var(--accent))' }
      ]}
      xAxisLabel="Metrik"
      yAxisLabel="Værdi"
      height={height}
      showLegend={true}
      showValueLabels={true}
    />
  )
})

PeriodComparisonChart.displayName = 'PeriodComparisonChart'
