/**
 * Modal for moving a player to a different court/slot (mobile-friendly alternative to drag-and-drop).
 */

import React, { useState, useMemo } from 'react'
import type { Player, CourtWithPlayers } from '@rundeklar/common'
import { Button, PageCard } from '../ui'
import { X } from 'lucide-react'

interface MovePlayerModalProps {
  /** Whether modal is open */
  isOpen: boolean
  
  /** Player to move */
  player: Player | null
  
  /** All courts */
  courts: CourtWithPlayers[]
  
  /** Extended capacity courts map */
  extendedCapacityCourts: Map<number, number>
  
  /** Current court index (if player is already on a court) */
  currentCourtIdx?: number
  
  /** Current slot index (if player is already on a court) */
  currentSlot?: number
  
  /** Handler when move is confirmed */
  onMove: (courtIdx: number, slot: number) => Promise<void>
  
  /** Handler to close modal */
  onClose: () => void
}

/**
 * Modal for moving a player (mobile-friendly).
 */
export const MovePlayerModal: React.FC<MovePlayerModalProps> = ({
  isOpen,
  player,
  courts,
  extendedCapacityCourts,
  currentCourtIdx,
  currentSlot,
  onMove,
  onClose
}) => {
  const [selectedCourtIdx, setSelectedCourtIdx] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [isMoving, setIsMoving] = useState(false)

  // Reset selection when modal opens/closes or player changes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedCourtIdx(null)
      setSelectedSlot(null)
    }
  }, [isOpen])

  // Get available slots for selected court
  const availableSlots = useMemo(() => {
    if (selectedCourtIdx === null) return []
    const court = courts[selectedCourtIdx]
    if (!court) return []
    
    // Get max capacity (default 4, or extended capacity if set)
    const maxCapacity = extendedCapacityCourts.get(court.courtIdx) || 4
    
    return Array.from({ length: maxCapacity }, (_, i) => i)
  }, [selectedCourtIdx, courts, extendedCapacityCourts])

  const handleMove = async () => {
    if (selectedCourtIdx === null || selectedSlot === null || !player) return
    
    // Get the court to find court.courtIdx (1-based) from array index (0-based)
    const selectedCourt = courts[selectedCourtIdx]
    if (!selectedCourt) return
    
    const targetCourtIdx = selectedCourt.courtIdx
    
    // Don't allow moving to same position
    // currentCourtIdx is court.courtIdx (1-based), so find the array index for comparison
    const currentCourtArrayIdx = currentCourtIdx !== undefined 
      ? courts.findIndex(c => c.courtIdx === currentCourtIdx)
      : undefined
    
    if (selectedCourtIdx === currentCourtArrayIdx && selectedSlot === currentSlot) {
      onClose()
      return
    }
    
    setIsMoving(true)
    try {
      // Pass court.courtIdx (1-based) instead of array index (0-based)
      await onMove(targetCourtIdx, selectedSlot)
      onClose()
    } catch (err) {
      // Error handling is done by parent
    } finally {
      setIsMoving(false)
    }
  }

  if (!isOpen || !player) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <PageCard className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
            Flyt {player.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[hsl(var(--surface-2)/.5)] transition-colors"
            aria-label="Luk"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Court selection */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
              Vælg bane
            </label>
            <div className="grid grid-cols-2 gap-2">
              {courts.map((court, idx) => {
                const isSelected = selectedCourtIdx === idx
                // currentCourtIdx is court.courtIdx (1-based), not array index
                const isCurrentCourt = currentCourtIdx !== undefined && court.courtIdx === currentCourtIdx
                const occupiedSlots = court.slots.filter(slot => slot.player).length
                const maxCapacity = extendedCapacityCourts.get(court.courtIdx) || 4
                const isFull = occupiedSlots >= maxCapacity
                
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedCourtIdx(idx)
                      setSelectedSlot(null) // Reset slot selection
                    }}
                    disabled={isFull && !isCurrentCourt}
                    className={`
                      p-3 rounded-lg border-2 transition-all
                      ${isSelected 
                        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)]' 
                        : 'border-[hsl(var(--line)/.12)] bg-[hsl(var(--surface-2)/.85)] hover:border-[hsl(var(--primary)/.3)]'
                      }
                      ${isFull && !isCurrentCourt ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      ${isCurrentCourt ? 'ring-2 ring-[hsl(var(--accent)/.3)]' : ''}
                    `}
                  >
                    <div className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      Bane {court.courtIdx}
                    </div>
                    <div className="text-xs text-[hsl(var(--muted))] mt-1">
                      {occupiedSlots}/{maxCapacity} spillere
                      {isCurrentCourt && ' (nuværende)'}
                      {isFull && !isCurrentCourt && ' (fuld)'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Slot selection */}
          {selectedCourtIdx !== null && (
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Vælg plads
              </label>
              <div className="grid grid-cols-2 gap-2">
                {availableSlots.map((slot) => {
                  const court = courts[selectedCourtIdx]
                  if (!court) return null
                  const slotEntry = court.slots.find(s => s.slot === slot)
                  const slotPlayer = slotEntry?.player
                  const isSelected = selectedSlot === slot
                  // currentCourtIdx is court.courtIdx (1-based), compare with court.courtIdx
                  const isCurrentSlot = currentCourtIdx !== undefined && court.courtIdx === currentCourtIdx && currentSlot === slot
                  
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      disabled={!!slotPlayer && !isCurrentSlot}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-left
                        ${isSelected 
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)]' 
                          : 'border-[hsl(var(--line)/.12)] bg-[hsl(var(--surface-2)/.85)] hover:border-[hsl(var(--primary)/.3)]'
                        }
                        ${slotPlayer && !isCurrentSlot ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        ${isCurrentSlot ? 'ring-2 ring-[hsl(var(--accent)/.3)]' : ''}
                      `}
                    >
                      <div className="text-sm font-semibold text-[hsl(var(--foreground))]">
                        Plads {slot + 1}
                      </div>
                      {slotPlayer ? (
                        <div className="text-xs text-[hsl(var(--muted))] mt-1">
                          {slotPlayer.name}
                          {isCurrentSlot && ' (nuværende)'}
                        </div>
                      ) : (
                        <div className="text-xs text-[hsl(var(--muted))] mt-1">
                          Ledig
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-[hsl(var(--line)/.12)]">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Annuller
            </Button>
            <Button
              variant="primary"
              onClick={handleMove}
              disabled={selectedCourtIdx === null || selectedSlot === null || isMoving}
              className="flex-1"
            >
              {isMoving ? 'Flytter...' : 'Flyt'}
            </Button>
          </div>
        </div>
      </PageCard>
    </div>
  )
}

