import React from 'react'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export interface LineChartData {
  name: string
  [key: string]: string | number
}

export interface LineChartProps {
  data: LineChartData[]
  lines: Array<{
    dataKey: string
    name?: string
    color?: string
    strokeWidth?: number
  }>
  xAxisLabel?: string
  yAxisLabel?: string
  height?: number
  showLegend?: boolean
  showGrid?: boolean
}

/**
 * LineChart component — styled line chart wrapper using recharts.
 * @remarks Follows design tokens and provides consistent styling.
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  lines,
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
        <RechartsLineChart
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
              iconType="line"
            />
          )}
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color || `hsl(var(--chart-${(index % 5) + 1}))`}
              strokeWidth={line.strokeWidth || 2}
              dot={{ r: 4, fill: line.color || `hsl(var(--chart-${(index % 5) + 1}))` }}
              activeDot={{ r: 6 }}
              connectNulls={false} // Don't connect lines across missing data points
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

