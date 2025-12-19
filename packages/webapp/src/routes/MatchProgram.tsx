/**
 * Match program page — manages court assignments and player matching for training sessions.
 * 
 * @remarks Renders court layout with drag-and-drop, handles auto-matching algorithm,
 * and tracks duplicate matchups across rounds. Uses hooks for data management and
 * utilities for state persistence.
 */

import React from 'react'
import { PageCard } from '../components/ui'
import { useTenant } from '../contexts/TenantContext'
import { getTenantSport } from '../lib/tenant'
import courtsSettings from '../services/courtsSettings'
import { useSession, useCheckIns, useWakeLock } from '../hooks'
import { useMatchProgram } from '../hooks/useMatchProgram'
import { FullScreenMatchProgram } from '../components/matchprogram/FullScreenMatchProgram'
import { BenchSection } from '../components/matchprogram/BenchSection'
import { CourtCard } from '../components/matchprogram/CourtCard'
import { PreviousRoundsPopup } from '../components/matchprogram/PreviousRoundsPopup'
import { MatchProgramHeader } from '../components/matchprogram/MatchProgramHeader'
import { MatchResultInput } from '../components/matchprogram/MatchResultInput'
import { NotesModal } from '../components/checkin/NotesModal'
import type { CheckedInPlayer } from '@rundeklar/common'
import type { PlayerSortType } from '../lib/matchProgramUtils'

/**
 * Match program page component.
 * 
 * @example
 * ```tsx
 * <MatchProgramPage />
 * ```
 */
