import type {
  TrainingGroupAttendance,
  WeekdayAttendance,
  PlayerCheckInLongTail,
  WeekdayAttendanceOverTime,
  TrainingDayComparison,
  MonthlyAttendanceTrend,
  GroupAttendanceOverTime,
  PeriodComparison
} from '@rundeklar/common'
import { getStateCopy, getStatisticsSnapshots } from '../postgres'
import { logger } from '../../lib/utils/logger'

/**
 * Gets training group attendance statistics.
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Array of training group attendance data
 */
export const getTrainingGroupAttendance = async (
  dateFrom?: string,
  dateTo?: string,
  groupNames?: string[]
): Promise<TrainingGroupAttendance[]> => {
  // Don't invalidate cache here - cache should only be invalidated when data actually changes
  // This prevents unnecessary database queries on every filter change
  
  const [statistics, state] = await Promise.all([
    getStatisticsSnapshots(),
    getStateCopy()
  ])
  
  // Create player lookup Map for O(1) access instead of O(n) find()
  const playerMap = new Map<string, typeof state.players[0]>()
  state.players.forEach(player => {
    playerMap.set(player.id, player)
  })

  // Filter statistics by date range if provided
  let relevantStats = statistics
  if (dateFrom || dateTo) {
    relevantStats = statistics.filter((stat) => {
      if (dateFrom && stat.sessionDate < dateFrom) return false
      if (dateTo && stat.sessionDate > dateTo) return false
      return true
    })
  }

  // Debug: Log statistics summary
  logger.debug('[getTrainingGroupAttendance] Processing statistics', {
    totalSnapshots: statistics.length,
    relevantSnapshots: relevantStats.length,
    dateFrom,
    dateTo,
    groupNames,
    firstSnapshotSample: relevantStats.length > 0 ? {
      sessionId: relevantStats[0].sessionId,
      sessionDate: relevantStats[0].sessionDate,
      checkInsType: typeof relevantStats[0].checkIns,
      checkInsIsArray: Array.isArray(relevantStats[0].checkIns),
      checkInsLength: Array.isArray(relevantStats[0].checkIns) 
        ? relevantStats[0].checkIns.length 
        : typeof relevantStats[0].checkIns === 'string'
          ? (relevantStats[0].checkIns as string).length
          : 'unknown',
      checkInsPreview: Array.isArray(relevantStats[0].checkIns) && relevantStats[0].checkIns.length > 0
        ? JSON.stringify(relevantStats[0].checkIns[0]).substring(0, 200)
        : typeof relevantStats[0].checkIns === 'string'
          ? (relevantStats[0].checkIns as string).substring(0, 200)
          : 'empty or null'
    } : null
  })

  // Group check-ins by training group
  const groupStats = new Map<string, {
    checkInCount: number
    uniquePlayers: Set<string>
    sessions: Set<string>
  }>()

  let totalCheckInsProcessed = 0
  let checkInsWithoutPlayer = 0
  let checkInsWithoutGroups = 0
  relevantStats.forEach((stat) => {
    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []
    totalCheckInsProcessed += checkIns.length
    
    
    checkIns.forEach((checkIn) => {
      // Debug logging removed for performance - only log in development if needed
      
      // Handle both camelCase (playerId) and snake_case (player_id) formats
      // This is needed because old snapshots might have snake_case from fix scripts
      const playerId = (checkIn as any).playerId || (checkIn as any).player_id
      if (!playerId) {
        checkInsWithoutPlayer++
        return
      }
      // Use Map lookup for O(1) performance instead of O(n) find()
      const player = playerMap.get(playerId)
      if (!player) {
        checkInsWithoutPlayer++
        return
      }

      const trainingGroups = player.trainingGroups || []
      if (trainingGroups.length === 0) {
        checkInsWithoutGroups++
      }
      
      // If filtering by group names, check if player belongs to any of the selected groups
      if (groupNames && groupNames.length > 0) {
        const hasMatchingGroup = trainingGroups.some(groupName => groupNames.includes(groupName))
        if (!hasMatchingGroup) {
          return // Skip this check-in if player doesn't belong to any selected group
        }
      }
      
      trainingGroups.forEach((groupName) => {
        if (!groupName) return
        
        // Filter by group names if provided - only count groups that match the filter
        if (groupNames && groupNames.length > 0 && !groupNames.includes(groupName)) {
          return
        }

        if (!groupStats.has(groupName)) {
          groupStats.set(groupName, {
            checkInCount: 0,
            uniquePlayers: new Set(),
            sessions: new Set()
          })
        }

        const stats = groupStats.get(groupName)!
        stats.checkInCount++
        stats.uniquePlayers.add(checkIn.playerId)
        stats.sessions.add(stat.sessionId)
      })
    })
  })

  // Collect all unique session IDs across all groups for accurate total session count
  const allUniqueSessionIds = new Set<string>()
  groupStats.forEach(stats => {
    stats.sessions.forEach(sessionId => allUniqueSessionIds.add(sessionId))
  })
  
  // Store total unique sessions in a way that calculateKPIs can access it
  // We'll attach it to the result array as a non-enumerable property
  const result: TrainingGroupAttendance[] = Array.from(groupStats.entries()).map(([groupName, stats]) => {
    const uniqueSessions = stats.sessions.size
    const averageAttendance = uniqueSessions > 0 ? stats.checkInCount / uniqueSessions : 0

    return {
      groupName,
      checkInCount: stats.checkInCount,
      uniquePlayers: stats.uniquePlayers.size,
      sessions: uniqueSessions,
      averageAttendance: Math.round(averageAttendance * 10) / 10 // Round to 1 decimal
    }
  })
  
  // Attach total unique sessions as a property on the result array
  // This allows calculateKPIs to access it without re-querying
  ;(result as any).__totalUniqueSessions = allUniqueSessionIds.size

  // Debug: Log result summary
  logger.debug('[getTrainingGroupAttendance] Result summary', {
    totalCheckInsProcessed,
    checkInsWithoutPlayer,
    checkInsWithoutGroups,
    groupsFound: result.length,
    totalCheckInsInResult: result.reduce((sum, g) => sum + g.checkInCount, 0),
    totalUniqueSessions: allUniqueSessionIds.size,
    groups: result.map(g => ({ name: g.groupName, checkIns: g.checkInCount }))
  })

  // Sort by group name
  return result.sort((a, b) => a.groupName.localeCompare(b.groupName))
}

