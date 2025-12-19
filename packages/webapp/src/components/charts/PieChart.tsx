import React from 'react'
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export interface PieChartData {
  name: string
  value: number
  color?: string
}

export interface PieChartProps {
  data: PieChartData[]
  height?: number
  showLegend?: boolean
  innerRadius?: number
  outerRadius?: number
}

/**
 * PieChart component — styled pie chart wrapper using recharts.
 * @remarks Follows design tokens and provides consistent styling.
 */
export const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 300,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 80
}) => {
  const textColor = 'hsl(var(--foreground))'
  const mutedColor = 'hsl(var(--muted))'
  const borderColor = 'hsl(var(--border))'

  // Assign colors if not provided
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || `hsl(var(--chart-${(index % 5) + 1}))`
  }))

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
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
              iconType="circle"
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}

