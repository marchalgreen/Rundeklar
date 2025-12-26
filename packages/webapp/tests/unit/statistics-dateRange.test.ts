/**
 * Unit tests for statistics date range calculation utilities.
 * 
 * Tests date range calculation for different period types.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calculateDateRange } from '../../src/lib/statistics/dateRange'

describe('calculateDateRange', () => {
  beforeEach(() => {
    // Mock current date to January 15, 2024 for consistent tests
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('currentSeason', () => {
    it('should calculate current season range for January (previous year start)', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
      const result = calculateDateRange({ period: 'currentSeason' })
      
      expect(result.dateFrom).toBeDefined()
      expect(result.dateTo).toBeDefined()
      
      if (result.dateFrom && result.dateTo) {
        const from = new Date(result.dateFrom)
        const to = new Date(result.dateTo)
        
        // Should start August 1st of previous year (2023)
        expect(from.getFullYear()).toBe(2023)
        expect(from.getMonth()).toBe(7) // August (0-indexed)
        expect(from.getDate()).toBe(1)
        
        // Should end at current date
        expect(to.getFullYear()).toBe(2024)
        expect(to.getMonth()).toBe(0) // January
        expect(to.getDate()).toBe(15)
      }
    })

    it('should calculate current season range for August (current year start)', () => {
      vi.setSystemTime(new Date('2024-08-15T12:00:00Z'))
      const result = calculateDateRange({ period: 'currentSeason' })
      
      expect(result.dateFrom).toBeDefined()
      expect(result.dateTo).toBeDefined()
      
      if (result.dateFrom && result.dateTo) {
        const from = new Date(result.dateFrom)
        const to = new Date(result.dateTo)
        
        // Should start August 1st of current year (2024)
        expect(from.getFullYear()).toBe(2024)
        expect(from.getMonth()).toBe(7) // August (0-indexed)
        expect(from.getDate()).toBe(1)
        
        // Should end at current date
        expect(to.getFullYear()).toBe(2024)
        expect(to.getMonth()).toBe(7) // August
        expect(to.getDate()).toBe(15)
      }
    })
  })

  describe('last7days', () => {
    it('should calculate last 7 days range', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
      const result = calculateDateRange({ period: 'last7days' })
      
      expect(result.dateFrom).toBeDefined()
      expect(result.dateTo).toBeDefined()
      
      if (result.dateFrom && result.dateTo) {
        const from = new Date(result.dateFrom)
        const to = new Date(result.dateTo)
        const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
        
        expect(diffDays).toBe(7)
        expect(to.getDate()).toBe(15)
      }
    })
  })

  describe('last30days', () => {
    it('should calculate last 30 days range', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
      const result = calculateDateRange({ period: 'last30days' })
      
      expect(result.dateFrom).toBeDefined()
      expect(result.dateTo).toBeDefined()
      
      if (result.dateFrom && result.dateTo) {
        const from = new Date(result.dateFrom)
        const to = new Date(result.dateTo)
        const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
        
        expect(diffDays).toBe(30)
        expect(to.getDate()).toBe(15)
      }
    })
  })

  describe('custom', () => {
    it('should return custom date range when provided', () => {
      const result = calculateDateRange({
        period: 'custom',
        customDateFrom: '2024-01-01',
        customDateTo: '2024-01-31'
      })
      
      expect(result.dateFrom).toBe('2024-01-01')
      expect(result.dateTo).toBe('2024-01-31')
    })

    it('should return undefined dates when not provided', () => {
      const result = calculateDateRange({
        period: 'custom'
      })
      
      expect(result.dateFrom).toBeUndefined()
      expect(result.dateTo).toBeUndefined()
    })

    it('should handle partial custom dates', () => {
      const result1 = calculateDateRange({
        period: 'custom',
        customDateFrom: '2024-01-01'
      })
      
      const result2 = calculateDateRange({
        period: 'custom',
        customDateTo: '2024-01-31'
      })
      
      expect(result1.dateFrom).toBe('2024-01-01')
      expect(result1.dateTo).toBeUndefined()
      expect(result2.dateFrom).toBeUndefined()
      expect(result2.dateTo).toBe('2024-01-31')
    })
  })

  describe('allSeasons', () => {
    it('should return empty date range', () => {
      const result = calculateDateRange({ period: 'allSeasons' })
      
      expect(result.dateFrom).toBeUndefined()
      expect(result.dateTo).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should handle year boundary for last7days', () => {
      vi.setSystemTime(new Date('2024-01-02T12:00:00Z'))
      const result = calculateDateRange({ period: 'last7days' })
      
      expect(result.dateFrom).toBeDefined()
      expect(result.dateTo).toBeDefined()
      
      if (result.dateFrom && result.dateTo) {
        const from = new Date(result.dateFrom)
        const to = new Date(result.dateTo)
        
        // Should handle year rollover correctly
        expect(to.getFullYear()).toBe(2024)
        expect(to.getMonth()).toBe(0) // January
        expect(to.getDate()).toBe(2)
      }
    })

    it('should handle year boundary for last30days', () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
      const result = calculateDateRange({ period: 'last30days' })
      
      expect(result.dateFrom).toBeDefined()
      expect(result.dateTo).toBeDefined()
      
      if (result.dateFrom && result.dateTo) {
        const from = new Date(result.dateFrom)
        const to = new Date(result.dateTo)
        
        // Should handle year rollover correctly
        expect(to.getFullYear()).toBe(2024)
      }
    })
  })
})

