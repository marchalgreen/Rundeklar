/**
 * Statistics API - Main entry point.
 * 
 * This module re-exports all statistics functions from the modular statistics package.
 * The actual implementation is split across multiple modules for better organization:
 * - statistics/playerStats.ts - Player-related statistics
 * - statistics/attendance.ts - Attendance-related statistics
 * - statistics/snapshots.ts - Snapshot management
 * - statistics/matchResults.ts - Match result queries
 * - statistics/utils.ts - Shared utilities
 * 
 * @module stats
 */

// Re-export all statistics functions from modular structure
export {
  // Player statistics
  getCheckInsBySeason,
  getTopPartners,
  getTopOpponents,
  getPlayerComparison,
  getPlayerHeadToHead,
  getPlayerRecentMatches,
  getPlayerAllMatches,
  getPlayerStatistics,
  // Attendance statistics
  getTrainingGroupAttendance,
  getWeekdayAttendance,
  getPlayerCheckInLongTail,
  getWeekdayAttendanceOverTime,
  getTrainingDayComparison,
  // Snapshot management
  snapshotSession,
  getAllSeasons,
  getSessionHistory,
  // Match results
  searchMatchResults
} from './statistics'

/**
 * Statistics API — manages historical statistics and player analytics.
 * 
 * All functions are re-exported from the modular statistics package.
 * See statistics/index.ts for the full module structure.
 */
import {
  snapshotSession,
  getPlayerStatistics,
  getTopPartners,
  getTopOpponents,
  getCheckInsBySeason,
  getAllSeasons,
  getSessionHistory,
  getPlayerComparison,
  getPlayerHeadToHead,
  searchMatchResults,
  getPlayerRecentMatches,
  getPlayerAllMatches,
  getTrainingGroupAttendance,
  getWeekdayAttendance,
  getPlayerCheckInLongTail,
  getWeekdayAttendanceOverTime,
  getTrainingDayComparison
} from './statistics'

const statsApi = {
  snapshotSession,
  getPlayerStatistics,
  getTopPartners,
  getTopOpponents,
  getCheckInsBySeason,
  getAllSeasons,
  getSessionHistory,
  getPlayerComparison,
  getPlayerHeadToHead,
  searchMatchResults,
  getPlayerRecentMatches,
  getPlayerAllMatches,
  getTrainingGroupAttendance,
  getWeekdayAttendance,
  getPlayerCheckInLongTail,
  getWeekdayAttendanceOverTime,
  getTrainingDayComparison
}

export default statsApi
