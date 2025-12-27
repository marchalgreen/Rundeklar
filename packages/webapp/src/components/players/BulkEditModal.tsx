/**
 * Bulk Edit Modal component for editing multiple players at once.
 * 
 * Allows updating training groups, active status, and other fields for selected players.
 */

import React, { useState, useCallback } from 'react'
import type { Player } from '@rundeklar/common'
import { X } from 'lucide-react'
import { Button } from '../ui'
import { fetchTrainingGroups } from '../../services/coachLandingApi'
import type { Group } from '../../routes/landing/types'

interface BulkEditModalProps {
  isOpen: boolean
  selectedPlayers: Player[]
  onClose: () => void
  onSave: (updates: {
    trainingGroups?: string[]
    active?: boolean
  }) => Promise<void>
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  selectedPlayers,
  onClose,
  onSave
}) => {
  const [trainingGroups, setTrainingGroups] = useState<string[]>([])
  const [availableGroups, setAvailableGroups] = useState<Group[]>([])
  const [activeStatus, setActiveStatus] = useState<boolean | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [newGroupInput, setNewGroupInput] = useState('')

  // Load available training groups
  React.useEffect(() => {
    if (isOpen) {
      void fetchTrainingGroups().then((groups) => {
        setAvailableGroups(groups)
      })
    }
  }, [isOpen])

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setTrainingGroups([])
      setActiveStatus(null)
      setNewGroupInput('')
    }
  }, [isOpen])

  const handleAddGroup = useCallback(() => {
    const trimmed = newGroupInput.trim()
    if (trimmed && !trainingGroups.includes(trimmed)) {
      setTrainingGroups([...trainingGroups, trimmed])
      setNewGroupInput('')
    }
  }, [newGroupInput, trainingGroups])

  const handleRemoveGroup = useCallback((groupToRemove: string) => {
    setTrainingGroups(trainingGroups.filter(g => g !== groupToRemove))
  }, [trainingGroups])

  const handleToggleGroup = useCallback((groupName: string) => {
    if (trainingGroups.includes(groupName)) {
      handleRemoveGroup(groupName)
    } else {
      setTrainingGroups([...trainingGroups, groupName])
    }
  }, [trainingGroups, handleRemoveGroup])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    const updates: {
      trainingGroups?: string[]
      active?: boolean
    } = {}

    if (trainingGroups.length > 0) {
      updates.trainingGroups = trainingGroups
    }

    if (activeStatus !== null) {
      updates.active = activeStatus
    }

    if (Object.keys(updates).length === 0) {
      return // No changes
    }

    setIsSaving(true)
    try {
      await onSave(updates)
      onClose()
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setIsSaving(false)
    }
  }, [trainingGroups, activeStatus, onSave, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="bg-[hsl(var(--surface))] rounded-lg shadow-lg p-4 sm:p-6 max-w-md w-full mx-4 ring-1 ring-[hsl(var(--line)/.12)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">
            Rediger {selectedPlayers.length} spiller{selectedPlayers.length !== 1 ? 'e' : ''}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-2)/.5)] transition-colors"
            aria-label="Luk"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Active Status */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
              Status
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveStatus(activeStatus === true ? null : true)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeStatus === true
                    ? 'bg-[hsl(var(--success))] text-white'
                    : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-glass)/.85)]'
                }`}
              >
                Aktiv
              </button>
              <button
                type="button"
                onClick={() => setActiveStatus(activeStatus === false ? null : false)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeStatus === false
                    ? 'bg-[hsl(var(--destructive))] text-white'
                    : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-glass)/.85)]'
                }`}
              >
                Inaktiv
              </button>
            </div>
            <p className="text-xs text-[hsl(var(--muted))] mt-1">
              {activeStatus === null ? 'Ingen ændring' : activeStatus ? 'Alle spillere bliver aktive' : 'Alle spillere bliver inaktive'}
            </p>
          </div>

          {/* Training Groups */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
              Træningsgrupper
            </label>
            <p className="text-xs text-[hsl(var(--muted))] mb-2">
              Vælg grupper der skal tilføjes til alle valgte spillere
            </p>
            
            {/* Available groups */}
            {availableGroups.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {availableGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleToggleGroup(group.name)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      trainingGroups.includes(group.name)
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-glass)/.85)]'
                    }`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            )}

            {/* Add new group */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupInput}
                onChange={(e) => setNewGroupInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGroup())}
                placeholder="Tilføj ny gruppe"
                className="flex-1 rounded-md bg-[hsl(var(--surface))] px-3 py-2 ring-1 ring-[hsl(var(--line)/.14)] focus:ring-2 focus:ring-[hsl(var(--ring))] outline-none text-[hsl(var(--foreground))] text-sm"
              />
              <Button type="button" onClick={handleAddGroup} size="sm" variant="secondary">
                Tilføj
              </Button>
            </div>

            {/* Selected groups */}
            {trainingGroups.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {trainingGroups.map((group) => (
                  <span
                    key={group}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] text-xs font-medium"
                  >
                    {group}
                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(group)}
                      className="hover:text-[hsl(var(--destructive))] transition-colors"
                      aria-label={`Fjern ${group}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Selected players list */}
          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
              Valgte spillere ({selectedPlayers.length})
            </label>
            <div className="max-h-32 overflow-y-auto bg-[hsl(var(--surface-2))] rounded-md p-2 space-y-1">
              {selectedPlayers.map((player) => (
                <div key={player.id} className="text-xs text-[hsl(var(--muted))]">
                  {player.name}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-[hsl(var(--line)/.12)]">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Annuller
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSaving}
              disabled={trainingGroups.length === 0 && activeStatus === null}
            >
              Gem ændringer
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

