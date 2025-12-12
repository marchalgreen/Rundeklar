/**
 * NotesModal component — modal for adding/editing player check-in notes.
 * 
 * Allows players to add optional notes about training preferences (e.g., preferred partners).
 * Includes validation, character counter, and proper accessibility support.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui'
import { useToast } from '../ui/Toast'

export type NotesModalProps = {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Current notes value (if editing) */
  currentNotes?: string | null
  /** Callback when notes are saved */
  onSave: (notes: string | null) => Promise<void>
  /** Player name (for display) */
  playerName: string
  /** Element to return focus to when modal closes */
  returnFocusTo?: HTMLElement | null
  /** Whether this is for a non-checked-in player (shows "Gem og tjek ind" button) */
  isForNonCheckedInPlayer?: boolean
  /** Optional callback to check in the player (only used if isForNonCheckedInPlayer is true) */
  onSaveAndCheckIn?: (notes: string | null) => Promise<void>
}

const MAX_NOTES_LENGTH = 500

/**
 * NotesModal component.
 * 
 * @example
 * ```tsx
 * <NotesModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   currentNotes={player.notes}
 *   onSave={handleSaveNotes}
 *   playerName={player.name}
 * />
 * ```
 */
export const NotesModal: React.FC<NotesModalProps> = ({
  isOpen,
  onClose,
  currentNotes,
  onSave,
  playerName,
  returnFocusTo,
  isForNonCheckedInPlayer = false,
  onSaveAndCheckIn
}) => {
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { notify } = useToast()

  // Initialize notes from currentNotes when modal opens
  useEffect(() => {
    if (isOpen) {
      setNotes(currentNotes ?? '')
      setError(null)
      // Focus textarea when modal opens
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
    }
  }, [isOpen, currentNotes])

  const handleSave = useCallback(async () => {
    // Validate length
    if (notes.length > MAX_NOTES_LENGTH) {
      setError(`Noter må maksimalt være ${MAX_NOTES_LENGTH} tegn`)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const trimmedNotes = notes.trim()
      const notesValue = trimmedNotes === '' ? null : trimmedNotes
      
      if (isForNonCheckedInPlayer && onSaveAndCheckIn) {
        // For non-checked-in players, save and check in
        await onSaveAndCheckIn(notesValue)
        notify({
          variant: 'success',
          title: 'Spiller tjekket ind',
          description: 'Noter er blevet gemt og spilleren er tjekket ind'
        })
      } else {
        // For checked-in players, just save notes
        await onSave(notesValue)
        notify({
          variant: 'success',
          title: 'Noter gemt',
          description: 'Noter er blevet gemt'
        })
      }
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Kunne ikke gemme noter'
      setError(errorMessage)
      notify({
        variant: 'danger',
        title: 'Fejl',
        description: errorMessage
      })
    } finally {
      setIsSaving(false)
    }
  }, [notes, onSave, onClose, notify, isForNonCheckedInPlayer, onSaveAndCheckIn])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      setTimeout(() => returnFocusTo?.focus(), 0)
    }
    if (e.key === 'Tab') {
      // Focus trap
      const container = e.currentTarget as HTMLElement
      const focusables = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [onClose, returnFocusTo])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  if (!isOpen) return null

  const remainingChars = MAX_NOTES_LENGTH - notes.length
  const isOverLimit = notes.length > MAX_NOTES_LENGTH

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Tilføj noter"
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-md mx-3 sm:mx-4 bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)] rounded-lg shadow-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-[hsl(var(--line)/.12)] flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-[hsl(var(--foreground))]">
              Noter for {playerName}
            </h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted))] mt-1">
              Tilføj noter om ønsker til træningsrunderne (f.eks. foretrukne makkere)
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onClose()
              setTimeout(() => returnFocusTo?.focus(), 0)
            }}
            className="flex-shrink-0"
            aria-label="Luk dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-3">
            <label htmlFor="notes-textarea" className="block text-sm font-medium text-[hsl(var(--foreground))]">
              Noter
            </label>
            <textarea
              id="notes-textarea"
              ref={textareaRef}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                setError(null)
              }}
              placeholder="F.eks. Gerne træne med..."
              rows={6}
              maxLength={MAX_NOTES_LENGTH + 10} // Allow typing past limit to show error
              className={`
                w-full px-3 py-2 text-sm
                bg-[hsl(var(--surface-2))] 
                text-[hsl(var(--foreground))] 
                placeholder-[hsl(var(--muted))]
                ring-1 ring-[hsl(var(--line)/.12)]
                rounded-md
                focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]
                resize-none
                ${isOverLimit ? 'ring-[hsl(var(--destructive))]' : ''}
              `}
              aria-invalid={isOverLimit}
              aria-describedby={error ? 'notes-error' : 'notes-counter'}
            />
            <div className="flex items-center justify-between">
              <div>
                {error && (
                  <p id="notes-error" className="text-xs text-[hsl(var(--destructive))]" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <p
                id="notes-counter"
                className={`text-xs ${
                  remainingChars < 50
                    ? remainingChars < 0
                      ? 'text-[hsl(var(--destructive))]'
                      : 'text-[hsl(var(--warning))]'
                    : 'text-[hsl(var(--muted))]'
                }`}
              >
                {remainingChars} tegn tilbage
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-[hsl(var(--line)/.12)] flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onClose()
              setTimeout(() => returnFocusTo?.focus(), 0)
            }}
            disabled={isSaving}
          >
            Annuller
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={isSaving}
            disabled={isOverLimit}
          >
            {isForNonCheckedInPlayer ? 'Gem og tjek ind' : 'Gem'}
          </Button>
        </div>
      </div>
    </div>
  )
}

