import React from 'react'
import { Users, Calendar, Activity, User, TrendingUp, TrendingDown } from 'lucide-react'
import type { KPIMetricsWithDeltas } from '../../lib/statistics/kpiCalculation'

interface KPICardsProps {
  kpis: KPIMetricsWithDeltas
}

/**
 * Formats a delta value with sign and color.
 */
function formatDelta(delta: number): { text: string; color: string; icon: React.ReactNode } {
  if (delta === 0) {
    return { text: '0', color: 'text-[hsl(var(--muted))]', icon: null }
  }
  const isPositive = delta > 0
  const absValue = Math.abs(delta)
  const sign = isPositive ? '+' : ''
  return {
    text: `${sign}${absValue}`,
    color: isPositive ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--danger))]',
    icon: isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
  }
}

/**
 * KPICards component — displays key performance indicator cards with period deltas.
 * 
 * Shows total check-ins, training sessions, average attendance, and unique players.
 * Each card displays the current value and delta compared to previous period (if available).
 */
export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  const checkInDelta = kpis.deltas ? formatDelta(kpis.deltas.totalCheckIns) : null
  const sessionsDelta = kpis.deltas ? formatDelta(kpis.deltas.totalSessions) : null
  const attendanceDelta = kpis.deltas ? formatDelta(Math.round(kpis.deltas.averageAttendance * 10) / 10) : null
  const playersDelta = kpis.deltas ? formatDelta(kpis.deltas.uniquePlayers) : null
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Total indtjekninger</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">{kpis.totalCheckIns}</span>
              {checkInDelta && (
                <div className={`flex items-center gap-1 ${checkInDelta.color}`} title={kpis.previousPeriod ? `vs forrige periode (${new Date(kpis.previousPeriod.dateFrom).toLocaleDateString('da-DK')} - ${new Date(kpis.previousPeriod.dateTo).toLocaleDateString('da-DK')})` : ''}>
                  {checkInDelta.icon}
                  <span className="text-xs font-medium">{checkInDelta.text}</span>
                </div>
              )}
            </div>
            {kpis.previousPeriod && (
              <span className="text-xs text-[hsl(var(--muted))] mt-0.5">vs forrige periode</span>
            )}
          </div>
        </div>
      </div>
      <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent))]">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Træningssessioner</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">{kpis.totalSessions}</span>
              {sessionsDelta && (
                <div className={`flex items-center gap-1 ${sessionsDelta.color}`} title={kpis.previousPeriod ? `vs forrige periode (${new Date(kpis.previousPeriod.dateFrom).toLocaleDateString('da-DK')} - ${new Date(kpis.previousPeriod.dateTo).toLocaleDateString('da-DK')})` : ''}>
                  {sessionsDelta.icon}
                  <span className="text-xs font-medium">{sessionsDelta.text}</span>
                </div>
              )}
            </div>
            {kpis.previousPeriod && (
              <span className="text-xs text-[hsl(var(--muted))] mt-0.5">vs forrige periode</span>
            )}
          </div>
        </div>
      </div>
      <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--success)/.1)] text-[hsl(var(--success))]">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Gennemsnit pr. session</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">{kpis.averageAttendance.toFixed(1)}</span>
              {attendanceDelta && (
                <div className={`flex items-center gap-1 ${attendanceDelta.color}`} title={kpis.previousPeriod ? `vs forrige periode (${new Date(kpis.previousPeriod.dateFrom).toLocaleDateString('da-DK')} - ${new Date(kpis.previousPeriod.dateTo).toLocaleDateString('da-DK')})` : ''}>
                  {attendanceDelta.icon}
                  <span className="text-xs font-medium">{attendanceDelta.text}</span>
                </div>
              )}
            </div>
            {kpis.previousPeriod && (
              <span className="text-xs text-[hsl(var(--muted))] mt-0.5">vs forrige periode</span>
            )}
          </div>
        </div>
      </div>
      <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--warning)/.1)] text-[hsl(var(--warning))]">
            <User className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Unikke spillere</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">{kpis.uniquePlayers}</span>
              {playersDelta && (
                <div className={`flex items-center gap-1 ${playersDelta.color}`} title={kpis.previousPeriod ? `vs forrige periode (${new Date(kpis.previousPeriod.dateFrom).toLocaleDateString('da-DK')} - ${new Date(kpis.previousPeriod.dateTo).toLocaleDateString('da-DK')})` : ''}>
                  {playersDelta.icon}
                  <span className="text-xs font-medium">{playersDelta.text}</span>
                </div>
              )}
            </div>
            {kpis.previousPeriod && (
              <span className="text-xs text-[hsl(var(--muted))] mt-0.5">vs forrige periode</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

