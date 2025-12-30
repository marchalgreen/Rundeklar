import React from 'react'
import type { UseStatisticsFiltersReturn } from '../../hooks/statistics/useStatisticsFilters'

interface StatisticsFiltersProps {
  filters: UseStatisticsFiltersReturn
}

/**
 * StatisticsFilters component — displays filter controls for statistics.
 * 
 * Provides period selection (last 7 days, last month, current season, etc.)
 * and training group multi-select filtering.
 */
export const StatisticsFilters: React.FC<StatisticsFiltersProps> = ({ filters }) => {
  const {
    attendancePeriod,
    setAttendancePeriod,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    enableComparison,
    setEnableComparison,
    selectedGroups,
    setSelectedGroups,
    allGroups
  } = filters
  
  const handleGroupToggle = (group: string) => {
    if (selectedGroups.includes(group)) {
      setSelectedGroups(selectedGroups.filter((g) => g !== group))
    } else {
      setSelectedGroups([...selectedGroups, group])
    }
  }
  
  return (
    <div className="rounded-[28px] bg-[hsl(var(--surface)/0.9)] ring-1 ring-[hsl(var(--line)/0.16)] shadow-[0_30px_60px_hsl(var(--accent-blue)/0.12)] backdrop-blur-xl p-3 sm:p-4 md:p-5 transition-all motion-reduce:transition-none">
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
              onClick={() => setAttendancePeriod('currentSeason')}
              className={`px-2 sm:px-3 py-1 text-xs rounded transition-colors ${
                attendancePeriod === 'currentSeason'
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface))]'
              }`}
            >
              Denne sæson
            </button>
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
              onClick={() => setAttendancePeriod('last30days')}
              className={`px-2 sm:px-3 py-1 text-xs rounded transition-colors ${
                attendancePeriod === 'last30days'
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface))]'
              }`}
            >
              Sidste 30 dage
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
              onClick={() => setAttendancePeriod('allSeasons')}
              className={`px-2 sm:px-3 py-1 text-xs rounded transition-colors ${
                attendancePeriod === 'allSeasons'
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface))]'
              }`}
            >
              Alle sæsoner
            </button>
          </div>
          
          {/* Period-specific inputs */}
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

        {/* Period Comparison Toggle */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableComparison"
              checked={enableComparison}
              onChange={(e) => setEnableComparison(e.target.checked)}
              disabled={filters.isComparisonDisabled}
              className={`w-4 h-4 rounded border-hair text-[hsl(var(--primary))] focus:ring-focus ${
                filters.isComparisonDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer'
              }`}
            />
            <label 
              htmlFor="enableComparison" 
              className={`text-xs sm:text-sm font-medium ${
                filters.isComparisonDisabled 
                  ? 'text-[hsl(var(--muted))] cursor-not-allowed' 
                  : 'text-[hsl(var(--foreground))] cursor-pointer'
              }`}
            >
              Sammenlign med samme periode sidste år
            </label>
          </div>
          {filters.isComparisonDisabled && (
            <p className="text-xs text-[hsl(var(--muted))] ml-6">
              Ikke tilgængelig for &quot;Alle sæsoner&quot; eller perioder længere end 1 år
            </p>
          )}
          {enableComparison && !filters.isComparisonDisabled && (
            <p className="text-xs text-[hsl(var(--muted))] ml-6">
              Sammenligner automatisk med samme datointerval sidste år for at se sæsonudsvingninger
            </p>
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
            <>
              <div className="flex flex-wrap gap-2">
                {allGroups.map((group) => {
                  const isSelected = selectedGroups.includes(group)
                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => handleGroupToggle(group)}
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
              <div className="flex items-center gap-2 mt-1">
                {selectedGroups.length === allGroups.length ? (
                  <span className="text-xs text-[hsl(var(--muted))]">
                    Alle grupper valgt
                  </span>
                ) : (
                  <>
                    <span className="text-xs text-[hsl(var(--muted))]">
                      {selectedGroups.length} af {allGroups.length} {allGroups.length === 1 ? 'gruppe' : 'grupper'} valgt
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedGroups([...allGroups])}
                      className="text-xs text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors underline"
                    >
                      Vælg alle
                    </button>
                  </>
                )}
                {selectedGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedGroups([])}
                    className="text-xs text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors underline"
                  >
                    Fravælg alle
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

