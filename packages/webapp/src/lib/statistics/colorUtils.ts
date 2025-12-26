/**
 * Color manipulation utilities for statistics visualizations.
 * 
 * Provides functions to manipulate HSL colors for chart visualizations,
 * ensuring consistent use of design tokens and proper color transformations.
 */

import {
  COMPARISON_COLOR_LIGHTNESS_OFFSET,
  GRADIENT_LIGHTNESS_OFFSET,
  MAX_GRADIENT_LIGHTNESS,
  MIN_GRADIENT_LIGHTNESS,
  GRADIENT_SATURATION_INCREASE,
  MAX_GRADIENT_SATURATION
} from './constants'

/**
 * Parses an HSL color string and extracts hue, saturation, and lightness values.
 * 
 * Supports formats:
 * - `hsl(206, 88%, 52%)` - Standard HSL format
 * - `206 88% 52%` - Space-separated format (CSS variable format)
 * 
 * @param hslColor - HSL color string
 * @returns Object with hue, saturation, and lightness, or null if parsing fails
 * 
 * @example
 * ```typescript
 * const parsed = parseHSLColor("hsl(206, 88%, 52%)")
 * // Returns: { hue: 206, saturation: 88, lightness: 52 }
 * ```
 */
export function parseHSLColor(
  hslColor: string
): { hue: number; saturation: number; lightness: number } | null {
  // Try standard HSL format: hsl(206, 88%, 52%)
  let match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  
  // Try space-separated format: 206 88% 52%
  if (!match) {
    match = hslColor.match(/(\d+)\s+(\d+)%\s+(\d+)%/)
  }
  
  if (!match) {
    return null
  }
  
  const [, h, s, l] = match
  return {
    hue: parseInt(h, 10),
    saturation: parseInt(s, 10),
    lightness: parseInt(l, 10)
  }
}

/**
 * Darkens an HSL color by reducing lightness.
 * 
 * Used to create comparison period colors that are visually distinct
 * but maintain the same hue and saturation as the base color.
 * 
 * @param hslColor - Base HSL color string
 * @param lightnessOffset - Amount to reduce lightness (default: COMPARISON_COLOR_LIGHTNESS_OFFSET)
 * @returns Darkened HSL color string, or original if parsing fails
 * 
 * @example
 * ```typescript
 * const darkened = darkenHSLColor("hsl(206, 88%, 52%)", 10)
 * // Returns: "hsl(206, 88%, 42%)"
 * ```
 */
export function darkenHSLColor(
  hslColor: string,
  lightnessOffset: number = COMPARISON_COLOR_LIGHTNESS_OFFSET
): string {
  const parsed = parseHSLColor(hslColor)
  if (!parsed) {
    return hslColor
  }
  
  const newLightness = Math.max(0, Math.min(100, parsed.lightness - lightnessOffset))
  return `hsl(${parsed.hue}, ${parsed.saturation}%, ${newLightness}%)`
}

/**
 * ECharts gradient color object type.
 * 
 * Represents a linear gradient configuration for ECharts chart libraries.
 */
export interface EChartsGradient {
  type: 'linear'
  x: number
  y: number
  x2: number
  y2: number
  colorStops: Array<{ offset: number; color: string }>
  global: boolean
}

/**
 * Creates a gradient color object for chart libraries from an HSL color.
 * 
 * Generates a linear gradient from lighter to darker variant of the base color,
 * with enhanced saturation for better visual contrast.
 * 
 * @param hslColor - Base HSL color string
 * @returns ECharts-compatible gradient object, or original color if parsing fails
 * 
 * @example
 * ```typescript
 * const gradient = createGradientFromHSL("hsl(206, 88%, 52%)")
 * // Returns: { type: 'linear', colorStops: [...], ... }
 * ```
 */
export function createGradientFromHSL(hslColor: string): EChartsGradient | string {
  const parsed = parseHSLColor(hslColor)
  if (!parsed) {
    return hslColor
  }
  
  // Create lighter variant for top of gradient
  const lightColor = `hsl(${parsed.hue}, ${parsed.saturation}%, ${Math.min(
    parsed.lightness + GRADIENT_LIGHTNESS_OFFSET,
    MAX_GRADIENT_LIGHTNESS
  )}%)`
  
  // Create darker variant with enhanced saturation for bottom of gradient
  const darkColor = `hsl(${parsed.hue}, ${Math.min(
    parsed.saturation + GRADIENT_SATURATION_INCREASE,
    MAX_GRADIENT_SATURATION
  )}%, ${Math.max(parsed.lightness - GRADIENT_LIGHTNESS_OFFSET, MIN_GRADIENT_LIGHTNESS)}%)`
  
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: lightColor },
      { offset: 1, color: darkColor }
    ],
    global: false
  }
}

/**
 * Gets chart color palette from design tokens.
 * 
 * Returns an array of HSL color strings using design token CSS variables.
 * Falls back to computed CSS values if available, otherwise uses fallback colors.
 * 
 * @returns Array of HSL color strings for chart visualizations
 * 
 * @example
 * ```typescript
 * const palette = getChartColorPalette()
 * // Returns: ["hsl(var(--primary))", "hsl(var(--success))", ...]
 * ```
 */
export function getChartColorPalette(): string[] {
  return [
    'hsl(var(--primary))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))'
  ]
}

