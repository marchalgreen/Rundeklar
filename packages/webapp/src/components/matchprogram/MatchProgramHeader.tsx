/**
 * Match program header component.
 * 
 * Displays session info, round selector, and action buttons.
 */

import React from 'react'
import type { TrainingSession } from '@herlev-hjorten/common'

interface MatchProgramHeaderProps {
  /** Current training session */
  session: TrainingSession | null
  /** Number of checked-in players */
  checkedInCount: number
  /** Gender breakdown */
  genderBreakdown: { male: number; female: number }
  /** Selected round number */
  selectedRound: number
  /** Handler for round change */
  onRoundChange: (round: number) => void
  /** Error message */
  error: string | null
  /** Whether previous rounds are visible */
  previousRoundsVisible: Set<number>
  /** Handler to toggle previous rounds visibility */
  onTogglePreviousRounds: () => void
  /** Handler to load previous round */
  onLoadPreviousRound: (round: number) => Promise<void>
  /** Whether auto-match has been run for selected round */
  hasRunAutoMatch: boolean
  /** Number of bench players */
  benchCount: number
  /** Handler for auto-match */
  onAutoMatch: () => void
  /** Handler to reset matches */
  onResetMatches: () => void
  /** Handler to enter full-screen */
  onEnterFullScreen: () => void
  /** Handler to start training */
  onStartTraining: () => void
  /** Handler to end training */
  onEndTraining: () => void
}

/**
 * Match program header component.
 * 
 * @example
 * ```tsx
 * <MatchProgramHeader
 *   session={session}
 *   checkedInCount={checkedIn.length}
 *   genderBreakdown={genderBreakdown}
 *   selectedRound={selectedRound}
 *   onRoundChange={setSelectedRound}
 *   error={error}
 *   previousRoundsVisible={previousRoundsVisible}
 *   onTogglePreviousRounds={handleTogglePreviousRounds}
 *   onLoadPreviousRound={loadPreviousRound}
 *   hasRunAutoMatch={hasRunAutoMatch.has(selectedRound)}
 *   benchCount={bench.length}
 *   onAutoMatch={handleAutoMatch}
 *   onResetMatches={handleResetMatches}
 *   onEnterFullScreen={() => setIsFullScreen(true)}
 *   onStartTraining={handleStartTraining}
 *   onEndTraining={handleEndTraining}
 * />
 * ```
 */
export const MatchProgramHeader: React.FC<MatchProgramHeaderProps> = ({
  session,
  checkedInCount,
  genderBreakdown,
  selectedRound,
  onRoundChange,
  error,
  previousRoundsVisible,
  onTogglePreviousRounds,
  onLoadPreviousRound,
  hasRunAutoMatch,
  benchCount,
  onAutoMatch,
  onResetMatches,
  onEnterFullScreen,
  onStartTraining,
  onEndTraining
}) => {
  return (
    <header className="relative flex items-center justify-between mb-2">
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">Kampprogram</h1>
        <p className="text-base text-[hsl(var(--muted))] mt-1">
          {session ? (
            <>
              Aktiv træning: {new Date(session.date).toLocaleDateString('da-DK')}
              {checkedInCount > 0 && (
                <> <span className="font-bold text-[hsl(var(--foreground))]">•</span> Indtjekkede spillere: {checkedInCount} <span className="font-bold text-[hsl(var(--foreground))]">•</span> {genderBreakdown.male} Herrer & {genderBreakdown.female} Damer</>
              )}
            </>
          ) : (
            'Start en træning for at begynde at matche spillere'
          )}
        </p>
        {error && <span className="mt-2 inline-block text-sm text-[hsl(var(--destructive))]">{error}</span>}
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center">
        <div className="relative">
          <select
            value={selectedRound}
            onChange={(e) => onRoundChange(Number(e.target.value))}
            className="relative rounded-lg px-5 py-3 pr-11 text-base font-semibold bg-[hsl(var(--primary))] text-[hsl(var(--primary-contrast))] shadow-[0_2px_8px_hsl(var(--primary)/.25)] hover:shadow-[0_4px_16px_hsl(var(--primary)/.35)] hover:bg-[hsl(var(--primary)/.95)] focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 focus:ring-offset-[hsl(var(--bg-canvas))] outline-none transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_2px_8px_hsl(var(--primary)/.25)] appearance-none min-w-[140px]"
            disabled={!session}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              backgroundSize: '18px 18px'
            }}
          >
            <option value={1}>Runde 1</option>
            <option value={2}>Runde 2</option>
            <option value={3}>Runde 3</option>
            <option value={4}>Runde 4</option>
          </select>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-2 items-end">
        <div className="flex gap-2">
          {selectedRound > 1 && (
            <button
              type="button"
              onClick={async () => {
                // Load all previous rounds if not already loaded
                for (let round = 1; round < selectedRound; round++) {
                  await onLoadPreviousRound(round)
                }
                // Toggle visibility
                onTogglePreviousRounds()
              }}
              className="rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none bg-[hsl(var(--surface-glass)/.85)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-glass)/.95)] ring-1 ring-[hsl(var(--line)/.12)] hover:shadow-sm"
            >
              {previousRoundsVisible.size > 0 ? 'Skjul' : 'Se'} tidligere runder
            </button>
          )}
          <button
            type="button"
            onClick={onAutoMatch}
            disabled={!session || (benchCount === 0 && !hasRunAutoMatch)}
            className="rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none bg-[hsl(var(--surface-glass)/.85)] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-glass)/.95)] ring-1 ring-[hsl(var(--line)/.12)] disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-sm"
          >
            {hasRunAutoMatch ? 'Omfordel' : 'Auto-match'}
          </button>
          <button
            type="button"
            onClick={onResetMatches}
            disabled={!session}
            className="rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none bg-transparent text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)] ring-1 ring-[hsl(var(--destructive)/.3)] disabled:opacity-40 disabled:cursor-not-allowed hover:ring-[hsl(var(--destructive)/.4)] focus:ring-[hsl(var(--destructive)/.4)] focus:ring-2"
          >
            Nulstil kampe
          </button>
          {session && (
            <button
              type="button"
              onClick={onEnterFullScreen}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none ring-focus hover:shadow-sm"
            >
              Vis kampprogram
            </button>
          )}
          {session ? (
            <button
              type="button"
              onClick={onEndTraining}
              className="rounded-md px-4 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--line)/.12)] transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none hover:shadow-sm"
            >
              Afslut træning
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartTraining}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none ring-focus hover:shadow-sm"
            >
              Start træning
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

