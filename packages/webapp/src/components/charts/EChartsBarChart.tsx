import React, { useMemo, useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { createGradientFromHSL } from '../../lib/statistics/colorUtils'

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
    
    // Helper to resolve CSS variable colors to actual HSL values
    const resolveColor = (color: string | undefined): string => {
      if (!color) {
        if (chartColors.length > 0) {
          return chartColors[0]
        }
        return 'hsl(206, 88%, 52%)' // fallback
      }
      
      // If it's a CSS variable reference like "hsl(var(--primary))", resolve it
      if (color.includes('var(--')) {
        // Extract the CSS variable name
        const varMatch = color.match(/var\(--([^)]+)\)/)
        if (varMatch) {
          const cssVarName = `--${varMatch[1]}`
          const resolved = getCSSVariableColor(cssVarName)
          // getCSSVariableColor returns HSL format, so use it directly
          return resolved
        }
      }
      
      // If it's already a valid HSL color, return as-is
      if (color.match(/^hsl\(/)) {
        return color
      }
      
      return color
    }
    
    // Create gradient functions for each bar
    const gradientFunctions: Record<string, any> = {}
    
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
      
      // Resolve CSS variables to actual colors
      const resolvedColor = resolveColor(barColor)
      
      // Create unique gradient ID for this series
      const gradientId = `gradient-${bar.dataKey}-${index}`
      
      // Store gradient function
      gradientFunctions[gradientId] = (params: any) => {
        return createGradientFromHSL(resolvedColor)
      }
      
      return {
        name: bar.name || bar.dataKey,
        type: 'bar' as const,
        data: data.map(item => item[bar.dataKey] as number),
        itemStyle: {
          color: (params: any) => createGradientFromHSL(resolvedColor),
          borderRadius: [6, 6, 0, 0],
          shadowBlur: 8,
          shadowColor: 'rgba(0, 0, 0, 0.15)',
          shadowOffsetY: 2
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
          shadowBlur: 16,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowColor: 'rgba(0, 0, 0, 0.25)',
          borderWidth: 2,
          borderColor: resolvedColor
        },
        focus: 'series' as const
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
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(0, 0, 0, 0.08)'
          }
        },
        backgroundColor: surfaceColor,
        borderColor: borderColor,
        borderWidth: 1,
        borderRadius: 16,
        padding: [12, 16],
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        textStyle: {
          color: textColor,
          fontSize: 12,
          fontWeight: 500
        },
        animationDuration: 200,
        formatter: (params: any) => {
          if (!Array.isArray(params)) return ''
          let result = `<div style="margin-bottom: 8px; font-weight: 600; font-size: 13px; color: ${textColor};">${params[0].axisValue}</div>`
          params.forEach((param: any) => {
            result += `<div style="margin: 4px 0; display: flex; align-items: center;">
              <span style="display: inline-block; width: 12px; height: 12px; background: ${param.color}; border-radius: 3px; margin-right: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></span>
              <span style="color: ${mutedColor}; margin-right: 8px;">${param.seriesName}:</span>
              <strong style="color: ${textColor}; font-size: 13px;">${param.value}</strong>
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
            width: 1,
            opacity: 0.6
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