/**
 * Gets weekday attendance statistics for comparing training attendance across weekdays.
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Array of weekday attendance data
 */
export const getWeekdayAttendance = async (
  dateFrom?: string,
  dateTo?: string,
  groupNames?: string[]
): Promise<WeekdayAttendance[]> => {
  const [statistics, state] = await Promise.all([
    getStatisticsSnapshots(),
    getStateCopy()
  ])

  // Create player lookup Map for O(1) access instead of O(n) find()
  const playerMap = new Map<string, typeof state.players[0]>()
  state.players.forEach(player => {
    playerMap.set(player.id, player)
  })

  // Filter statistics by date range if provided
  let relevantStats = statistics
  if (dateFrom || dateTo) {
    relevantStats = statistics.filter((stat) => {
      if (dateFrom && stat.sessionDate < dateFrom) return false
      if (dateTo && stat.sessionDate > dateTo) return false
      return true
    })
  }

  // Danish weekday names
  const weekdayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']

  // Group check-ins by weekday
  const weekdayStats = new Map<number, {
    checkInCount: number
    uniquePlayers: Set<string>
    sessions: Set<string>
  }>()

  relevantStats.forEach((stat) => {
    // Get weekday from session date
    const sessionDate = new Date(stat.sessionDate)
    const weekday = sessionDate.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []
    
    checkIns.forEach((checkIn) => {
      // Handle both camelCase (playerId) and snake_case (player_id) formats
      const playerId = (checkIn as any).playerId || (checkIn as any).player_id
      if (!playerId) return
      
      // Use Map lookup for O(1) performance
      const player = playerMap.get(playerId)
      if (!player) return

      // Filter by training groups if provided
      if (groupNames && groupNames.length > 0) {
        const playerGroups = player.trainingGroups || []
        const hasMatchingGroup = groupNames.some(groupName => playerGroups.includes(groupName))
        if (!hasMatchingGroup) return
      }

      if (!weekdayStats.has(weekday)) {
        weekdayStats.set(weekday, {
          checkInCount: 0,
          uniquePlayers: new Set(),
          sessions: new Set()
        })
      }

      const stats = weekdayStats.get(weekday)!
      stats.checkInCount++
      stats.uniquePlayers.add(playerId)
      stats.sessions.add(stat.sessionId)
    })
  })

  // Convert to array and calculate averages
  const result: WeekdayAttendance[] = Array.from(weekdayStats.entries()).map(([weekday, stats]) => {
    const uniqueSessions = stats.sessions.size
    const averageAttendance = uniqueSessions > 0 ? stats.checkInCount / uniqueSessions : 0

    return {
      weekday,
      weekdayName: weekdayNames[weekday],
      checkInCount: stats.checkInCount,
      uniquePlayers: stats.uniquePlayers.size,
      sessions: uniqueSessions,
      averageAttendance: Math.round(averageAttendance * 10) / 10 // Round to 1 decimal
    }
  })

  // Sort by weekday (Monday = 1 first, then Tuesday = 2, etc., Sunday = 0 last)
  return result.sort((a, b) => {
    // Convert Sunday (0) to 7 for sorting purposes
    const aWeekday = a.weekday === 0 ? 7 : a.weekday
    const bWeekday = b.weekday === 0 ? 7 : b.weekday
    return aWeekday - bWeekday
  })
}

