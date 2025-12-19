import React, { useEffect, useMemo, useState } from 'react'
import type { Player } from '@rundeklar/common'
import { ArrowLeft, Calendar, User, Search, X, Users, Target } from 'lucide-react'
import { PageCard } from '../components/ui'
import { TableSearch } from '../components/ui/Table'
import { useToast } from '../components/ui/Toast'
import { usePlayers } from '../hooks'
import { 
  useStatisticsFilters, 
  useTrainingAttendance, 
  usePlayerStatistics, 
  usePlayerComparison 
} from '../hooks/statistics'
import { 
  StatisticsLanding, 
  StatisticsFilters, 
  KPICards, 
  StatisticsInsights,
  RecentMatches, 
  HeadToHeadResults 
} from '../components/statistics'
import { BarChart, LineChart } from '../components/charts'
import { formatDate } from '../lib/formatting'

type ViewMode = 'landing' | 'training' | 'player'

/**
 * Statistics dashboard page — displays training statistics and player analytics.
 * @remarks Two main views: Training & Attendance (general) and Individual Statistics (player-specific).
 */
const StatisticsPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('landing')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [comparisonPlayerId, setComparisonPlayerId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [comparisonSearch, setComparisonSearch] = useState('')
  const [showComparisonSearch, setShowComparisonSearch] = useState(false)
  
  // Use hooks for data management
  const { players, loading, error: playersError } = usePlayers()
  const filters = useStatisticsFilters()
  const trainingAttendance = useTrainingAttendance(filters, viewMode === 'training')
  const playerStatistics = usePlayerStatistics()
  const playerComparison = usePlayerComparison()
  
  const { notify } = useToast()

  // Load player statistics when player is selected
  useEffect(() => {
    if (selectedPlayerId) {
      void playerStatistics.loadStatistics(selectedPlayerId)
    } else {
      playerStatistics.clearStatistics()
    }
  }, [selectedPlayerId, playerStatistics])

  // Load comparison when both players are selected
  useEffect(() => {
    if (selectedPlayerId && comparisonPlayerId) {
      void playerComparison.loadComparison(selectedPlayerId, comparisonPlayerId)
    } else {
      playerComparison.clearComparison()
    }
  }, [selectedPlayerId, comparisonPlayerId, playerComparison])

  /** Memoized filtered players list — applies search term to name/alias. */
  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return players
    return players.filter((player) => {
      const alias = (player.alias ?? '').toLowerCase()
      return player.name.toLowerCase().includes(term) || alias.includes(term)
    })
  }, [players, search])

  /** Selected player object. */
  const selectedPlayer = useMemo(() => {
    if (!selectedPlayerId) return null
    return players.find((p) => p.id === selectedPlayerId) ?? null
  }, [players, selectedPlayerId])

  /** Comparison player object. */
  const comparisonPlayer = useMemo(() => {
    if (!comparisonPlayerId) return null
    return players.find((p) => p.id === comparisonPlayerId) ?? null
  }, [players, comparisonPlayerId])

  /** Memoized filtered players list for comparison — applies search term to name/alias. */
  const filteredComparisonPlayers = useMemo(() => {
    const term = comparisonSearch.trim().toLowerCase()
    if (!term) return players.filter((p) => p.id !== selectedPlayerId)
    return players.filter((player) => {
      if (player.id === selectedPlayerId) return false
      const alias = (player.alias ?? '').toLowerCase()
      return player.name.toLowerCase().includes(term) || alias.includes(term)
    })
  }, [players, comparisonSearch, selectedPlayerId])

  // Reset player selection when switching away from player view
  useEffect(() => {
    if (viewMode !== 'player') {
      setSelectedPlayerId(null)
      playerStatistics.clearStatistics()
      setComparisonPlayerId(null)
      playerComparison.clearComparison()
    }
  }, [viewMode, playerStatistics, playerComparison])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-3 sm:p-4">
        <p className="text-sm sm:text-base text-[hsl(var(--muted))]">Indlæser...</p>
      </div>
    )
  }

  // Landing View - Choose between Training & Attendance or Individual Statistics
  if (viewMode === 'landing') {
    return <StatisticsLanding onSelectView={setViewMode} />
  }

  return (
    <section className="flex flex-col gap-4 sm:gap-6 pt-2 sm:pt-4 xl:pt-2">
      <header className="flex flex-col gap-2 sm:gap-3 mb-2 lg:mb-1.5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setViewMode('landing')}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] border-hair transition-colors motion-reduce:transition-none flex-shrink-0"
              title="Tilbage"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">
                {viewMode === 'training' ? 'Træning & Fremmøde' : 'Individuel Statistik'}
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-[hsl(var(--muted))] mt-1">
                {viewMode === 'training' 
                  ? 'Se generel statistik over træninger og fremmøde.'
                  : 'Se spillernes statistik og sammenlign data.'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Training & Attendance View */}
      {viewMode === 'training' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Filters Section */}
          <StatisticsFilters filters={filters} />

          {/* KPI Cards Section */}
          <KPICards kpis={trainingAttendance.kpis} />

          {/* Charts Section */}
          <div className="space-y-4 sm:space-y-6">
            {/* Training Group Attendance */}
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
                Fremmøde pr. træningsgruppe
              </h3>
              {trainingAttendance.attendanceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser fremmøde...</p>
                </div>
              ) : trainingAttendance.trainingGroupAttendance.length > 0 ? (
                <BarChart
                  data={trainingAttendance.trainingGroupAttendance.map((group) => ({
                    name: group.groupName,
                    'Indtjekninger': group.checkInCount,
                    'Unikke spillere': group.uniquePlayers
                  }))}
                  bars={[
                    { dataKey: 'Indtjekninger', name: 'Indtjekninger', color: 'hsl(var(--primary))' },
                    { dataKey: 'Unikke spillere', name: 'Unikke spillere', color: 'hsl(var(--accent))' }
                  ]}
                  xAxisLabel="Træningsgruppe"
                  yAxisLabel="Antal"
                  height={300}
                  showLegend={true}
                />
              ) : (
                <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen fremmødedata tilgængelig</p>
              )}
            </div>

            {/* Weekday Attendance Bar Chart */}
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
                Fremmøde pr. ugedag
              </h3>
              {trainingAttendance.weekdayLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser ugedagsanalyse...</p>
                </div>
              ) : trainingAttendance.weekdayAttendance.length > 0 ? (
                <BarChart
                  data={trainingAttendance.weekdayAttendance.map((day) => ({
                    name: day.weekdayName,
                    'Gennemsnitligt fremmøde': day.averageAttendance,
                    'Indtjekninger': day.checkInCount
                  }))}
                  bars={[
                    { dataKey: 'Gennemsnitligt fremmøde', name: 'Gennemsnitligt fremmøde', color: 'hsl(var(--primary))' },
                    { dataKey: 'Indtjekninger', name: 'Indtjekninger', color: 'hsl(var(--accent))' }
                  ]}
                  xAxisLabel="Ugedag"
                  yAxisLabel="Antal"
                  height={300}
                  showLegend={true}
                />
              ) : (
                <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen ugedagsdata tilgængelig</p>
              )}
            </div>

            {/* Training Day 1 vs Training Day 2 Comparison */}
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
                Træningsdag 1 vs. Træningsdag 2
              </h3>
              {trainingAttendance.comparisonLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser sammenligning...</p>
                </div>
              ) : trainingAttendance.trainingDayComparison ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-[hsl(var(--surface))] border-hair p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-[hsl(var(--primary))]" />
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{trainingAttendance.trainingDayComparison.day1.weekdayName}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(var(--muted))]">Indtjekninger:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{trainingAttendance.trainingDayComparison.day1.checkInCount}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(var(--muted))]">Gennemsnit:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{trainingAttendance.trainingDayComparison.day1.averageAttendance.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(var(--muted))]">Unikke spillere:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{trainingAttendance.trainingDayComparison.day1.uniquePlayers}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-[hsl(var(--surface))] border-hair p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-[hsl(var(--accent))]" />
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{trainingAttendance.trainingDayComparison.day2.weekdayName}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(var(--muted))]">Indtjekninger:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{trainingAttendance.trainingDayComparison.day2.checkInCount}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(var(--muted))]">Gennemsnit:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{trainingAttendance.trainingDayComparison.day2.averageAttendance.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(var(--muted))]">Unikke spillere:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{trainingAttendance.trainingDayComparison.day2.uniquePlayers}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ikke nok data til sammenligning (kræver mindst 2 ugedage med data)</p>
              )}
            </div>

            {/* Attendance Over Time per Weekday Line Chart */}
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
                Fremmøde over tid pr. ugedag
              </h3>
              {trainingAttendance.attendanceOverTimeLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser tidsdata...</p>
                </div>
              ) : trainingAttendance.weekdayAttendanceOverTime.length > 0 ? (
                <LineChart
                  data={(() => {
                    // Group by date and create lines for each weekday
                    const dateMap = new Map<string, Record<string, number>>()
                    trainingAttendance.weekdayAttendanceOverTime.forEach((item) => {
                      if (!dateMap.has(item.date)) {
                        dateMap.set(item.date, {})
                      }
                      dateMap.get(item.date)![item.weekdayName] = item.averageAttendance
                    })
                    return Array.from(dateMap.entries())
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, values]) => ({
                        name: formatDate(date, false),
                        ...values
                      }))
                  })()}
                  lines={trainingAttendance.weekdayAttendance.map((day) => ({
                    dataKey: day.weekdayName,
                    name: day.weekdayName,
                    color: `hsl(var(--chart-${(day.weekday % 5) + 1}))`
                  }))}
                  xAxisLabel="Dato"
                  yAxisLabel="Gennemsnitligt fremmøde"
                  height={300}
                  showLegend={true}
                />
              ) : (
                <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen tidsdata tilgængelig</p>
              )}
            </div>
          </div>

          {/* Tables Section */}
          <div className="space-y-4 sm:space-y-6">
            {/* Player Check-In Long-Tail View */}
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
                Spillere pr. indtjekninger
              </h3>
              <p className="text-xs sm:text-sm text-[hsl(var(--muted))] mb-3">
                Oversigt over antal indtjekninger pr. spiller (sorteret efter mest aktive)
              </p>
              {trainingAttendance.longTailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser spillerdata...</p>
                </div>
              ) : trainingAttendance.playerCheckInLongTail.length > 0 ? (
                <div className="space-y-2">
                  <BarChart
                    data={trainingAttendance.playerCheckInLongTail.slice(0, 20).map((player) => ({
                      name: player.playerName.length > 15 ? player.playerName.substring(0, 15) + '...' : player.playerName,
                      'Indtjekninger': player.checkInCount
                    }))}
                    bars={[
                      { dataKey: 'Indtjekninger', name: 'Indtjekninger', color: 'hsl(var(--primary))' }
                    ]}
                    xAxisLabel="Spiller"
                    yAxisLabel="Antal indtjekninger"
                    height={400}
                    showLegend={false}
                  />
                  {trainingAttendance.playerCheckInLongTail.length > 20 && (
                    <p className="text-xs text-[hsl(var(--muted))] text-center mt-2">
                      Viser top 20 af {trainingAttendance.playerCheckInLongTail.length} spillere
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen spillerdata tilgængelig</p>
              )}
            </div>
          </div>

          {/* Insights & Analysis Section */}
          <StatisticsInsights
            trainingDayComparison={trainingAttendance.trainingDayComparison}
            weekdayAttendance={trainingAttendance.weekdayAttendance}
            trainingGroupAttendance={trainingAttendance.trainingGroupAttendance}
            playerCheckInLongTail={trainingAttendance.playerCheckInLongTail}
          />
        </div>
      )}

      {/* Player Statistics View */}
      {viewMode === 'player' && (
        <div>
      {/* FilterBar */}
      {selectedPlayer ? (
        <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] font-semibold text-xs sm:text-sm flex-shrink-0">
                {selectedPlayer.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-semibold text-[hsl(var(--foreground))] truncate">{selectedPlayer.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className="rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair px-2 py-1 text-xs transition-colors motion-reduce:transition-none flex items-center gap-1.5 focus-visible:ring-focus"
                title="Skift spiller"
              >
                <Search className="w-3 h-3" />
                <span className="hidden sm:inline">Skift</span>
              </button>
              <button
                type="button"
                onClick={() => setShowComparisonSearch(!showComparisonSearch)}
                className={`rounded-full border-hair px-2 py-1 text-xs transition-colors motion-reduce:transition-none flex items-center gap-1.5 focus-visible:ring-focus ${
                  showComparisonSearch || comparisonPlayer
                    ? 'bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] border-hair shadow-sm'
                    : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))]'
                }`}
                title="Sammenlign med anden spiller"
              >
                <span className="hidden sm:inline">Sammenlign</span>
                <span className="sm:hidden">Sml.</span>
              </button>
            </div>
          </div>
          {showSearch && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-hair">
              <div className="flex flex-col gap-2 sm:gap-3">
                <TableSearch
                  value={search}
                  onChange={(value) => setSearch(value)}
                  placeholder="Søg efter spiller..."
                />
                <div className="max-h-[200px] overflow-y-auto border-hair rounded-lg">
                  {filteredPlayers.length === 0 ? (
                    <div className="p-2 sm:p-3 text-center text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen spillere fundet</div>
                  ) : (
                    <div className="divide-y divide-[hsl(var(--line)/.12)]">
                      {filteredPlayers.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => {
                            setSelectedPlayerId(player.id)
                            setShowSearch(false)
                            setSearch('')
                          }}
                          className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left hover:bg-[hsl(var(--surface-2))] transition-colors motion-reduce:transition-none focus-visible:ring-focus ${
                            selectedPlayerId === player.id ? 'bg-[hsl(var(--primary)/.1)]' : ''
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))]">{player.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {(showComparisonSearch || comparisonPlayer) && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-hair">
              {!comparisonPlayer ? (
                <div className="space-y-2 sm:space-y-3">
                  <TableSearch
                    value={comparisonSearch}
                    onChange={(value) => {
                      setComparisonSearch(value)
                      if (value.trim()) {
                        setShowComparisonSearch(true)
                      }
                    }}
                    placeholder="Søg efter spiller at sammenligne med..."
                  />
                  {showComparisonSearch && filteredComparisonPlayers.length > 0 && (
                    <div className="max-h-[200px] overflow-y-auto border-hair rounded-lg">
                      <div className="divide-y divide-[hsl(var(--line)/.12)]">
                        {filteredComparisonPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => {
                              setComparisonPlayerId(player.id)
                              setComparisonSearch('')
                              setShowComparisonSearch(false)
                            }}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left hover:bg-[hsl(var(--surface-2))] transition-colors motion-reduce:transition-none focus-visible:ring-focus"
                          >
                            <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))]">{player.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] font-semibold text-xs sm:text-sm flex-shrink-0">
                        {comparisonPlayer.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Sammenlignet med</span>
                        <span className="text-xs sm:text-sm font-semibold text-[hsl(var(--foreground))] truncate">{comparisonPlayer.name}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setComparisonPlayerId(null)
                        setComparisonSearch('')
                        setShowComparisonSearch(false)
                      }}
                      className="h-6 w-6 rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] border-hair transition-colors motion-reduce:transition-none flex items-center justify-center focus-visible:ring-focus flex-shrink-0"
                      title="Fjern sammenligning"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {playerComparison.loading ? (
                    <div className="flex items-center justify-center py-3 sm:py-4">
                      <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser sammenligning...</p>
                    </div>
                  ) : playerComparison.comparisonStats ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                        <div className="flex items-center justify-between rounded-md bg-[hsl(var(--surface))] border-hair px-2 sm:px-3 py-1.5 sm:py-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--primary))] flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Spillet sammen</span>
                              <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">
                                {playerComparison.comparisonStats.partnerCount} {playerComparison.comparisonStats.partnerCount === 1 ? 'gang' : 'gange'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between rounded-md bg-[hsl(var(--surface))] border-hair px-2 sm:px-3 py-1.5 sm:py-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--danger))] flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Spillet mod</span>
                              <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">
                                {playerComparison.comparisonStats.opponentCount} {playerComparison.comparisonStats.opponentCount === 1 ? 'gang' : 'gange'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Head-to-Head Results */}
                      {playerComparison.comparisonStats.headToHeadMatches.length > 0 && (
                        <div className="mt-4">
                          <HeadToHeadResults
                            results={playerComparison.comparisonStats.headToHeadMatches}
                            player1Name={selectedPlayer.name}
                            player2Name={comparisonPlayer!.name}
                            player1Wins={playerComparison.comparisonStats.player1Wins}
                            player2Wins={playerComparison.comparisonStats.player2Wins}
                          />
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <PageCard>
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] mb-1.5 sm:mb-2">
                Vælg spiller
              </label>
              <TableSearch
                value={search}
                onChange={(value) => setSearch(value)}
                placeholder="Søg efter spiller..."
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto border-hair rounded-lg">
              {filteredPlayers.length === 0 ? (
                <div className="p-3 sm:p-4 text-center text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen spillere fundet</div>
              ) : (
                <div className="divide-y divide-[hsl(var(--line)/.12)]">
                  {filteredPlayers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setSelectedPlayerId(player.id)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-[hsl(var(--surface-2))] transition-colors motion-reduce:transition-none focus-visible:ring-focus"
                    >
                      <span className="text-sm sm:text-base font-medium text-[hsl(var(--foreground))]">{player.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PageCard>
      )}

          {/* Statistics Display */}
          {selectedPlayer && (
        <div className="space-y-4 sm:space-y-6">
          {playerStatistics.loading ? (
            <>
              {/* KPI Skeletons */}
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-1">
                      <div className="h-3 sm:h-4 w-20 sm:w-24 bg-[hsl(var(--surface-2))] rounded animate-pulse" />
                      <div className="h-6 sm:h-8 w-12 sm:w-16 bg-[hsl(var(--surface-2))] rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Season List Skeleton */}
              <div className="card-glass-active border-hair rounded-lg p-4 md:p-5 shadow-sm">
                <div className="space-y-3">
                  <div className="h-5 w-48 bg-[hsl(var(--surface-2))] rounded animate-pulse" />
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-[hsl(var(--surface-2))] rounded-md animate-pulse" />
                    ))}
                  </div>
                </div>
              </div>
              {/* Top Lists Skeletons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="card-glass-active border-hair rounded-lg p-4 md:p-5 shadow-sm">
                    <div className="space-y-3">
                      <div className="h-5 w-32 bg-[hsl(var(--surface-2))] rounded animate-pulse" />
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((j) => (
                          <div key={j} className="h-10 bg-[hsl(var(--surface-2))] rounded-md animate-pulse" />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : playerStatistics.statistics ? (
            <>
              {/* KPI Tiles */}
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-1">
                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indtjekninger</span>
                <span className="text-xl sm:text-2xl font-semibold text-[hsl(var(--foreground))]">{playerStatistics.statistics.totalCheckIns}</span>
                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Total</span>
              </div>
            </div>
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-1">
                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Kampe</span>
                <span className="text-xl sm:text-2xl font-semibold text-[hsl(var(--foreground))]">{playerStatistics.statistics.totalMatches}</span>
                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Total</span>
              </div>
            </div>
            {playerStatistics.statistics.matchesWithResults > 0 && (
              <>
                <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-1">
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Sejre</span>
                    <span className="text-xl sm:text-2xl font-semibold text-[hsl(var(--success))]">{playerStatistics.statistics.totalWins}</span>
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">
                      {playerStatistics.statistics.totalLosses} nederlag • {playerStatistics.statistics.winRate.toFixed(1)}% win rate
                    </span>
                  </div>
                </div>
                <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-1">
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Win Rate</span>
                    <span className="text-xl sm:text-2xl font-semibold text-[hsl(var(--foreground))]">
                      {playerStatistics.statistics.winRate.toFixed(1)}%
                    </span>
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">
                      {playerStatistics.statistics.matchesWithResults} kampe med resultat
                    </span>
                  </div>
                </div>
              </>
            )}
            {playerStatistics.statistics.matchesWithResults === 0 && (
              <>
                <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-1">
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Sidst spillet</span>
                    <span className="text-lg sm:text-xl md:text-2xl font-semibold text-[hsl(var(--foreground))]">
                      {formatDate(playerStatistics.statistics.lastPlayedDate, false)}
                    </span>
                  </div>
                </div>
                <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-1">
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Mest spillede kategori</span>
                    <span className="text-lg sm:text-xl md:text-2xl font-semibold text-[hsl(var(--foreground))]">
                      {playerStatistics.statistics.preferredCategory ?? 'Ingen'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Win/Loss Trend Chart */}
          {playerStatistics.statistics.matchesWithResults > 0 && playerStatistics.statistics.winsBySeason && Object.keys(playerStatistics.statistics.winsBySeason).length > 0 && (
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
                Sejre/Nederlag pr. sæson
              </h3>
              <BarChart
                data={Object.keys(playerStatistics.statistics.winsBySeason)
                  .sort()
                  .map((season) => ({
                    name: season,
                    Sejre: (playerStatistics.statistics.winsBySeason?.[season]) || 0,
                    Nederlag: (playerStatistics.statistics.lossesBySeason?.[season]) || 0
                  }))}
                bars={[
                  { dataKey: 'Sejre', name: 'Sejre', color: 'hsl(var(--success))' },
                  { dataKey: 'Nederlag', name: 'Nederlag', color: 'hsl(var(--danger))' }
                ]}
                xAxisLabel="Sæson"
                yAxisLabel="Antal"
                height={250}
                showLegend={true}
              />
            </div>
          )}

          {/* Recent Matches */}
          {playerStatistics.statistics.recentMatches && playerStatistics.statistics.recentMatches.length > 0 && (
            <RecentMatches matches={playerStatistics.statistics.recentMatches} playerName={selectedPlayer.name} />
          )}

          {/* Check-ins by Season */}
          {Object.keys(playerStatistics.statistics.checkInsBySeason).length > 0 && (
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">Indtjekninger pr. sæson</h3>
                <div className="space-y-1.5 sm:space-y-2">
                  {Object.entries(playerStatistics.statistics.checkInsBySeason)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([season, count]) => (
                      <div key={season} className="flex items-center justify-between rounded-md bg-[hsl(var(--surface))] border-hair px-2 sm:px-3 py-1.5 sm:py-2 hover:shadow-sm transition-shadow motion-reduce:transition-none">
                        <span className="text-xs sm:text-sm text-[hsl(var(--foreground))]">Sæson {season}</span>
                        <span className="rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair px-2 py-0.5 sm:py-1 text-xs">
                          {String(count)} {Number(count) === 1 ? 'gang' : 'gange'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Partners and Opponents Section - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
            {/* Top Partners Section */}
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <div className="space-y-2 sm:space-y-3">
                <h2 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">Top 5 makkere</h2>
                {playerStatistics.statistics.partners.length === 0 ? (
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen partnerdata tilgængelig</p>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    {playerStatistics.statistics.partners.map((partner, index) => (
                      <div
                        key={partner.playerId}
                        className="flex items-center justify-between rounded-md bg-[hsl(var(--surface))] border-hair px-2 sm:px-3 py-1.5 sm:py-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="h-5 w-5 sm:h-6 sm:w-6 grid place-items-center rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair text-xs font-semibold flex-shrink-0">
                            {index + 1}
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] truncate">{partner.names}</span>
                        </div>
                        <span className="rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs flex-shrink-0 ml-1 sm:ml-2">
                          {partner.count} {partner.count === 1 ? 'gang' : 'gange'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top Opponents Section */}
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <div className="space-y-2 sm:space-y-3">
                <h2 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">Top 5 modstandere</h2>
                {playerStatistics.statistics.opponents.length === 0 ? (
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen modstanderdata tilgængelig</p>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    {playerStatistics.statistics.opponents.map((opponent, index) => (
                      <div
                        key={opponent.playerId}
                        className="flex items-center justify-between rounded-md bg-[hsl(var(--surface))] border-hair px-2 sm:px-3 py-1.5 sm:py-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="h-5 w-5 sm:h-6 sm:w-6 grid place-items-center rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair text-xs font-semibold flex-shrink-0">
                            {index + 1}
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] truncate">{opponent.names}</span>
                        </div>
                        <span className="rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs flex-shrink-0 ml-1 sm:ml-2">
                          {opponent.count} {opponent.count === 1 ? 'gang' : 'gange'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
            </>
          ) : null}
          </div>
        )}

        {/* Empty State - Only show in player view when no player selected */}
        {!selectedPlayer && !loading && (
          <PageCard>
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
              <User className="w-10 h-10 sm:w-12 sm:h-12 text-[hsl(var(--muted))] mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg font-medium text-[hsl(var(--foreground))] mb-1.5 sm:mb-2">Vælg en spiller</p>
              <p className="text-xs sm:text-sm text-[hsl(var(--muted))] px-4">Vælg en spiller for at se individuel statistik.</p>
            </div>
          </PageCard>
        )}
        </div>
      )}

      {/* Error Display */}
      {(playersError || playerStatistics.error || playerComparison.error) && (
        <PageCard>
          <div className="p-3 sm:p-4 bg-[hsl(var(--destructive)/.1)] ring-1 ring-[hsl(var(--destructive)/.2)] rounded-lg">
            <p className="text-xs sm:text-sm text-[hsl(var(--destructive))]">
              {playersError || playerStatistics.error || playerComparison.error}
            </p>
          </div>
        </PageCard>
      )}
    </section>
  )
}

export default StatisticsPage
