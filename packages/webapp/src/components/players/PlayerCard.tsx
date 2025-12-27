/**
 * Player card component for PlayersDB page (mobile view).
 * 
 * Displays player information in a card format optimized for mobile devices.
 */

import React from 'react'
import type { Player } from '@rundeklar/common'
import { Pencil, Trash2, CheckSquare, Square } from 'lucide-react'
import { Badge, Button } from '../ui'
import { InitialsAvatar } from '../ui/PlayerAvatar'
import { formatDate } from '../../lib/formatting'
import { PLAYER_CATEGORIES } from '../../constants'

interface PlayerCardProps {
  /** Player data to display. */
  player: Player
  
  /** Whether player is selected for bulk operations. */
  isSelected: boolean
  
  /** Callback when selection checkbox is toggled. */
  onToggleSelection: (playerId: string) => void
  
  /** Callback when edit button is clicked. */
  onEdit: (player: Player) => void
  
  /** Callback when delete button is clicked. */
  onDelete: (player: Player) => void
  
  /** All players for partner dropdowns. */
  allPlayers: Player[]
}

/**
 * Player card component for mobile view in PlayersDB.
 */
export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
  allPlayers
}) => {
  const categoryLabel = player.primaryCategory 
    ? PLAYER_CATEGORIES[player.primaryCategory] 
    : null

  return (
    <div className="border border-[hsl(var(--line)/.12)] rounded-lg p-4 bg-[hsl(var(--surface-2)/.85)] backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
      {/* Header with selection checkbox and avatar */}
      <div className="flex items-start gap-3 mb-3">
        <button
          type="button"
          onClick={() => onToggleSelection(player.id)}
          className="flex-shrink-0 p-1 rounded hover:bg-[hsl(var(--surface-2)/.5)] transition-colors mt-1"
          aria-label={`${isSelected ? 'Fjern' : 'Vælg'} ${player.name}`}
        >
          {isSelected ? (
            <CheckSquare size={20} className="text-[hsl(var(--primary))]" />
          ) : (
            <Square size={20} className="text-[hsl(var(--muted))]" />
          )}
        </button>
        <InitialsAvatar seed={player.id} name={player.name} gender={player.gender ?? null} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[hsl(var(--foreground))] text-base truncate">
                {player.name}
              </h3>
              {player.alias && (
                <p className="text-sm text-[hsl(var(--muted))] truncate">
                  {player.alias}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(player)}
                className="p-1.5"
                aria-label={`Rediger ${player.name}`}
              >
                <Pencil size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(player)}
                className="p-1.5 text-[hsl(var(--danger))] hover:text-[hsl(var(--danger))]"
                aria-label={`Slet ${player.name}`}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Player details */}
      <div className="space-y-2 text-sm">
        {/* Status and Category */}
        <div className="flex items-center gap-2 flex-wrap">
          {player.active ? (
            <Badge variant="success" size="sm">Aktiv</Badge>
          ) : (
            <Badge variant="secondary" size="sm">Inaktiv</Badge>
          )}
          {categoryLabel && (
            <Badge variant="secondary" size="sm">{categoryLabel}</Badge>
          )}
          {player.gender && (
            <Badge variant="secondary" size="sm">{player.gender}</Badge>
          )}
        </div>

        {/* Levels */}
        {(player.levelSingle || player.levelDouble || player.levelMix) && (
          <div className="flex flex-wrap gap-3 text-xs">
            {player.levelSingle && (
              <div>
                <span className="text-[hsl(var(--muted))]">Single: </span>
                <span className="font-medium text-[hsl(var(--foreground))]">{player.levelSingle}</span>
              </div>
            )}
            {player.levelDouble && (
              <div>
                <span className="text-[hsl(var(--muted))]">Double: </span>
                <span className="font-medium text-[hsl(var(--foreground))]">{player.levelDouble}</span>
              </div>
            )}
            {player.levelMix && (
              <div>
                <span className="text-[hsl(var(--muted))]">Mix: </span>
                <span className="font-medium text-[hsl(var(--foreground))]">{player.levelMix}</span>
              </div>
            )}
          </div>
        )}

        {/* Training Groups */}
        {player.trainingGroups && player.trainingGroups.length > 0 && (
          <div>
            <span className="text-[hsl(var(--muted))] text-xs">Træningsgrupper: </span>
            <span className="text-xs text-[hsl(var(--foreground))]">
              {player.trainingGroups.join(', ')}
            </span>
          </div>
        )}

        {/* Partners */}
        {(player.preferredDoublesPartners?.length > 0 || player.preferredMixedPartners?.length > 0) && (
          <div className="space-y-1">
            {player.preferredDoublesPartners && player.preferredDoublesPartners.length > 0 && (
              <div>
                <span className="text-[hsl(var(--muted))] text-xs">Double makker: </span>
                <span className="text-xs text-[hsl(var(--foreground))]">
                  {player.preferredDoublesPartners
                    .map(id => allPlayers.find(p => p.id === id)?.name)
                    .filter(Boolean)
                    .join(', ') || '–'}
                </span>
              </div>
            )}
            {player.preferredMixedPartners && player.preferredMixedPartners.length > 0 && (
              <div>
                <span className="text-[hsl(var(--muted))] text-xs">Mix makker: </span>
                <span className="text-xs text-[hsl(var(--foreground))]">
                  {player.preferredMixedPartners
                    .map(id => allPlayers.find(p => p.id === id)?.name)
                    .filter(Boolean)
                    .join(', ') || '–'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Created date */}
        <div className="text-xs text-[hsl(var(--muted))] pt-1 border-t border-[hsl(var(--line)/.12)]">
          Oprettet: {formatDate(player.createdAt, true)}
        </div>
      </div>
    </div>
  )
}

