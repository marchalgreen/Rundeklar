import React from 'react'
import { Lightbulb } from 'lucide-react'
import { generateAllInsights } from '../../lib/statistics/insights'
import type { TrainingGroupAttendance, WeekdayAttendance, PlayerCheckInLongTail, TrainingDayComparison } from '@rundeklar/common'

interface StatisticsInsightsProps {
  trainingDayComparison?: TrainingDayComparison | null
  weekdayAttendance?: WeekdayAttendance[]
  trainingGroupAttendance?: TrainingGroupAttendance[]
  playerCheckInLongTail?: PlayerCheckInLongTail[]
}

/**
 * StatisticsInsights component — displays text-based insights from statistics data.
 * 
 * Generates and displays insights about training day comparisons, most active days,
 * groups, and players.
 */
export const StatisticsInsights: React.FC<StatisticsInsightsProps> = ({
  trainingDayComparison,
  weekdayAttendance,
  trainingGroupAttendance,
  playerCheckInLongTail
}) => {
  const insights = generateAllInsights({
    trainingDayComparison,
    weekdayAttendance,
    trainingGroupAttendance,
    playerCheckInLongTail
  })
  
  if (insights.length === 0) {
    return null
  }
  
  return (
    <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-[hsl(var(--warning))]" />
        <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">
          Insights & Analyser
        </h3>
      </div>
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="p-3 rounded-lg bg-[hsl(var(--surface))] border-hair">
            <p className="text-xs sm:text-sm text-[hsl(var(--foreground))]">
              {insight.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

