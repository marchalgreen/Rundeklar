import React, { memo } from 'react'
import { Search, X, Users, Target, User } from 'lucide-react'
import type { Player } from '@rundeklar/common'
import { PageCard } from '../ui'
import { TableSearch } from '../ui/Table'
import { RecentMatches, HeadToHeadResults, PlayerOpponentList } from './index'
import type { UsePlayerStatisticsReturn } from '../../hooks/statistics/usePlayerStatistics'
import type { UsePlayerComparisonReturn } from '../../hooks/statistics/usePlayerComparison'
import type { UseStatisticsViewReturn } from '../../hooks/statistics/useStatisticsView'
import { formatDate } from '../../lib/formatting'

interface StatisticsPlayerViewProps {
  view: UseStatisticsViewReturn
  players: Player[]
  loading: boolean
  playerStatistics: UsePlayerStatisticsReturn
  playerComparison: UsePlayerComparisonReturn
}

/**
 * StatisticsPlayerView component — displays individual player statistics view.
 * 
 * Shows comprehensive player statistics including KPIs, match history, check-ins,
 * top partners/opponents, and player comparison functionality.
 * 
 * @remarks Follows design tokens and provides consistent styling. Mobile-first responsive design.
 */
export const StatisticsPlayerView: React.FC<StatisticsPlayerViewProps> = memo(({
  view,
  players: _players,
  loading,
  playerStatistics,
  playerComparison
}) => {
  const {
    selectedPlayer,
    comparisonPlayer,
    search,
    setSearch,
    showSearch,
    setShowSearch,
    comparisonSearch,
    setComparisonSearch,
    showComparisonSearch,
    setShowComparisonSearch,
    filteredPlayers,
    filteredComparisonPlayers,
    setSelectedPlayerId,
    setComparisonPlayerId
  } = view

  return (
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
                <span className="text-xs sm:text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                  {selectedPlayer.name}
                </span>
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
                    <div className="p-2 sm:p-3 text-center text-xs sm:text-sm text-[hsl(var(--muted))]">
                      Ingen spillere fundet
                    </div>
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
                            view.selectedPlayerId === player.id ? 'bg-[hsl(var(--primary)/.1)]' : ''
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))]">
                            {player.name}
                          </span>
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
                            <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))]">
                              {player.name}
                            </span>
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
                        <span className="text-xs sm:text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                          {comparisonPlayer.name}
                        </span>
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
                                {playerComparison.comparisonStats.partnerCount}{' '}
                                {playerComparison.comparisonStats.partnerCount === 1 ? 'gang' : 'gange'}
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
                                {playerComparison.comparisonStats.opponentCount}{' '}
                                {playerComparison.comparisonStats.opponentCount === 1 ? 'gang' : 'gange'}
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
                            player2Name={comparisonPlayer.name}
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
                <div className="p-3 sm:p-4 text-center text-xs sm:text-sm text-[hsl(var(--muted))]">
                  Ingen spillere fundet
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--line)/.12)]">
                  {filteredPlayers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setSelectedPlayerId(player.id)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-[hsl(var(--surface-2))] transition-colors motion-reduce:transition-none focus-visible:ring-focus"
                    >
                      <span className="text-sm sm:text-base font-medium text-[hsl(var(--foreground))]">
                        {player.name}
                      </span>
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
        <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
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
                    <span className="text-xl sm:text-2xl font-semibold text-[hsl(var(--foreground))]">
                      {playerStatistics.statistics.totalCheckIns}
                    </span>
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Total</span>
                  </div>
                </div>
                <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-1">
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Kampe</span>
                    <span className="text-xl sm:text-2xl font-semibold text-[hsl(var(--foreground))]">
                      {playerStatistics.statistics.totalMatches}
                    </span>
                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Total</span>
                  </div>
                </div>
                {playerStatistics.statistics.matchesWithResults > 0 && (
                  <>
                    <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                      <div className="flex flex-col justify-between gap-1">
                        <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">Sejre</span>
                        <span className="text-xl sm:text-2xl font-semibold text-[hsl(var(--success))]">
                          {playerStatistics.statistics.totalWins}
                        </span>
                        <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">
                          {playerStatistics.statistics.totalLosses} nederlag •{' '}
                          {playerStatistics.statistics.winRate.toFixed(1)}% win rate
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

              {/* Win/Loss by Season KPI Cards */}
              {playerStatistics.statistics.matchesWithResults > 0 &&
                playerStatistics.statistics.winsBySeason &&
                Object.keys(playerStatistics.statistics.winsBySeason).length > 0 && (
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">
                      Sejre/Nederlag pr. sæson
                    </h3>
                    <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {Object.keys(playerStatistics.statistics.winsBySeason)
                        .sort()
                        .map((season) => {
                          const wins = playerStatistics.statistics?.winsBySeason?.[season] || 0
                          const losses = playerStatistics.statistics?.lossesBySeason?.[season] || 0
                          const total = wins + losses
                          const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'

                          return (
                            <div key={season} className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                              <div className="flex flex-col justify-between gap-1">
                                <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">{season}</span>
                                <div className="flex items-baseline gap-2 sm:gap-3 mt-1">
                                  <div className="flex-1">
                                    <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--success))]">
                                      {wins}
                                    </span>
                                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))] ml-1">sejre</span>
                                  </div>
                                  <div className="flex-1">
                                    <span className="text-lg sm:text-xl font-semibold text-[hsl(var(--danger))]">
                                      {losses}
                                    </span>
                                    <span className="text-xs sm:text-sm text-[hsl(var(--muted))] ml-1">nederlag</span>
                                  </div>
                                </div>
                                <span className="text-xs sm:text-sm text-[hsl(var(--muted))] mt-1">
                                  {total} kampe • {winRate}% win rate
                                </span>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

              {/* Recent Matches */}
              {playerStatistics.statistics.recentMatches !== undefined && (
                <RecentMatches
                  matches={playerStatistics.statistics.recentMatches || []}
                  playerName={selectedPlayer.name}
                  allMatches={playerStatistics.allMatches}
                  onLoadAll={() => playerStatistics.loadAllMatches(view.selectedPlayerId!)}
                  loadingAll={playerStatistics.allMatchesLoading}
                />
              )}

              {/* Check-ins by Season */}
              {Object.keys(playerStatistics.statistics.checkInsBySeason).length > 0 && (
                <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
                  <div className="space-y-2 sm:space-y-3">
                    <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">
                      Indtjekninger pr. sæson
                    </h3>
                    <div className="space-y-1.5 sm:space-y-2">
                      {Object.entries(playerStatistics.statistics.checkInsBySeason)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([season, count]) => (
                          <div
                            key={season}
                            className="flex items-center justify-between rounded-md bg-[hsl(var(--surface))] border-hair px-2 sm:px-3 py-1.5 sm:py-2 hover:shadow-sm transition-shadow motion-reduce:transition-none"
                          >
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
              {view.selectedPlayerId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                  {/* Top Partners Section */}
                  <PlayerOpponentList
                    players={playerStatistics.statistics.partners}
                    currentPlayerId={view.selectedPlayerId}
                    currentPlayerName={selectedPlayer.name}
                    headToHeadData={playerStatistics.headToHeadData}
                    onPlayerClick={(playerId) => playerStatistics.loadHeadToHead(view.selectedPlayerId!, playerId)}
                    loadingPlayerIds={playerStatistics.headToHeadLoading}
                    title="Top 5 makkere"
                    isPartners={true}
                    onCompare={(playerId) => {
                      setComparisonPlayerId(playerId)
                      setComparisonSearch('')
                      setShowComparisonSearch(false)
                    }}
                  />

                  {/* Top Opponents Section */}
                  <PlayerOpponentList
                    players={playerStatistics.statistics.opponents}
                    currentPlayerId={view.selectedPlayerId}
                    currentPlayerName={selectedPlayer.name}
                    headToHeadData={playerStatistics.headToHeadData}
                    onPlayerClick={(playerId) => playerStatistics.loadHeadToHead(view.selectedPlayerId!, playerId)}
                    loadingPlayerIds={playerStatistics.headToHeadLoading}
                    title="Top 5 modstandere"
                    isPartners={false}
                    onCompare={(playerId) => {
                      setComparisonPlayerId(playerId)
                      setComparisonSearch('')
                      setShowComparisonSearch(false)
                    }}
                  />
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Empty State - Only show in player view when no player selected */}
      {!selectedPlayer && !loading && (
        <PageCard>
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <User className="w-10 h-10 sm:w-12 sm:h-12 text-[hsl(var(--muted))] mb-3 sm:mb-4" />
            <p className="text-base sm:text-lg font-medium text-[hsl(var(--foreground))] mb-1.5 sm:mb-2">
              Vælg en spiller
            </p>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted))] px-4">
              Vælg en spiller for at se individuel statistik.
            </p>
          </div>
        </PageCard>
      )}
    </div>
  )
})

StatisticsPlayerView.displayName = 'StatisticsPlayerView'

