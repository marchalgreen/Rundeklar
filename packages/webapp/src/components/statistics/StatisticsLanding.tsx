import React from 'react'
import { Calendar, User } from 'lucide-react'

export type ViewMode = 'landing' | 'training' | 'player'

interface StatisticsLandingProps {
  onSelectView: (view: 'training' | 'player') => void
}

/**
 * StatisticsLanding component — displays the landing page for statistics.
 * 
 * Shows two cards allowing users to choose between Training & Attendance
 * or Individual Statistics views.
 */
export const StatisticsLanding: React.FC<StatisticsLandingProps> = ({ onSelectView }) => {
  return (
    <section className="flex flex-col gap-4 sm:gap-6 pt-2 sm:pt-4 xl:pt-2">
      <header className="flex flex-col gap-2 sm:gap-3 mb-2 lg:mb-1.5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">Statistik</h1>
            <p className="text-xs sm:text-sm md:text-base text-[hsl(var(--muted))] mt-1">
              Vælg en statistiktype for at se data.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Training & Attendance Card */}
        <button
          type="button"
          onClick={() => onSelectView('training')}
          className="card-glass-active border-hair rounded-lg p-6 sm:p-8 shadow-sm hover:shadow-md transition-all motion-reduce:transition-none text-left group"
        >
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] group-hover:bg-[hsl(var(--primary)/.2)] transition-colors">
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">Træning & Fremmøde</h2>
              <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">
                Se generel statistik over træninger, fremmøde pr. træningsgruppe og deltagelsesmønstre.
              </p>
            </div>
          </div>
        </button>

        {/* Individual Statistics Card */}
        <button
          type="button"
          onClick={() => onSelectView('player')}
          className="card-glass-active border-hair rounded-lg p-6 sm:p-8 shadow-sm hover:shadow-md transition-all motion-reduce:transition-none text-left group"
        >
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent))] group-hover:bg-[hsl(var(--accent)/.2)] transition-colors">
              <User className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">Individuel Statistik</h2>
              <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">
                Se detaljerede statistikker for individuelle spillere, kampresultater og sammenligninger.
              </p>
            </div>
          </div>
        </button>
      </div>
    </section>
  )
}

