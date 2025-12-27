/**
 * Unit tests for statistics constants module.
 * 
 * Tests that constants are properly exported and have expected values.
 */

import { describe, it, expect } from 'vitest'
import {
  MAX_COMPARISON_PERIOD_DAYS,
  COMPARISON_COLOR_LIGHTNESS_OFFSET,
  GRADIENT_LIGHTNESS_OFFSET,
  MAX_GRADIENT_LIGHTNESS,
  MIN_GRADIENT_LIGHTNESS,
  GRADIENT_SATURATION_INCREASE,
  MAX_GRADIENT_SATURATION,
  TOP_PLAYERS_DISPLAY_LIMIT,
  MAX_PLAYER_NAME_LENGTH,
  MAX_GROUP_NAME_LENGTH
} from '../../src/lib/statistics/constants'

describe('statistics constants', () => {
  describe('MAX_COMPARISON_PERIOD_DAYS', () => {
    it('should be 365', () => {
      expect(MAX_COMPARISON_PERIOD_DAYS).toBe(365)
    })

    it('should be a positive number', () => {
      expect(MAX_COMPARISON_PERIOD_DAYS).toBeGreaterThan(0)
    })
  })

  describe('COMPARISON_COLOR_LIGHTNESS_OFFSET', () => {
    it('should be 10', () => {
      expect(COMPARISON_COLOR_LIGHTNESS_OFFSET).toBe(10)
    })

    it('should be a positive number', () => {
      expect(COMPARISON_COLOR_LIGHTNESS_OFFSET).toBeGreaterThan(0)
    })
  })

  describe('GRADIENT_LIGHTNESS_OFFSET', () => {
    it('should be 20', () => {
      expect(GRADIENT_LIGHTNESS_OFFSET).toBe(20)
    })

    it('should be a positive number', () => {
      expect(GRADIENT_LIGHTNESS_OFFSET).toBeGreaterThan(0)
    })
  })

  describe('MAX_GRADIENT_LIGHTNESS', () => {
    it('should be 95', () => {
      expect(MAX_GRADIENT_LIGHTNESS).toBe(95)
    })

    it('should be less than or equal to 100', () => {
      expect(MAX_GRADIENT_LIGHTNESS).toBeLessThanOrEqual(100)
    })

    it('should be greater than MIN_GRADIENT_LIGHTNESS', () => {
      expect(MAX_GRADIENT_LIGHTNESS).toBeGreaterThan(MIN_GRADIENT_LIGHTNESS)
    })
  })

  describe('MIN_GRADIENT_LIGHTNESS', () => {
    it('should be 5', () => {
      expect(MIN_GRADIENT_LIGHTNESS).toBe(5)
    })

    it('should be greater than or equal to 0', () => {
      expect(MIN_GRADIENT_LIGHTNESS).toBeGreaterThanOrEqual(0)
    })

    it('should be less than MAX_GRADIENT_LIGHTNESS', () => {
      expect(MIN_GRADIENT_LIGHTNESS).toBeLessThan(MAX_GRADIENT_LIGHTNESS)
    })
  })

  describe('GRADIENT_SATURATION_INCREASE', () => {
    it('should be 15', () => {
      expect(GRADIENT_SATURATION_INCREASE).toBe(15)
    })

    it('should be a positive number', () => {
      expect(GRADIENT_SATURATION_INCREASE).toBeGreaterThan(0)
    })
  })

  describe('MAX_GRADIENT_SATURATION', () => {
    it('should be 100', () => {
      expect(MAX_GRADIENT_SATURATION).toBe(100)
    })

    it('should be less than or equal to 100', () => {
      expect(MAX_GRADIENT_SATURATION).toBeLessThanOrEqual(100)
    })
  })

  describe('TOP_PLAYERS_DISPLAY_LIMIT', () => {
    it('should be 20', () => {
      expect(TOP_PLAYERS_DISPLAY_LIMIT).toBe(20)
    })

    it('should be a positive number', () => {
      expect(TOP_PLAYERS_DISPLAY_LIMIT).toBeGreaterThan(0)
    })
  })

  describe('MAX_PLAYER_NAME_LENGTH', () => {
    it('should be 15', () => {
      expect(MAX_PLAYER_NAME_LENGTH).toBe(15)
    })

    it('should be a positive number', () => {
      expect(MAX_PLAYER_NAME_LENGTH).toBeGreaterThan(0)
    })
  })

  describe('MAX_GROUP_NAME_LENGTH', () => {
    it('should be 12', () => {
      expect(MAX_GROUP_NAME_LENGTH).toBe(12)
    })

    it('should be a positive number', () => {
      expect(MAX_GROUP_NAME_LENGTH).toBeGreaterThan(0)
    })
  })
})




