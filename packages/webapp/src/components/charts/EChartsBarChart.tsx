import React, { useMemo, useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

/**
 * Gets computed CSS variable value as a color string.
 * @param cssVar - CSS variable name (e.g., '--primary')
 * @returns Computed color value or fallback
 */
const getCSSVariableColor = (cssVar: string): string => {
  if (typeof window === 'undefined') {
    // Fallback for SSR
    return '#8884d8'
  }
  
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim()
  
  if (!value) {
    return '#8884d8' // Fallback
  }
  
  // If it's already a full HSL value with hsl() wrapper, return it
  if (value.includes('hsl(') || value.includes('#')) {
    return value
  }
  
  // If it's HSL values without hsl() wrapper (e.g., "206 88% 52%"), wrap it
  if (/^\d+\s+\d+%\s+\d+%/.test(value)) {
    return `hsl(${value})`
  }
  
  return value
}

export interface EChartsBarChartData {
  name: string
  [key: string]: string | number
}

export interface EChartsBarChartProps {
  data: EChartsBarChartData[]
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
  showValueLabels?: boolean // New prop to show values on bars
}

/**
 * EChartsBarChart component — styled bar chart wrapper using Apache ECharts.
 * 
 * Provides enhanced visualizations with better tooltips, annotations, and interactions
 * compared to recharts. Uses design tokens for consistent styling.
 * 
 * @remarks Apache ECharts is Apache-2.0 licensed (free-to-use).
 */
export const EChartsBarChart: React.FC<EChartsBarChartProps> = ({
  data,
  bars,
  xAxisLabel,
  yAxisLabel,
  height = 300,
  showLegend = false,
  showGrid = true,
  showValueLabels = false
}) => {
  // Get computed colors from CSS variables
  const [chartColors, setChartColors] = useState<string[]>([])
  
  useEffect(() => {
    // Define chart color palette - using primary/accent colors
    // CSS variables return values like "206 88% 52%" which we wrap in hsl()
    const colorPalette = [
      getCSSVariableColor('--primary'),
      getCSSVariableColor('--success'),
      getCSSVariableColor('--warning'),
      getCSSVariableColor('--cat-single'),
      getCSSVariableColor('--cat-double')
    ]
    setChartColors(colorPalette)
  }, [])

  const textColor = 'hsl(var(--foreground))'
  const mutedColor = 'hsl(var(--foreground)/0.6)'
  const gridColor = 'hsl(var(--line)/0.16)'
  const surfaceColor = 'hsl(var(--surface))'
  const borderColor = 'hsl(var(--border))'

  const option: EChartsOption = useMemo(() => {
    const hasManyItems = data.length > 10
    const series = bars.map((bar, index) => {
      // Use provided color, or get from computed chart colors, or fallback
      let barColor = bar.color
      if (!barColor) {
        if (chartColors.length > 0) {
          barColor = chartColors[index % chartColors.length]
        } else {
          // Fallback palette if chartColors not loaded yet
          const fallbackColors = [
            'hsl(206, 88%, 52%)', // primary blue
            'hsl(158, 58%, 42%)', // success green
            'hsl(38, 92%, 52%)',  // warning orange
            'hsl(258, 65%, 58%)', // purple
            'hsl(195, 70%, 52%)'  // cyan
          ]
          barColor = fallbackColors[index % fallbackColors.length]
        }
      }
      
      return {
        name: bar.name || bar.dataKey,
        type: 'bar' as const,
        data: data.map(item => item[bar.dataKey] as number),
        itemStyle: {
          color: barColor,
          borderRadius: [4, 4, 0, 0]
        },
      label: showValueLabels ? {
        show: true,
        position: 'top' as const,
        color: textColor,
        fontSize: 11,
        fontWeight: 500,
        formatter: (params: any) => {
          return params.value?.toString() || '0'
        }
      } : {
        show: false
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      }
    }
    })

    return {
      animation: true,
      animationDuration: 1200,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: surfaceColor,
        borderColor: borderColor,
        borderWidth: 1,
        borderRadius: 12,
        boxShadow: '0 4px 12px hsl(var(--accent-blue)/0.12)',
        textStyle: {
          color: textColor,
          fontSize: 11
        },
        animationDuration: 200,
        formatter: (params: any) => {
          if (!Array.isArray(params)) return ''
          let result = `<div style="margin-bottom: 4px; font-weight: 600;">${params[0].axisValue}</div>`
          params.forEach((param: any) => {
            result += `<div style="margin: 2px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; background: ${param.color}; border-radius: 2px; margin-right: 6px;"></span>
              ${param.seriesName}: <strong>${param.value}</strong>
            </div>`
          })
          return result
        }
      },
      legend: showLegend ? {
        show: true,
        top: 0,
        textStyle: {
          color: mutedColor,
          fontSize: 11
        },
        itemGap: 20,
        iconSize: 12
      } : {
        show: false
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: hasManyItems ? '25%' : '10%', // More space at bottom if labels are rotated (increased to prevent overlap)
        top: showLegend ? '15%' : showValueLabels ? '10%' : '5%', // More space at top if value labels shown
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.name),
        axisLabel: {
          color: mutedColor,
          fontSize: 11,
          rotate: hasManyItems ? 45 : 0, // Rotate labels if many items to prevent overlap
          interval: 0, // Show all labels
          formatter: (value: string) => {
            // Truncate long names if needed
            return value.length > 12 ? value.substring(0, 12) + '...' : value
          }
        },
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        name: xAxisLabel,
        nameLocation: 'middle',
        nameGap: hasManyItems ? 70 : 30, // More space if labels are rotated (increased to prevent overlap)
        nameTextStyle: {
          color: mutedColor,
          fontSize: 12
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: mutedColor,
          fontSize: 11
        },
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        splitLine: showGrid ? {
          show: true,
          lineStyle: {
            color: gridColor,
            type: 'dashed',
            width: 1
          }
        } : {
          show: false
        },
        name: yAxisLabel,
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: mutedColor,
          fontSize: 12
        }
      },
      series
    }
  }, [data, bars, xAxisLabel, yAxisLabel, showLegend, showGrid, showValueLabels, textColor, mutedColor, gridColor, surfaceColor, borderColor, chartColors])

  return (
    <div style={{ width: '100%', height }} className="motion-safe:transition-all motion-safe:duration-200">
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  )
}