/**
 * Gets player check-in long-tail statistics (check-ins per player).
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Array of player check-in data sorted by check-in count (descending)
 */
export const getPlayerCheckInLongTail = async (
  dateFrom?: string,
  dateTo?: string,
  groupNames?: string[]
): Promise<PlayerCheckInLongTail[]> => {
  const [statistics, state] = await Promise.all([
    getStatisticsSnapshots(),
    getStateCopy()
  ])

  // Create player lookup Map for O(1) access instead of O(n) find()
  const playerMap = new Map<string, typeof state.players[0]>()
  state.players.forEach(player => {
    playerMap.set(player.id, player)
  })

  // Filter statistics by date range if provided
  let relevantStats = statistics
  if (dateFrom || dateTo) {
    relevantStats = statistics.filter((stat) => {
      if (dateFrom && stat.sessionDate < dateFrom) return false
      if (dateTo && stat.sessionDate > dateTo) return false
      return true
    })
  }

  // Count check-ins per player
  const playerCheckIns = new Map<string, number>()

  relevantStats.forEach((stat) => {
    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []
    
    checkIns.forEach((checkIn) => {
      // Handle both camelCase (playerId) and snake_case (player_id) formats
      const playerId = (checkIn as any).playerId || (checkIn as any).player_id
      if (!playerId) return
      
      // Use Map lookup for O(1) performance
      const player = playerMap.get(playerId)
      if (!player) return

      // Filter by training groups if provided
      if (groupNames && groupNames.length > 0) {
        const playerGroups = player.trainingGroups || []
        const hasMatchingGroup = groupNames.some(groupName => playerGroups.includes(groupName))
        if (!hasMatchingGroup) return
      }

      playerCheckIns.set(playerId, (playerCheckIns.get(playerId) || 0) + 1)
    })
  })

  // Convert to array
  const result: PlayerCheckInLongTail[] = Array.from(playerCheckIns.entries()).map(([playerId, checkInCount]) => {
    const player = playerMap.get(playerId)
    return {
      playerId,
      playerName: player?.name || 'Ukendt spiller',
      checkInCount
    }
  })

  // Sort by check-in count (descending)
  return result.sort((a, b) => b.checkInCount - a.checkInCount)
}

/**
 * Gets weekday attendance over time (time series data).
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Array of weekday attendance data over time
 */
