/**
 * Deduplication utilities for statistics data.
 * 
 * Provides functions to remove duplicate entries from statistics data structures,
 * ensuring data integrity and preventing visualization issues.
 */

import type { GroupAttendanceOverTime } from '@rundeklar/common'

/**
 * Creates a unique key for a group-month combination.
 * 
 * @param groupName - Name of the training group
 * @param month - Month identifier (e.g., "2024-01")
 * @returns Unique key string
 * 
 * @example
 * ```typescript
 * const key = createGroupMonthKey("U15", "2024-01")
 * // Returns: "U15_2024-01"
 * ```
 */
export function createGroupMonthKey(groupName: string, month: string): string {
  return `${groupName}_${month}`
}

/**
 * Deduplicates group attendance over time data.
 * 
 * Removes duplicate entries based on group name and month combination,
 * keeping the first occurrence of each unique group-month pair.
 * 
 * @param data - Array of group attendance over time data
 * @returns Deduplicated array
 * 
 * @example
 * ```typescript
 * const deduplicated = deduplicateGroupAttendance([
 *   { groupName: "U15", month: "2024-01", ... },
 *   { groupName: "U15", month: "2024-01", ... }, // Duplicate
 *   { groupName: "U17", month: "2024-01", ... }
 * ])
 * // Returns array with only unique group-month combinations
 * ```
 */
export function deduplicateGroupAttendance(
  data: GroupAttendanceOverTime[]
): GroupAttendanceOverTime[] {
  const map = new Map<string, GroupAttendanceOverTime>()
  
  data.forEach((item) => {
    const key = createGroupMonthKey(item.groupName, item.month)
    if (!map.has(key)) {
      map.set(key, item)
    }
  })
  
  return Array.from(map.values())
}

