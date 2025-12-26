/**
 * Unit tests for statistics color manipulation utilities.
 * 
 * Tests HSL color parsing, darkening, and gradient creation functions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  parseHSLColor,
  darkenHSLColor,
  createGradientFromHSL,
  getChartColorPalette
} from '../../src/lib/statistics/colorUtils'

describe('parseHSLColor', () => {
  it('should parse standard HSL format', () => {
    const result = parseHSLColor('hsl(206, 88%, 52%)')
    expect(result).toEqual({
      hue: 206,
      saturation: 88,
      lightness: 52
    })
  })

  it('should parse space-separated format', () => {
    const result = parseHSLColor('206 88% 52%')
    expect(result).toEqual({
      hue: 206,
      saturation: 88,
      lightness: 52
    })
  })

  it('should return null for invalid format', () => {
    const result = parseHSLColor('invalid')
    expect(result).toBeNull()
  })

  it('should return null for empty string', () => {
    const result = parseHSLColor('')
    expect(result).toBeNull()
  })

  it('should handle different hue values', () => {
    const result1 = parseHSLColor('hsl(0, 50%, 50%)')
    const result2 = parseHSLColor('hsl(360, 50%, 50%)')
    expect(result1?.hue).toBe(0)
    expect(result2?.hue).toBe(360)
  })

  it('should handle different saturation values', () => {
    const result1 = parseHSLColor('hsl(206, 0%, 50%)')
    const result2 = parseHSLColor('hsl(206, 100%, 50%)')
    expect(result1?.saturation).toBe(0)
    expect(result2?.saturation).toBe(100)
  })

  it('should handle different lightness values', () => {
    const result1 = parseHSLColor('hsl(206, 50%, 0%)')
    const result2 = parseHSLColor('hsl(206, 50%, 100%)')
    expect(result1?.lightness).toBe(0)
    expect(result2?.lightness).toBe(100)
  })
})

describe('darkenHSLColor', () => {
  it('should darken color by default offset', () => {
    const result = darkenHSLColor('hsl(206, 88%, 52%)')
    const parsed = parseHSLColor(result)
    expect(parsed?.lightness).toBe(42) // 52 - 10
    expect(parsed?.hue).toBe(206)
    expect(parsed?.saturation).toBe(88)
  })

  it('should darken color by custom offset', () => {
    const result = darkenHSLColor('hsl(206, 88%, 52%)', 20)
    const parsed = parseHSLColor(result)
    expect(parsed?.lightness).toBe(32) // 52 - 20
  })

  it('should not go below 0 lightness', () => {
    const result = darkenHSLColor('hsl(206, 88%, 5%)', 10)
    const parsed = parseHSLColor(result)
    expect(parsed?.lightness).toBe(0) // Clamped to 0
  })

  it('should return original color if parsing fails', () => {
    const result = darkenHSLColor('invalid')
    expect(result).toBe('invalid')
  })

  it('should preserve hue and saturation', () => {
    const result = darkenHSLColor('hsl(206, 88%, 52%)')
    const parsed = parseHSLColor(result)
    expect(parsed?.hue).toBe(206)
    expect(parsed?.saturation).toBe(88)
  })
})

describe('createGradientFromHSL', () => {
  it('should create gradient object from HSL color', () => {
    const result = createGradientFromHSL('hsl(206, 88%, 52%)')
    expect(result).toHaveProperty('type', 'linear')
    expect(result).toHaveProperty('x', 0)
    expect(result).toHaveProperty('y', 0)
    expect(result).toHaveProperty('x2', 0)
    expect(result).toHaveProperty('y2', 1)
    expect(result).toHaveProperty('colorStops')
    expect(result).toHaveProperty('global', false)
  })

  it('should create gradient with two color stops', () => {
    const result = createGradientFromHSL('hsl(206, 88%, 52%)')
    if (typeof result === 'object' && 'colorStops' in result) {
      expect(result.colorStops).toHaveLength(2)
      expect(result.colorStops[0]).toHaveProperty('offset', 0)
      expect(result.colorStops[1]).toHaveProperty('offset', 1)
    }
  })

  it('should create lighter color for first stop', () => {
    const result = createGradientFromHSL('hsl(206, 88%, 52%)')
    if (typeof result === 'object' && 'colorStops' in result) {
      const lightColor = parseHSLColor(result.colorStops[0].color)
      expect(lightColor?.lightness).toBeGreaterThan(52)
    }
  })

  it('should create darker color for second stop', () => {
    const result = createGradientFromHSL('hsl(206, 88%, 52%)')
    if (typeof result === 'object' && 'colorStops' in result) {
      const darkColor = parseHSLColor(result.colorStops[1].color)
      expect(darkColor?.lightness).toBeLessThan(52)
    }
  })

  it('should return original color if parsing fails', () => {
    const result = createGradientFromHSL('invalid')
    expect(result).toBe('invalid')
  })

  it('should handle edge case lightness values', () => {
    const result1 = createGradientFromHSL('hsl(206, 88%, 0%)')
    const result2 = createGradientFromHSL('hsl(206, 88%, 100%)')
    expect(result1).not.toBe('hsl(206, 88%, 0%)')
    expect(result2).not.toBe('hsl(206, 88%, 100%)')
  })

  it('should preserve hue in gradient', () => {
    const result = createGradientFromHSL('hsl(206, 88%, 52%)')
    if (typeof result === 'object' && 'colorStops' in result) {
      const lightColor = parseHSLColor(result.colorStops[0].color)
      const darkColor = parseHSLColor(result.colorStops[1].color)
      expect(lightColor?.hue).toBe(206)
      expect(darkColor?.hue).toBe(206)
    }
  })
})

describe('getChartColorPalette', () => {
  it('should return array of color strings', () => {
    const palette = getChartColorPalette()
    expect(Array.isArray(palette)).toBe(true)
    expect(palette.length).toBeGreaterThan(0)
  })

  it('should return colors in HSL format', () => {
    const palette = getChartColorPalette()
    palette.forEach(color => {
      expect(color).toMatch(/hsl\(var\(--/)
    })
  })

  it('should return consistent palette', () => {
    const palette1 = getChartColorPalette()
    const palette2 = getChartColorPalette()
    expect(palette1).toEqual(palette2)
  })

  it('should return at least 5 colors', () => {
    const palette = getChartColorPalette()
    expect(palette.length).toBeGreaterThanOrEqual(5)
  })
})

