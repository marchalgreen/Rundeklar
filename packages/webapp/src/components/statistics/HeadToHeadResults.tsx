import React from 'react'
import type { HeadToHeadResult } from '@rundeklar/common'
import { Trophy, Users, Target } from 'lucide-react'
import { formatDate } from '../../lib/formatting'

interface HeadToHeadResultsProps {
  results: HeadToHeadResult[]
  player1Name: string
  player2Name: string
  player1Wins: number
  player2Wins: number
}

/**
 * HeadToHeadResults component — displays head-to-head match results between two players.
 */
export const HeadToHeadResults: React.FC<HeadToHeadResultsProps> = ({
  results,
  player1Name,
  player2Name,
  player1Wins,
  player2Wins
}) => {
  if (results.length === 0) {
    return (
      <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
        <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
          Head-to-Head
        </h3>
        <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen kampresultater mellem disse spillere</p>
      </div>
    )
  }

  const formatScore = (scoreData: HeadToHeadResult['scoreData'], sport: string) => {
    if (sport === 'badminton' && 'sets' in scoreData) {
      const sets = scoreData.sets.filter(s => s.team1 !== null && s.team2 !== null)
      return sets.map(s => `${s.team1}-${s.team2}`).join(', ')
    }
    return 'N/A'
  }

  // Filter to only show matches where they played against each other (not as partners)
  const headToHeadOnly = results.filter(r => !r.wasPartner)
  const partnerMatches = results.filter(r => r.wasPartner)

  return (
    <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
      <h3 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] mb-3 sm:mb-4">
        Head-to-Head
      </h3>
      
      {/* Win/Loss Summary */}
      {headToHeadOnly.length > 0 && (
        <div className="mb-4 p-3 bg-[hsl(var(--surface))] rounded-md border-hair">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))]">
                {player1Name}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[hsl(var(--success))]">
                {player1Wins}
              </span>
            </div>
            <span className="text-xs text-[hsl(var(--muted))]">-</span>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-[hsl(var(--success))]">
                {player2Wins}
              </span>
              <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))]">
                {player2Name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Head-to-Head Matches (playing against each other) */}
      {headToHeadOnly.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs sm:text-sm font-medium text-[hsl(var(--muted))] mb-2">
            Mod hinanden ({headToHeadOnly.length})
          </h4>
          <div className="space-y-2">
            {headToHeadOnly.map((result) => (
              <div
                key={result.matchId}
                className={`flex items-center justify-between rounded-md border-hair px-2 sm:px-3 py-1.5 sm:py-2 ${
                  result.player1Won
                    ? 'bg-[hsl(var(--success)/.1)] ring-1 ring-[hsl(var(--success)/.2)]'
                    : 'bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)]'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  {result.player1Won ? (
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--success))] flex-shrink-0" />
                  ) : (
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--muted))] flex-shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))]">
                      {result.player1Won ? player1Name : player2Name} vandt
                    </span>
                    <span className="text-xs text-[hsl(var(--muted))] mt-0.5">
                      {formatDate(result.date, false)} • {formatScore(result.scoreData, result.sport)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partner Matches (playing together) */}
      {partnerMatches.length > 0 && (
        <div>
          <h4 className="text-xs sm:text-sm font-medium text-[hsl(var(--muted))] mb-2">
            Spillet sammen ({partnerMatches.length})
          </h4>
          <div className="space-y-2">
            {partnerMatches.map((result) => (
              <div
                key={result.matchId}
                className={`flex items-center justify-between rounded-md border-hair px-2 sm:px-3 py-1.5 sm:py-2 ${
                  result.player1Won
                    ? 'bg-[hsl(var(--success)/.1)] ring-1 ring-[hsl(var(--success)/.2)]'
                    : 'bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)]'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[hsl(var(--muted))] flex-shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))]">
                      {result.player1Won ? 'Sejr' : 'Nederlag'} sammen
                    </span>
                    <span className="text-xs text-[hsl(var(--muted))] mt-0.5">
                      {formatDate(result.date, false)} • {formatScore(result.scoreData, result.sport)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

