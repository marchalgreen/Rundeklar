import React, { memo } from 'react'
import type { UseTrainingAttendanceReturn } from '../../hooks/statistics/useTrainingAttendance'
import type { UseStatisticsFiltersReturn } from '../../hooks/statistics/useStatisticsFilters'
import {
  StatisticsFilters,
  KPICards,
  StatisticsInsights,
  GroupTrendsChart,
  PeriodComparisonChart
} from './index'
import { EChartsBarChart } from '../charts/EChartsBarChart'
import { TOP_PLAYERS_DISPLAY_LIMIT, MAX_PLAYER_NAME_LENGTH } from '../../lib/statistics/constants'

interface StatisticsTrainingViewProps {
  filters: UseStatisticsFiltersReturn
  trainingAttendance: UseTrainingAttendanceReturn
}

/**
 * StatisticsTrainingView component — displays training & attendance statistics view.
 * 
 * Shows comprehensive training attendance statistics including KPIs, trends,
 * comparisons, and detailed breakdowns by group and player.
 * 
 * @remarks Follows design tokens and provides consistent styling. Mobile-first responsive design.
 */
export const StatisticsTrainingView: React.FC<StatisticsTrainingViewProps> = memo(({
  filters,
  trainingAttendance
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters Section */}
      <StatisticsFilters filters={filters} />

      {/* KPI Cards Section */}
      <KPICards
        kpis={trainingAttendance.kpis}
        loading={trainingAttendance.kpisLoading || trainingAttendance.attendanceLoading}
      />

      {/* Period Comparison - Show early if active */}
      {trainingAttendance.periodComparison && (
        <div className="rounded-[28px] bg-[hsl(var(--surface)/0.9)] ring-1 ring-[hsl(var(--line)/0.16)] shadow-[0_30px_60px_hsl(var(--accent-blue)/0.12)] backdrop-blur-xl p-3 sm:p-4 md:p-5 transition-all motion-reduce:transition-none">
          <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
            Periodesammenligning
          </h3>
          <PeriodComparisonChart
            data={trainingAttendance.periodComparison}
            loading={trainingAttendance.periodComparisonLoading}
            height={300}
          />
        </div>
      )}

      {/* Group Trends Over Time - Main time-based visualization */}
      <div className="rounded-[28px] bg-[hsl(var(--surface)/0.9)] ring-1 ring-[hsl(var(--line)/0.16)] shadow-[0_30px_60px_hsl(var(--accent-blue)/0.12)] backdrop-blur-xl p-3 sm:p-4 md:p-5 transition-all motion-reduce:transition-none">
        <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
          Gruppetrends over tid
        </h3>
        <GroupTrendsChart
          data={trainingAttendance.groupAttendanceOverTime}
          comparisonData={trainingAttendance.comparisonGroupAttendanceOverTime}
          enableComparison={filters.enableComparison}
          loading={trainingAttendance.groupTrendsLoading || trainingAttendance.comparisonGroupTrendsLoading}
          height={300}
        />
      </div>

      {/* Current Status Section - Snapshot visualizations */}
      <div className="space-y-4 sm:space-y-6">
        {/* Training Group Attendance - Split into two charts to avoid mixing units */}
        <div className="space-y-4 sm:space-y-6">
          {/* Average Attendance per Group - Using ECharts */}
          <div className="rounded-[28px] bg-[hsl(var(--surface)/0.9)] ring-1 ring-[hsl(var(--line)/0.16)] shadow-[0_30px_60px_hsl(var(--accent-blue)/0.12)] backdrop-blur-xl p-3 sm:p-4 md:p-5 transition-all motion-reduce:transition-none">
            <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
              Gennemsnitligt fremmøde pr. træningsgruppe
            </h3>
            {trainingAttendance.attendanceLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Indlæser fremmøde...</p>
              </div>
            ) : trainingAttendance.trainingGroupAttendance.length > 0 ? (
              <EChartsBarChart
                data={trainingAttendance.trainingGroupAttendance.map((group) => ({
                  name: group.groupName,
                  'Gennemsnitligt fremmøde': group.averageAttendance
                }))}
                bars={[
                  { dataKey: 'Gennemsnitligt fremmøde', name: 'Gennemsnitligt fremmøde', color: 'hsl(var(--primary))' }
                ]}
                xAxisLabel="Træningsgruppe"
                yAxisLabel="Gennemsnitligt antal spillere"
                height={300}
                showLegend={false}
                showValueLabels={true}
              />
            ) : (
              <div className="flex items-center justify-center py-8" style={{ minHeight: 300 }}>
                <p className="text-sm text-[hsl(var(--foreground)/0.6)]">Ingen fremmødedata tilgængelig</p>
              </div>
            )}
          </div>

          {/* Total Check-ins and Unique Players per Group - Using ECharts */}
          <div className="rounded-[28px] bg-[hsl(var(--surface)/0.9)] ring-1 ring-[hsl(var(--line)/0.16)] shadow-[0_30px_60px_hsl(var(--accent-blue)/0.12)] backdrop-blur-xl p-3 sm:p-4 md:p-5 transition-all motion-reduce:transition-none">
            <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
              Total indtjekninger og unikke spillere pr. træningsgruppe
            </h3>
            {trainingAttendance.attendanceLoading ? (
              <div className="flex items-center justify-center" style={{ height: 300 }}>
                <div className="space-y-2 w-full px-4">
                  <div className="h-3 w-40 bg-[hsl(var(--surface-2))] rounded animate-pulse mx-auto" />
                  <div className="h-64 bg-[hsl(var(--surface-2))] rounded animate-pulse" />
                </div>
              </div>
            ) : trainingAttendance.trainingGroupAttendance.length > 0 ? (
              <EChartsBarChart
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
                showValueLabels={true}
              />
            ) : (
              <div className="flex items-center justify-center py-8" style={{ minHeight: 300 }}>
                <p className="text-sm text-[hsl(var(--foreground)/0.6)]">Ingen fremmødedata tilgængelig</p>
              </div>
            )}
          </div>
        </div>

        {/* Training Day 1 vs Training Day 2 Comparison */}
        <div className="rounded-[28px] bg-[hsl(var(--surface)/0.9)] ring-1 ring-[hsl(var(--line)/0.16)] shadow-[0_30px_60px_hsl(var(--accent-blue)/0.12)] backdrop-blur-xl p-3 sm:p-4 md:p-5 transition-all motion-reduce:transition-none">
          <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
            Træningsdag 1 vs. Træningsdag 2
          </h3>
          {trainingAttendance.comparisonLoading ? (
            <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
              <div className="space-y-2 w-full px-4">
                <div className="h-3 w-40 bg-[hsl(var(--surface-2))] rounded animate-pulse mx-auto" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-32 bg-[hsl(var(--surface-2))] rounded animate-pulse" />
                  <div className="h-32 bg-[hsl(var(--surface-2))] rounded animate-pulse" />
                </div>
              </div>
            </div>
          ) : trainingAttendance.trainingDayComparison ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg bg-[hsl(var(--surface))] border-hair p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--primary))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {trainingAttendance.trainingDayComparison.day1.weekdayName}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[hsl(var(--muted))]">Indtjekninger:</span>
                    <span className="font-semibold text-[hsl(var(--foreground))]">
                      {trainingAttendance.trainingDayComparison.day1.checkInCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[hsl(var(--muted))]">Gennemsnit:</span>
                    <span className="font-semibold text-[hsl(var(--foreground))]">
                      {trainingAttendance.trainingDayComparison.day1.averageAttendance.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[hsl(var(--muted))]">Unikke spillere:</span>
                    <span className="font-semibold text-[hsl(var(--foreground))]">
                      {trainingAttendance.trainingDayComparison.day1.uniquePlayers}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-[hsl(var(--surface))] border-hair p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(var(--accent))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {trainingAttendance.trainingDayComparison.day2.weekdayName}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[hsl(var(--muted))]">Indtjekninger:</span>
                    <span className="font-semibold text-[hsl(var(--foreground))]">
                      {trainingAttendance.trainingDayComparison.day2.checkInCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[hsl(var(--muted))]">Gennemsnit:</span>
                    <span className="font-semibold text-[hsl(var(--foreground))]">
                      {trainingAttendance.trainingDayComparison.day2.averageAttendance.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[hsl(var(--muted))]">Unikke spillere:</span>
                    <span className="font-semibold text-[hsl(var(--foreground))]">
                      {trainingAttendance.trainingDayComparison.day2.uniquePlayers}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8" style={{ minHeight: 200 }}>
              <p className="text-sm text-[hsl(var(--foreground)/0.6)]">
                Ikke nok data til sammenligning (kræver mindst 2 ugedage med data)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tables Section */}
      <div className="space-y-4 sm:space-y-6">
        {/* Player Check-In Long-Tail View */}
        <div className="rounded-[28px] bg-[hsl(var(--surface)/0.9)] ring-1 ring-[hsl(var(--line)/0.16)] shadow-[0_30px_60px_hsl(var(--accent-blue)/0.12)] backdrop-blur-xl p-3 sm:p-4 md:p-5 transition-all motion-reduce:transition-none">
          <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
            Spillere pr. indtjekninger
          </h3>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted))] mb-3">
            Oversigt over antal indtjekninger pr. spiller (sorteret efter mest aktive)
          </p>
          {trainingAttendance.longTailLoading ? (
            <div className="flex items-center justify-center" style={{ height: 400 }}>
              <div className="space-y-2 w-full px-4">
                <div className="h-3 w-40 bg-[hsl(var(--surface-2))] rounded animate-pulse mx-auto" />
                <div className="h-96 bg-[hsl(var(--surface-2))] rounded animate-pulse" />
              </div>
            </div>
          ) : trainingAttendance.playerCheckInLongTail.length > 0 ? (
            <div className="space-y-2">
              <EChartsBarChart
                data={trainingAttendance.playerCheckInLongTail.slice(0, TOP_PLAYERS_DISPLAY_LIMIT).map((player) => ({
                  name: player.playerName.length > MAX_PLAYER_NAME_LENGTH
                    ? `${player.playerName.substring(0, MAX_PLAYER_NAME_LENGTH)}...`
                    : player.playerName,
                  'Indtjekninger': player.checkInCount
                }))}
                bars={[
                  { dataKey: 'Indtjekninger', name: 'Indtjekninger', color: 'hsl(var(--primary))' }
                ]}
                xAxisLabel="Spiller"
                yAxisLabel="Antal indtjekninger"
                height={400}
                showLegend={false}
                showValueLabels={true}
              />
              {trainingAttendance.playerCheckInLongTail.length > TOP_PLAYERS_DISPLAY_LIMIT && (
                <p className="text-xs text-[hsl(var(--muted))] text-center mt-2">
                  Viser top {TOP_PLAYERS_DISPLAY_LIMIT} af {trainingAttendance.playerCheckInLongTail.length} spillere
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8" style={{ minHeight: 400 }}>
              <p className="text-sm text-[hsl(var(--foreground)/0.6)]">Ingen spillerdata tilgængelig</p>
            </div>
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
  )
})

StatisticsTrainingView.displayName = 'StatisticsTrainingView'

