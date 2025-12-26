/**
 * Unit tests for statistics deduplication utilities.
 * 
 * Tests deduplication logic for group attendance over time data.
 */

import { describe, it, expect } from 'vitest'
import {
  createGroupMonthKey,
  deduplicateGroupAttendance
} from '../../src/lib/statistics/deduplication'

// Define type locally to avoid module resolution issues in tests
interface GroupAttendanceOverTime {
  groupName: string
  month: string
  year: number
  monthName: string
  averageAttendance: number
  checkInCount: number
  uniquePlayers: number
  sessions: number
}

describe('createGroupMonthKey', () => {
  it('should create key from group name and month', () => {
    const key = createGroupMonthKey('U15', '2024-01')
    expect(key).toBe('U15_2024-01')
  })

  it('should handle different group names', () => {
    const key1 = createGroupMonthKey('U17', '2024-01')
    const key2 = createGroupMonthKey('U15', '2024-01')
    expect(key1).toBe('U17_2024-01')
    expect(key2).toBe('U15_2024-01')
    expect(key1).not.toBe(key2)
  })

  it('should handle different months', () => {
    const key1 = createGroupMonthKey('U15', '2024-01')
    const key2 = createGroupMonthKey('U15', '2024-02')
    expect(key1).toBe('U15_2024-01')
    expect(key2).toBe('U15_2024-02')
    expect(key1).not.toBe(key2)
  })
})

describe('deduplicateGroupAttendance', () => {
  it('should return empty array for empty input', () => {
    const result = deduplicateGroupAttendance([])
    expect(result).toEqual([])
  })

  it('should return single item unchanged', () => {
    const data: GroupAttendanceOverTime[] = [
      {
        groupName: 'U15',
        month: '2024-01',
        year: 2024,
        monthName: 'Januar 2024',
        averageAttendance: 10.5,
        checkInCount: 50,
        uniquePlayers: 15,
        sessions: 5
      }
    ]
    const result = deduplicateGroupAttendance(data)
    expect(result).toEqual(data)
  })

  it('should remove duplicate group-month combinations', () => {
    const data: GroupAttendanceOverTime[] = [
      {
        groupName: 'U15',
        month: '2024-01',
        year: 2024,
        monthName: 'Januar 2024',
        averageAttendance: 10.5,
        checkInCount: 50,
        uniquePlayers: 15,
        sessions: 5
      },
      {
        groupName: 'U15',
        month: '2024-01',
        year: 2024,
        monthName: 'Januar 2024',
        averageAttendance: 12.0,
        checkInCount: 60,
        uniquePlayers: 18,
        sessions: 5
      },
      {
        groupName: 'U17',
        month: '2024-01',
        year: 2024,
        monthName: 'Januar 2024',
        averageAttendance: 8.0,
        checkInCount: 40,
        uniquePlayers: 12,
        sessions: 5
      }
    ]
    const result = deduplicateGroupAttendance(data)
    expect(result).toHaveLength(2)
    expect(result[0].groupName).toBe('U15')
    expect(result[0].month).toBe('2024-01')
    expect(result[1].groupName).toBe('U17')
    expect(result[1].month).toBe('2024-01')
  })

  it('should keep first occurrence of duplicates', () => {
    const data: GroupAttendanceOverTime[] = [
      {
        groupName: 'U15',
        month: '2024-01',
        year: 2024,
        monthName: 'Januar 2024',
        averageAttendance: 10.5,
        checkInCount: 50,
        uniquePlayers: 15,
        sessions: 5
      },
      {
        groupName: 'U15',
        month: '2024-01',
        year: 2024,
        monthName: 'Januar 2024',
        averageAttendance: 12.0,
        checkInCount: 60,
        uniquePlayers: 18,
        sessions: 5
      }
    ]
    const result = deduplicateGroupAttendance(data)
    expect(result).toHaveLength(1)
    expect(result[0].averageAttendance).toBe(10.5)
    expect(result[0].checkInCount).toBe(50)
  })

  it('should handle multiple groups and months', () => {
    const data: GroupAttendanceOverTime[] = [
      {
        groupName: 'U15',
        month: '2024-01',
        year: 2024,
        monthName: 'Januar 2024',
        averageAttendance: 10.5,
        checkInCount: 50,
        uniquePlayers: 15,
        sessions: 5
      },
      {
        groupName: 'U15',
        month: '2024-02',
        year: 2024,
        monthName: 'Februar 2024',
        averageAttendance: 11.0,
        checkInCount: 55,
        uniquePlayers: 16,
        sessions: 5
      },
      {
        groupName: 'U17',
        month: '2024-01',
        year: 2024,
        monthName: 'Januar 2024',
        averageAttendance: 8.0,
        checkInCount: 40,
        uniquePlayers: 12,
        sessions: 5
      },
      {
        groupName: 'U17',
        month: '2024-02',
        year: 2024,
        monthName: 'Februar 2024',
        averageAttendance: 9.0,
        checkInCount: 45,
        uniquePlayers: 13,
        sessions: 5
      }
    ]
    const result = deduplicateGroupAttendance(data)
    expect(result).toHaveLength(4)
  })

  it('should handle no duplicates correctly', () => {
    const data: GroupAttendanceOverTime[] = [
      {
        groupName: 'U15',
        month: '2024-01',
        year: 2024,
        monthName: 'Januar 2024',
        averageAttendance: 10.5,
        checkInCount: 50,
        uniquePlayers: 15,
        sessions: 5
      },
      {
        groupName: 'U15',
        month: '2024-02',
        year: 2024,
        monthName: 'Februar 2024',
        averageAttendance: 11.0,
        checkInCount: 55,
        uniquePlayers: 16,
        sessions: 5
      }
    ]
    const result = deduplicateGroupAttendance(data)
    expect(result).toHaveLength(2)
    expect(result).toEqual(data)
  })
})

