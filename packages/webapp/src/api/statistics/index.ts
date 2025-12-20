/**
 * Statistics API module exports.
 * 
 * This module re-exports all statistics-related functions organized by domain:
 * - Player statistics (playerStats.ts)
 * - Attendance statistics (attendance.ts)
 * - Snapshot management (snapshots.ts)
 * - Match results (matchResults.ts)
 * - Shared utilities (utils.ts)
 */

// Player statistics
export {
  getCheckInsBySeason,
  getTopPartners,
  getTopOpponents,
  getPlayerComparison,
  getPlayerHeadToHead,
  getPlayerRecentMatches,
  getPlayerAllMatches,
  getPlayerStatistics
} from './playerStats'

// Attendance statistics
export {
  getTrainingGroupAttendance,
  getWeekdayAttendance,
  getPlayerCheckInLongTail,
  getWeekdayAttendanceOverTime,
  getTrainingDayComparison
} from './attendance'

// Snapshot management
export {
  snapshotSession,
  getAllSeasons,
  getSessionHistory
} from './snapshots'

// Match results
export {
  searchMatchResults
} from './matchResults'

// Shared utilities
export {
  getSeasonFromDate,
  getTeamStructure
} from './utils'

