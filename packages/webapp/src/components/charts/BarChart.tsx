import React from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export interface BarChartData {
  name: string
  [key: string]: string | number
}

export interface BarChartProps {
  data: BarChartData[]
  bars: Array<{
    dataKey: string
    name?: string
    color?: string
  }>
  xAxisLabel?: string
  yAxisLabel?: string
  height?: number
  showLegend?: boolean
  showGrid?: boolean
}

/**
 * BarChart component — styled bar chart wrapper using recharts.
 * @remarks Follows design tokens and provides consistent styling.
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  bars,
  xAxisLabel,
  yAxisLabel,
  height = 300,
  showLegend = false,
  showGrid = true
}) => {
  const textColor = 'hsl(var(--foreground))'
  const mutedColor = 'hsl(var(--muted))'
  const gridColor = 'hsl(var(--line)/.12)'
  const borderColor = 'hsl(var(--border))'

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              vertical={false}
            />
          )}
          <XAxis
            dataKey="name"
            stroke={mutedColor}
            tick={{ fill: textColor, fontSize: 12 }}
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: mutedColor, fontSize: 12 } : undefined}
          />
          <YAxis
            stroke={mutedColor}
            tick={{ fill: textColor, fontSize: 12 }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: mutedColor, fontSize: 12 } : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--surface))',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              color: textColor
            }}
            labelStyle={{ color: mutedColor, fontSize: 12 }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="rect"
            />
          )}
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name || bar.dataKey}
              fill={bar.color || `hsl(var(--chart-${(index % 5) + 1}))`}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

