/**
 * Pure utility functions for match program functionality.
 * 
 * These functions have no side effects and can be easily tested.
 */

import React from 'react'
import type { CourtWithPlayers, Player } from '@rundeklar/common'

/**
 * Gets category letter (S/D/B) for data-cat attribute.
 * @param category - Player primary category ('Single', 'Double', 'Begge', or null)
 * @returns 'S', 'D', 'B', or null
 */
export const getCategoryLetter = (
  category: 'Single' | 'Double' | 'Begge' | null | undefined
): 'S' | 'D' | 'B' | null => {
  if (!category) return null
  if (category === 'Single') return 'S'
  if (category === 'Double') return 'D'
  if (category === 'Begge') return 'B'
  return null
}

/**
 * Returns neutral background color for all players.
 * @returns CSS class string for player slot background
 */
export const getPlayerSlotBgColor = (): string => {
  return 'bg-[hsl(var(--surface-2)/.85)] shadow-sm'
}

/**
 * Finds the first free slot in a court.
 * @param court - Court data
 * @param maxSlots - Maximum number of slots for this court (default: 4)
 * @returns Slot index (0-based) or undefined if court is full
 */
export const getFirstFreeSlot = (
  court: CourtWithPlayers,
  maxSlots: number = 4
): number | undefined => {
  const occupied = new Set(court.slots.map((entry) => entry.slot))
  const slots = Array.from({ length: maxSlots }, (_, i) => i)
  return slots.find((idx) => !occupied.has(idx))
}

/**
 * Calculates gender breakdown from checked-in players.
 * @param players - Array of checked-in players
 * @returns Object with counts for men, women, and total
 */
export const calculateGenderBreakdown = (players: Player[]): {
  men: number
  women: number
  total: number
} => {
  const men = players.filter((p) => p.gender === 'Herre').length
  const women = players.filter((p) => p.gender === 'Dame').length
  return { men, women, total: players.length }
}

/**
 * Gets assigned player IDs from matches.
 * @param matches - Array of court matches
 * @returns Set of assigned player IDs
 */
export const getAssignedPlayerIds = (matches: CourtWithPlayers[]): Set<string> => {
  const ids = new Set<string>()
  matches.forEach((court) => {
    court.slots.forEach(({ player }) => {
      if (player) {
        ids.add(player.id)
      }
    })
  })
  return ids
}

/**
 * Sorts players alphabetically by name (case-insensitive, Danish locale-aware).
 * Handles null/undefined names by treating them as empty strings (sorted last).
 * 
 * @param players - Array of players to sort
 * @returns Sorted array of players (preserves input type)
 * 
 * @example
 * ```ts
 * const sorted = sortPlayersAlphabetically(players)
 * // Players sorted: "Andersen", "Bøgh", "Østergaard", "Zimmermann"
 * ```
 */
export const sortPlayersAlphabetically = <T extends Player>(players: T[]): T[] => {
  return [...players].sort((a, b) => {
    const nameA = (a.name ?? '').trim()
    const nameB = (b.name ?? '').trim()
    
    // Handle empty names - sort them last
    if (!nameA && !nameB) return 0
    if (!nameA) return 1
    if (!nameB) return -1
    
    // Use Danish locale-aware comparison for proper sorting of æ, ø, å
    return nameA.localeCompare(nameB, 'da', { sensitivity: 'base', caseFirst: 'upper' })
  })
}

/**
 * Sorts players by gender first (Dame first, Herre second, then null/undefined),
 * then alphabetically by name within each gender group.
 * 
 * @param players - Array of players to sort
 * @returns Sorted array of players (preserves input type)
 * 
 * @example
 * ```ts
 * const sorted = sortPlayersByGenderAlphabetically(players)
 * // Players sorted: Dame (A-Z), Herre (A-Z), then players without gender (A-Z)
 * ```
 */
export const sortPlayersByGenderAlphabetically = <T extends Player>(players: T[]): T[] => {
  return [...players].sort((a, b) => {
    // Primary sort: Gender (Dame first, Herre second, then null/undefined)
    const genderOrder: Record<string, number> = { Dame: 1, Herre: 2 }
    const genderA = genderOrder[a.gender ?? ''] ?? 3
    const genderB = genderOrder[b.gender ?? ''] ?? 3
    
    if (genderA !== genderB) {
      return genderA - genderB
    }
    
    // Secondary sort: Alphabetical by name within same gender group
    const nameA = (a.name ?? '').trim()
    const nameB = (b.name ?? '').trim()
    
    // Handle empty names - sort them last
    if (!nameA && !nameB) return 0
    if (!nameA) return 1
    if (!nameB) return -1
    
    // Use Danish locale-aware comparison for proper sorting of æ, ø, å
    return nameA.localeCompare(nameB, 'da', { sensitivity: 'base', caseFirst: 'upper' })
  })
}

