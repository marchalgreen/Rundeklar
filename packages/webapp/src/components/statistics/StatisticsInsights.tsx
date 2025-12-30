import React, { useState } from 'react'
import { Lightbulb, ChevronDown, ChevronUp, AlertCircle, Info, TrendingUp, Target } from 'lucide-react'
import { generateAllInsights, type InsightSeverity } from '../../lib/statistics/insights'
import type { TrainingGroupAttendance, WeekdayAttendance, PlayerCheckInLongTail, TrainingDayComparison } from '@rundeklar/common'

interface StatisticsInsightsProps {
  trainingDayComparison?: TrainingDayComparison | null
  weekdayAttendance?: WeekdayAttendance[]
  trainingGroupAttendance?: TrainingGroupAttendance[]
  playerCheckInLongTail?: PlayerCheckInLongTail[]
}

/**
 * Gets severity color and icon.
 */
function getSeverityStyle(severity: InsightSeverity): { color: string; bgColor: string; icon: React.ReactNode } {
  switch (severity) {
    case 'high':
      return {
        color: 'text-[hsl(var(--danger))]',
        bgColor: 'bg-[hsl(var(--destructive)/.1)]',
        icon: <AlertCircle className="w-4 h-4" />
      }
    case 'medium':
      return {
        color: 'text-[hsl(var(--warning))]',
        bgColor: 'bg-[hsl(var(--warning)/.1)]',
        icon: <TrendingUp className="w-4 h-4" />
      }
    case 'low':
      return {
        color: 'text-[hsl(var(--accent))]',
        bgColor: 'bg-[hsl(var(--accent)/.1)]',
        icon: <Info className="w-4 h-4" />
      }
    case 'info':
    default:
      return {
        color: 'text-[hsl(var(--primary))]',
        bgColor: 'bg-[hsl(var(--primary)/.1)]',
        icon: <Info className="w-4 h-4" />
      }
  }
}

/**
 * StatisticsInsights component — displays structured, actionable insights from statistics data.
 * 
 * Shows top insights prioritized by severity and confidence, with evidence and recommended actions.
 */
export const StatisticsInsights: React.FC<StatisticsInsightsProps> = ({
  trainingDayComparison,
  weekdayAttendance,
  trainingGroupAttendance,
  playerCheckInLongTail
}) => {
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set())
  
  const insights = generateAllInsights({
    trainingDayComparison,
    weekdayAttendance,
    trainingGroupAttendance,
    playerCheckInLongTail
  }, 3) // Top 3 insights
  
  if (insights.length === 0) {
    return null
  }
  
  const toggleExpanded = (insightId: string) => {
    const newExpanded = new Set(expandedInsights)
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId)
    } else {
      newExpanded.add(insightId)
    }
    setExpandedInsights(newExpanded)
  }
  
  return (
    <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-[hsl(var(--warning))]" />
        <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">
          Top Insights & Anbefalinger
        </h3>
      </div>
      <div className="space-y-3">
        {insights.map((insight) => {
          const isExpanded = expandedInsights.has(insight.id)
          const severityStyle = getSeverityStyle(insight.severity)
          
          return (
            <div
              key={insight.id}
              className={`rounded-lg border-hair overflow-hidden transition-all ${
                isExpanded ? 'bg-[hsl(var(--surface))]' : 'bg-[hsl(var(--surface-2))]'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleExpanded(insight.id)}
                className="w-full p-3 sm:p-4 text-left flex items-start gap-3 hover:bg-[hsl(var(--surface))] transition-colors"
              >
                <div className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ${severityStyle.bgColor} ${severityStyle.color}`}>
                  {severityStyle.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] flex-1">
                      {insight.text}
                    </p>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[hsl(var(--muted))] flex-shrink-0 mt-0.5" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[hsl(var(--muted))] flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border-hair ${
                      insight.severity === 'high' ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' :
                      insight.severity === 'medium' ? 'bg-[hsl(var(--warning)/.1)] text-[hsl(var(--warning))]' :
                      'bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent))]'
                    }`}>
                      {insight.severity === 'high' ? 'Høj prioritet' :
                       insight.severity === 'medium' ? 'Medium prioritet' :
                       'Lav prioritet'}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted))]">
                      {insight.confidence}% sikkerhed
                    </span>
                    {insight.evidence.sampleSize && (
                      <span className="text-xs text-[hsl(var(--muted))]">
                        {insight.evidence.sampleSize} observationer
                      </span>
                    )}
                  </div>
                </div>
              </button>
              
              {isExpanded && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-hair space-y-3">
                  {/* Evidence */}
                  <div className="pt-3">
                    <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] mb-2">Bevis</h4>
                    <div className="space-y-1 text-xs text-[hsl(var(--muted))]">
                      <div>
                        <span className="font-medium">{insight.evidence.metric}:</span> {insight.evidence.value}
                      </div>
                      {insight.evidence.comparison && (
                        <div>
                          <span className="font-medium">{insight.evidence.comparison.metric}:</span> {insight.evidence.comparison.value}
                          {insight.evidence.comparison.percentageDifference !== undefined && (
                            <span className="ml-2">
                              ({insight.evidence.comparison.percentageDifference > 0 ? '+' : ''}{insight.evidence.comparison.percentageDifference.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Recommended Actions */}
                  {insight.recommendedActions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] mb-2 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Anbefalede handlinger
                      </h4>
                      <ul className="space-y-1.5">
                        {insight.recommendedActions.map((action, idx) => (
                          <li key={idx} className="text-xs text-[hsl(var(--muted))] flex items-start gap-2">
                            <span className="text-[hsl(var(--primary))] mt-0.5">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

