/**
 * Bench section component for match program.
 * 
 * Displays available players (bench) and inactive players with drag-and-drop support.
 */

import React, { useEffect, useState } from 'react'
import type { CheckedInPlayer } from '@rundeklar/common'
import { PageCard } from '../ui'
import { getCategoryBadge, getPlayerSlotBgColor, type PlayerSortType } from '../../lib/matchProgramUtils'
import { formatPlayerCardName } from '../../lib/formatting'
import { getSeedHue } from '../ui/PlayerAvatar'
import { getPlayerUiVariant, VARIANT_CHANGED_EVENT, type PlayerUiVariant } from '../../lib/uiVariants'

interface BenchSectionProps {
  /** Bench players (available players) */
  bench: CheckedInPlayer[]
  /** Inactive players (one-round-only or unavailable) */
  inactivePlayers: CheckedInPlayer[]
  /** Selected round number */
  selectedRound: number
  /** Set of unavailable player IDs */
  unavailablePlayers: Set<string>
  /** Current sort type for players */
  sortType: PlayerSortType
  /** Handler for sort type change */
  onSortTypeChange: (sortType: PlayerSortType) => void
  /** Drag over state for bench */
  dragOverBench: boolean
  /** Drag over state for inactive section */
  dragOverInactive: boolean
  /** Current drag source */
  dragSource: 'bench' | 'inactive' | 'court' | null
  /** Handler for drag start from bench */
  onBenchDragStart: (event: React.DragEvent<HTMLDivElement>, playerId: string) => void
  /** Handler for drag end from bench */
  onBenchDragEnd: () => void
  /** Handler for drag start from inactive */
  onInactiveDragStart: (event: React.DragEvent<HTMLDivElement>, playerId: string) => void
  /** Handler for drag end from inactive */
  onInactiveDragEnd: () => void
  /** Handler for drag over bench */
  onBenchDragOver: (event: React.DragEvent<HTMLDivElement>) => void
  /** Handler for drag leave bench */
  onBenchDragLeave: () => void
  /** Handler for drop on bench */
  onBenchDrop: (event: React.DragEvent<HTMLDivElement>) => void
  /** Handler for drag over inactive */
  onInactiveDragOver: (event: React.DragEvent<HTMLDivElement>) => void
  /** Handler for drag leave inactive */
  onInactiveDragLeave: (event: React.DragEvent<HTMLDivElement>) => void
  /** Handler for drop on inactive */
  onInactiveDrop: (event: React.DragEvent<HTMLDivElement>) => void
  /** Handler to mark player as available */
  onMarkAvailable: (playerId: string) => void
  /** Handler to activate one-round player */
  onActivateOneRoundPlayer: (playerId: string) => void
}

/**
 * Bench section component.
 * 
 * @example
 * ```tsx
 * <BenchSection
 *   bench={bench}
 *   inactivePlayers={inactivePlayers}
 *   selectedRound={1}
 *   unavailablePlayers={unavailablePlayers}
 *   benchCollapsed={false}
 *   benchCollapsing={false}
 *   onToggleCollapse={() => setBenchCollapsed(!benchCollapsed)}
 *   dragOverBench={false}
 *   dragOverInactive={false}
 *   dragSource={null}
 *   onBenchDragStart={handleBenchDragStart}
 *   onBenchDragEnd={handleBenchDragEnd}
 *   onInactiveDragStart={handleInactiveDragStart}
 *   onInactiveDragEnd={handleInactiveDragEnd}
 *   onBenchDragOver={handleBenchDragOver}
 *   onBenchDragLeave={handleBenchDragLeave}
 *   onBenchDrop={handleBenchDrop}
 *   onInactiveDragOver={handleInactiveDragOver}
 *   onInactiveDragLeave={handleInactiveDragLeave}
 *   onInactiveDrop={handleInactiveDrop}
 *   onMarkAvailable={handleMarkAvailable}
 *   onActivateOneRoundPlayer={handleActivateOneRoundPlayer}
 * />
 * ```
 */
