/**
 * Insights generation utilities for statistics.
 * 
 * Provides functions to generate structured, actionable insights from statistics data.
 * 
 * Insights are prioritized by severity and include evidence and recommended actions.
 */

import type { TrainingGroupAttendance, WeekdayAttendance, PlayerCheckInLongTail, TrainingDayComparison } from '@rundeklar/common'

export type InsightSeverity = 'high' | 'medium' | 'low' | 'info'
export type InsightType = 'comparison' | 'mostActive' | 'trend' | 'anomaly' | 'opportunity'

export interface Insight {
  id: string
  text: string
  type: InsightType
  severity: InsightSeverity
  confidence: number // 0-100, percentage confidence in the insight
  evidence: {
    metric: string
    value: number | string
    comparison?: {
      metric: string
      value: number | string
      difference: number
      percentageDifference?: number
    }
    sampleSize?: number
  }
  recommendedActions: string[]
  priority: number // Calculated from severity and confidence, higher = more important
}

/**
 * Generates insights from training day comparison data.
 * 
 * @param comparison - Training day comparison data
 * @returns Array of structured insight objects
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
  const avgDiff = Math.abs(comparison.difference.averageAttendance)
  
  // Determine severity based on percentage difference
  const absPercentageDiff = Math.abs(percentageDiff)
  const severity: InsightSeverity = absPercentageDiff > 20 ? 'high' : absPercentageDiff > 10 ? 'medium' : 'low'
  
  // Confidence based on sample size (sessions)
  const minSessions = Math.min(comparison.day1.sessions, comparison.day2.sessions)
  const confidence = Math.min(100, Math.max(50, minSessions * 10)) // At least 50%, up to 100% based on sessions
  
  const isHigher = percentageDiff > 0
  
  insights.push({
    id: `training-day-comparison-${day1Name}-${day2Name}`,
    type: 'comparison',
    severity,
    confidence,
    text: `${day1Name} har ${
      isHigher ? 'højere' : 'lavere'
    } fremmøde end ${day2Name} med ${
      absPercentageDiff.toFixed(1)
    }% (${checkInDiff} flere indtjekninger, gennemsnit ${avgDiff.toFixed(1)} spillere pr. session).`,
    evidence: {
      metric: `${day1Name} fremmøde`,
      value: comparison.day1.checkInCount,
      comparison: {
        metric: `${day2Name} fremmøde`,
        value: comparison.day2.checkInCount,
        difference: checkInDiff,
        percentageDifference: absPercentageDiff
      },
      sampleSize: comparison.day1.sessions + comparison.day2.sessions
    },
    recommendedActions: [
      isHigher 
        ? `Overvej at øge kapaciteten på ${day1Name} eller tilbyde flere sessioner denne dag`
        : `Undersøg hvorfor ${day1Name} har lavere fremmøde - kan der være barrierer?`,
      `Sammenlign med historiske data for at se om dette er en trend`,
      `Overvej at flytte nogle spillere fra ${isHigher ? day1Name : day2Name} til ${isHigher ? day2Name : day1Name} for bedre balance`
    ],
    priority: (severity === 'high' ? 100 : severity === 'medium' ? 70 : 40) + (confidence / 10)
  })
  
  return insights
}

/**
 * Generates insights from weekday attendance data.
 * 
 * @param attendance - Array of weekday attendance data
 * @returns Array of structured insight objects
 */
