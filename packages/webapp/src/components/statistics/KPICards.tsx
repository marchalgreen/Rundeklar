import React from 'react'
import { Users, Calendar, Activity, User } from 'lucide-react'
import type { KPIMetrics } from '../../lib/statistics/kpiCalculation'

interface KPICardsProps {
  kpis: KPIMetrics
}

/**
 * KPICards component — displays key performance indicator cards.
 * 
 * Shows total check-ins, training sessions, average attendance, and unique players.
 */
export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Total indtjekninger</span>
            <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">{kpis.totalCheckIns}</span>
          </div>
        </div>
      </div>
      <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent))]">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Træningssessioner</span>
            <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">{kpis.totalSessions}</span>
          </div>
        </div>
      </div>
      <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--success)/.1)] text-[hsl(var(--success))]">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Gennemsnit pr. session</span>
            <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">{kpis.averageAttendance.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--warning)/.1)] text-[hsl(var(--warning))]">
            <User className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Unikke spillere</span>
            <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">{kpis.uniquePlayers}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

