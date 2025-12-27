import React, { useCallback } from 'react'
import { PageCard } from '../components/ui'
import { useToast } from '../components/ui/Toast'
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
import { formatDate } from '../lib/formatting'

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
  const { notify } = useToast()
  
  // Use hooks for data management
  const { players, loading, error: playersError } = usePlayers()
  const filters = useStatisticsFilters()
  const playerStatistics = usePlayerStatistics()
  const playerComparison = usePlayerComparison()
  
  // Use view management hook
  const view = useStatisticsView(players, playerStatistics, playerComparison)
  
  // Preload training attendance data in background when Statistics page opens
  // This improves perceived performance when user switches to training view
  // Data loads in background and will be ready when user navigates to training view
  const trainingAttendance = useTrainingAttendance(filters, true)

  /**
   * Exports training statistics to CSV format.
   */
  const exportTrainingStatisticsToCSV = useCallback(() => {
    try {
      const csvRows: string[] = []
      
      // Add header
      csvRows.push('Statistik Eksport - Træning & Fremmøde')
      csvRows.push(`Eksporteret: ${formatDate(new Date().toISOString())}`)
      csvRows.push(`Periode: ${formatDate(filters.dateRange.dateFrom)} - ${formatDate(filters.dateRange.dateTo)}`)
      if (filters.groupNames.length > 0) {
        csvRows.push(`Grupper: ${filters.groupNames.join(', ')}`)
      }
      csvRows.push('') // Empty line
      
      // KPIs Section
      csvRows.push('KPI\'er')
      csvRows.push('Metrik,Værdi,Ændring')
      csvRows.push(`Total indtjekninger,${trainingAttendance.kpis.totalCheckIns},${trainingAttendance.kpis.deltas.totalCheckIns >= 0 ? '+' : ''}${trainingAttendance.kpis.deltas.totalCheckIns.toFixed(1)}%`)
      csvRows.push(`Sessioner,${trainingAttendance.kpis.totalSessions},${trainingAttendance.kpis.deltas.totalSessions >= 0 ? '+' : ''}${trainingAttendance.kpis.deltas.totalSessions.toFixed(1)}%`)
      csvRows.push(`Gennemsnit pr. session,${trainingAttendance.kpis.averageAttendance.toFixed(1)},${trainingAttendance.kpis.deltas.averageAttendance >= 0 ? '+' : ''}${trainingAttendance.kpis.deltas.averageAttendance.toFixed(1)}%`)
      csvRows.push(`Unikke spillere,${trainingAttendance.kpis.uniquePlayers},${trainingAttendance.kpis.deltas.uniquePlayers >= 0 ? '+' : ''}${trainingAttendance.kpis.deltas.uniquePlayers.toFixed(1)}%`)
      csvRows.push('') // Empty line
      
      // Training Group Attendance
      csvRows.push('Fremmøde pr. Træningsgruppe')
      csvRows.push('Gruppe,Gennemsnitligt fremmøde,Total indtjekninger,Sessioner,Unikke spillere')
      trainingAttendance.trainingGroupAttendance.forEach((group) => {
        csvRows.push(`${group.groupName},${group.averageAttendance.toFixed(1)},${group.checkInCount},${group.sessions},${group.uniquePlayers}`)
      })
      csvRows.push('') // Empty line
      
      // Weekday Attendance
      csvRows.push('Fremmøde pr. Ugedag')
      csvRows.push('Ugedag,Gennemsnitligt fremmøde,Total indtjekninger,Sessioner')
      trainingAttendance.weekdayAttendance.forEach((day) => {
        csvRows.push(`${day.weekdayName},${day.averageAttendance.toFixed(1)},${day.checkInCount},${day.sessions}`)
      })
      csvRows.push('') // Empty line
      
      // Top Players (Long Tail)
      csvRows.push('Top Spillere (Indtjekninger)')
      csvRows.push('Spiller,Antal indtjekninger')
      trainingAttendance.playerCheckInLongTail.slice(0, 50).forEach((player) => {
        csvRows.push(`${player.playerName},${player.checkInCount}`)
      })
      
      // Create CSV content
      const csvContent = csvRows.join('\n')
      
      // Create blob and download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel compatibility
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `statistikker_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      notify({
        variant: 'success',
        title: 'Eksport gennemført',
        description: 'Statistikker eksporteret til CSV'
      })
    } catch (err) {
      notify({
        variant: 'danger',
        title: 'Eksport fejlede',
        description: err instanceof Error ? err.message : 'Kunne ikke eksportere statistikker'
      })
    }
  }, [filters, trainingAttendance, notify])

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
      <StatisticsHeader 
        viewMode={view.viewMode} 
        onBack={() => view.setViewMode('landing')}
        onExport={view.viewMode === 'training' ? exportTrainingStatisticsToCSV : undefined}
      />

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