export const BenchSection: React.FC<BenchSectionProps> = ({
  bench,
  inactivePlayers,
  selectedRound,
  unavailablePlayers,
  sortType,
  onSortTypeChange,
  dragOverBench,
  dragOverInactive,
  dragSource,
  onBenchDragStart,
  onBenchDragEnd,
  onInactiveDragStart,
  onInactiveDragEnd,
  onBenchDragOver,
  onBenchDragLeave,
  onBenchDrop,
  onInactiveDragOver,
  onInactiveDragLeave,
  onInactiveDrop,
  onMarkAvailable,
  onActivateOneRoundPlayer
}) => {
  const [variant, setVariant] = useState<PlayerUiVariant>(() => getPlayerUiVariant())
  useEffect(() => {
    const onChange = (e: Event) => {
      const ev = e as CustomEvent
      setVariant(ev.detail?.variant ?? getPlayerUiVariant())
    }
    window.addEventListener(VARIANT_CHANGED_EVENT, onChange as EventListener)
    return () => window.removeEventListener(VARIANT_CHANGED_EVENT, onChange as EventListener)
  }, [])

  // Helper function to get avatar rail color for a player (variant A only)
  const getAvatarRailColor = (player: CheckedInPlayer): string | undefined => {
    if (variant !== 'A') return undefined
    const hue = getSeedHue(player.id || player.name, player.gender ?? null)
    return `hsl(${hue} 70% 75% / .26)`
  }

  // Split bench players by gender (when using gender-category or gender-alphabetical sort)
  // When sorting alphabetically only, show all players together
  const shouldGroupByGender = sortType === 'gender-category' || sortType === 'gender-alphabetical'
  const malePlayers = shouldGroupByGender ? bench.filter((p) => p.gender === 'Herre') : []
  const femalePlayers = shouldGroupByGender ? bench.filter((p) => p.gender === 'Dame') : []
  const playersWithoutGender = shouldGroupByGender ? bench.filter((p) => !p.gender || (p.gender !== 'Herre' && p.gender !== 'Dame')) : []
  const allPlayersAlphabetical = !shouldGroupByGender ? bench : []

  return (
    <PageCard 
      className={`space-y-3 transition-all duration-300 ease-in-out p-3 sm:p-4 md:self-stretch flex flex-col max-h-[calc(100vh-440px+48px)] sm:max-h-[calc(100vh-400px+56px)] xl:max-h-[calc(100vh-360px+56px)] ${
        dragOverBench 
          ? 'bg-[hsl(var(--primary)/.05)]' 
          : ''
      }`}
      style={dragOverBench ? { 
        outline: '2px solid hsl(var(--primary) / 0.4)',
        outlineOffset: '-2px'
      } : undefined}
    >
      <header className="flex items-center justify-between flex-shrink-0 gap-2">
        <h3 className="text-sm sm:text-base font-semibold">BÆNK</h3>
        <div className="flex items-center gap-2">
          <select
            value={sortType}
            onChange={(e) => onSortTypeChange(e.target.value as PlayerSortType)}
            aria-label="Sorter spillere"
            className="dropdown-chevron relative rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 pr-6 sm:pr-7 text-[10px] sm:text-xs font-medium bg-[hsl(var(--surface-2))] text-[hsl(var(--foreground))] ring-1 ring-[hsl(var(--line)/.12)] hover:ring-[hsl(var(--line)/.2)] focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1 outline-none transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none cursor-pointer appearance-none min-w-[100px] sm:min-w-[120px] whitespace-nowrap"
          >
            <option value="gender-category">Køn + Kategori</option>
            <option value="gender-alphabetical">Køn + Alfabetisk</option>
            <option value="alphabetical">Alfabetisk</option>
          </select>
          <span className="rounded-full bg-[hsl(var(--surface-2))] px-2.5 py-1 text-xs sm:text-sm font-medium">
            {bench.length}
          </span>
        </div>
      </header>
      <div 
        className="flex flex-col space-y-4 max-h-[calc(100vh-440px)] sm:max-h-[calc(100vh-400px)] xl:max-h-[calc(100vh-360px)] overflow-y-auto scrollbar-thin min-w-0 min-h-0"
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onBenchDragOver(e)
        }}
        onDragLeave={(e) => {
          e.stopPropagation()
          onBenchDragLeave()
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onBenchDrop(e)
        }}
      >
        {bench.length === 0 && (
          <p className="rounded-md bg-[hsl(var(--surface-2))] px-3 py-4 text-center text-sm text-[hsl(var(--muted))] border-hair">
            Træk spillere her for at aktivere dem
          </p>
        )}
        
        {/* Alphabetical sort - show all players together */}
        {!shouldGroupByGender && allPlayersAlphabetical.length > 0 && (
          <div className="space-y-2">
            {allPlayersAlphabetical.map((player) => {
              const avatarRailColor = getAvatarRailColor(player)
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 sm:px-4 sm:py-2 h-[52px] sm:h-[56px] w-full hover:shadow-sm cursor-grab active:cursor-grabbing transition-all ring-1 ring-[hsl(var(--line)/.12)] ${getPlayerSlotBgColor()} avatar-rail`}
                  draggable
                  onDragStart={(event) => onBenchDragStart(event, player.id)}
                  onDragEnd={onBenchDragEnd}
                  style={variant === 'A' && avatarRailColor ? ({ ['--railColor' as any]: avatarRailColor } as React.CSSProperties) : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      {getCategoryBadge(player.primaryCategory)}
                      <p className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] truncate">{formatPlayerCardName(player.name, player.alias)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Gender-category sort - show players grouped by gender */}
        {/* Female players section */}
        {shouldGroupByGender && femalePlayers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-[hsl(var(--line)/.2)]"></div>
              <span className="text-xs sm:text-sm font-semibold text-[hsl(var(--muted))] uppercase tracking-wide px-2">
                Damer ({femalePlayers.length})
              </span>
              <div className="flex-1 h-px bg-[hsl(var(--line)/.2)]"></div>
            </div>
            {femalePlayers.map((player) => {
              const avatarRailColor = getAvatarRailColor(player)
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 sm:px-4 sm:py-2 h-[52px] sm:h-[56px] w-full hover:shadow-sm cursor-grab active:cursor-grabbing transition-all ring-1 ring-[hsl(var(--line)/.12)] ${getPlayerSlotBgColor()} avatar-rail`}
                  draggable
                  onDragStart={(event) => onBenchDragStart(event, player.id)}
                  onDragEnd={onBenchDragEnd}
                  style={variant === 'A' && avatarRailColor ? ({ ['--railColor' as any]: avatarRailColor } as React.CSSProperties) : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      {getCategoryBadge(player.primaryCategory)}
                      <p className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] truncate">{formatPlayerCardName(player.name, player.alias)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Male players section */}
        {shouldGroupByGender && malePlayers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-[hsl(var(--line)/.2)]"></div>
              <span className="text-xs sm:text-sm font-semibold text-[hsl(var(--muted))] uppercase tracking-wide px-2">
                Herrer ({malePlayers.length})
              </span>
              <div className="flex-1 h-px bg-[hsl(var(--line)/.2)]"></div>
            </div>
            {malePlayers.map((player) => {
              const avatarRailColor = getAvatarRailColor(player)
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 sm:px-4 sm:py-2 h-[52px] sm:h-[56px] w-full hover:shadow-sm cursor-grab active:cursor-grabbing transition-all ring-1 ring-[hsl(var(--line)/.12)] ${getPlayerSlotBgColor()} avatar-rail`}
                  draggable
                  onDragStart={(event) => onBenchDragStart(event, player.id)}
                  onDragEnd={onBenchDragEnd}
                  style={variant === 'A' && avatarRailColor ? ({ ['--railColor' as any]: avatarRailColor } as React.CSSProperties) : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      {getCategoryBadge(player.primaryCategory)}
                      <p className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] truncate">{formatPlayerCardName(player.name, player.alias)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Players without gender (fallback) */}
        {shouldGroupByGender && playersWithoutGender.length > 0 && (
          <div className="space-y-2">
            {malePlayers.length > 0 || femalePlayers.length > 0 ? (
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-[hsl(var(--line)/.2)]"></div>
                <span className="text-xs sm:text-sm font-semibold text-[hsl(var(--muted))] uppercase tracking-wide px-2">
                  Uden køn ({playersWithoutGender.length})
                </span>
                <div className="flex-1 h-px bg-[hsl(var(--line)/.2)]"></div>
              </div>
            ) : null}
            {playersWithoutGender.map((player) => {
              const avatarRailColor = getAvatarRailColor(player)
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 sm:px-4 sm:py-2 h-[52px] sm:h-[56px] w-full hover:shadow-sm cursor-grab active:cursor-grabbing transition-all ring-1 ring-[hsl(var(--line)/.12)] ${getPlayerSlotBgColor()} avatar-rail`}
                  draggable
                  onDragStart={(event) => onBenchDragStart(event, player.id)}
                  onDragEnd={onBenchDragEnd}
                  style={variant === 'A' && avatarRailColor ? ({ ['--railColor' as any]: avatarRailColor } as React.CSSProperties) : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      {getCategoryBadge(player.primaryCategory)}
                      <p className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] truncate">{formatPlayerCardName(player.name, player.alias)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Category Legend - only show if there are players with categories */}
        {bench.length > 0 && bench.some(p => p.primaryCategory) && (() => {
          const hasSingle = bench.some(p => p.primaryCategory === 'Single')
          const hasDouble = bench.some(p => p.primaryCategory === 'Double')
          const hasBegge = bench.some(p => p.primaryCategory === 'Begge')
          
          if (!hasSingle && !hasDouble && !hasBegge) return null
          
          return (
            <div className="mt-2 pt-2 border-t border-[hsl(var(--line)/.06)]">
              <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap px-1">
                <span className="text-[9px] sm:text-[10px] text-[hsl(var(--muted))] opacity-70">Kategorier:</span>
                <div className="flex items-center gap-2 sm:gap-2.5">
                  {hasSingle && (
                    <div className="flex items-center gap-1">
                      {getCategoryBadge('Single')}
                      <span className="text-[9px] sm:text-[10px] text-[hsl(var(--muted))] opacity-80">Single</span>
                    </div>
                  )}
                  {hasDouble && (
                    <div className="flex items-center gap-1">
                      {getCategoryBadge('Double')}
                      <span className="text-[9px] sm:text-[10px] text-[hsl(var(--muted))] opacity-80">Double</span>
                    </div>
                  )}
                  {hasBegge && (
                    <div className="flex items-center gap-1">
                      {getCategoryBadge('Begge')}
                      <span className="text-[9px] sm:text-[10px] text-[hsl(var(--muted))] opacity-80">Begge</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
            
            {/* Inactive Players Section */}
            <div 
              className={`mt-4 pt-4 border-t transition-all duration-200 min-w-0 ${
                dragOverInactive && dragSource !== 'inactive'
                  ? 'border-[hsl(var(--destructive)/.4)] bg-[hsl(var(--destructive)/.05)]' 
                  : 'border-[hsl(var(--line)/.12)]'
              }`}
              onDragOver={(e) => {
                // If dragging from within inactive section, don't handle - let it bubble
                if (dragSource === 'inactive') {
                  return
                }
                onInactiveDragOver(e)
              }}
              onDragLeave={(e) => {
                // If dragging from within inactive section, don't handle - let it bubble
                if (dragSource === 'inactive') {
                  return
                }
                onInactiveDragLeave(e)
              }}
              onDrop={(e) => {
                // If dropping from within inactive section, don't handle - let it bubble
                if (dragSource === 'inactive') {
                  return
                }
                onInactiveDrop(e)
              }}
            >
              {inactivePlayers.length > 0 ? (
                <>
                  <header className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] sm:text-xs font-semibold text-[hsl(var(--muted))] uppercase tracking-wide">
                      Inaktive / 1 runde
                    </h4>
                    <span className="rounded-full bg-[hsl(var(--surface-2))] px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-[hsl(var(--muted))]">
                      {inactivePlayers.length}
                    </span>
                  </header>
                  <div className="flex flex-col space-y-3 min-w-0">
                    {inactivePlayers.map((player) => {
                      const isOneRoundOnly = selectedRound > 1 && player.maxRounds === 1
                      const isUnavailable = unavailablePlayers.has(player.id)
                      const avatarRailColor = getAvatarRailColor(player)
                      return (
                        <div
                          key={player.id}
                          className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 sm:px-3 sm:py-2 h-[52px] sm:h-[56px] w-full max-w-full box-border opacity-60 hover:opacity-100 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all ring-1 ring-[hsl(var(--line)/.12)] overflow-hidden ${getPlayerSlotBgColor()} avatar-rail`}
                          draggable
                          onDragStart={(event) => onInactiveDragStart(event, player.id)}
                          onDragEnd={onInactiveDragEnd}
                          style={variant === 'A' && avatarRailColor ? ({ ['--railColor' as any]: avatarRailColor } as React.CSSProperties) : undefined}
                        >
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="text-sm sm:text-base font-semibold text-[hsl(var(--foreground))] truncate w-full">{formatPlayerCardName(player.name, player.alias)}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                              {getCategoryBadge(player.primaryCategory)}
                              {isOneRoundOnly && !isUnavailable && (
                                <span className="inline-flex items-center rounded-full bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair px-1.5 py-0.5 text-[9px] sm:text-[10px] whitespace-nowrap flex-shrink-0">1 runde</span>
                              )}
                              {isUnavailable && (
                                <span className="text-[9px] sm:text-[10px] font-normal text-[hsl(var(--destructive))] whitespace-nowrap flex-shrink-0">Inaktiv</span>
                              )}
                            </div>
                          </div>
                          {(isUnavailable || (isOneRoundOnly && !isUnavailable)) && (
                            <div className="flex-shrink-0 flex items-center justify-end ml-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isUnavailable) {
                                    onMarkAvailable(player.id)
                                  } else if (isOneRoundOnly) {
                                    onActivateOneRoundPlayer(player.id)
                                  }
                                }}
                                className="rounded px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/.1)] ring-1 ring-[hsl(var(--success)/.2)] transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none hover:shadow-sm whitespace-nowrap"
                                title={isUnavailable ? "Gendan til bænk" : "Aktiver spiller"}
                              >
                                Aktiver
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="py-4">
                  <header className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] sm:text-xs font-semibold text-[hsl(var(--muted))] uppercase tracking-wide">
                      Inaktive / 1 runde
                    </h4>
                    <span className="rounded-full bg-[hsl(var(--surface-2))] px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-[hsl(var(--muted))]">
                      0
                    </span>
                  </header>
                  <p className="text-[9px] sm:text-[10px] text-[hsl(var(--muted))] text-center py-2 rounded-md bg-[hsl(var(--surface-2))] border-hair">
                    Træk spillere her for at markere dem som inaktive
                  </p>
                </div>
              )}
            </div>
          </div>
    </PageCard>
  )
}

