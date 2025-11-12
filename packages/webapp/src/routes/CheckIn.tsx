/**
 * Check-in page — manages player check-in/out for active training session.
 * 
 * @remarks Renders active session UI, filters players, and handles check-in/out
 * with animations. Uses custom hooks for data management and sub-components for UI.
 */

import React, { useCallback, useMemo, useState } from 'react'
import type { Player } from '@herlev-hjorten/common'
import { UsersRound } from 'lucide-react'
import { PageCard, EmptyState } from '../components/ui'
import { TableSearch } from '../components/ui/Table'
import { PlayerCard, CheckedInPlayerCard, LetterFilters } from '../components/checkin'
import { useSession, useCheckIns, usePlayers } from '../hooks'
import { formatDate } from '../lib/formatting'
import { LETTER_FILTERS, UI_CONSTANTS } from '../constants'

/**
 * Check-in page component.
 * 
 * @example
 * ```tsx
 * <CheckInPage />
 * ```
 */
const CheckInPage = () => {
  // Data hooks
  const { session, loading: sessionLoading, startSession } = useSession()
  const { players, loading: playersLoading } = usePlayers({ active: true })
  const { checkedIn, checkIn, checkOut } = useCheckIns(session?.id ?? null)

  // UI state
  const [search, setSearch] = useState('')
  const [filterLetter, setFilterLetter] = useState<string>(LETTER_FILTERS.ALL)
  const [oneRoundOnlyPlayers, setOneRoundOnlyPlayers] = useState<Set<string>>(new Set())
  const [justCheckedIn, setJustCheckedIn] = useState<Set<string>>(new Set())
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set())
  const [animatingIn, setAnimatingIn] = useState<Set<string>>(new Set())

  const loading = sessionLoading || playersLoading

  /**
   * Handles starting a training session.
   */
  const handleStartTraining = useCallback(async () => {
    await startSession()
  }, [startSession])

  /**
   * Handles player check-in with animation feedback.
   * 
   * @param player - Player to check in
   * @param maxRounds - Optional max rounds (1 for "kun 1 runde")
   */
  const handleCheckIn = useCallback(
    async (player: Player, maxRounds?: number) => {
      if (!session) return

      // Add animation state for moving out of main list
      setAnimatingOut((prev) => new Set(prev).add(player.id))
      // Add visual feedback immediately
      setJustCheckedIn((prev) => new Set(prev).add(player.id))

      // Wait for exit animation to complete before API call
      await new Promise((resolve) => setTimeout(resolve, UI_CONSTANTS.CHECK_IN_ANIMATION_DURATION_MS))

      const success = await checkIn(player.id, maxRounds)

      if (success) {
        // Add animation state for moving into checked-in section
        setAnimatingIn((prev) => new Set(prev).add(player.id))
        setAnimatingOut((prev) => {
          const newSet = new Set(prev)
          newSet.delete(player.id)
          return newSet
        })

        // Remove visual feedback after animation
        setTimeout(() => {
          setJustCheckedIn((prev) => {
            const newSet = new Set(prev)
            newSet.delete(player.id)
            return newSet
          })
          setAnimatingIn((prev) => {
            const newSet = new Set(prev)
            newSet.delete(player.id)
            return newSet
          })
        }, UI_CONSTANTS.ANIMATION_CLEANUP_DELAY_MS)
      } else {
        // Remove visual feedback on error
        setJustCheckedIn((prev) => {
          const newSet = new Set(prev)
          newSet.delete(player.id)
          return newSet
        })
        setAnimatingOut((prev) => {
          const newSet = new Set(prev)
          newSet.delete(player.id)
          return newSet
        })
      }
    },
    [checkIn, session]
  )

  /**
   * Handles player check-out with animation feedback.
   * 
   * @param player - Checked-in player to check out
   */
  const handleCheckOut = useCallback(
    async (player: { id: string }) => {
      if (!session) return

      // Add animation state for moving out of checked-in section
      setAnimatingOut((prev) => new Set(prev).add(player.id))

      // Wait for exit animation to complete before API call
      await new Promise((resolve) => setTimeout(resolve, UI_CONSTANTS.CHECK_IN_ANIMATION_DURATION_MS))

      const success = await checkOut(player.id)

      if (success) {
        // Add animation state for moving back into main list
        setAnimatingIn((prev) => new Set(prev).add(player.id))
        setAnimatingOut((prev) => {
          const newSet = new Set(prev)
          newSet.delete(player.id)
          return newSet
        })

        // Remove animation state after animation
        setTimeout(() => {
          setAnimatingIn((prev) => {
            const newSet = new Set(prev)
            newSet.delete(player.id)
            return newSet
          })
        }, UI_CONSTANTS.ANIMATION_CLEANUP_DELAY_MS)
      } else {
        setAnimatingOut((prev) => {
          const newSet = new Set(prev)
          newSet.delete(player.id)
          return newSet
        })
      }
    },
    [checkOut, session]
  )

  /**
   * Handles "one round only" checkbox change.
   */
  const handleOneRoundOnlyChange = useCallback((playerId: string, checked: boolean) => {
    setOneRoundOnlyPlayers((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(playerId)
      } else {
        newSet.delete(playerId)
      }
      return newSet
    })
  }, [])

  /** Memoized Set of checked-in player IDs for fast lookup. */
  const checkedInIds = useMemo(() => new Set(checkedIn.map((player) => player.id)), [checkedIn])

  /** Gender breakdown of checked-in players. */
  const genderBreakdown = useMemo(() => {
    const male = checkedIn.filter((player) => player.gender === 'Herre').length
    const female = checkedIn.filter((player) => player.gender === 'Dame').length
    return { male, female }
  }, [checkedIn])

  /** Memoized filtered players list — excludes checked-in players, applies search/letter filters. */
  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return players.filter((player) => {
      // Exclude checked-in players from the main list
      if (checkedInIds.has(player.id)) return false
      const matchesLetter =
        filterLetter === LETTER_FILTERS.ALL || (typeof filterLetter === 'string' && player.name.toLowerCase().startsWith(filterLetter.toLowerCase()))
      const nameLower = player.name.toLowerCase()
      const aliasLower = (player.alias ?? '').toLowerCase()
      const matchesSearch = !term || nameLower.includes(term) || aliasLower.includes(term)
      return matchesLetter && matchesSearch
    })
  }, [players, search, filterLetter, checkedInIds])

  /** Sorted checked-in players by first name. */
  const sortedCheckedIn = useMemo(() => {
    return [...checkedIn].sort((a, b) => {
      const firstNameA = a.name.split(' ')[0] || ''
      const firstNameB = b.name.split(' ')[0] || ''
      return firstNameA.localeCompare(firstNameB, 'da')
    })
  }, [checkedIn])

  if (loading) {
    return (
      <section className="mx-auto flex h-full max-w-4xl items-center justify-center">
        <p className="text-lg text-[hsl(var(--muted))]">Loader...</p>
      </section>
    )
  }

  if (!session) {
    return (
      <section className="flex h-full items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--surface)/.95)] via-[hsl(var(--surface)/.98)] to-[hsl(var(--surface-glass)/.85)] p-6 sm:p-8 md:p-12 shadow-[0_8px_32px_hsl(var(--primary)/.08)] ring-1 ring-[hsl(var(--line)/.12)] backdrop-blur-sm">
            {/* Decorative background elements */}
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[hsl(var(--primary)/.06)] blur-3xl" />
            <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-[hsl(var(--accent)/.06)] blur-3xl" />

            <div className="relative z-10 flex flex-col items-center gap-6 text-center">
              {/* Icon */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[hsl(var(--primary)/.12)] blur-xl" />
                <div className="relative rounded-full bg-gradient-to-br from-[hsl(var(--primary)/.15)] to-[hsl(var(--accent)/.15)] p-6 ring-2 ring-[hsl(var(--primary)/.2)]">
                  <UsersRound className="h-12 w-12 text-[hsl(var(--primary))]" />
                </div>
              </div>

              {/* Title and description */}
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">
                  Velkommen til dagens træning
                </h1>
                <p className="mx-auto max-w-md text-base leading-relaxed text-[hsl(var(--muted))]">
                  Start en ny træning for at begynde at tjekke spillere ind og arrangere kampe. Når træningen er
                  startet, kan du se alle tilmeldte spillere og oprette kampprogrammer.
                </p>
              </div>

              {/* CTA Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartTraining}
                  className="min-w-[200px] h-14 px-8 text-lg font-semibold rounded-lg bg-[hsl(var(--primary))] text-white shadow-[0_4px_16px_hsl(var(--primary)/.25)] hover:shadow-[0_6px_24px_hsl(var(--primary)/.35)] transition-all duration-300"
                >
                  Start træning
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4 sm:gap-6 pt-2 sm:pt-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3">
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-semibold text-[hsl(var(--foreground))]">Indtjekning</h1>
          <p className="text-base text-[hsl(var(--muted))] mt-1">
            Aktiv træning: {formatDate(session.date, false)}
            {checkedIn.length > 0 && (
              <>
                {' '}
                <span className="font-bold text-[hsl(var(--foreground))]">•</span> Indtjekkede spillere:{' '}
                {checkedIn.length}{' '}
                <span className="font-bold text-[hsl(var(--foreground))]">•</span> {genderBreakdown.male} Herrer &{' '}
                {genderBreakdown.female} Damer
              </>
            )}
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[35%_65%] lg:items-start">
        {/* Checked-in players section */}
        <PageCard className="space-y-2 flex flex-col">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Tjekket ind</h3>
            <span className="rounded-full bg-[hsl(var(--surface-2))] px-2 py-0.5 text-xs font-medium">
              {checkedIn.length}
            </span>
          </header>
          <div className="flex flex-col space-y-2 pr-2">
            {checkedIn.length === 0 ? (
              <p className="text-xs text-[hsl(var(--muted))] text-center py-4">Ingen spillere tjekket ind</p>
            ) : (
              sortedCheckedIn.map((player) => (
                <CheckedInPlayerCard
                  key={player.id}
                  player={player}
                  isAnimatingOut={animatingOut.has(player.id)}
                  isAnimatingIn={animatingIn.has(player.id)}
                  onCheckOut={handleCheckOut}
                />
              ))
            )}
          </div>
        </PageCard>

        {/* Players overview */}
        <PageCard className="space-y-6">
          <div className="flex flex-col gap-4">
            <TableSearch value={search} onChange={setSearch} placeholder="Søg efter spiller" />
            <LetterFilters selectedLetter={filterLetter} onLetterSelect={setFilterLetter} />
          </div>

          <div className="flex flex-col space-y-2">
            {filteredPlayers.length === 0 ? (
              <EmptyState
                icon={<UsersRound />}
                title="Ingen spillere matcher"
                helper="Prøv en anden søgning eller vælg et andet bogstav."
              />
            ) : (
              filteredPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  oneRoundOnly={oneRoundOnlyPlayers.has(player.id)}
                  isJustCheckedIn={justCheckedIn.has(player.id)}
                  isAnimatingOut={animatingOut.has(player.id)}
                  isAnimatingIn={animatingIn.has(player.id)}
                  onCheckIn={handleCheckIn}
                  onOneRoundOnlyChange={handleOneRoundOnlyChange}
                />
              ))
            )}
          </div>
        </PageCard>
      </div>
    </section>
  )
}

export default CheckInPage
