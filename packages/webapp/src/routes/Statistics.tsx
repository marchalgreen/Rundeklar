import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { Player, PlayerStatistics, PlayerComparison, TrainingGroupAttendance, WeekdayAttendance, PlayerCheckInLongTail, WeekdayAttendanceOverTime, TrainingDayComparison } from '@rundeklar/common'
import { BarChart3, Users, Target, X, Search, Trophy, TrendingUp, ArrowLeft, Calendar, User, Filter, ChevronDown, Lightbulb, Activity, Clock } from 'lucide-react'
import api from '../api'
import statsApi from '../api/stats'
import { PageCard } from '../components/ui'
import { TableSearch } from '../components/ui/Table'
import { useToast } from '../components/ui/Toast'
import { formatDate } from '../lib/formatting'
import { normalizeError } from '../lib/errors'
import { RecentMatches, HeadToHeadResults } from '../components/statistics'
import { BarChart, LineChart, Heatmap } from '../components/charts'

type ViewMode = 'landing' | 'training' | 'player'

/**
 * Statistics dashboard page — displays training statistics and player analytics.
 * @remarks Two main views: Training & Attendance (general) and Individual Statistics (player-specific).
 */
const StatisticsPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('landing')
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<PlayerStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(false)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { notify } = useToast()
  
  // Player comparison state
  const [comparisonSearch, setComparisonSearch] = useState('')
  const [comparisonPlayerId, setComparisonPlayerId] = useState<string | null>(null)
  const [comparisonStats, setComparisonStats] = useState<PlayerComparison | null>(null)
  const [loadingComparison, setLoadingComparison] = useState(false)
  const [showComparisonSearch, setShowComparisonSearch] = useState(false)
  
  // Training group attendance state
  const [trainingGroupAttendance, setTrainingGroupAttendance] = useState<TrainingGroupAttendance[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendancePeriod, setAttendancePeriod] = useState<'all' | 'last7days' | 'lastMonth' | 'lastSeason' | 'month' | 'custom'>('lastSeason')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [customDateFrom, setCustomDateFrom] = useState<string>('')
  const [customDateTo, setCustomDateTo] = useState<string>('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [allGroups, setAllGroups] = useState<string[]>([])
  
  // Weekday analysis state
  const [weekdayAttendance, setWeekdayAttendance] = useState<WeekdayAttendance[]>([])
  const [weekdayLoading, setWeekdayLoading] = useState(false)
  
  // Long-tail view state
  const [playerCheckInLongTail, setPlayerCheckInLongTail] = useState<PlayerCheckInLongTail[]>([])
  const [longTailLoading, setLongTailLoading] = useState(false)
  
  // Attendance over time state
  const [weekdayAttendanceOverTime, setWeekdayAttendanceOverTime] = useState<WeekdayAttendanceOverTime[]>([])
  const [attendanceOverTimeLoading, setAttendanceOverTimeLoading] = useState(false)
  
  // Training day comparison state
  const [trainingDayComparison, setTrainingDayComparison] = useState<TrainingDayComparison | null>(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  
  // KPI state
  const [totalCheckIns, setTotalCheckIns] = useState(0)
  const [totalSessions, setTotalSessions] = useState(0)
  const [averageAttendance, setAverageAttendance] = useState(0)
  const [uniquePlayers, setUniquePlayers] = useState(0)

  /** Loads all players from API. */
  const loadPlayers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.players.list()
      setPlayers(result)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      setError(normalizedError.message)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente spillere',
        description: normalizedError.message
      })
    } finally {
      setLoading(false)
    }
  }, [notify])

  /** Loads player statistics from API. */
  const loadStatistics = useCallback(
    async (playerId: string) => {
      setLoadingStats(true)
      setError(null)
      try {
        const stats = await statsApi.getPlayerStatistics(playerId)
        setStatistics(stats)
      } catch (err: unknown) {
        const normalizedError = normalizeError(err)
        setError(normalizedError.message)
        notify({
          variant: 'danger',
          title: 'Kunne ikke hente statistik',
          description: normalizedError.message
        })
      } finally {
        setLoadingStats(false)
      }
    },
    [notify]
  )

  // WHY: Load players on mount
  useEffect(() => {
    void loadPlayers()
  }, [loadPlayers])

  // WHY: Load statistics when player is selected
  useEffect(() => {
    if (selectedPlayerId) {
      void loadStatistics(selectedPlayerId)
    } else {
      setStatistics(null)
    }
  }, [selectedPlayerId, loadStatistics])

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

  /** Loads comparison statistics between two players. */
  const loadComparison = useCallback(
    async (playerId1: string, playerId2: string) => {
      setLoadingComparison(true)
      setError(null)
      try {
        const stats = await statsApi.getPlayerComparison(playerId1, playerId2)
        setComparisonStats(stats)
      } catch (err: unknown) {
        const normalizedError = normalizeError(err)
        setError(normalizedError.message)
        notify({
          variant: 'danger',
          title: 'Kunne ikke hente sammenligning',
          description: normalizedError.message
        })
      } finally {
        setLoadingComparison(false)
      }
    },
    [notify]
  )

  // WHY: Load comparison when both players are selected
  useEffect(() => {
    if (selectedPlayerId && comparisonPlayerId) {
      void loadComparison(selectedPlayerId, comparisonPlayerId)
    } else {
      setComparisonStats(null)
    }
  }, [selectedPlayerId, comparisonPlayerId, loadComparison])

  // Calculate date range based on period selection
  const getDateRange = useCallback((): { dateFrom?: string; dateTo?: string } => {
    const now = new Date()
    
    switch (attendancePeriod) {
      case 'last7days': {
        const dateFrom = new Date(now)
        dateFrom.setDate(dateFrom.getDate() - 7)
        return { dateFrom: dateFrom.toISOString(), dateTo: now.toISOString() }
      }
      case 'lastMonth': {
        const dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const dateTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        return { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() }
      }
      case 'lastSeason': {
        // Season runs from August to July
        const currentMonth = now.getMonth() + 1 // 1-12
        let seasonStartYear: number
        if (currentMonth >= 8) {
          // August-December: current year is start
          seasonStartYear = now.getFullYear()
        } else {
          // January-July: previous year is start
          seasonStartYear = now.getFullYear() - 1
        }
        const dateFrom = new Date(seasonStartYear, 7, 1) // August 1st
        return { dateFrom: dateFrom.toISOString(), dateTo: now.toISOString() }
      }
      case 'custom': {
        return {
          dateFrom: customDateFrom || undefined,
          dateTo: customDateTo || undefined
        }
      }
      case 'month': {
        const [year, month] = selectedMonth.split('-').map(Number)
        const dateFrom = new Date(year, month - 1, 1).toISOString()
        const dateTo = new Date(year, month, 0, 23, 59, 59).toISOString()
        return { dateFrom, dateTo }
      }
      default:
        return {}
    }
  }, [attendancePeriod, selectedMonth, customDateFrom, customDateTo])

  // Load all training groups
  const loadAllGroups = useCallback(async () => {
    try {
      const allPlayers = await api.players.list()
      const groupsSet = new Set<string>()
      allPlayers.forEach((player) => {
        const playerGroups = player.trainingGroups || []
        playerGroups.forEach((group) => {
          if (group) groupsSet.add(group)
        })
      })
      const groups = Array.from(groupsSet).sort()
      setAllGroups(groups)
    } catch (err: unknown) {
      // Silently fail - groups will just be empty
      console.error('Failed to load groups', err)
    }
  }, [])

  // Load training group attendance
  const loadTrainingGroupAttendance = useCallback(async () => {
    setAttendanceLoading(true)
    try {
      const { dateFrom, dateTo } = getDateRange()
      const groupNames = selectedGroups.length > 0 ? selectedGroups : undefined
      const attendance = await statsApi.getTrainingGroupAttendance(dateFrom, dateTo, groupNames)
      setTrainingGroupAttendance(attendance)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente fremmøde',
        description: normalizedError.message
      })
    } finally {
      setAttendanceLoading(false)
    }
  }, [getDateRange, selectedGroups, notify])

  // Load weekday attendance
  const loadWeekdayAttendance = useCallback(async () => {
    setWeekdayLoading(true)
    try {
      const { dateFrom, dateTo } = getDateRange()
      const groupNames = selectedGroups.length > 0 ? selectedGroups : undefined
      const weekdayData = await statsApi.getWeekdayAttendance(dateFrom, dateTo, groupNames)
      setWeekdayAttendance(weekdayData)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente ugedagsanalyse',
        description: normalizedError.message
      })
    } finally {
      setWeekdayLoading(false)
    }
  }, [getDateRange, selectedGroups, notify])

  // Load player check-in long-tail
  const loadPlayerCheckInLongTail = useCallback(async () => {
    setLongTailLoading(true)
    try {
      const { dateFrom, dateTo } = getDateRange()
      const groupNames = selectedGroups.length > 0 ? selectedGroups : undefined
      const longTailData = await statsApi.getPlayerCheckInLongTail(dateFrom, dateTo, groupNames)
      setPlayerCheckInLongTail(longTailData)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente spillerdata',
        description: normalizedError.message
      })
    } finally {
      setLongTailLoading(false)
    }
  }, [getDateRange, selectedGroups, notify])

  // Load weekday attendance over time
  const loadWeekdayAttendanceOverTime = useCallback(async () => {
    setAttendanceOverTimeLoading(true)
    try {
      const { dateFrom, dateTo } = getDateRange()
      const groupNames = selectedGroups.length > 0 ? selectedGroups : undefined
      const overTimeData = await statsApi.getWeekdayAttendanceOverTime(dateFrom, dateTo, groupNames)
      setWeekdayAttendanceOverTime(overTimeData)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente tidsdata',
        description: normalizedError.message
      })
    } finally {
      setAttendanceOverTimeLoading(false)
    }
  }, [getDateRange, selectedGroups, notify])

  // Load training day comparison
  const loadTrainingDayComparison = useCallback(async () => {
    setComparisonLoading(true)
    try {
      const { dateFrom, dateTo } = getDateRange()
      const groupNames = selectedGroups.length > 0 ? selectedGroups : undefined
      const comparison = await statsApi.getTrainingDayComparison(dateFrom, dateTo, groupNames)
      setTrainingDayComparison(comparison)
    } catch (err: unknown) {
      const normalizedError = normalizeError(err)
      notify({
        variant: 'danger',
        title: 'Kunne ikke hente sammenligning',
        description: normalizedError.message
      })
    } finally {
      setComparisonLoading(false)
    }
  }, [getDateRange, selectedGroups, notify])

  // Calculate KPIs from training group attendance
  useEffect(() => {
    if (trainingGroupAttendance.length > 0) {
      const total = trainingGroupAttendance.reduce((sum, group) => sum + group.checkInCount, 0)
      const totalSessionsCount = new Set(
        trainingGroupAttendance.flatMap(group => Array.from({ length: group.sessions }, (_, i) => `session-${i}`))
      ).size
      const avg = trainingGroupAttendance.reduce((sum, group) => sum + group.averageAttendance, 0) / trainingGroupAttendance.length
      const unique = trainingGroupAttendance.reduce((sum, group) => sum + group.uniquePlayers, 0)
      
      setTotalCheckIns(total)
      setTotalSessions(totalSessionsCount)
      setAverageAttendance(Math.round(avg * 10) / 10)
      setUniquePlayers(unique)
    } else {
      setTotalCheckIns(0)
      setTotalSessions(0)
      setAverageAttendance(0)
      setUniquePlayers(0)
    }
  }, [trainingGroupAttendance])

  useEffect(() => {
    // Load all groups when entering training view
    if (viewMode === 'training') {
      void loadAllGroups()
    }
  }, [viewMode, loadAllGroups])

  useEffect(() => {
    // Only load training attendance when in training view
    if (viewMode === 'training') {
      void loadTrainingGroupAttendance()
      void loadWeekdayAttendance()
      void loadPlayerCheckInLongTail()
      void loadWeekdayAttendanceOverTime()
      void loadTrainingDayComparison()
    }
  }, [loadTrainingGroupAttendance, loadWeekdayAttendance, loadPlayerCheckInLongTail, loadWeekdayAttendanceOverTime, loadTrainingDayComparison, viewMode])

  // Reset player selection when switching away from player view
  useEffect(() => {
    if (viewMode !== 'player') {
      setSelectedPlayerId(null)
      setStatistics(null)
      setComparisonPlayerId(null)
      setComparisonStats(null)
    }
  }, [viewMode])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-3 sm:p-4">
        <p className="text-sm sm:text-base text-[hsl(var(--muted))]">Indlæser...</p>
      </div>
    )
  }

  // Landing View - Choose between Training & Attendance or Individual Statistics
  if (viewMode === 'landing') {
    return (
      <section className="flex flex-col gap-4 sm:gap-6 pt-2 sm:pt-4 xl:pt-2">
        <header className="flex flex-col gap-2 sm:gap-3 mb-2 lg:mb-1.5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">Statistik</h1>
              <p className="text-xs sm:text-sm md:text-base text-[hsl(var(--muted))] mt-1">Vælg en statistiktype for at se data.</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Training & Attendance Card */}
          <button
            type="button"
            onClick={() => setViewMode('training')}
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
            onClick={() => setViewMode('player')}
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
          {/* Filters Section - Prominent Group Filter */}
          <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">
                Filtre
              </h3>
              
              {/* Period Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))]">
                  Periode
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAttendancePeriod('last7days')}
                    className={`px-2 sm:px-3 py-1 text-xs rounded transition-colors ${
                      attendancePeriod === 'last7days'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface))]'
                    }`}
                  >
                    Sidste 7 dage
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendancePeriod('lastMonth')}
                    className={`px-2 sm:px-3 py-1 text-xs rounded transition-colors ${
                      attendancePeriod === 'lastMonth'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface))]'
                    }`}
                  >
                    Sidste måned
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendancePeriod('lastSeason')}
                    className={`px-2 sm:px-3 py-1 text-xs rounded transition-colors ${
                      attendancePeriod === 'lastSeason'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface))]'
                    }`}
                  >
                    Denne sæson
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendancePeriod('month')}
                    className={`px-2 sm:px-3 py-1 text-xs rounded transition-colors ${
                      attendancePeriod === 'month'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface))]'
                    }`}
                  >
                    Måned
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendancePeriod('custom')}
                    className={`px-2 sm:px-3 py-1 text-xs rounded transition-colors ${
                      attendancePeriod === 'custom'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface))]'
                    }`}
                  >
                    Tilpasset
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendancePeriod('all')}
                    className={`px-2 sm:px-3 py-1 text-xs rounded transition-colors ${
                      attendancePeriod === 'all'
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface))]'
                    }`}
                  >
                    Hele perioden
                  </button>
                </div>
                
                {/* Period-specific inputs */}
                {attendancePeriod === 'month' && (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="mt-2 px-2 py-1 text-xs rounded bg-[hsl(var(--surface))] border-hair max-w-[200px]"
                  />
                )}
                {attendancePeriod === 'custom' && (
                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      placeholder="Fra dato"
                      className="px-2 py-1 text-xs rounded bg-[hsl(var(--surface))] border-hair"
                    />
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      placeholder="Til dato"
                      className="px-2 py-1 text-xs rounded bg-[hsl(var(--surface))] border-hair"
                    />
                  </div>
                )}
              </div>

              {/* Training Group Multi-Select - Button Layout */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[hsl(var(--foreground))]">
                  Filtrer efter træningsgruppe
                </label>
                {allGroups.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--muted))]">Ingen træningsgrupper fundet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allGroups.map((group) => {
                      const isSelected = selectedGroups.includes(group)
                      return (
                        <button
                          key={group}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGroups(selectedGroups.filter((g) => g !== group))
                            } else {
                              setSelectedGroups([...selectedGroups, group])
                            }
                          }}
                          className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition-all ${
                            isSelected
                              ? 'bg-[hsl(var(--primary))] text-white font-medium shadow-sm'
                              : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--foreground))]'
                          }`}
                        >
                          {group}
                        </button>
                      )
                    })}
                  </div>
                )}
                {selectedGroups.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[hsl(var(--muted))]">
                      {selectedGroups.length} {selectedGroups.length === 1 ? 'gruppe' : 'grupper'} valgt
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedGroups([])}
                      className="text-xs text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors underline"
                    >
                      Ryd valg
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KPI Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Total indtjekninger</span>
                  <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">{totalCheckIns}</span>
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
                  <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">{totalSessions}</span>
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
                  <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">{averageAttendance.toFixed(1)}</span>
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
                  <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">{uniquePlayers}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="space-y-4 sm:space-y-6">
            {/* Training Group Attendance */}
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
                Fremmøde pr. træningsgruppe
              </h3>
            {attendanceLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser fremmøde...</p>
              </div>
            ) : trainingGroupAttendance.length > 0 ? (
              <BarChart
                data={trainingGroupAttendance.map((group) => ({
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
              {weekdayLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser ugedagsanalyse...</p>
                </div>
              ) : weekdayAttendance.length > 0 ? (
                <BarChart
                  data={weekdayAttendance.map((day) => ({
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

            {/* Weekday Heatmap */}
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
                Ugedags Heatmap
              </h3>
              <p className="text-xs sm:text-sm text-[hsl(var(--muted))] mb-3">
                Visuel oversigt over fremmøde pr. ugedag
              </p>
              {weekdayLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser...</p>
                </div>
              ) : weekdayAttendance.length > 0 ? (
                <Heatmap
                  data={weekdayAttendance.map((day) => ({
                    weekday: day.weekday,
                    weekdayName: day.weekdayName,
                    value: day.averageAttendance
                  }))}
                  height={150}
                  showLabels={true}
                />
              ) : (
                <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen data tilgængelig</p>
              )}
            </div>

            {/* Training Day 1 vs Training Day 2 Comparison */}
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
                Træningsdag 1 vs. Træningsdag 2
              </h3>
              {comparisonLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser sammenligning...</p>
                </div>
              ) : trainingDayComparison ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-[hsl(var(--surface))] border-hair p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-[hsl(var(--primary))]" />
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{trainingDayComparison.day1.weekdayName}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(var(--muted))]">Indtjekninger:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{trainingDayComparison.day1.checkInCount}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(var(--muted))]">Gennemsnit:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{trainingDayComparison.day1.averageAttendance.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(var(--muted))]">Unikke spillere:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{trainingDayComparison.day1.uniquePlayers}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-[hsl(var(--surface))] border-hair p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-[hsl(var(--accent))]" />
                      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{trainingDayComparison.day2.weekdayName}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(var(--muted))]">Indtjekninger:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{trainingDayComparison.day2.checkInCount}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(var(--muted))]">Gennemsnit:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{trainingDayComparison.day2.averageAttendance.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[hsl(var(--muted))]">Unikke spillere:</span>
                        <span className="font-semibold text-[hsl(var(--foreground))]">{trainingDayComparison.day2.uniquePlayers}</span>
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
              {attendanceOverTimeLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser tidsdata...</p>
                </div>
              ) : weekdayAttendanceOverTime.length > 0 ? (
                <LineChart
                  data={(() => {
                    // Group by date and create lines for each weekday
                    const dateMap = new Map<string, Record<string, number>>()
                    weekdayAttendanceOverTime.forEach((item) => {
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
                  lines={weekdayAttendance.map((day) => ({
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
            {longTailLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser spillerdata...</p>
              </div>
            ) : playerCheckInLongTail.length > 0 ? (
              <div className="space-y-2">
                <BarChart
                  data={playerCheckInLongTail.slice(0, 20).map((player) => ({
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
                {playerCheckInLongTail.length > 20 && (
                  <p className="text-xs text-[hsl(var(--muted))] text-center mt-2">
                    Viser top 20 af {playerCheckInLongTail.length} spillere
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen spillerdata tilgængelig</p>
            )}
          </div>
          </div>

          {/* Insights & Analysis Section */}
          <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-[hsl(var(--warning))]" />
              <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">
                Insights & Analyser
              </h3>
            </div>
            <div className="space-y-3">
              {trainingDayComparison && (
                <div className="p-3 rounded-lg bg-[hsl(var(--surface))] border-hair">
                  <p className="text-xs sm:text-sm text-[hsl(var(--foreground))]">
                    <strong>{trainingDayComparison.day1.weekdayName}</strong> har {
                      trainingDayComparison.difference.percentageDifference > 0 ? 'højere' : 'lavere'
                    } fremmøde end <strong>{trainingDayComparison.day2.weekdayName}</strong> med {
                      Math.abs(trainingDayComparison.difference.percentageDifference).toFixed(1)
                    }% ({Math.abs(trainingDayComparison.difference.checkInCount)} flere indtjekninger).
                  </p>
                </div>
              )}
              {weekdayAttendance.length > 0 && (
                <div className="p-3 rounded-lg bg-[hsl(var(--surface))] border-hair">
                  <p className="text-xs sm:text-sm text-[hsl(var(--foreground))]">
                    Den mest aktive træningsdag er <strong>{
                      weekdayAttendance.reduce((max, day) => 
                        day.averageAttendance > max.averageAttendance ? day : max
                      ).weekdayName
                    }</strong> med et gennemsnitligt fremmøde på {
                      weekdayAttendance.reduce((max, day) => 
                        day.averageAttendance > max.averageAttendance ? day : max
                      ).averageAttendance.toFixed(1)
                    } spillere pr. session.
                  </p>
                </div>
              )}
              {trainingGroupAttendance.length > 0 && (
                <div className="p-3 rounded-lg bg-[hsl(var(--surface))] border-hair">
                  <p className="text-xs sm:text-sm text-[hsl(var(--foreground))]">
                    Den mest aktive træningsgruppe er <strong>{
                      trainingGroupAttendance.reduce((max, group) => 
                        group.averageAttendance > max.averageAttendance ? group : max
                      ).groupName
                    }</strong> med et gennemsnitligt fremmøde på {
                      trainingGroupAttendance.reduce((max, group) => 
                        group.averageAttendance > max.averageAttendance ? group : max
                      ).averageAttendance.toFixed(1)
                    } spillere pr. session.
                  </p>
                </div>
              )}
              {playerCheckInLongTail.length > 0 && (
                <div className="p-3 rounded-lg bg-[hsl(var(--surface))] border-hair">
                  <p className="text-xs sm:text-sm text-[hsl(var(--foreground))]">
                    Den mest aktive spiller er <strong>{playerCheckInLongTail[0].playerName}</strong> med {
                      playerCheckInLongTail[0].checkInCount
                    } indtjekninger i den valgte periode.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Player Statistics View */}
      {viewMode === 'player' && (
        <>
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
                  
                  {loadingComparison ? (
                    <div className="flex items-center justify-center py-3 sm:py-4">
                      <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser sammenligning...</p>
                    </div>
                  ) : comparisonStats ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                        <div className="flex items-center justify-between rounded-md bg-[hsl(var(--surface))] border-hair px-2 sm:px-3 py-1.5 sm:py-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--primary))] flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Spillet sammen</span>
                              <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">
                                {comparisonStats.partnerCount} {comparisonStats.partnerCount === 1 ? 'gang' : 'gange'}
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
                                {comparisonStats.opponentCount} {comparisonStats.opponentCount === 1 ? 'gang' : 'gange'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Head-to-Head Results */}
                      {comparisonStats.headToHeadMatches.length > 0 && (
                        <div className="mt-4">
                          <HeadToHeadResults
                            results={comparisonStats.headToHeadMatches}
                            player1Name={selectedPlayer.name}
                            player2Name={comparisonPlayer!.name}
                            player1Wins={comparisonStats.player1Wins}
                            player2Wins={comparisonStats.player2Wins}
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
          {loadingStats ? (
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
          ) : statistics ? (
            <>
              {/* KPI Tiles */}
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-1">
                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indtjekninger</span>
                <span className="text-xl sm:text-2xl font-semibold text-[hsl(var(--foreground))]">{statistics.totalCheckIns}</span>
                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Total</span>
              </div>
            </div>
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-1">
                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Kampe</span>
                <span className="text-xl sm:text-2xl font-semibold text-[hsl(var(--foreground))]">{statistics.totalMatches}</span>
                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Total</span>
              </div>
            </div>
            {statistics.matchesWithResults > 0 && (
              <>
                <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-1">
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Sejre</span>
                    <span className="text-xl sm:text-2xl font-semibold text-[hsl(var(--success))]">{statistics.totalWins}</span>
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">
                      {statistics.totalLosses} nederlag • {statistics.winRate.toFixed(1)}% win rate
                    </span>
                  </div>
                </div>
                <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-1">
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Win Rate</span>
                    <span className="text-xl sm:text-2xl font-semibold text-[hsl(var(--foreground))]">
                      {statistics.winRate.toFixed(1)}%
                    </span>
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">
                      {statistics.matchesWithResults} kampe med resultat
                    </span>
                  </div>
                </div>
              </>
            )}
            {statistics.matchesWithResults === 0 && (
              <>
                <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-1">
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Sidst spillet</span>
                    <span className="text-lg sm:text-xl md:text-2xl font-semibold text-[hsl(var(--foreground))]">
                      {formatDate(statistics.lastPlayedDate, false)}
                    </span>
                  </div>
                </div>
                <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-1">
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Mest spillede kategori</span>
                    <span className="text-lg sm:text-xl md:text-2xl font-semibold text-[hsl(var(--foreground))]">
                      {statistics.preferredCategory ?? 'Ingen'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Win/Loss Trend Chart */}
          {statistics.matchesWithResults > 0 && Object.keys(statistics.winsBySeason).length > 0 && (
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
                Sejre/Nederlag pr. sæson
              </h3>
              <BarChart
                data={Object.keys(statistics.winsBySeason)
                  .sort()
                  .map((season) => ({
                    name: season,
                    Sejre: statistics.winsBySeason[season] || 0,
                    Nederlag: statistics.lossesBySeason[season] || 0
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
          {statistics.recentMatches && statistics.recentMatches.length > 0 && (
            <RecentMatches matches={statistics.recentMatches} playerName={selectedPlayer.name} />
          )}

          {/* Check-ins by Season */}
          {Object.keys(statistics.checkInsBySeason).length > 0 && (
            <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">Indtjekninger pr. sæson</h3>
                <div className="space-y-1.5 sm:space-y-2">
                  {Object.entries(statistics.checkInsBySeason)
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
                {statistics.partners.length === 0 ? (
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen partnerdata tilgængelig</p>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    {statistics.partners.map((partner, index) => (
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
                {statistics.opponents.length === 0 ? (
                  <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen modstanderdata tilgængelig</p>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    {statistics.opponents.map((opponent, index) => (
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
        </>
      )}

      {/* Empty State - Only show in player view when no player selected */}
      {viewMode === 'player' && !selectedPlayer && !loading && (
        <PageCard>
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <User className="w-10 h-10 sm:w-12 sm:h-12 text-[hsl(var(--muted))] mb-3 sm:mb-4" />
            <p className="text-base sm:text-lg font-medium text-[hsl(var(--foreground))] mb-1.5 sm:mb-2">Vælg en spiller</p>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted))] px-4">Vælg en spiller for at se individuel statistik.</p>
          </div>
        </PageCard>
      )}

      {/* Error Display */}
      {error && (
        <PageCard>
          <div className="p-3 sm:p-4 bg-[hsl(var(--destructive)/.1)] ring-1 ring-[hsl(var(--destructive)/.2)] rounded-lg">
            <p className="text-xs sm:text-sm text-[hsl(var(--destructive))]">{error}</p>
          </div>
        </PageCard>
      )}
    </section>
  )
}

export default StatisticsPage
