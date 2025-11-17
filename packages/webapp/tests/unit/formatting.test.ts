/**
 * Unit tests for formatting utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  formatDate,
  formatDateOnly,
  formatPlayerName,
  formatPlayerCardName,
  formatNumber,
  formatCategoryLetter,
  formatDuration,
  truncateText
} from '../../src/lib/formatting'

describe('formatDate', () => {
  beforeEach(() => {
    // Mock Intl.DateTimeFormat for consistent tests
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((locale, options) => {
      return {
        format: (date: Date) => {
          const day = date.getDate()
          const month = date.toLocaleDateString(locale as string, { month: 'short' })
          const year = date.getFullYear()
          const time = options?.timeStyle ? `, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}` : ''
          return `${day}. ${month} ${year}${time}`
        }
      } as Intl.DateTimeFormat
    })
  })

  it('should format a valid date string with time', () => {
    const result = formatDate('2024-01-15T10:30:00Z')
    expect(result).toContain('2024')
    expect(result).toContain('15')
  })

  it('should format a valid date string without time when includeTime is false', () => {
    const result = formatDate('2024-01-15T10:30:00Z', false)
    expect(result).toContain('2024')
    expect(result).not.toContain(':')
  })

  it('should return "Aldrig" for null', () => {
    expect(formatDate(null)).toBe('Aldrig')
  })

  it('should return "Aldrig" for undefined', () => {
    expect(formatDate(undefined)).toBe('Aldrig')
  })

  it('should return "Ugyldig dato" for invalid date string', () => {
    expect(formatDate('invalid-date')).toBe('Ugyldig dato')
  })

  it('should return "Aldrig" for empty string', () => {
    expect(formatDate('')).toBe('Aldrig')
  })
})

describe('formatDateOnly', () => {
  it('should call formatDate with includeTime = false', () => {
    const result = formatDateOnly('2024-01-15T10:30:00Z')
    expect(result).toBe(formatDate('2024-01-15T10:30:00Z', false))
  })

  it('should return "Aldrig" for null', () => {
    expect(formatDateOnly(null)).toBe('Aldrig')
  })
})

describe('formatPlayerName', () => {
  it('should return name only when alias is not provided', () => {
    expect(formatPlayerName('John Doe')).toBe('John Doe')
  })

  it('should return name with alias in parentheses', () => {
    expect(formatPlayerName('John Doe', 'JD')).toBe('John Doe (JD)')
  })

  it('should return name only when alias is null', () => {
    expect(formatPlayerName('John Doe', null)).toBe('John Doe')
  })

  it('should return name only when alias is empty string', () => {
    expect(formatPlayerName('John Doe', '')).toBe('John Doe')
  })
})

describe('formatPlayerCardName', () => {
  it('should return alias in uppercase when alias is provided', () => {
    expect(formatPlayerCardName('John Doe', 'jd')).toBe('JD')
    expect(formatPlayerCardName('John Doe', 'nickname')).toBe('NICKNAME')
  })

  it('should return first name + rest uppercase when no alias', () => {
    expect(formatPlayerCardName('John Doe', null)).toBe('John DOE')
    expect(formatPlayerCardName('Mary Jane Watson', null)).toBe('Mary JANE WATSON')
  })

  it('should handle single name', () => {
    expect(formatPlayerCardName('John', null)).toBe('John')
  })

  it('should trim whitespace from alias', () => {
    expect(formatPlayerCardName('John Doe', '  jd  ')).toBe('JD')
  })

  it('should handle empty string alias', () => {
    expect(formatPlayerCardName('John Doe', '')).toBe('John DOE')
  })
})

describe('formatNumber', () => {
  beforeEach(() => {
    // Mock Intl.NumberFormat for consistent tests
    vi.spyOn(Intl, 'NumberFormat').mockImplementation((locale, options) => {
      return {
        format: (value: number) => {
          const formatted = value.toLocaleString(locale as string)
          if (options?.minimumFractionDigits || options?.maximumFractionDigits) {
            const decimals = options.minimumFractionDigits || options.maximumFractionDigits || 0
            const parts = formatted.split('.')
            if (parts.length === 1 && decimals > 0) {
              return `${formatted}.${'0'.repeat(decimals)}`
            }
          }
          return formatted
        }
      } as Intl.NumberFormat
    })
  })

  it('should format integer without decimals', () => {
    const result = formatNumber(1234)
    expect(result).toBeTruthy()
  })

  it('should format number with specified decimals', () => {
    const result = formatNumber(1234.567, 2)
    expect(result).toBeTruthy()
  })

  it('should return "–" for null', () => {
    expect(formatNumber(null)).toBe('–')
  })

  it('should return "–" for undefined', () => {
    expect(formatNumber(undefined)).toBe('–')
  })

  it('should handle zero', () => {
    const result = formatNumber(0)
    expect(result).toBeTruthy()
  })

  it('should handle negative numbers', () => {
    const result = formatNumber(-1234)
    expect(result).toBeTruthy()
  })
})

describe('formatCategoryLetter', () => {
  it('should return "S" for Single', () => {
    expect(formatCategoryLetter('Single')).toBe('S')
  })

  it('should return "D" for Double', () => {
    expect(formatCategoryLetter('Double')).toBe('D')
  })

  it('should return "B" for Begge', () => {
    expect(formatCategoryLetter('Begge')).toBe('B')
  })

  it('should return null for null', () => {
    expect(formatCategoryLetter(null)).toBe(null)
  })

  it('should return null for undefined', () => {
    expect(formatCategoryLetter(undefined)).toBe(null)
  })
})

describe('formatDuration', () => {
  it('should format seconds correctly', () => {
    expect(formatDuration(1000)).toBe('1 sekund')
    expect(formatDuration(3000)).toBe('3 sekunder')
  })

  it('should format minutes correctly', () => {
    expect(formatDuration(60000)).toBe('1 minut')
    expect(formatDuration(120000)).toBe('2 minutter')
  })

  it('should format hours correctly', () => {
    expect(formatDuration(3600000)).toBe('1 time')
    expect(formatDuration(7200000)).toBe('2 timer')
  })

  it('should prioritize hours over minutes', () => {
    expect(formatDuration(3660000)).toBe('1 time') // 1 hour + 1 minute
  })

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0 sekunder')
  })
})

describe('truncateText', () => {
  it('should return text unchanged if shorter than maxLength', () => {
    expect(truncateText('Short', 10)).toBe('Short')
  })

  it('should truncate text longer than maxLength', () => {
    expect(truncateText('Very long text here', 10)).toBe('Very lo...')
  })

  it('should truncate exactly at maxLength', () => {
    const text = 'A'.repeat(20)
    const result = truncateText(text, 10)
    expect(result.length).toBe(10)
    expect(result).toContain('...')
  })

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('')
  })

  it('should handle maxLength of 3', () => {
    expect(truncateText('Test', 3)).toBe('...')
  })
})

