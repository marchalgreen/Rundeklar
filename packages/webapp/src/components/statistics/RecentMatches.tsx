import React from 'react'
import type { PlayerMatchResult } from '@rundeklar/common'
import { Trophy, Users, Target } from 'lucide-react'
import { formatDate } from '../../lib/formatting'

interface RecentMatchesProps {
  matches: PlayerMatchResult[]
  playerName: string
  allMatches?: PlayerMatchResult[] | null
  onLoadAll?: () => void
  loadingAll?: boolean
}

/**
 * RecentMatches component — displays the latest match results for a player.
 */
export const RecentMatches: React.FC<RecentMatchesProps> = ({ 
  matches, 
  playerName: _playerName, 
  allMatches, 
  onLoadAll, 
  loadingAll = false 
}) => {
  const totalCount = allMatches ? allMatches.length : matches.length

  if (matches.length === 0 && (!allMatches || allMatches.length === 0)) {
    return (
      <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
        <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
          Seneste resultater
        </h3>
        <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen resultater tilgængelig</p>
      </div>
    )
  }

  // Always load all matches if available, show in scrollable container
  React.useEffect(() => {
    if (!allMatches && onLoadAll && matches.length > 0) {
      // Auto-load all matches when component mounts if we have some matches
      onLoadAll()
    }
  }, [allMatches, onLoadAll, matches.length])

  const formatScore = (scoreData?: PlayerMatchResult['scoreData'], sport?: string) => {
    if (!scoreData || !sport) return 'Ingen resultat'
    if (sport === 'badminton' && 'sets' in scoreData) {
      const sets = scoreData.sets.filter(s => s.team1 !== null && s.team2 !== null)
      return sets.map(s => `${s.team1}-${s.team2}`).join(', ')
    }
    return 'N/A'
  }

  // Use allMatches if available, otherwise use matches
  const matchesToDisplay = allMatches || matches

  return (
    <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">
          {allMatches 
            ? `Alle resultater (${totalCount})`
            : `Seneste ${matches.length} resultater${matches.length < totalCount ? ` (indlæser alle...)` : ''}`
          }
        </h3>
        {loadingAll && (
          <span className="text-xs sm:text-sm text-[hsl(var(--muted))]">
            Indlæser...
          </span>
        )}
      </div>
      <div className="space-y-2 sm:space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
        {matchesToDisplay.map((match) => {
          const hasResult = match.won !== undefined && match.scoreData !== undefined && match.sport !== undefined
          
          return (
            <div
              key={match.matchId}
              className={`flex items-center justify-between rounded-md border-hair px-2 sm:px-3 py-1.5 sm:py-2 transition-colors ${
                hasResult && match.won
                  ? 'bg-[hsl(var(--success)/.1)] ring-1 ring-[hsl(var(--success)/.2)]'
                  : 'bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)]'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {hasResult && match.won ? (
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--success))] flex-shrink-0" />
                ) : (
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--muted))] flex-shrink-0" />
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {match.partnerNames && match.partnerNames.length > 0 ? (
                      // 2v2 match: show partners and opponents separately
                      <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))]">
                        <span className="flex items-center gap-1 flex-wrap">
                          <Users className="w-3 h-3 text-[hsl(var(--primary))]" />
                          <span className="font-semibold">Med {match.partnerNames.join(', ')}</span>
                          {match.opponentNamesSeparate && match.opponentNamesSeparate.length > 0 && (
                            <>
                              <span className="text-[hsl(var(--muted))]">•</span>
                              <Target className="w-3 h-3 text-[hsl(var(--muted))]" />
                              <span>Mod {match.opponentNamesSeparate.join(', ')}</span>
                            </>
                          )}
                        </span>
                      </span>
                    ) : match.opponentNamesSeparate && match.opponentNamesSeparate.length > 0 ? (
                      // 1v1 or 1v2 match: show opponents
                      <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))]">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Mod {match.opponentNamesSeparate.join(', ')}
                        </span>
                      </span>
                    ) : (
                      // Fallback to old format for backward compatibility
                      <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))]">
                        {match.wasPartner ? (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Med {match.opponentNames.join(', ')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Mod {match.opponentNames.join(', ')}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[hsl(var(--muted))] mt-0.5">
                    {formatDate(match.date, false)} • {formatScore(match.scoreData, match.sport)}
                  </span>
                </div>
              </div>
              {hasResult && (
                <div className="flex-shrink-0 ml-2">
                  <span
                    className={`text-xs sm:text-sm font-semibold px-2 py-1 rounded ${
                      match.won
                        ? 'bg-[hsl(var(--success)/.2)] text-[hsl(var(--success))]'
                        : 'bg-[hsl(var(--muted)/.2)] text-[hsl(var(--muted))]'
                    }`}
                  >
                    {match.won ? 'Sejr' : 'Nederlag'}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

