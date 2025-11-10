/**
 * Player card component for check-in page.
 * 
 * Displays a player card with check-in functionality and optional
 * "one round only" checkbox.
 */

import React from 'react'
import type { Player } from '@herlev-hjorten/common'
import { clsx } from 'clsx'
import { Button } from '../ui'
import { formatCategoryLetter, formatPlayerName } from '../../lib/formatting'
import { PLAYER_CATEGORIES } from '../../constants'

/**
 * Props for PlayerCard component.
 */
interface PlayerCardProps {
  /** Player data to display. */
  player: Player
  
  /** Whether player is marked for "one round only". */
  oneRoundOnly: boolean
  
  /** Whether player was just checked in (for animation). */
  isJustCheckedIn: boolean
  
  /** Whether player is animating out. */
  isAnimatingOut: boolean
  
  /** Whether player is animating in. */
  isAnimatingIn: boolean
  
  /** Callback when player is clicked to check in. */
  onCheckIn: (player: Player, maxRounds?: number) => void
  
  /** Callback when "one round only" checkbox changes. */
  onOneRoundOnlyChange: (playerId: string, checked: boolean) => void
}

/**
 * Category badge component.
 */
const CategoryBadge = ({ category }: { category: Player['primaryCategory'] }) => {
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
 * Player card component for check-in page.
 * 
 * @example
 * ```tsx
 * <PlayerCard
 *   player={player}
 *   oneRoundOnly={false}
 *   onCheckIn={handleCheckIn}
 *   onOneRoundOnlyChange={handleOneRoundOnlyChange}
 * />
 * ```
 */
export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  oneRoundOnly,
  isJustCheckedIn,
  isAnimatingOut,
  isAnimatingIn,
  onCheckIn,
  onOneRoundOnlyChange
}) => {
  const catLetter = formatCategoryLetter(player.primaryCategory)
  
  return (
    <div
      onClick={() => {
        onCheckIn(player, oneRoundOnly ? 1 : undefined)
        // Clear checkbox after check-in
        onOneRoundOnlyChange(player.id, false)
      }}
      className={clsx(
        'border-hair flex min-h-[64px] items-center justify-between gap-3 rounded-lg px-3 py-3',
        'transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none',
        'cursor-pointer hover:shadow-sm ring-0 hover:ring-2 hover:ring-[hsl(var(--accent)/.15)]',
        'bg-[hsl(var(--surface-2))]',
        catLetter && 'cat-rail',
        isJustCheckedIn && 'ring-2 ring-[hsl(206_88%_60%)] scale-[1.02] shadow-lg',
        isAnimatingOut && 'opacity-0 scale-95 -translate-x-4 pointer-events-none',
        isAnimatingIn && 'opacity-0 scale-95 translate-x-4'
      )}
      data-cat={catLetter || undefined}
      style={{
        animation: isAnimatingIn ? 'slideInFromRight 0.3s ease-out forwards' : undefined
      }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <CategoryBadge category={player.primaryCategory} />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-[hsl(var(--foreground))] truncate">
            {formatPlayerName(player.name, player.alias)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <label
          className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-[hsl(var(--surface-2)/.5)] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={oneRoundOnly}
            onChange={(e) => {
              onOneRoundOnlyChange(player.id, e.target.checked)
            }}
            className="w-4 h-4 rounded ring-1 ring-[hsl(var(--line)/.12)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none transition-all duration-200 motion-reduce:transition-none cursor-pointer flex-shrink-0"
          />
          <span className="inline-flex items-center rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair px-2 py-1 text-xs whitespace-nowrap">
            Kun 1 runde
          </span>
        </label>
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onCheckIn(player, oneRoundOnly ? 1 : undefined)
            onOneRoundOnlyChange(player.id, false)
          }}
          className={clsx('ring-2 ring-[hsl(var(--accent)/.2)]', 'text-xs px-3 py-1.5')}
        >
          Tjek ind
        </Button>
      </div>
    </div>
  )
}

