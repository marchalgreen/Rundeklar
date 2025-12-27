import React from 'react'
import { LineChart as RechartsLineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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
    strokeDasharray?: string
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

  // Custom tooltip that filters out zero/null values and deduplicates entries
  const CustomTooltip = (props: any) => {
    const { active, payload, label } = props
    if (!active || !payload || payload.length === 0) {
      return null
    }

    // Filter out items with zero, null, or undefined values
    const nonZeroPayload = payload.filter((item: any) => {
      const value = item.value
      return value !== null && value !== undefined && value !== 0
    })

    if (nonZeroPayload.length === 0) {
      return null
    }

    // Deduplicate: Group by base group name (remove "(sidste år)" suffix)
    // If both current and comparison exist, prefer current period
    const seenGroups = new Set<string>()
    const filteredPayload: any[] = []
    
    // First pass: add current period entries
    nonZeroPayload.forEach((item: any) => {
      const baseName = item.name?.replace(' (sidste år)', '') || item.dataKey?.replace(' (sidste år)', '')
      if (!seenGroups.has(baseName) && !item.name?.includes('(sidste år)')) {
        seenGroups.add(baseName)
        filteredPayload.push(item)
      }
    })
    
    // Second pass: add comparison entries only if current period doesn't exist
    nonZeroPayload.forEach((item: any) => {
      const baseName = item.name?.replace(' (sidste år)', '') || item.dataKey?.replace(' (sidste år)', '')
      if (!seenGroups.has(baseName) && item.name?.includes('(sidste år)')) {
        seenGroups.add(baseName)
        filteredPayload.push(item)
      }
    })

    if (filteredPayload.length === 0) {
      return null
    }

    return (
      <div
        style={{
          backgroundColor: surfaceColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '12px',
          boxShadow: '0 4px 12px hsl(var(--accent-blue)/0.12)'
        }}
      >
        <p style={{ marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: textColor }}>
          {label}
        </p>
        {filteredPayload.map((item: any, index: number) => (
          <div key={index} style={{ margin: '4px 0', display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                backgroundColor: item.color || textColor,
                borderRadius: '3px',
                marginRight: '8px'
              }}
            />
            <span style={{ color: mutedColor, marginRight: '8px', fontSize: '12px' }}>
              {item.name}:
            </span>
            <strong style={{ color: textColor, fontSize: '13px' }}>{item.value}</strong>
          </div>
        ))}
      </div>
    )
  }

  // Only render chart if we have data and valid dimensions
  if (!data || data.length === 0 || height <= 0) {
    return (
      <div style={{ width: '100%', height, minHeight: height }} className="flex items-center justify-center">
        <p className="text-sm text-[hsl(var(--foreground)/0.6)]">Ingen data tilgængelig</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height, minHeight: height }} className="motion-safe:transition-all motion-safe:duration-200">
      <ResponsiveContainer width="100%" height="100%" minHeight={height} minWidth={0}>
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
            content={<CustomTooltip />}
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
          {lines.map((line, index) => {
            const color = line.color || `hsl(var(--chart-${(index % 5) + 1}))`
            const gradientId = `gradient-${line.dataKey}-${index}`
            return (
              <React.Fragment key={line.dataKey}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke="none"
                  fill={`url(#${gradientId})`}
                  animationDuration={1200}
                  animationBegin={index * 50}
                />
            <Line
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
                  stroke={color}
                  strokeWidth={line.strokeWidth || 3}
                  strokeDasharray={line.strokeDasharray}
                  dot={{ r: 5, fill: color, strokeWidth: 2, stroke: surfaceColor }}
                  activeDot={{ r: 8, strokeWidth: 3, stroke: surfaceColor, fill: color }}
                  connectNulls={false}
                  animationDuration={1200}
                  animationBegin={index * 50}
                  isAnimationActive={true}
                />
              </React.Fragment>
            )
          })}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

