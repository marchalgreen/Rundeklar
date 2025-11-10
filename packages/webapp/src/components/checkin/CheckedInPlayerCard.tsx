/**
 * Checked-in player card component.
 * 
 * Displays a checked-in player with check-out functionality.
 */

import React from 'react'
import type { CheckedInPlayer } from '@herlev-hjorten/common'
import { clsx } from 'clsx'
import { Button } from '../ui'
import { formatCategoryLetter, formatPlayerName } from '../../lib/formatting'
import { PLAYER_CATEGORIES } from '../../constants'

/**
 * Props for CheckedInPlayerCard component.
 */
interface CheckedInPlayerCardProps {
  /** Checked-in player data. */
  player: CheckedInPlayer
  
  /** Whether player is animating out. */
  isAnimatingOut: boolean
  
  /** Whether player is animating in. */
  isAnimatingIn: boolean
  
  /** Callback when player is checked out. */
  onCheckOut: (player: CheckedInPlayer) => void
}

/**
 * Category badge component.
 */
const CategoryBadge = ({ category }: { category: CheckedInPlayer['primaryCategory'] }) => {
  if (!category) return null
  
  const labels: Record<typeof category, string> = {
    [PLAYER_CATEGORIES.SINGLE]: 'S',
    [PLAYER_CATEGORIES.DOUBLE]: 'D',
    [PLAYER_CATEGORIES.BOTH]: 'B'
  }
  
  const catLetter = formatCategoryLetter(category)
  
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full text-xs font-bold w-6 h-6',
        'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair',
        catLetter && 'cat-ring'
      )}
      data-cat={catLetter || undefined}
      title={category}
    >
      {labels[category]}
    </span>
  )
}

/**
 * Checked-in player card component.
 * 
 * @example
 * ```tsx
 * <CheckedInPlayerCard
 *   player={checkedInPlayer}
 *   onCheckOut={handleCheckOut}
 * />
 * ```
 */
export const CheckedInPlayerCard: React.FC<CheckedInPlayerCardProps> = ({
  player,
  isAnimatingOut,
  isAnimatingIn,
  onCheckOut
}) => {
  const isOneRoundOnly = player.maxRounds === 1
  const catLetter = formatCategoryLetter(player.primaryCategory)
  
  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-3 rounded-md border-hair px-3 py-3 min-h-[64px]',
        'hover:shadow-sm transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)]',
        'motion-reduce:transition-none bg-[hsl(var(--success)/.06)]',
        catLetter && 'cat-rail',
        isAnimatingOut && 'opacity-0 scale-95 translate-x-4 pointer-events-none',
        isAnimatingIn && 'opacity-0 scale-95 -translate-x-4'
      )}
      data-cat={catLetter || undefined}
      style={{
        animation: isAnimatingIn ? 'slideInFromLeft 0.3s ease-out forwards' : undefined
      }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <CategoryBadge category={player.primaryCategory} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-base font-semibold text-[hsl(var(--foreground))] truncate">
              {formatPlayerName(player.name, player.alias)}
            </p>
            {isOneRoundOnly && (
              <span className="inline-flex items-center rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair px-2 py-1 text-xs whitespace-nowrap">
                Kun 1 runde
              </span>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onCheckOut(player)}
        className="text-xs px-3 py-1.5 flex-shrink-0"
      >
        Tjek ud
      </Button>
    </div>
  )
}