const MatchProgramPage = () => {
  const { config, tenantId } = useTenant()
  const [maxCourts, setMaxCourts] = React.useState(() => courtsSettings.getEffectiveCourtsInUse(tenantId, config.maxCourts))
  React.useEffect(() => {
    const recompute = () => setMaxCourts(courtsSettings.getEffectiveCourtsInUse(tenantId, config.maxCourts))
    recompute()
    const onStorage = (e: StorageEvent) => {
      if (e.key === `courtsInUse:${tenantId}`) recompute()
    }
    const onLocal = (e: Event) => {
      const ev = e as CustomEvent
      if (ev.detail?.tenantId === tenantId) recompute()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('courtsInUse:changed', onLocal as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('courtsInUse:changed', onLocal as EventListener)
    }
  }, [tenantId, config.maxCourts])
  
  // Data hooks
  const { session, loading: sessionLoading, startSession, endSession } = useSession()
  const { checkedIn, loading: checkInsLoading, updateNotes } = useCheckIns(session?.id ?? null)

  // Keep screen awake when session is active
  useWakeLock(session !== null)
  
  const loading = sessionLoading || checkInsLoading
  
  // Player sorting state
  const [playerSortType, setPlayerSortType] = React.useState<PlayerSortType>('gender-category')
  
  // Notes modal state
  const [notesModalOpen, setNotesModalOpen] = React.useState(false)
  const [notesModalPlayer, setNotesModalPlayer] = React.useState<CheckedInPlayer | null>(null)
  const [notesModalOpener, setNotesModalOpener] = React.useState<HTMLElement | null>(null)
  
  // Match program hook - manages all state and operations
  const matchProgram = useMatchProgram({
    session,
    checkedIn,
    maxCourts,
    startSession,
    endSession,
    sortType: playerSortType
  })
  
  // Destructure hook return for easier access
  const {
    matches,
    selectedRound,
    setSelectedRound,
    error,
    unavailablePlayers,
    handleMarkUnavailable: _handleMarkUnavailable,
    handleMarkAvailable,
    handleActivateOneRoundPlayer,
    dragOverInactive,
    dragOverBench,
    dragSource,
    dragOverCourt,
    dragOverSlot,
    recentlySwappedPlayers,
    bench,
    inactivePlayers,
    genderBreakdown,
    currentRoundLockedCourts,
    extendedCapacityCourts,
    handleToggleCourtLock,
    handleAutoMatch,
    handleResetMatches,
    courtsWithDuplicatesSet,
    duplicatePlayersMap,
    previousRoundsMatches,
    previousRoundsVisible,
    setPreviousRoundsVisible,
    loadPreviousRound,
    isFullScreen,
    setIsFullScreen,
    viewportSize,
    popupPosition,
    popupSize,
    isDragging,
    isResizing,
    inMemoryMatches,
    hasRunAutoMatch,
    handleEndTraining: _handleEndTraining,
    handleMouseDown,
    handleResizeStart,
    handleExtendedCapacityChange,
    handleTogglePreviousRounds,
    handleSlotDragStart,
    handleSlotDragEnd,
    handleSlotDragOver,
    handleSlotDragLeave,
    handleSlotDrop,
    handleBenchDragStart,
    handleBenchDragEnd,
    handleInactiveDragStart,
    handleInactiveDragEnd,
    handleBenchDragOver,
    handleBenchDragLeave,
    handleBenchDrop,
    handleInactiveDragOver,
    handleInactiveDragLeave,
    handleInactiveDrop,
    handleCourtDragOver,
    handleCourtDragLeave,
    handleCourtDrop,
    matchResults,
    openResultInputMatchId,
    setOpenResultInputMatchId,
    handleSaveMatchResult,
    handleDeleteMatchResult,
    matchObjects,
    matchByCourtIdx,
    getMatchForCourt,
    handleEnterResult
  } = matchProgram

  /**
   * Handles opening notes modal for a player.
   */
  const handleEditNotes = React.useCallback((player: CheckedInPlayer, opener?: HTMLElement | null) => {
    setNotesModalPlayer(player)
    setNotesModalOpener(opener ?? null)
    setNotesModalOpen(true)
  }, [])

  /**
   * Handles saving notes for a player.
   */
  const handleSaveNotes = React.useCallback(async (notes: string | null) => {
    if (!notesModalPlayer) return
    await updateNotes(notesModalPlayer.id, notes)
    setNotesModalOpen(false)
    setNotesModalPlayer(null)
    setNotesModalOpener(null)
  }, [notesModalPlayer, updateNotes])
  
  // Get sport from tenant config
  const sport = getTenantSport(config)

  // Calculate if there are matches (courts with players) - must be before any conditional returns
  const hasMatches = React.useMemo(() => {
    if (!Array.isArray(matches)) return false
    return matches.some(court => 
      court.slots.some(slot => slot.player)
    )
  }, [matches])

  // Handle keyboard shortcut (F11) to open fullscreen - must be before any conditional returns
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F11 key to open fullscreen
      if (e.key === 'F11' && session && !isFullScreen) {
        e.preventDefault()
        setIsFullScreen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [session, isFullScreen, setIsFullScreen])

  // Handle fullscreen body class - must be before any conditional returns
  React.useEffect(() => {
    if (isFullScreen) {
      document.body.classList.add('fullscreen-active')
    } else {
      document.body.classList.remove('fullscreen-active')
    }
    return () => {
      document.body.classList.remove('fullscreen-active')
    }
  }, [isFullScreen])

  if (loading) {
    return (
      <section className="mx-auto flex h-full max-w-5xl items-center justify-center pt-2 sm:pt-4 xl:pt-2">
        <p className="text-lg text-[hsl(var(--muted))]">Loader...</p>
      </section>
    )
  }

  // Full-screen view mode
  if (isFullScreen && session) {
    return (
      <>
        <FullScreenMatchProgram
          courts={matches}
          selectedRound={selectedRound}
          onRoundChange={setSelectedRound}
          onExitFullScreen={() => setIsFullScreen(false)}
          viewportSize={viewportSize}
          extendedCapacityCourts={extendedCapacityCourts}
          courtsWithDuplicatesSet={courtsWithDuplicatesSet}
          duplicatePlayersMap={duplicatePlayersMap}
          dragOverSlot={dragOverSlot}
          dragOverCourt={dragOverCourt}
          recentlySwappedPlayers={recentlySwappedPlayers}
          onSlotDragStart={handleSlotDragStart}
          onSlotDragEnd={handleSlotDragEnd}
          onSlotDragOver={handleSlotDragOver}
          onSlotDragLeave={handleSlotDragLeave}
          onSlotDrop={handleSlotDrop}
          getMatchForCourt={getMatchForCourt}
          onEnterResult={handleEnterResult}
          sport={sport}
        />
        
        {/* Match Result Input Modal (also available in fullscreen) */}
        {openResultInputMatchId && (() => {
          const match = matchObjects.find(m => m.id === openResultInputMatchId)
          if (!match) return null
          
          const court = matches.find(c => {
            const matchForCourt = matchByCourtIdx.get(c.courtIdx)
            return matchForCourt?.id === match.id
          })
          if (!court) return null
          
          const result = matchResults.get(match.id) || null
          
          return (
            <MatchResultInput
              isOpen={true}
              onClose={() => setOpenResultInputMatchId(null)}
              matchId={match.id}
              court={court}
              existingResult={result}
              sport={sport}
              onSave={async ({ scoreData, winnerTeam }) => {
                await handleSaveMatchResult(match.id, scoreData, winnerTeam, sport, court.courtIdx)
              }}
              onDelete={result ? async () => {
                await handleDeleteMatchResult(match.id, court.courtIdx)
              } : undefined}
            />
          )
        })()}
      </>
    )
  }

  return (
    <section className="flex flex-col gap-4 sm:gap-6 pt-2 sm:pt-4 xl:pt-2">
      <MatchProgramHeader
        session={session}
        checkedInCount={checkedIn.length}
        genderBreakdown={genderBreakdown}
        selectedRound={selectedRound}
        onRoundChange={setSelectedRound}
        error={error}
        previousRoundsVisible={previousRoundsVisible}
        onTogglePreviousRounds={handleTogglePreviousRounds}
        onLoadPreviousRound={loadPreviousRound}
        hasRunAutoMatch={hasRunAutoMatch.has(selectedRound)}
        benchCount={bench.length}
        hasMatches={hasMatches}
        onAutoMatch={handleAutoMatch}
        onResetMatches={handleResetMatches}
        onEnterFullScreen={() => setIsFullScreen(true)}
      />

      {!session && (
        <PageCard className="rounded-full px-6 py-3 text-center text-[hsl(var(--muted))]">
          Ingen aktiv træning. Gå til Træner-siden for at starte en træning.
        </PageCard>
      )}

      <div className="grid gap-3 md:grid-cols-[minmax(280px,320px)_1fr] lg:items-start transition-all duration-300 ease-in-out">
        {/* Bench - matches height of courts section */}
        <BenchSection
          bench={bench}
          inactivePlayers={inactivePlayers}
          selectedRound={selectedRound}
          unavailablePlayers={unavailablePlayers}
          sortType={playerSortType}
          onSortTypeChange={setPlayerSortType}
          dragOverBench={dragOverBench}
          dragOverInactive={dragOverInactive}
          dragSource={dragSource}
          onBenchDragStart={handleBenchDragStart}
          onBenchDragEnd={handleBenchDragEnd}
          onInactiveDragStart={handleInactiveDragStart}
          onInactiveDragEnd={handleInactiveDragEnd}
          onBenchDragOver={handleBenchDragOver}
          onBenchDragLeave={handleBenchDragLeave}
          onBenchDrop={handleBenchDrop}
          onInactiveDragOver={handleInactiveDragOver}
          onInactiveDragLeave={handleInactiveDragLeave}
          onInactiveDrop={handleInactiveDrop}
          onMarkAvailable={handleMarkAvailable}
          onActivateOneRoundPlayer={handleActivateOneRoundPlayer}
          onEditNotes={handleEditNotes}
        />

        {/* Courts */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 xl:gap-2.5 pb-2">
          {Array.isArray(matches) ? matches.map((court) => {
            const { result, isFinished } = getMatchForCourt(court.courtIdx)
            
            return (
              <CourtCard
                key={court.courtIdx}
                court={court}
                extendedCapacityCourts={extendedCapacityCourts}
                onExtendedCapacityChange={handleExtendedCapacityChange}
                hasDuplicates={courtsWithDuplicatesSet.has(court.courtIdx)}
                isLocked={currentRoundLockedCourts.has(court.courtIdx)}
                onToggleLock={handleToggleCourtLock}
                dragOverCourt={dragOverCourt}
                dragOverSlot={dragOverSlot}
                recentlySwappedPlayers={recentlySwappedPlayers}
                duplicatePlayersMap={duplicatePlayersMap}
                onCourtDragOver={handleCourtDragOver}
                onCourtDragLeave={handleCourtDragLeave}
                onCourtDrop={handleCourtDrop}
                onSlotDragStart={handleSlotDragStart}
                onSlotDragEnd={handleSlotDragEnd}
                onSlotDragOver={handleSlotDragOver}
                onSlotDragLeave={handleSlotDragLeave}
                onSlotDrop={handleSlotDrop}
                matchResult={result}
                isMatchFinished={isFinished}
                onEnterResult={() => handleEnterResult(court.courtIdx)}
                sport={sport}
              />
            )
          }) : (
            <div className="col-span-full text-center text-red-500 p-4">
              Error: matches is not an array. {error || 'Unknown error'}
            </div>
          )}
        </section>
      </div>

      {/* Previous Rounds Popup Window */}
      <PreviousRoundsPopup
        selectedRound={selectedRound}
        previousRoundsVisible={previousRoundsVisible}
        onClose={() => setPreviousRoundsVisible(new Set())}
        inMemoryMatches={inMemoryMatches}
        previousRoundsMatches={previousRoundsMatches}
        popupPosition={popupPosition}
        popupSize={popupSize}
        isDragging={isDragging}
        isResizing={isResizing}
        onMouseDown={handleMouseDown}
        onResizeStart={handleResizeStart}
      />
      
      {/* Match Result Input Modal */}
      {openResultInputMatchId && (() => {
        const match = matchObjects.find(m => m.id === openResultInputMatchId)
        if (!match) return null
        
        const court = matches.find(c => {
          const matchForCourt = matchByCourtIdx.get(c.courtIdx)
          return matchForCourt?.id === match.id
        })
        if (!court) return null
        
        const result = matchResults.get(match.id) || null
        
        return (
          <MatchResultInput
            isOpen={true}
            onClose={() => setOpenResultInputMatchId(null)}
            matchId={match.id}
            court={court}
            existingResult={result}
            sport={sport}
            onSave={async ({ scoreData, winnerTeam }) => {
              await handleSaveMatchResult(match.id, scoreData, winnerTeam, sport, court.courtIdx)
            }}
            onDelete={result ? async () => {
              await handleDeleteMatchResult(match.id, court.courtIdx)
            } : undefined}
          />
        )
      })()}

      {/* Notes Modal */}
      {notesModalPlayer && (
        <NotesModal
          isOpen={notesModalOpen}
          onClose={() => {
            setNotesModalOpen(false)
            setTimeout(() => notesModalOpener?.focus(), 0)
          }}
          currentNotes={notesModalPlayer.notes}
          onSave={handleSaveNotes}
          playerName={notesModalPlayer.name}
          returnFocusTo={notesModalOpener}
        />
      )}
    </section>
  )
}

export default MatchProgramPage
