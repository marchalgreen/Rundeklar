import React from 'react'
import type { PlayerMatchResult } from '@rundeklar/common'
import { Trophy, Users, Target } from 'lucide-react'
import { formatDate } from '../../lib/formatting'

interface RecentMatchesProps {
  matches: PlayerMatchResult[]
  playerName: string
}

/**
 * RecentMatches component — displays the latest match results for a player.
 */
export const RecentMatches: React.FC<RecentMatchesProps> = ({ matches, playerName }) => {
  if (matches.length === 0) {
    return (
      <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
        <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
          Seneste resultater
        </h3>
        <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen resultater tilgængelig</p>
      </div>
    )
  }

  const formatScore = (scoreData: PlayerMatchResult['scoreData'], sport: string) => {
    if (sport === 'badminton' && 'sets' in scoreData) {
      const sets = scoreData.sets.filter(s => s.team1 !== null && s.team2 !== null)
      return sets.map(s => `${s.team1}-${s.team2}`).join(', ')
    }
    return 'N/A'
  }

  return (
    <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
      <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
        Seneste {matches.length} resultater
      </h3>
      <div className="space-y-2 sm:space-y-3">
        {matches.map((match) => (
          <div
            key={match.matchId}
            className={`flex items-center justify-between rounded-md border-hair px-2 sm:px-3 py-1.5 sm:py-2 transition-colors ${
              match.won
                ? 'bg-[hsl(var(--success)/.1)] ring-1 ring-[hsl(var(--success)/.2)]'
                : 'bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)]'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {match.won ? (
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--success))] flex-shrink-0" />
              ) : (
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--muted))] flex-shrink-0" />
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
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
                </div>
                <span className="text-xs text-[hsl(var(--muted))] mt-0.5">
                  {formatDate(match.date, false)} • {formatScore(match.scoreData, match.sport)}
                </span>
              </div>
            </div>
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
          </div>
        ))}
      </div>
    </div>
  )
}

