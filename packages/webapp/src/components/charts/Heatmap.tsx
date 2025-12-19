import React from 'react'

export interface HeatmapData {
  weekday: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  weekdayName: string
  value: number
}

export interface HeatmapProps {
  data: HeatmapData[]
  height?: number
  colorScale?: (value: number, maxValue: number) => string
  showLabels?: boolean
}

/**
 * Heatmap component — visualizes weekday data as a heatmap.
 * @remarks Uses color intensity to represent values.
 */
export const Heatmap: React.FC<HeatmapProps> = ({
  data,
  height = 200,
  colorScale,
  showLabels = true
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  
  const defaultColorScale = (value: number, max: number): string => {
    const intensity = max > 0 ? value / max : 0
    // Generate color from primary with varying opacity
    if (intensity === 0) return 'hsl(var(--surface-2))'
    if (intensity < 0.25) return 'hsl(var(--primary)/.2)'
    if (intensity < 0.5) return 'hsl(var(--primary)/.4)'
    if (intensity < 0.75) return 'hsl(var(--primary)/.6)'
    return 'hsl(var(--primary)/.8)'
  }
  
  const getColor = colorScale || defaultColorScale
  
  // Sort data by weekday (Monday = 1 first, Sunday = 0 last)
  const sortedData = [...data].sort((a, b) => {
    const aWeekday = a.weekday === 0 ? 7 : a.weekday
    const bWeekday = b.weekday === 0 ? 7 : b.weekday
    return aWeekday - bWeekday
  })

  return (
    <div className="w-full" style={{ height }}>
      <div className="grid grid-cols-7 gap-2 h-full">
        {sortedData.map((item) => {
          const color = getColor(item.value, maxValue)
          return (
            <div
              key={item.weekday}
              className="flex flex-col items-center justify-center rounded-lg transition-all hover:scale-105"
              style={{
                backgroundColor: color,
                minHeight: '60px'
              }}
              title={`${item.weekdayName}: ${item.value}`}
            >
              {showLabels && (
                <>
                  <span className="text-xs font-medium text-[hsl(var(--foreground))] opacity-80">
                    {item.weekdayName.substring(0, 2)}
                  </span>
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {item.value}
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>
      {maxValue > 0 && (
        <div className="flex items-center justify-between mt-2 text-xs text-[hsl(var(--muted))]">
          <span>Lav</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: getColor(0, maxValue) }} />
            <div className="w-3 h-3 rounded" style={{ backgroundColor: getColor(maxValue * 0.25, maxValue) }} />
            <div className="w-3 h-3 rounded" style={{ backgroundColor: getColor(maxValue * 0.5, maxValue) }} />
            <div className="w-3 h-3 rounded" style={{ backgroundColor: getColor(maxValue * 0.75, maxValue) }} />
            <div className="w-3 h-3 rounded" style={{ backgroundColor: getColor(maxValue, maxValue) }} />
          </div>
          <span>Høj</span>
        </div>
      )}
    </div>
  )
}