export const getWeekdayAttendanceOverTime = async (
  dateFrom?: string,
  dateTo?: string,
  groupNames?: string[]
): Promise<WeekdayAttendanceOverTime[]> => {
  const [statistics, state] = await Promise.all([
    getStatisticsSnapshots(),
    getStateCopy()
  ])

  // Create player lookup Map for O(1) access instead of O(n) find()
  const playerMap = new Map<string, typeof state.players[0]>()
  state.players.forEach(player => {
    playerMap.set(player.id, player)
  })

  // Filter statistics by date range if provided
  let relevantStats = statistics
  if (dateFrom || dateTo) {
    relevantStats = statistics.filter((stat) => {
      if (dateFrom && stat.sessionDate < dateFrom) return false
      if (dateTo && stat.sessionDate > dateTo) return false
      return true
    })
  }

  // Danish weekday names
  const weekdayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']

  // Group by date and weekday
  const dateWeekdayStats = new Map<string, {
    checkInCount: number
    sessions: Set<string>
  }>()

  relevantStats.forEach((stat) => {
    const sessionDate = new Date(stat.sessionDate)
    const weekday = sessionDate.getDay()
    const dateKey = `${stat.sessionDate}_${weekday}`

    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []
    
    let sessionCheckInCount = 0
    checkIns.forEach((checkIn) => {
      // Handle both camelCase (playerId) and snake_case (player_id) formats
      const playerId = (checkIn as any).playerId || (checkIn as any).player_id
      if (!playerId) return
      
      // Use Map lookup for O(1) performance
      const player = playerMap.get(playerId)
      if (!player) return

      // Filter by training groups if provided
      if (groupNames && groupNames.length > 0) {
        const playerGroups = player.trainingGroups || []
        const hasMatchingGroup = groupNames.some(groupName => playerGroups.includes(groupName))
        if (!hasMatchingGroup) return
      }

      sessionCheckInCount++
    })

    // Only include sessions that have check-ins matching the filter
    // This prevents showing 0 values for sessions with no relevant check-ins
    if (sessionCheckInCount === 0) return

    if (!dateWeekdayStats.has(dateKey)) {
      dateWeekdayStats.set(dateKey, {
        checkInCount: 0,
        sessions: new Set()
      })
    }

    const stats = dateWeekdayStats.get(dateKey)!
    stats.checkInCount += sessionCheckInCount
    stats.sessions.add(stat.sessionId)
  })

  // Convert to array - only include entries with actual check-ins
  const result: WeekdayAttendanceOverTime[] = Array.from(dateWeekdayStats.entries())
    .filter(([_, stats]) => stats.checkInCount > 0) // Only include if there are check-ins
    .map(([dateKey, stats]) => {
      const [date, weekdayStr] = dateKey.split('_')
      const weekday = parseInt(weekdayStr, 10)
      const averageAttendance = stats.sessions.size > 0 ? stats.checkInCount / stats.sessions.size : 0

      return {
        date,
        weekday,
        weekdayName: weekdayNames[weekday],
        checkInCount: stats.checkInCount,
        averageAttendance: Math.round(averageAttendance * 10) / 10
      }
    })

  // Sort by date (ascending)
  return result.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Gets comparison between the two most active training days.
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Comparison data between the two most active training days
 */
export const getTrainingDayComparison = async (
  dateFrom?: string,
  dateTo?: string,
  groupNames?: string[]
): Promise<TrainingDayComparison | null> => {
  const weekdayData = await getWeekdayAttendance(dateFrom, dateTo, groupNames)
  
  if (weekdayData.length < 2) {
    return null
  }

  // Sort by check-in count (descending) and take top 2
  const sortedDays = [...weekdayData].sort((a, b) => b.checkInCount - a.checkInCount)
  const day1 = sortedDays[0]
  const day2 = sortedDays[1]

  const checkInDiff = day1.checkInCount - day2.checkInCount
  const avgDiff = day1.averageAttendance - day2.averageAttendance
  const percentageDiff = day2.checkInCount > 0 
    ? ((checkInDiff / day2.checkInCount) * 100) 
    : 0

  return {
    day1: {
      weekday: day1.weekday,
      weekdayName: day1.weekdayName,
      checkInCount: day1.checkInCount,
      uniquePlayers: day1.uniquePlayers,
      sessions: day1.sessions,
      averageAttendance: day1.averageAttendance
    },
    day2: {
      weekday: day2.weekday,
      weekdayName: day2.weekdayName,
      checkInCount: day2.checkInCount,
      uniquePlayers: day2.uniquePlayers,
      sessions: day2.sessions,
      averageAttendance: day2.averageAttendance
    },
    difference: {
      checkInCount: checkInDiff,
      averageAttendance: avgDiff,
      percentageDifference: Math.round(percentageDiff * 10) / 10
    }
  }
}

/**
 * Gets monthly attendance trends grouped by month.
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Array of monthly attendance trend data
 */
export const getMonthlyAttendanceTrends = async (
  dateFrom?: string,
  dateTo?: string,
  groupNames?: string[]
): Promise<MonthlyAttendanceTrend[]> => {
  const [statistics, state] = await Promise.all([
    getStatisticsSnapshots(),
    getStateCopy()
  ])

  // Create player lookup Map for O(1) access
  const playerMap = new Map<string, typeof state.players[0]>()
  state.players.forEach(player => {
    playerMap.set(player.id, player)
  })

  // Filter statistics by date range if provided
  let relevantStats = statistics
  if (dateFrom || dateTo) {
    relevantStats = statistics.filter((stat) => {
      if (dateFrom && stat.sessionDate < dateFrom) return false
      if (dateTo && stat.sessionDate > dateTo) return false
      return true
    })
  }

  // Danish month names
  const monthNames = ['Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'December']

  // Group by month
  const monthStats = new Map<string, {
    checkInCount: number
    uniquePlayers: Set<string>
    sessions: Set<string>
  }>()

  relevantStats.forEach((stat) => {
    const sessionDate = new Date(stat.sessionDate)
    const year = sessionDate.getFullYear()
    const month = sessionDate.getMonth() + 1 // 1-12
    const monthKey = `${year}-${String(month).padStart(2, '0')}` // "2024-01"

    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []

    checkIns.forEach((checkIn) => {
      // Handle both camelCase (playerId) and snake_case (player_id) formats
      const playerId = (checkIn as any).playerId || (checkIn as any).player_id
      if (!playerId) return

      // Use Map lookup for O(1) performance
      const player = playerMap.get(playerId)
      if (!player) return

      // Filter by training groups if provided
      if (groupNames && groupNames.length > 0) {
        const playerGroups = player.trainingGroups || []
        const hasMatchingGroup = groupNames.some(groupName => playerGroups.includes(groupName))
        if (!hasMatchingGroup) return
      }

      if (!monthStats.has(monthKey)) {
        monthStats.set(monthKey, {
          checkInCount: 0,
          uniquePlayers: new Set(),
          sessions: new Set()
        })
      }

      const stats = monthStats.get(monthKey)!
      stats.checkInCount++
      stats.uniquePlayers.add(playerId)
      stats.sessions.add(stat.sessionId)
    })
  })

  // Convert to array
  const result: MonthlyAttendanceTrend[] = Array.from(monthStats.entries()).map(([monthKey, stats]) => {
    const [yearStr, monthStr] = monthKey.split('-')
    const year = parseInt(yearStr, 10)
    const monthNum = parseInt(monthStr, 10)
    const uniqueSessions = stats.sessions.size
    const averageAttendance = uniqueSessions > 0 ? stats.checkInCount / uniqueSessions : 0

    return {
      month: monthKey,
      year,
      monthName: `${monthNames[monthNum - 1]} ${year}`,
      checkInCount: stats.checkInCount,
      averageAttendance: Math.round(averageAttendance * 10) / 10,
      uniquePlayers: stats.uniquePlayers.size,
      sessions: uniqueSessions
    }
  })

  // Sort by month (ascending)
  return result.sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Gets group attendance trends over time, grouped by month.
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Array of group attendance data over time
 */
export const getGroupAttendanceOverTime = async (
  dateFrom?: string,
  dateTo?: string,
  groupNames?: string[]
): Promise<GroupAttendanceOverTime[]> => {
  const [statistics, state] = await Promise.all([
    getStatisticsSnapshots(),
    getStateCopy()
  ])

  // Create player lookup Map for O(1) access
  const playerMap = new Map<string, typeof state.players[0]>()
  state.players.forEach(player => {
    playerMap.set(player.id, player)
  })

  // Filter statistics by date range if provided
  let relevantStats = statistics
  if (dateFrom || dateTo) {
    relevantStats = statistics.filter((stat) => {
      if (dateFrom && stat.sessionDate < dateFrom) return false
      if (dateTo && stat.sessionDate > dateTo) return false
      return true
    })
  }

  // Danish month names
  const monthNames = ['Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'December']

  // Group by group name and month
  const groupMonthStats = new Map<string, {
    checkInCount: number
    uniquePlayers: Set<string>
    sessions: Set<string>
  }>()

  relevantStats.forEach((stat) => {
    const sessionDate = new Date(stat.sessionDate)
    const year = sessionDate.getFullYear()
    const month = sessionDate.getMonth() + 1 // 1-12
    const monthKey = `${year}-${String(month).padStart(2, '0')}` // "2024-01"

    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []

    checkIns.forEach((checkIn) => {
      // Handle both camelCase (playerId) and snake_case (player_id) formats
      const playerId = (checkIn as any).playerId || (checkIn as any).player_id
      if (!playerId) return

      // Use Map lookup for O(1) performance
      const player = playerMap.get(playerId)
      if (!player) return

      const trainingGroups = player.trainingGroups || []
      
      // Filter by training groups if provided
      if (groupNames && groupNames.length > 0) {
        const hasMatchingGroup = groupNames.some(groupName => trainingGroups.includes(groupName))
        if (!hasMatchingGroup) return
      }

      trainingGroups.forEach((groupName) => {
        if (!groupName) return

        // Filter by group names if provided
        if (groupNames && groupNames.length > 0 && !groupNames.includes(groupName)) {
          return
        }

        const groupMonthKey = `${groupName}_${monthKey}`

        if (!groupMonthStats.has(groupMonthKey)) {
          groupMonthStats.set(groupMonthKey, {
            checkInCount: 0,
            uniquePlayers: new Set(),
            sessions: new Set()
          })
        }

        const stats = groupMonthStats.get(groupMonthKey)!
        stats.checkInCount++
        stats.uniquePlayers.add(playerId)
        stats.sessions.add(stat.sessionId)
      })
    })
  })

  // Convert to array
  const result: GroupAttendanceOverTime[] = Array.from(groupMonthStats.entries()).map(([groupMonthKey, stats]) => {
    const [groupName, monthKey] = groupMonthKey.split('_')
    const [yearStr, monthStr] = monthKey.split('-')
    const year = parseInt(yearStr, 10)
    const monthNum = parseInt(monthStr, 10)
    const uniqueSessions = stats.sessions.size
    const averageAttendance = uniqueSessions > 0 ? stats.checkInCount / uniqueSessions : 0

    return {
      groupName,
      month: monthKey,
      year,
      monthName: `${monthNames[monthNum - 1]} ${year}`,
      averageAttendance: Math.round(averageAttendance * 10) / 10,
      checkInCount: stats.checkInCount,
      uniquePlayers: stats.uniquePlayers.size,
      sessions: uniqueSessions
    }
  })

  // Sort by group name, then by month
  return result.sort((a, b) => {
    const groupCompare = a.groupName.localeCompare(b.groupName)
    if (groupCompare !== 0) return groupCompare
    return a.month.localeCompare(b.month)
  })
}

/**
 * Gets period comparison data comparing current period with a comparison period.
 * @param currentDateFrom - Start date for current period (ISO string)
 * @param currentDateTo - End date for current period (ISO string)
 * @param comparisonDateFrom - Start date for comparison period (ISO string)
 * @param comparisonDateTo - End date for comparison period (ISO string)
 * @param groupNames - Optional array of training group names to filter by
 * @returns Comparison data between the two periods
 */
export const getPeriodComparison = async (
  currentDateFrom: string,
  currentDateTo: string,
  comparisonDateFrom: string,
  comparisonDateTo: string,
  groupNames?: string[]
): Promise<PeriodComparison> => {
  // Get data for both periods
  const [currentData, comparisonData] = await Promise.all([
    getTrainingGroupAttendance(currentDateFrom, currentDateTo, groupNames),
    getTrainingGroupAttendance(comparisonDateFrom, comparisonDateTo, groupNames)
  ])

  // Get statistics snapshots and state for accurate calculations
  const [currentStats, comparisonStats, state] = await Promise.all([
    getStatisticsSnapshots(),
    getStatisticsSnapshots(),
    getStateCopy()
  ])

  const playerMap = new Map<string, typeof state.players[0]>()
  state.players.forEach(player => {
    playerMap.set(player.id, player)
  })

  // Filter statistics for both periods
  const currentRelevantStats = currentStats.filter((stat) => {
    if (stat.sessionDate < currentDateFrom) return false
    if (stat.sessionDate > currentDateTo) return false
    return true
  })

  const comparisonRelevantStats = comparisonStats.filter((stat) => {
    if (stat.sessionDate < comparisonDateFrom) return false
    if (stat.sessionDate > comparisonDateTo) return false
    return true
  })

  // Calculate metrics for current period
  const currentUniqueSessions = new Set<string>()
  const currentUniquePlayers = new Set<string>()
  let currentCheckInCount = 0

  currentRelevantStats.forEach((stat) => {
    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []
    currentUniqueSessions.add(stat.sessionId)

    checkIns.forEach((checkIn) => {
      const playerId = (checkIn as any).playerId || (checkIn as any).player_id
      if (!playerId) return
      const player = playerMap.get(playerId)
      if (!player) return

      if (groupNames && groupNames.length > 0) {
        const playerGroups = player.trainingGroups || []
        const hasMatchingGroup = groupNames.some(groupName => playerGroups.includes(groupName))
        if (!hasMatchingGroup) return
      }

      currentCheckInCount++
      currentUniquePlayers.add(playerId)
    })
  })

  // Calculate metrics for comparison period
  const comparisonUniqueSessions = new Set<string>()
  const comparisonUniquePlayers = new Set<string>()
  let comparisonCheckInCount = 0

  comparisonRelevantStats.forEach((stat) => {
    const checkIns = Array.isArray(stat.checkIns) ? stat.checkIns : []
    comparisonUniqueSessions.add(stat.sessionId)

    checkIns.forEach((checkIn) => {
      const playerId = (checkIn as any).playerId || (checkIn as any).player_id
      if (!playerId) return
      const player = playerMap.get(playerId)
      if (!player) return

      if (groupNames && groupNames.length > 0) {
        const playerGroups = player.trainingGroups || []
        const hasMatchingGroup = groupNames.some(groupName => playerGroups.includes(groupName))
        if (!hasMatchingGroup) return
      }

      comparisonCheckInCount++
      comparisonUniquePlayers.add(playerId)
    })
  })

  // Calculate totals
  const currentTotal = {
    checkInCount: currentCheckInCount,
    totalSessions: currentUniqueSessions.size,
    averageAttendance: currentUniqueSessions.size > 0 ? currentCheckInCount / currentUniqueSessions.size : 0,
    uniquePlayers: currentUniquePlayers.size
  }

  const comparisonTotal = {
    checkInCount: comparisonCheckInCount,
    totalSessions: comparisonUniqueSessions.size,
    averageAttendance: comparisonUniqueSessions.size > 0 ? comparisonCheckInCount / comparisonUniqueSessions.size : 0,
    uniquePlayers: comparisonUniquePlayers.size
  }

  // Calculate deltas
  const deltas = {
    checkInCount: currentTotal.checkInCount - comparisonTotal.checkInCount,
    totalSessions: currentTotal.totalSessions - comparisonTotal.totalSessions,
    averageAttendance: currentTotal.averageAttendance - comparisonTotal.averageAttendance,
    uniquePlayers: currentTotal.uniquePlayers - comparisonTotal.uniquePlayers
  }

  // Calculate percentage deltas
  const percentageDeltas = {
    checkInCount: comparisonTotal.checkInCount > 0
      ? (deltas.checkInCount / comparisonTotal.checkInCount) * 100
      : 0,
    totalSessions: comparisonTotal.totalSessions > 0
      ? (deltas.totalSessions / comparisonTotal.totalSessions) * 100
      : 0,
    averageAttendance: comparisonTotal.averageAttendance > 0
      ? (deltas.averageAttendance / comparisonTotal.averageAttendance) * 100
      : 0,
    uniquePlayers: comparisonTotal.uniquePlayers > 0
      ? (deltas.uniquePlayers / comparisonTotal.uniquePlayers) * 100
      : 0
  }

  return {
    current: {
      checkInCount: currentTotal.checkInCount,
      totalSessions: currentTotal.totalSessions,
      averageAttendance: Math.round(currentTotal.averageAttendance * 10) / 10,
      uniquePlayers: currentTotal.uniquePlayers
    },
    comparison: {
      checkInCount: comparisonTotal.checkInCount,
      totalSessions: comparisonTotal.totalSessions,
      averageAttendance: Math.round(comparisonTotal.averageAttendance * 10) / 10,
      uniquePlayers: comparisonTotal.uniquePlayers
    },
    deltas: {
      checkInCount: deltas.checkInCount,
      totalSessions: deltas.totalSessions,
      averageAttendance: Math.round(deltas.averageAttendance * 10) / 10,
      uniquePlayers: deltas.uniquePlayers
    },
    percentageDeltas: {
      checkInCount: Math.round(percentageDeltas.checkInCount * 10) / 10,
      totalSessions: Math.round(percentageDeltas.totalSessions * 10) / 10,
      averageAttendance: Math.round(percentageDeltas.averageAttendance * 10) / 10,
      uniquePlayers: Math.round(percentageDeltas.uniquePlayers * 10) / 10
    }
  }
}

