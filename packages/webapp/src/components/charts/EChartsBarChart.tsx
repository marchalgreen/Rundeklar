import React, { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'

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
  showGrid = true
}) => {
  const textColor = 'hsl(var(--foreground))'
  const mutedColor = 'hsl(var(--muted))'
  const gridColor = 'hsl(var(--line)/.12)'
  const surfaceColor = 'hsl(var(--surface))'
  const borderColor = 'hsl(var(--border))'

  const option: EChartsOption = useMemo(() => {
    const series = bars.map((bar, index) => ({
      name: bar.name || bar.dataKey,
      type: 'bar' as const,
      data: data.map(item => item[bar.dataKey] as number),
      itemStyle: {
        color: bar.color || `hsl(var(--chart-${(index % 5) + 1}))`,
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      }
    }))

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: surfaceColor,
        borderColor: borderColor,
        borderWidth: 1,
        textStyle: {
          color: textColor,
          fontSize: 12
        },
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
          color: textColor,
          fontSize: 12
        },
        itemGap: 20
      } : {
        show: false
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: showLegend ? '15%' : '5%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.name),
        axisLabel: {
          color: textColor,
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: mutedColor
          }
        },
        name: xAxisLabel,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: mutedColor,
          fontSize: 12
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: textColor,
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: mutedColor
          }
        },
        splitLine: showGrid ? {
          lineStyle: {
            color: gridColor,
            type: 'dashed'
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
  }, [data, bars, xAxisLabel, yAxisLabel, showLegend, showGrid, textColor, mutedColor, gridColor, surfaceColor, borderColor])

  return (
    <div style={{ width: '100%', height }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  )
}