/**
 * Sorts players by gender and category for display.
 * Primary sort: Gender (Dame first, Herre second, then null/undefined)
 * Secondary sort: Category (Double first, Begge second, Single last, then null/undefined)
 * 
 * @param players - Array of players to sort
 * @returns Sorted array of players (preserves input type)
 */
export const sortPlayersForDisplay = <T extends Player>(players: T[]): T[] => {
  return [...players].sort((a, b) => {
    // Primary sort: Gender (Dame first, Herre second, then null/undefined)
    const genderOrder: Record<string, number> = { Dame: 1, Herre: 2 }
    const genderA = genderOrder[a.gender ?? ''] ?? 3
    const genderB = genderOrder[b.gender ?? ''] ?? 3
    if (genderA !== genderB) {
      return genderA - genderB
    }

    // Secondary sort: Category (Double first, Begge second, Single last, then null/undefined)
    const categoryOrder: Record<string, number> = { Double: 1, Begge: 2, Single: 3 }
    const categoryA = categoryOrder[a.primaryCategory ?? ''] ?? 4
    const categoryB = categoryOrder[b.primaryCategory ?? ''] ?? 4
    return categoryA - categoryB
  })
}

/**
 * Type for player sorting options.
 */
export type PlayerSortType = 'gender-category' | 'gender-alphabetical' | 'alphabetical'

/**
 * Sorts players using the specified sort type.
 * 
 * @param players - Array of players to sort
 * @param sortType - Type of sorting to apply ('gender-category', 'gender-alphabetical', or 'alphabetical')
 * @returns Sorted array of players (preserves input type)
 * 
 * @example
 * ```ts
 * const sorted = sortPlayers(players, 'alphabetical')
 * const sortedByGender = sortPlayers(players, 'gender-category')
 * const sortedByGenderAlphabetical = sortPlayers(players, 'gender-alphabetical')
 * ```
 */
export const sortPlayers = <T extends Player>(players: T[], sortType: PlayerSortType = 'gender-category'): T[] => {
  if (sortType === 'alphabetical') {
    return sortPlayersAlphabetically(players)
  }
  if (sortType === 'gender-alphabetical') {
    return sortPlayersByGenderAlphabetically(players)
  }
  return sortPlayersForDisplay(players)
}

/**
 * Ensures all courts are present in matches array.
 * Fills in missing courts with empty slots.
 * 
 * @param matches - Array of court matches
 * @param maxCourts - Maximum number of courts
 * @returns Complete array with all courts (1 to maxCourts)
 */
export const ensureAllCourtsPresent = (
  matches: CourtWithPlayers[],
  maxCourts: number
): CourtWithPlayers[] => {
  // Safety check: ensure matches is always an array
  const safeMatches = Array.isArray(matches) ? matches : []
  const allCourts = Array.from({ length: maxCourts }, (_, i) => i + 1)
  const matchesByCourt = new Map(safeMatches.map((court) => [court.courtIdx, court]))
  return allCourts.map((courtIdx) => {
    const existing = matchesByCourt.get(courtIdx)
    return existing || { courtIdx, slots: [] }
  })
}

/**
 * Renders category badge (S/D/B) for player primary category.
 * Neutral style with optional category ring for visual cue.
 * 
 * @param category - Player primary category ('Single', 'Double', 'Begge', or null)
 * @returns Badge React element or null
 */
export const getCategoryBadge = (
  category: 'Single' | 'Double' | 'Begge' | null | undefined
): React.ReactElement | null => {
  if (!category) return null
  const labels: Record<'Single' | 'Double' | 'Begge', string> = {
    Single: 'S',
    Double: 'D',
    Begge: 'B'
  }
  const catLetter = getCategoryLetter(category)
  return (
    <span 
      className={`inline-flex items-center justify-center rounded-full text-xs font-bold w-6 h-6 flex-shrink-0 bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] border-hair ${catLetter ? 'cat-ring' : ''}`}
      data-cat={catLetter || undefined}
      title={category}
    >
      {labels[category]}
    </span>
  )
}

/**
 * Gets team players from court slots.
 * 
 * Team 1 consists of players in slots 0-1 (or slot 0 for singles).
 * Team 2 consists of players in slots 2-3 (or slot 1 for singles).
 * 
 * @param court - Court data with slots and players
 * @returns Object with team1 and team2 arrays of players
 */
export const getTeamPlayers = (court: CourtWithPlayers): { team1: Player[]; team2: Player[] } => {
  const team1: Player[] = []
  const team2: Player[] = []
  
  // Team 1: slots 0-1 (or slot 0 for singles)
  // Team 2: slots 2-3 (or slot 1 for singles)
  court.slots.forEach((slot) => {
    if (slot.player) {
      if (slot.slot === 0 || slot.slot === 1) {
        team1.push(slot.player)
      } else if (slot.slot === 2 || slot.slot === 3) {
        team2.push(slot.player)
      }
    }
  })
  
  return { team1, team2 }
}

