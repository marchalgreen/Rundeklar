/**
 * Checked-in player card component.
 * 
 * Displays a checked-in player with check-out functionality.
 */

import React, { useEffect, useMemo, useState } from 'react'
import type { CheckedInPlayer } from '@rundeklar/common'
import { clsx } from 'clsx'
import { Info } from 'lucide-react'
import { Button, Tooltip } from '../ui'
import { formatCategoryLetter, formatPlayerCardName } from '../../lib/formatting'
import { PLAYER_CATEGORIES } from '../../constants'
import { InitialsAvatar, getSeedHue } from '../ui/PlayerAvatar'
import { getPlayerUiVariant, VARIANT_CHANGED_EVENT, type PlayerUiVariant } from '../../lib/uiVariants'

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
  
  /** Optional callback when notes icon is clicked to edit notes. */
  onEditNotes?: (player: CheckedInPlayer, opener: HTMLElement) => void
}

/**
 * Category badge component (unused - kept for potential future use).
 */
const _CategoryBadge = ({ category }: { category: CheckedInPlayer['primaryCategory'] }) => {
  if (!category) return null
  
  const labels: Record<typeof category, string> = {
    [PLAYER_CATEGORIES.SINGLE]: 'S',
    [PLAYER_CATEGORIES.DOUBLE]: 'D',
    [PLAYER_CATEGORIES.BOTH]: 'B'
  }
  
  const _catLetter = formatCategoryLetter(category)
  
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full text-xs font-bold w-6 h-6',
        'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair',
        _catLetter && 'cat-ring'
      )}
      data-cat={_catLetter || undefined}
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
  onCheckOut,
  onEditNotes
}) => {
  const isOneRoundOnly = player.maxRounds === 1
  const [variant, setVariant] = useState<PlayerUiVariant>(() => getPlayerUiVariant())
  useEffect(() => {
    const onChange = (e: Event) => {
      const ev = e as CustomEvent
      setVariant(ev.detail?.variant ?? getPlayerUiVariant())
    }
    window.addEventListener(VARIANT_CHANGED_EVENT, onChange as EventListener)
    return () => window.removeEventListener(VARIANT_CHANGED_EVENT, onChange as EventListener)
  }, [])
  const avatarRailColor = useMemo(() => {
    if (variant !== 'A') return undefined
    const hue = getSeedHue(player.id || player.name, player.gender ?? null)
    return `hsl(${hue} 70% 75% / .26)`
  }, [variant, player])
  const variantCardBg = undefined as string | undefined
  
  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-2 sm:gap-3 rounded-md border-hair px-2 py-1.5 sm:py-2 md:px-3 md:py-3 min-h-[56px] sm:min-h-[64px]',
        'hover:shadow-md transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)]',
        'motion-reduce:transition-none bg-[hsl(var(--success)/.2)] backdrop-blur-sm shadow-sm',
        'ring-1 ring-[hsl(var(--success)/.3)] avatar-rail',
        isAnimatingOut && 'opacity-0 scale-95 translate-x-4 pointer-events-none',
        isAnimatingIn && 'opacity-0 scale-95 -translate-x-4'
      )}
      data-cat={undefined}
      style={{
        animation: isAnimatingIn ? 'slideInFromLeft 0.3s ease-out forwards' : undefined,
        ...(variant === 'A' && avatarRailColor ? ({ ['--railColor' as any]: avatarRailColor } as React.CSSProperties) : {}),
        ...(variantCardBg ? ({ backgroundColor: variantCardBg } as React.CSSProperties) : {})
      }}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
        <InitialsAvatar seed={player.id} name={player.name} gender={player.gender ?? null} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <p className={`font-semibold text-[hsl(var(--foreground))] truncate text-sm sm:text-base md:text-lg`}>
              {formatPlayerCardName(player.name, player.alias)}
            </p>
            {isOneRoundOnly && (
              <span className="inline-flex items-center rounded-full bg-[hsl(var(--surface-2)/.7)] backdrop-blur-sm text-[hsl(var(--muted))] border-hair px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs whitespace-nowrap">
                1 runde
              </span>
            )}
            {player.notes && (
              <Tooltip content={player.notes} position="top">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditNotes?.(player, e.currentTarget)
                  }}
                  className="flex-shrink-0 p-0.5 sm:p-1 rounded hover:bg-[hsl(var(--surface-2)/.5)] transition-colors"
                  aria-label="Vis eller rediger noter"
                >
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onCheckOut(player)}
        className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 flex-shrink-0"
      >
        Tjek ud
      </Button>
    </div>
  )
}

