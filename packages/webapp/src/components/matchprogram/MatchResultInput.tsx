/**
 * Match Result Input component for entering match scores.
 * 
 * Supports badminton scoring (best-of-3 sets) with quick entry buttons and real-time validation.
 */

import React, { useState, useEffect, useRef } from 'react'
import type { MatchResult, BadmintonScoreData, CourtWithPlayers } from '@rundeklar/common'
import { Button } from '../ui'
import { Trophy, X, Trash2 } from 'lucide-react'
import { validateBadmintonScore } from '../../lib/matchResultValidation'
import { getTeamPlayers } from '../../lib/matchProgramUtils'
import { normalizeError } from '../../lib/errors'
import { useToast } from '../ui/Toast'

interface MatchResultInputProps {
  isOpen: boolean
  onClose: () => void
  matchId: string
  court: CourtWithPlayers
  existingResult?: MatchResult | null
  sport: 'badminton' | 'tennis' | 'padel'
  onSave: (result: { scoreData: BadmintonScoreData; winnerTeam: 'team1' | 'team2' }) => Promise<void>
  onDelete?: () => Promise<void>
}

export const MatchResultInput: React.FC<MatchResultInputProps> = ({
  isOpen,
  onClose,
  matchId: _matchId,
  court,
  existingResult,
  sport: _sport,
  onSave,
  onDelete
}) => {
  const { notify } = useToast()
  const { team1, team2 } = getTeamPlayers(court)
  
  // Determine if it's singles (1v1) or doubles (2v2)
  const isSingles = team1.length === 1 && team2.length === 1
  const columnHeader = isSingles ? 'Spiller' : 'Spillere'
  const playerLabelDefinite = isSingles ? 'En spiller' : 'Et par'
  const playerLabelPlural = isSingles ? 'Begge spillere' : 'Begge par'
  // Always initialize with 3 sets (with null for empty fields)
  const initializeSets = (): Array<{ team1: number | null; team2: number | null }> => {
    if (existingResult && existingResult.sport === 'badminton') {
      const existingSets = (existingResult.scoreData as BadmintonScoreData).sets
      // Convert existing sets to our format (numbers stay as numbers)
      const converted: Array<{ team1: number | null; team2: number | null }> = existingSets.map(set => ({ team1: set.team1, team2: set.team2 }))
      // Ensure we have exactly 3 sets (pad with nulls if needed)
      while (converted.length < 3) {
        converted.push({ team1: null, team2: null })
      }
      return converted.slice(0, 3)
    }
    return [{ team1: null, team2: null }, { team1: null, team2: null }, { team1: null, team2: null }]
  }
  const [sets, setSets] = useState<Array<{ team1: number | null; team2: number | null }>>(initializeSets)
  const [validation, setValidation] = useState<{ valid: boolean; error?: string }>({ valid: false })
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Filter out empty sets (sets where both teams are null) before saving and convert to numbers
  const getFilteredSets = React.useCallback((): Array<{ team1: number; team2: number }> => {
    return sets
      .filter(set => set.team1 !== null && set.team2 !== null)
      .map(set => ({ team1: set.team1!, team2: set.team2! }))
  }, [sets])

  // Validate on sets change (using filtered sets)
  useEffect(() => {
    const filteredSets = getFilteredSets()
    const result = validateBadmintonScore(filteredSets, {
      playerLabelPlural,
      playerLabelDefinite
    })
    
    setValidation(result)
  }, [sets, getFilteredSets, playerLabelPlural, playerLabelDefinite])

  // Auto-focus first input when modal opens
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSets(initializeSets())
      setShowDeleteConfirm(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, existingResult])

  const handleSetChange = (setIndex: number, team: 'team1' | 'team2', e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    
    // If input is empty or just whitespace, set to null (blank field)
    if (inputValue === '' || inputValue.trim() === '') {
      const newSets = [...sets]
      if (!newSets[setIndex]) {
        newSets[setIndex] = { team1: null, team2: null }
      }
      newSets[setIndex] = {
        ...newSets[setIndex],
        [team]: null
      }
      setSets(newSets)
      return
    }
    
    // Parse the value
    const numValue = parseInt(inputValue, 10)
    
    // Only update if it's a valid number and within range
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 30) {
      const newSets = [...sets]
      if (!newSets[setIndex]) {
        newSets[setIndex] = { team1: null, team2: null }
      }
      newSets[setIndex] = {
        ...newSets[setIndex],
        [team]: numValue
      }
      setSets(newSets)
    }
    // If value is invalid (> 30 or not a number), don't update state
    // The input will remain showing the invalid value temporarily, but React will
    // reset it to the controlled value on next render
  }
  
  // Handle input focus - select all text so typing replaces the entire value
  const handleInputFocus = (setIndex: number, team: 'team1' | 'team2', e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text when focusing, so typing replaces the entire value
    e.target.select()
  }
  
  // Handle input click - also select all text to ensure replacement behavior
  const handleInputClick = (setIndex: number, team: 'team1' | 'team2', e: React.MouseEvent<HTMLInputElement>) => {
    // Select all text on click to ensure typing replaces the entire value
    e.currentTarget.select()
  }

  const getWinner = (): 'team1' | 'team2' | null => {
    let team1Wins = 0
    let team2Wins = 0
    
    const filteredSets = getFilteredSets()
    // Only calculate winner if we have at least one complete set
    if (filteredSets.length === 0) {
      return null
    }
    
    for (const set of filteredSets) {
      if (set.team1 > set.team2) team1Wins++
      else if (set.team2 > set.team1) team2Wins++
    }
    
    if (team1Wins >= 2) return 'team1'
    if (team2Wins >= 2) return 'team2'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Use filtered sets (remove empty sets)
    const filteredSets = getFilteredSets()
    
    // Validate filtered sets
    const validationResult = validateBadmintonScore(filteredSets, {
      playerLabelPlural,
      playerLabelDefinite
    })
    
    if (!validationResult.valid) {
      setValidation(validationResult)
      return
    }
    
    const winner = getWinner()
    
    if (!winner) {
      return
    }
    
    setIsSaving(true)
    try {
      const scoreData: BadmintonScoreData = {
        sets: filteredSets,
        winner
      }
      
      await onSave({ scoreData, winnerTeam: winner })
      onClose()
    } catch (error) {
      const normalizedError = normalizeError(error)
      notify({
        variant: 'danger',
        title: 'Kunne ikke gemme resultat',
        description: normalizedError.message
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    
    setIsSaving(true)
    try {
      await onDelete()
      onClose()
    } catch (error) {
      const normalizedError = normalizeError(error)
      notify({
        variant: 'danger',
        title: 'Kunne ikke slette resultat',
        description: normalizedError.message
      })
    } finally {
      setIsSaving(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      // Enter key saves the form (only if not in a textarea or with modifiers)
      const target = e.target as HTMLElement
      if (target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        e.stopPropagation()
        // Trigger form submit if validation is valid
        if (validation.valid && !isSaving) {
          handleSubmit(e as any)
        }
      }
    }
  }
  
  // Handle Enter key in input fields - submit form if valid
  const handleInputKeyDownForEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      e.stopPropagation()
      // Trigger form submit if validation is valid
      if (validation.valid && !isSaving) {
        // Create a synthetic form event for handleSubmit
        const syntheticEvent = {
          preventDefault: () => {},
          stopPropagation: () => {}
        } as React.FormEvent
        handleSubmit(syntheticEvent)
      }
    }
  }

  if (!isOpen) return null

  const winner = getWinner()
  const team1Name = team1.map(p => p.name).join(' / ') || 'Team 1'
  const team2Name = team2.map(p => p.name).join(' / ') || 'Team 2'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Indtast kampresultat"
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-2xl mx-2 sm:mx-4 bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)] rounded-lg shadow-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-[hsl(var(--line)/.12)] flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[hsl(var(--primary))]" />
              Indtast resultat
            </h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted))] mt-1">
              Bane {court.courtIdx}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className="flex-shrink-0"
            aria-label="Luk dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 sm:space-y-5">

          {/* Score table */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))]">Score</h4>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full border-collapse min-w-[320px]">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-xs font-semibold text-[hsl(var(--muted))] border-b border-[hsl(var(--line)/.12)] min-w-[100px] sm:min-w-[120px]">
                      {columnHeader}
                    </th>
                    <th className="text-center p-1.5 sm:p-2 text-xs font-semibold text-[hsl(var(--muted))] border-b border-[hsl(var(--line)/.12)] min-w-[70px]">
                      1. sæt
                    </th>
                    <th className="text-center p-1.5 sm:p-2 text-xs font-semibold text-[hsl(var(--muted))] border-b border-[hsl(var(--line)/.12)] min-w-[70px]">
                      2. sæt
                    </th>
                    <th className="text-center p-1.5 sm:p-2 text-xs font-semibold text-[hsl(var(--muted))] border-b border-[hsl(var(--line)/.12)] min-w-[70px]">
                      3. sæt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Team 1 Row */}
                  <tr>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] border-b border-[hsl(var(--line)/.12)] min-w-[100px] sm:min-w-[120px]">
                      <span className="break-words">{team1Name}</span>
                    </td>
                    {sets.map((set, index) => {
                      const setWinner = set.team1 !== null && set.team2 !== null && set.team1 > set.team2 ? 'team1' : set.team1 !== null && set.team2 !== null && set.team2 > set.team1 ? 'team2' : null
                      const isValid = set.team1 !== null && set.team2 !== null && set.team1 !== set.team2 && (set.team1 >= 21 || set.team2 >= 21)
                      const isWinner = setWinner === 'team1' && isValid
                      // Tab order: Set 1 Team 1 = 1, Set 1 Team 2 = 2, Set 2 Team 1 = 3, Set 2 Team 2 = 4, Set 3 Team 1 = 5, Set 3 Team 2 = 6
                      const tabIndex = index * 2 + 1
                      
                      return (
                        <td
                          key={`team1-set${index}`}
                          className={`p-1.5 sm:p-2 text-center border-b border-[hsl(var(--line)/.12)] ${
                            isWinner ? 'bg-[hsl(var(--primary)/.1)]' : ''
                          }`}
                        >
                          <input
                            ref={(el) => {
                              if (index === 0) firstInputRef.current = el
                            }}
                            type="number"
                            min="0"
                            max="30"
                            value={set.team1 ?? ''}
                            tabIndex={tabIndex}
                            aria-label={`${team1Name} ${index + 1}. sæt`}
                            onChange={(e) => handleSetChange(index, 'team1', e)}
                            onFocus={(e) => handleInputFocus(index, 'team1', e)}
                            onClick={(e) => handleInputClick(index, 'team1', e)}
                            onKeyDown={(e) => handleInputKeyDownForEnter(e)}
                            className="w-full h-9 sm:h-10 text-center text-base sm:text-lg font-semibold rounded-md bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)] focus:ring-2 focus:ring-[hsl(var(--primary))] outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          />
                        </td>
                      )
                    })}
                  </tr>
                  
                  {/* Team 2 Row */}
                  <tr>
                    <td className="p-2 sm:p-3 text-xs sm:text-sm font-medium text-[hsl(var(--foreground))] min-w-[100px] sm:min-w-[120px]">
                      <span className="break-words">{team2Name}</span>
                    </td>
                    {sets.map((set, index) => {
                      const setWinner = set.team1 !== null && set.team2 !== null && set.team1 > set.team2 ? 'team1' : set.team1 !== null && set.team2 !== null && set.team2 > set.team1 ? 'team2' : null
                      const isValid = set.team1 !== null && set.team2 !== null && set.team1 !== set.team2 && (set.team1 >= 21 || set.team2 >= 21)
                      const isWinner = setWinner === 'team2' && isValid
                      // Tab order: Set 1 Team 1 = 1, Set 1 Team 2 = 2, Set 2 Team 1 = 3, Set 2 Team 2 = 4, Set 3 Team 1 = 5, Set 3 Team 2 = 6
                      const tabIndex = index * 2 + 2
                      
                      return (
                        <td
                          key={`team2-set${index}`}
                          className={`p-1.5 sm:p-2 text-center ${
                            isWinner ? 'bg-[hsl(var(--primary)/.1)]' : ''
                          }`}
                        >
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={set.team2 ?? ''}
                            tabIndex={tabIndex}
                            aria-label={`${team2Name} ${index + 1}. sæt`}
                            onChange={(e) => handleSetChange(index, 'team2', e)}
                            onFocus={(e) => handleInputFocus(index, 'team2', e)}
                            onClick={(e) => handleInputClick(index, 'team2', e)}
                            onKeyDown={(e) => handleInputKeyDownForEnter(e)}
                            className="w-full h-9 sm:h-10 text-center text-base sm:text-lg font-semibold rounded-md bg-[hsl(var(--surface))] ring-1 ring-[hsl(var(--line)/.12)] focus:ring-2 focus:ring-[hsl(var(--primary))] outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          />
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Validation error */}
          {!validation.valid && validation.error && (
            <div className="p-3 rounded-lg bg-[hsl(var(--destructive)/.1)] ring-1 ring-[hsl(var(--destructive)/.2)]">
              <p className="text-xs text-[hsl(var(--destructive))]">{validation.error}</p>
            </div>
          )}

          {/* Winner display */}
          {winner && validation.valid && (
            <div 
              className="p-3 rounded-lg bg-[hsl(var(--primary)/.1)] ring-1 ring-[hsl(var(--primary)/.2)]"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-semibold text-[hsl(var(--primary))]">
                Vinder: {winner === 'team1' ? team1Name : team2Name}
              </p>
            </div>
          )}

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="p-4 rounded-lg bg-[hsl(var(--destructive)/.1)] ring-1 ring-[hsl(var(--destructive)/.2)]">
              <p className="text-sm text-[hsl(var(--foreground))] mb-3">
                Er du sikker på, at du vil slette dette resultat?
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  loading={isSaving}
                >
                  Slet
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Annuller
                </Button>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-[hsl(var(--line)/.12)] flex-shrink-0 gap-3">
          {existingResult && onDelete && !showDeleteConfirm && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving}
            >
              <Trash2 className="h-4 w-4" />
              Slet
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              aria-label="Annuller og luk"
            >
              Annuller
            </Button>
            <Button
              type="submit"
              size="sm"
              onClick={handleSubmit}
              disabled={!validation.valid || isSaving}
              loading={isSaving}
              aria-label="Gem resultat"
            >
              Gem
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