export function generateWeekdayInsights(attendance: WeekdayAttendance[]): Insight[] {
  if (attendance.length === 0) {
    return []
  }
  
  const insights: Insight[] = []
  
  const mostActiveDay = attendance.reduce((max, day) => 
    day.averageAttendance > max.averageAttendance ? day : max
  )
  
  const leastActiveDay = attendance.reduce((min, day) => 
    day.averageAttendance < min.averageAttendance ? day : min
  )
  
  const avgAttendance = attendance.reduce((sum, day) => sum + day.averageAttendance, 0) / attendance.length
  const variance = attendance.reduce((sum, day) => {
    const diff = day.averageAttendance - avgAttendance
    return sum + (diff * diff)
  }, 0) / attendance.length
  const stdDev = Math.sqrt(variance)
  
  // High variance indicates inconsistent attendance across days
  const hasHighVariance = stdDev > avgAttendance * 0.3
  
  insights.push({
    id: `most-active-weekday-${mostActiveDay.weekdayName}`,
    type: 'mostActive',
    severity: 'info',
    confidence: mostActiveDay.sessions >= 5 ? 90 : mostActiveDay.sessions >= 3 ? 70 : 50,
    text: `Den mest aktive træningsdag er ${mostActiveDay.weekdayName} med et gennemsnitligt fremmøde på ${mostActiveDay.averageAttendance.toFixed(1)} spillere pr. session (${mostActiveDay.checkInCount} indtjekninger over ${mostActiveDay.sessions} sessioner).`,
    evidence: {
      metric: 'Gennemsnitligt fremmøde',
      value: mostActiveDay.averageAttendance,
      comparison: {
        metric: 'Gennemsnit for alle dage',
        value: avgAttendance,
        difference: mostActiveDay.averageAttendance - avgAttendance,
        percentageDifference: ((mostActiveDay.averageAttendance - avgAttendance) / avgAttendance) * 100
      },
      sampleSize: mostActiveDay.sessions
    },
    recommendedActions: [
      `Overvej at udvide kapaciteten på ${mostActiveDay.weekdayName} hvis der er venteliste`,
      `Undersøg om spillere fra mindre aktive dage kan flyttes til ${mostActiveDay.weekdayName}`
    ],
    priority: 30 + (mostActiveDay.sessions * 2)
  })
  
  // Add insight about variance if significant
  if (hasHighVariance && leastActiveDay.weekdayName !== mostActiveDay.weekdayName) {
    const diffPercentage = ((mostActiveDay.averageAttendance - leastActiveDay.averageAttendance) / leastActiveDay.averageAttendance) * 100
    
    insights.push({
      id: `weekday-variance-${mostActiveDay.weekdayName}-${leastActiveDay.weekdayName}`,
      type: 'opportunity',
      severity: diffPercentage > 30 ? 'medium' : 'low',
      confidence: Math.min(100, (mostActiveDay.sessions + leastActiveDay.sessions) * 8),
      text: `Der er stor variation i fremmøde på tværs af ugedage: ${mostActiveDay.weekdayName} har ${diffPercentage.toFixed(1)}% højere gennemsnit end ${leastActiveDay.weekdayName}.`,
      evidence: {
        metric: 'Fremmødevariation',
        value: stdDev.toFixed(1),
        comparison: {
          metric: 'Gennemsnit',
          value: avgAttendance.toFixed(1),
          difference: stdDev,
          percentageDifference: (stdDev / avgAttendance) * 100
        },
        sampleSize: attendance.reduce((sum, day) => sum + day.sessions, 0)
      },
      recommendedActions: [
        `Undersøg barrierer for fremmøde på ${leastActiveDay.weekdayName}`,
        `Overvej at konsolidere sessioner hvis variationen er uhensigtsmæssig`,
        `Kommunikér mulige fordele ved at deltage på ${leastActiveDay.weekdayName}`
      ],
      priority: (diffPercentage > 30 ? 60 : 40) + (Math.min(mostActiveDay.sessions, leastActiveDay.sessions) * 3)
    })
  }
  
  return insights
}

/**
 * Generates insights from training group attendance data.
 * 
 * @param attendance - Array of training group attendance data
 * @returns Array of structured insight objects
 */
export function generateGroupInsights(attendance: TrainingGroupAttendance[]): Insight[] {
  if (attendance.length === 0) {
    return []
  }
  
  const insights: Insight[] = []
  
  const mostActiveGroup = attendance.reduce((max, group) => 
    group.averageAttendance > max.averageAttendance ? group : max
  )
  
  const avgAttendance = attendance.reduce((sum, group) => sum + group.averageAttendance, 0) / attendance.length
  
  insights.push({
    id: `most-active-group-${mostActiveGroup.groupName}`,
    type: 'mostActive',
    severity: 'info',
    confidence: mostActiveGroup.sessions >= 5 ? 85 : mostActiveGroup.sessions >= 3 ? 65 : 45,
    text: `Den mest aktive træningsgruppe er ${mostActiveGroup.groupName} med et gennemsnitligt fremmøde på ${mostActiveGroup.averageAttendance.toFixed(1)} spillere pr. session (${mostActiveGroup.checkInCount} indtjekninger, ${mostActiveGroup.uniquePlayers} unikke spillere).`,
    evidence: {
      metric: 'Gennemsnitligt fremmøde',
      value: mostActiveGroup.averageAttendance,
      comparison: {
        metric: 'Gennemsnit for alle grupper',
        value: avgAttendance,
        difference: mostActiveGroup.averageAttendance - avgAttendance,
        percentageDifference: ((mostActiveGroup.averageAttendance - avgAttendance) / avgAttendance) * 100
      },
      sampleSize: mostActiveGroup.sessions
    },
    recommendedActions: [
      `Overvej at udvide ${mostActiveGroup.groupName} hvis der er høj efterspørgsel`,
      `Analysér hvad der gør ${mostActiveGroup.groupName} succesfuld og anvend det på andre grupper`
    ],
    priority: 25 + (mostActiveGroup.sessions * 2)
  })
  
  return insights
}

