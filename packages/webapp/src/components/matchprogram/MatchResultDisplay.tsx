/**
 * Match Result Display component.
 * 
 * Displays match result scores in a consistent format.
 * Used by both CourtCard and FullScreenMatchProgram to reduce duplication.
 */

import React from 'react'
import type { MatchResult } from '@rundeklar/common'
import { Trophy } from 'lucide-react'
import { isBadmintonScoreData } from '../../lib/matchResultValidation'

interface MatchResultDisplayProps {
  /** Match result to display */
  result: MatchResult
  /** Optional callback to edit the result */
  onEdit?: () => void
}

/**
 * Match Result Display component.
 * 
 * Displays badminton match scores in a formatted badge.
 * Shows edit button if onEdit callback is provided.
 * 
 * @example
 * ```tsx
 * <MatchResultDisplay
 *   result={matchResult}
 *   onEdit={() => handleEdit()}
 * />
 * ```
 */
export const MatchResultDisplay: React.FC<MatchResultDisplayProps> = ({
  result,
  onEdit
}) => {
  // Only display badminton results for now
  if (result.sport !== 'badminton' || !isBadmintonScoreData(result.scoreData)) {
    return null
  }

  const scoreData = result.scoreData
  if (!scoreData.sets || scoreData.sets.length === 0) {
    return null
  }

  return (
    <div 
      className="mb-2 p-2 rounded-md bg-[hsl(var(--primary)/.1)] ring-1 ring-[hsl(var(--primary)/.2)]"
      role="status"
      aria-label="Kampresultat"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-[hsl(var(--primary))]" aria-hidden="true" />
          <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
            {scoreData.sets.map((set) => 
              `${set.team1}-${set.team2}`
            ).join(', ')}
          </span>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="text-xs text-[hsl(var(--primary))] hover:underline"
            aria-label="Rediger resultat"
          >
            Rediger
          </button>
        )}
      </div>
    </div>
  )
}

