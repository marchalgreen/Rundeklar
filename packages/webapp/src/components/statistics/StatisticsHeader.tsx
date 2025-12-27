import React, { memo } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '../ui'
import type { ViewMode } from '../../hooks/statistics/useStatisticsView'

interface StatisticsHeaderProps {
  viewMode: ViewMode
  onBack: () => void
  onExport?: () => void
}

/**
 * StatisticsHeader component — displays page header with navigation.
 * 
 * Provides consistent header styling and back navigation for statistics views.
 * 
 * @remarks Follows design tokens and provides consistent styling. Mobile-first responsive design.
 */
export const StatisticsHeader: React.FC<StatisticsHeaderProps> = memo(({
  viewMode,
  onBack,
  onExport
}) => {
  const title = viewMode === 'training' ? 'Træning & fremmøde' : 'Individuel statistik'
  const description = viewMode === 'training'
    ? 'Se generel statistik over træninger og fremmøde.'
    : 'Se spillernes statistik og sammenlign data.'

  return (
    <header className="flex flex-col gap-2 sm:gap-3 mb-2 lg:mb-1.5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] border-hair transition-colors motion-reduce:transition-none flex-shrink-0"
            title="Tilbage"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">
              {title}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-[hsl(var(--muted))] mt-1">
              {description}
            </p>
          </div>
        </div>
        {onExport && (
          <div className="flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={onExport}
            >
              <Download size={16} />
              <span className="hidden sm:inline">Eksporter CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
})

StatisticsHeader.displayName = 'StatisticsHeader'