import React from 'react'
import { PageCard } from '../components/ui'
import { usePlayers } from '../hooks'
import { 
  useStatisticsFilters, 
  useTrainingAttendance, 
  usePlayerStatistics, 
  usePlayerComparison,
  useStatisticsView
} from '../hooks/statistics'
import { 
  StatisticsLanding, 
  StatisticsHeader,
  StatisticsTrainingView,
  StatisticsPlayerView
} from '../components/statistics'

/**
 * Statistics dashboard page — displays training statistics and player analytics.
 * 
 * Orchestrates the statistics views by composing specialized hooks and components.
 * Provides two main views: Training & Attendance (general) and Individual Statistics (player-specific).
 * 
 * @remarks This component is intentionally thin - it delegates to specialized hooks and view components.
 * All business logic is handled by hooks, and all view rendering is handled by view components.
 */
const StatisticsPage = () => {
  // Use hooks for data management
  const { players, loading, error: playersError } = usePlayers()
  const filters = useStatisticsFilters()
  const playerStatistics = usePlayerStatistics()
  const playerComparison = usePlayerComparison()
  
  // Use view management hook
  const view = useStatisticsView(players, playerStatistics, playerComparison)
  
  // Only load training attendance when training view is active
  const trainingAttendance = useTrainingAttendance(filters, view.viewMode === 'training')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-3 sm:p-4">
        <p className="text-sm sm:text-base text-[hsl(var(--muted))]">Indlæser...</p>
      </div>
    )
  }

  // Landing View - Choose between Training & Attendance or Individual Statistics
  if (view.viewMode === 'landing') {
    return <StatisticsLanding onSelectView={view.setViewMode} />
  }

  return (
    <section className="flex flex-col gap-4 sm:gap-6 pt-2 sm:pt-4 xl:pt-2">
      <StatisticsHeader viewMode={view.viewMode} onBack={() => view.setViewMode('landing')} />

      {/* Training & Attendance View */}
      {view.viewMode === 'training' && (
        <StatisticsTrainingView filters={filters} trainingAttendance={trainingAttendance} />
      )}

      {/* Player Statistics View */}
      {view.viewMode === 'player' && (
        <StatisticsPlayerView
          view={view}
          players={players}
          loading={loading}
          playerStatistics={playerStatistics}
          playerComparison={playerComparison}
        />
      )}

      {/* Error Display */}
      {(playersError || playerStatistics.error || playerComparison.error || trainingAttendance.error) && (
        <PageCard>
          <div className="p-3 sm:p-4 bg-[hsl(var(--destructive)/.1)] ring-1 ring-[hsl(var(--destructive)/.2)] rounded-lg">
            <p className="text-xs sm:text-sm text-[hsl(var(--destructive))]">
              {playersError || playerStatistics.error || playerComparison.error || trainingAttendance.error}
            </p>
          </div>
        </PageCard>
      )}
    </section>
  )
}

export default StatisticsPage
