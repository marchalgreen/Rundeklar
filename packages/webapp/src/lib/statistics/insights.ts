/**
 * Insights generation utilities for statistics.
 * 
 * Provides functions to generate text-based insights from statistics data.
 */

import type { TrainingGroupAttendance, WeekdayAttendance, PlayerCheckInLongTail, TrainingDayComparison } from '@rundeklar/common'

export interface Insight {
  text: string
  type: 'comparison' | 'mostActive' | 'trend'
}

/**
 * Generates insights from training day comparison data.
 * 
 * @param comparison - Training day comparison data
 * @returns Array of insight objects
 */
export function generateTrainingDayInsights(comparison: TrainingDayComparison | null): Insight[] {
  if (!comparison) {
    return []
  }
  
  const insights: Insight[] = []
  
  const day1Name = comparison.day1.weekdayName
  const day2Name = comparison.day2.weekdayName
  const percentageDiff = comparison.difference.percentageDifference
  const checkInDiff = Math.abs(comparison.difference.checkInCount)
  
  insights.push({
    type: 'comparison',
    text: `${day1Name} har ${
      percentageDiff > 0 ? 'højere' : 'lavere'
    } fremmøde end ${day2Name} med ${
      Math.abs(percentageDiff).toFixed(1)
    }% (${checkInDiff} flere indtjekninger).`
  })
  
  return insights
}

/**
 * Generates insights from weekday attendance data.
 * 
 * @param attendance - Array of weekday attendance data
 * @returns Array of insight objects
 */
export function generateWeekdayInsights(attendance: WeekdayAttendance[]): Insight[] {
  if (attendance.length === 0) {
    return []
  }
  
  const insights: Insight[] = []
  
  const mostActiveDay = attendance.reduce((max, day) => 
    day.averageAttendance > max.averageAttendance ? day : max
  )
  
  insights.push({
    type: 'mostActive',
    text: `Den mest aktive træningsdag er ${mostActiveDay.weekdayName} med et gennemsnitligt fremmøde på ${mostActiveDay.averageAttendance.toFixed(1)} spillere pr. session.`
  })
  
  return insights
}

/**
 * Generates insights from training group attendance data.
 * 
 * @param attendance - Array of training group attendance data
 * @returns Array of insight objects
 */
export function generateGroupInsights(attendance: TrainingGroupAttendance[]): Insight[] {
  if (attendance.length === 0) {
    return []
  }
  
  const insights: Insight[] = []
  
  const mostActiveGroup = attendance.reduce((max, group) => 
    group.averageAttendance > max.averageAttendance ? group : max
  )
  
  insights.push({
    type: 'mostActive',
    text: `Den mest aktive træningsgruppe er ${mostActiveGroup.groupName} med et gennemsnitligt fremmøde på ${mostActiveGroup.averageAttendance.toFixed(1)} spillere pr. session.`
  })
  
  return insights
}

/**
 * Generates insights from player check-in long-tail data.
 * 
 * @param longTail - Array of player check-in data sorted by activity
 * @returns Array of insight objects
 */
export function generatePlayerInsights(longTail: PlayerCheckInLongTail[]): Insight[] {
  if (longTail.length === 0) {
    return []
  }
  
  const insights: Insight[] = []
  
  const mostActivePlayer = longTail[0]
  
  insights.push({
    type: 'mostActive',
    text: `Den mest aktive spiller er ${mostActivePlayer.playerName} med ${mostActivePlayer.checkInCount} indtjekninger i den valgte periode.`
  })
  
  return insights
}

/**
 * Generates all insights from statistics data.
 * 
 * @param params - Statistics data for insight generation
 * @returns Array of all insight objects
 */
export function generateAllInsights(params: {
  trainingDayComparison?: TrainingDayComparison | null
  weekdayAttendance?: WeekdayAttendance[]
  trainingGroupAttendance?: TrainingGroupAttendance[]
  playerCheckInLongTail?: PlayerCheckInLongTail[]
}): Insight[] {
  const insights: Insight[] = []
  
  if (params.trainingDayComparison) {
    insights.push(...generateTrainingDayInsights(params.trainingDayComparison))
  }
  
  if (params.weekdayAttendance && params.weekdayAttendance.length > 0) {
    insights.push(...generateWeekdayInsights(params.weekdayAttendance))
  }
  
  if (params.trainingGroupAttendance && params.trainingGroupAttendance.length > 0) {
    insights.push(...generateGroupInsights(params.trainingGroupAttendance))
  }
  
  if (params.playerCheckInLongTail && params.playerCheckInLongTail.length > 0) {
    insights.push(...generatePlayerInsights(params.playerCheckInLongTail))
  }
  
  return insights
}

