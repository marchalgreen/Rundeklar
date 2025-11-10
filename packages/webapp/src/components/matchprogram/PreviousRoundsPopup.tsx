/**
 * Previous rounds popup component for match program.
 * 
 * Displays a draggable popup window showing previous rounds' match data.
 */

import React from 'react'
import type { CourtWithPlayers } from '@herlev-hjorten/common'
import { PageCard } from '../ui'
import { MATCH_CONSTANTS } from '../../constants'
import { getCategoryLetter, getPlayerSlotBgColor } from '../../lib/matchProgramUtils'

interface PreviousRoundsPopupProps {
  /** Selected round number */
  selectedRound: number
  /** Set of visible previous rounds */
  previousRoundsVisible: Set<number>
  /** Handler to close popup */
  onClose: () => void
  /** In-memory matches for all rounds */
  inMemoryMatches: Record<number, CourtWithPlayers[]>
  /** Previous rounds matches from database */
  previousRoundsMatches: Record<number, CourtWithPlayers[]>
  /** Popup position */
  popupPosition: { x: number; y: number }
  /** Whether popup is being dragged */
  isDragging: boolean
  /** Handler for mouse down on header */
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
}

const EMPTY_SLOTS = MATCH_CONSTANTS.DEFAULT_SLOTS_PER_COURT

/**
 * Previous rounds popup component.
 * 
 * @example
 * ```tsx
 * <PreviousRoundsPopup
 *   selectedRound={2}
 *   previousRoundsVisible={new Set([1])}
 *   onClose={() => setPreviousRoundsVisible(new Set())}
 *   inMemoryMatches={inMemoryMatches}
 *   previousRoundsMatches={previousRoundsMatches}
 *   popupPosition={{ x: 16, y: 16 }}
 *   isDragging={false}
 *   onMouseDown={handleMouseDown}
 * />
 * ```
 */
export const PreviousRoundsPopup: React.FC<PreviousRoundsPopupProps> = ({
  selectedRound,
  previousRoundsVisible,
  onClose,
  inMemoryMatches,
  previousRoundsMatches,
  popupPosition,
  isDragging,
  onMouseDown
}) => {
  if (previousRoundsVisible.size === 0) {
    return null
  }

  return (
    <>
      {/* Subtle backdrop - visual only, doesn't block interaction */}
      <div 
        className="fixed inset-0 z-40 bg-[hsl(var(--bg-canvas)/.1)] pointer-events-none"
      />
      {/* Floating Popup Window */}
      <div 
        className="fixed z-50 w-[400px] max-h-[85vh] rounded-xl bg-[hsl(var(--surface))] shadow-2xl ring-2 ring-[hsl(var(--line)/.2)] overflow-hidden flex flex-col pointer-events-auto select-none"
        style={{
          left: `${popupPosition.x}px`,
          top: `${popupPosition.y}px`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - draggable */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--line)/.12)] bg-[hsl(var(--surface-2))] cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-[hsl(var(--muted))]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              Tidligere runder
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--foreground))] transition-all duration-200"
            title="Luk"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Array.from({ length: selectedRound - 1 })
            .map((_, i) => selectedRound - 1 - i)
            .filter((round) => previousRoundsVisible.has(round))
            .map((round) => (
              <div key={round} className="space-y-2">
                <h3 className="text-sm font-semibold text-[hsl(var(--muted))] uppercase tracking-wide sticky top-0 bg-[hsl(var(--surface))] pb-1">
                  Runde {round}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(inMemoryMatches[round] || previousRoundsMatches[round] || []).map((court) => (
                    <PageCard key={court.courtIdx} className="space-y-1.5 p-2.5 opacity-75">
                      <header className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-semibold text-[hsl(var(--foreground))]">Bane {court.courtIdx}</h4>
                        <span className="text-[10px] text-[hsl(var(--muted))]">{court.slots.length}/{EMPTY_SLOTS}</span>
                      </header>
                      <div className="flex flex-col gap-1">
                        {Array.from({ length: 4 }).map((_, slotIdx) => {
                          const entry = court.slots.find((slot) => slot.slot === slotIdx)
                          const player = entry?.player
                          const catLetter = player ? getCategoryLetter(player.primaryCategory) : null
                          return (
                            <div
                              key={slotIdx}
                              className={`flex min-h-[36px] items-center rounded-md px-2 py-1 text-xs ring-1 ${
                                player
                                  ? `${getPlayerSlotBgColor()} ${catLetter ? 'cat-rail' : ''} ring-[hsl(var(--line)/.12)]`
                                  : 'bg-[hsl(var(--surface-2))] ring-[hsl(var(--line)/.12)]'
                              }`}
                              data-cat={catLetter || undefined}
                            >
                              {player ? (
                                <span className="text-xs font-medium text-[hsl(var(--foreground))] truncate">
                                  {player.alias ?? player.name}
                                </span>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </PageCard>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  )
}

