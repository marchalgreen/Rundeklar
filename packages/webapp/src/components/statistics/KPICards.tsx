import React from 'react'
import { Users, Calendar, Activity, User, TrendingUp, TrendingDown } from 'lucide-react'
import type { KPIMetricsWithDeltas } from '../../lib/statistics/kpiCalculation'
import { AnimatedNumber } from '../ui/AnimatedNumber'

interface KPICardsProps {
  kpis: KPIMetricsWithDeltas
  loading?: boolean
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
export const KPICards: React.FC<KPICardsProps> = ({ kpis, loading = false }) => {
  const checkInDelta = kpis.deltas ? formatDelta(kpis.deltas.totalCheckIns) : null
  const sessionsDelta = kpis.deltas ? formatDelta(kpis.deltas.totalSessions) : null
  const attendanceDelta = kpis.deltas ? formatDelta(Math.round(kpis.deltas.averageAttendance * 10) / 10) : null
  const playersDelta = kpis.deltas ? formatDelta(kpis.deltas.uniquePlayers) : null
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="rounded-[28px] bg-[hsl(var(--surface)/0.9)] ring-1 ring-[hsl(var(--line)/0.16)] shadow-[0_30px_60px_hsl(var(--accent-blue)/0.12)] backdrop-blur-xl p-3 sm:p-4 transition-all motion-reduce:transition-none hover:shadow-[0_30px_60px_hsl(var(--accent-blue)/0.16)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] motion-safe:transition-all motion-safe:duration-200">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Total indtjekninger</span>
            <div className="flex items-baseline gap-2">
              {loading && kpis.totalCheckIns === 0 ? (
                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser...</span>
              ) : (
                <AnimatedNumber
                  value={kpis.totalCheckIns}
                  duration={1500}
                  decimals={0}
                  className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))] tabular-nums"
                />
              )}
              {checkInDelta && !loading && (
                <div className={`flex items-center gap-1 ${checkInDelta.color} motion-safe:transition-all motion-safe:duration-200`} title={kpis.previousPeriod ? `vs forrige periode (${new Date(kpis.previousPeriod.dateFrom).toLocaleDateString('da-DK')} - ${new Date(kpis.previousPeriod.dateTo).toLocaleDateString('da-DK')})` : ''}>
                  {checkInDelta.icon}
                  <span className="text-xs font-medium tabular-nums">{checkInDelta.text}</span>
                </div>
              )}
            </div>
            {kpis.previousPeriod && !loading && (
              <span className="text-xs text-[hsl(var(--muted))] mt-0.5">vs {kpis.previousPeriod.label}</span>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-[28px] bg-[hsl(var(--surface)/0.9)] ring-1 ring-[hsl(var(--line)/0.16)] shadow-[0_30px_60px_hsl(var(--accent-blue)/0.12)] backdrop-blur-xl p-3 sm:p-4 transition-all motion-reduce:transition-none hover:shadow-[0_30px_60px_hsl(var(--accent-blue)/0.16)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--accent)/0.12)] text-[hsl(var(--accent))] motion-safe:transition-all motion-safe:duration-200">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Træningssessioner</span>
            <div className="flex items-baseline gap-2">
              {loading && kpis.totalSessions === 0 ? (
                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser...</span>
              ) : (
                <AnimatedNumber
                  value={kpis.totalSessions}
                  duration={1500}
                  decimals={0}
                  className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))] tabular-nums"
                />
              )}
              {sessionsDelta && !loading && (
                <div className={`flex items-center gap-1 ${sessionsDelta.color} motion-safe:transition-all motion-safe:duration-200`} title={kpis.previousPeriod ? `vs forrige periode (${new Date(kpis.previousPeriod.dateFrom).toLocaleDateString('da-DK')} - ${new Date(kpis.previousPeriod.dateTo).toLocaleDateString('da-DK')})` : ''}>
                  {sessionsDelta.icon}
                  <span className="text-xs font-medium tabular-nums">{sessionsDelta.text}</span>
                </div>
              )}
            </div>
            {kpis.previousPeriod && !loading && (
              <span className="text-xs text-[hsl(var(--muted))] mt-0.5">vs {kpis.previousPeriod.label}</span>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-[28px] bg-[hsl(var(--surface)/0.9)] ring-1 ring-[hsl(var(--line)/0.16)] shadow-[0_30px_60px_hsl(var(--accent-blue)/0.12)] backdrop-blur-xl p-3 sm:p-4 transition-all motion-reduce:transition-none hover:shadow-[0_30px_60px_hsl(var(--accent-blue)/0.16)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] motion-safe:transition-all motion-safe:duration-200">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Gennemsnit pr. session</span>
            <div className="flex items-baseline gap-2">
              {loading && kpis.averageAttendance === 0 ? (
                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser...</span>
              ) : (
                <AnimatedNumber
                  value={kpis.averageAttendance}
                  duration={1500}
                  decimals={1}
                  className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))] tabular-nums"
                />
              )}
              {attendanceDelta && !loading && (
                <div className={`flex items-center gap-1 ${attendanceDelta.color} motion-safe:transition-all motion-safe:duration-200`} title={kpis.previousPeriod ? `vs forrige periode (${new Date(kpis.previousPeriod.dateFrom).toLocaleDateString('da-DK')} - ${new Date(kpis.previousPeriod.dateTo).toLocaleDateString('da-DK')})` : ''}>
                  {attendanceDelta.icon}
                  <span className="text-xs font-medium tabular-nums">{attendanceDelta.text}</span>
                </div>
              )}
            </div>
            {kpis.previousPeriod && !loading && (
              <span className="text-xs text-[hsl(var(--muted))] mt-0.5">vs {kpis.previousPeriod.label}</span>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-[28px] bg-[hsl(var(--surface)/0.9)] ring-1 ring-[hsl(var(--line)/0.16)] shadow-[0_30px_60px_hsl(var(--accent-blue)/0.12)] backdrop-blur-xl p-3 sm:p-4 transition-all motion-reduce:transition-none hover:shadow-[0_30px_60px_hsl(var(--accent-blue)/0.16)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))] motion-safe:transition-all motion-safe:duration-200">
            <User className="w-5 h-5" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Unikke spillere</span>
            <div className="flex items-baseline gap-2">
              {loading && kpis.uniquePlayers === 0 ? (
                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser...</span>
              ) : (
                <AnimatedNumber
                  value={kpis.uniquePlayers}
                  duration={1500}
                  decimals={0}
                  className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))] tabular-nums"
                />
              )}
              {playersDelta && !loading && (
                <div className={`flex items-center gap-1 ${playersDelta.color} motion-safe:transition-all motion-safe:duration-200`} title={kpis.previousPeriod ? `vs forrige periode (${new Date(kpis.previousPeriod.dateFrom).toLocaleDateString('da-DK')} - ${new Date(kpis.previousPeriod.dateTo).toLocaleDateString('da-DK')})` : ''}>
                  {playersDelta.icon}
                  <span className="text-xs font-medium tabular-nums">{playersDelta.text}</span>
                </div>
              )}
            </div>
            {kpis.previousPeriod && !loading && (
              <span className="text-xs text-[hsl(var(--muted))] mt-0.5">vs {kpis.previousPeriod.label}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

