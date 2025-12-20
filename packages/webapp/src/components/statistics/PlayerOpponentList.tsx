import React, { useState } from 'react'
import type { HeadToHeadResult } from '@rundeklar/common'
import { ChevronDown, ChevronUp, Users, Target } from 'lucide-react'
import { HeadToHeadResults } from './HeadToHeadResults'

interface PlayerOpponentListProps {
  players: Array<{ playerId: string; count: number; names: string }>
  currentPlayerId: string
  currentPlayerName: string
  headToHeadData: Map<string, { matches: HeadToHeadResult[], player1Wins: number, player2Wins: number }>
  onPlayerClick: (playerId: string) => void
  loadingPlayerIds: Set<string>
  title: string
}

/**
 * PlayerOpponentList component — displays a list of players (partners or opponents) with clickable head-to-head statistics.
 */
export const PlayerOpponentList: React.FC<PlayerOpponentListProps> = ({
  players,
  currentPlayerId,
  currentPlayerName,
  headToHeadData,
  onPlayerClick,
  loadingPlayerIds,
  title
}) => {
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Set<string>>(new Set())

  const handlePlayerClick = (playerId: string) => {
    // Toggle expansion
    const newExpanded = new Set(expandedPlayerIds)
    if (newExpanded.has(playerId)) {
      newExpanded.delete(playerId)
    } else {
      newExpanded.add(playerId)
      // Trigger load if not already loaded
      const key = [currentPlayerId, playerId].sort().join('_')
      if (!headToHeadData.has(key) && !loadingPlayerIds.has(key)) {
        onPlayerClick(playerId)
      }
    }
    setExpandedPlayerIds(newExpanded)
  }

  const getHeadToHeadData = (playerId: string) => {
    const key = [currentPlayerId, playerId].sort().join('_')
    return headToHeadData.get(key)
  }

  const isLoading = (playerId: string) => {
    const key = [currentPlayerId, playerId].sort().join('_')
    return loadingPlayerIds.has(key)
  }

  if (!players || players.length === 0) {
    return (
      <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
        <div className="space-y-2 sm:space-y-3">
          <h2 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">{title}</h2>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted))]">Ingen data tilgængelig</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card-glass-active border-hair rounded-lg p-3 sm:p-4 md:p-5 shadow-sm">
      <div className="space-y-2 sm:space-y-3">
        <h2 className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))]">{title}</h2>
        <div className="space-y-1.5 sm:space-y-2">
          {players.map((player, index) => {
            const isExpanded = expandedPlayerIds.has(player.playerId)
            const headToHead = getHeadToHeadData(player.playerId)
            const loading = isLoading(player.playerId)
            const key = [currentPlayerId, player.playerId].sort().join('_')
            // Determine which player is player1 and which is player2 for display
            const isPlayer1 = currentPlayerId < player.playerId
            const player1Wins = isPlayer1 ? headToHead?.player1Wins ?? 0 : headToHead?.player2Wins ?? 0
            const player2Wins = isPlayer1 ? headToHead?.player2Wins ?? 0 : headToHead?.player1Wins ?? 0

            return (
              <div key={player.playerId}>
                <button
                  type="button"
                  onClick={() => handlePlayerClick(player.playerId)}
                  className="w-full flex items-center justify-between rounded-md bg-[hsl(var(--surface))] border-hair px-2 sm:px-3 py-1.5 sm:py-2 hover:shadow-sm transition-all motion-reduce:transition-none focus-visible:ring-focus"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="h-5 w-5 sm:h-6 sm:w-6 grid place-items-center rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair text-xs font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] truncate">
                      {player.names}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-1 sm:ml-2">
                    <span className="rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs">
                      {player.count} {player.count === 1 ? 'gang' : 'gange'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[hsl(var(--muted))]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[hsl(var(--muted))]" />
                    )}
                  </div>
                </button>

                {/* Expandable head-to-head section */}
                {isExpanded && (
                  <div className="mt-2 ml-7 sm:ml-9">
                    {loading ? (
                      <div className="p-3 text-center text-xs sm:text-sm text-[hsl(var(--muted))]">
                        Indlæser head-to-head statistik...
                      </div>
                    ) : headToHead && headToHead.matches && headToHead.matches.length > 0 ? (
                      <div className="bg-[hsl(var(--surface))] border-hair rounded-md p-3 -m-3">
                        <HeadToHeadResults
                          results={headToHead.matches}
                          player1Name={currentPlayerName}
                          player2Name={player.names}
                          player1Wins={player1Wins}
                          player2Wins={player2Wins}
                        />
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs sm:text-sm text-[hsl(var(--muted))]">
                        Ingen head-to-head kampresultater tilgængelig
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

