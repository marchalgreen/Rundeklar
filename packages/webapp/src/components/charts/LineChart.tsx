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
  const mutedColor = 'hsl(var(--foreground)/0.6)'
  const gridColor = 'hsl(var(--line)/0.16)'
  const borderColor = 'hsl(var(--border))'
  const surfaceColor = 'hsl(var(--surface))'

  return (
    <div style={{ width: '100%', height }} className="motion-safe:transition-all motion-safe:duration-200">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
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
            axisLine={false}
            tickLine={false}
            tick={{ fill: mutedColor, fontSize: 11 }}
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: mutedColor, fontSize: 11 } : undefined}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: mutedColor, fontSize: 11 }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: mutedColor, fontSize: 11 } : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: surfaceColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              color: textColor,
              boxShadow: '0 4px 12px hsl(var(--accent-blue)/0.12)'
            }}
            labelStyle={{ color: mutedColor, fontSize: 11 }}
            itemStyle={{ fontSize: 12 }}
            animationDuration={200}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '12px' }}
              iconType="line"
              iconSize={12}
              formatter={(value) => <span style={{ fontSize: 11, color: mutedColor }}>{value}</span>}
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
              activeDot={{ r: 6, strokeWidth: 2 }}
              connectNulls={false}
              animationDuration={1200}
              animationBegin={index * 50}
              isAnimationActive={true}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