/**
 * Generates insights from player check-in long-tail data.
 * 
 * @param longTail - Array of player check-in data sorted by activity
 * @returns Array of structured insight objects
 */
export function generatePlayerInsights(longTail: PlayerCheckInLongTail[]): Insight[] {
  if (longTail.length === 0) {
    return []
  }
  
  const insights: Insight[] = []
  
  const mostActivePlayer = longTail[0]
  const totalCheckIns = longTail.reduce((sum, p) => sum + p.checkInCount, 0)
  const avgCheckIns = totalCheckIns / longTail.length
  
  // Calculate Pareto (80/20 rule)
  const top20Percent = Math.ceil(longTail.length * 0.2)
  const top20CheckIns = longTail.slice(0, top20Percent).reduce((sum, p) => sum + p.checkInCount, 0)
  const top20Percentage = (top20CheckIns / totalCheckIns) * 100
  
  const hasParetoEffect = top20Percentage > 70 // More than 70% of check-ins from top 20%
  
  insights.push({
    id: `most-active-player-${mostActivePlayer.playerId}`,
    type: 'mostActive',
    severity: 'info',
    confidence: 95, // High confidence - direct data
    text: `Den mest aktive spiller er ${mostActivePlayer.playerName} med ${mostActivePlayer.checkInCount} indtjekninger i den valgte periode (${((mostActivePlayer.checkInCount / avgCheckIns - 1) * 100).toFixed(0)}% over gennemsnittet).`,
    evidence: {
      metric: 'Indtjekninger',
      value: mostActivePlayer.checkInCount,
      comparison: {
        metric: 'Gennemsnit',
        value: avgCheckIns.toFixed(1),
        difference: mostActivePlayer.checkInCount - avgCheckIns,
        percentageDifference: ((mostActivePlayer.checkInCount - avgCheckIns) / avgCheckIns) * 100
      },
      sampleSize: longTail.length
    },
    recommendedActions: [
      `Anerkend ${mostActivePlayer.playerName}s engagement`,
      `Overvej at bruge ${mostActivePlayer.playerName} som mentor eller ambassadør`
    ],
    priority: 20
  })
  
  // Add Pareto insight if significant
  if (hasParetoEffect && longTail.length >= 10) {
    insights.push({
      id: 'pareto-effect-checkins',
      type: 'trend',
      severity: 'medium',
      confidence: 80,
      text: `Pareto-effekt: De top ${top20Percent} mest aktive spillere (${top20Percentage.toFixed(1)}% af spillere) står for ${top20CheckIns} indtjekninger (${top20Percentage.toFixed(1)}% af total).`,
      evidence: {
        metric: 'Top 20% indtjekninger',
        value: top20CheckIns,
        comparison: {
          metric: 'Total indtjekninger',
          value: totalCheckIns,
          difference: top20CheckIns - (totalCheckIns * 0.2),
          percentageDifference: top20Percentage - 20
        },
        sampleSize: longTail.length
      },
      recommendedActions: [
        `Fokuser på at engagere de ${Math.ceil(longTail.length * 0.8)} mindre aktive spillere`,
        `Undersøg barrierer for fremmøde blandt de mindre aktive`,
        `Overvej incitamenter for at øge engagement`
      ],
      priority: 55
    })
  }
  
  return insights
}

/**
 * Generates all insights from statistics data.
 * 
 * @param params - Statistics data for insight generation
 * @param limit - Maximum number of insights to return (default: 3, sorted by priority)
 * @returns Array of insight objects, sorted by priority (highest first), limited to top N
 */
export function generateAllInsights(params: {
  trainingDayComparison?: TrainingDayComparison | null
  weekdayAttendance?: WeekdayAttendance[]
  trainingGroupAttendance?: TrainingGroupAttendance[]
  playerCheckInLongTail?: PlayerCheckInLongTail[]
}, limit: number = 3): Insight[] {
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
  
  // Sort by priority (highest first) and return top N
  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
}

