import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveCoachId } from '../lib/coachAdapter'
import api from '../services/coachLandingApi'
import type { Group, PlayerLite } from '../routes/landing/types'
import { useToast } from '../components/ui/Toast'
import { loadPersistedState } from '../lib/matchProgramPersistence'
import type { CourtWithPlayers } from '@rundeklar/common'
import { toggleGroupId, normalizeGroupIds } from '../lib/groupSelection'
import { normalizeError } from '../lib/errors'

export type UseLandingStateOptions = {
  coach?: { id: string; displayName?: string } | null
  onRedirectToCheckin?: (sessionId: string) => void
}

export type UseLandingState = {
  loading: boolean
  statusMessage: string | null
  activeSession: { sessionId: string; startedAt: string; groupIds: string[] } | null
  groups: Group[]
  selectedGroupIds: string[]
  toggleGroupId: (id: string) => void
  crossGroupPlayers: PlayerLite[]
  addCrossGroupPlayer: (p: PlayerLite) => void
  removeCrossGroupPlayer: (id: string) => void
  openSearch: () => void
  closeSearch: () => void
  searchOpen: boolean
  searchTerm: string
  setSearchTerm: (v: string) => void
  searchResults: PlayerLite[]
  starting: boolean
  start: () => Promise<void>
  goToCheckIn: () => void
  ending: boolean
  endSession: () => Promise<void>
}

const useDebounced = (value: string, delayMs: number) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export const useLandingState = (opts?: UseLandingStateOptions): UseLandingState => {
  const coachId = resolveCoachId({ coach: opts?.coach ?? undefined })
  const { notify } = useToast()

  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<UseLandingState['activeSession']>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [crossGroupPlayers, setCrossGroupPlayers] = useState<PlayerLite[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<PlayerLite[]>([])
  const [starting, setStarting] = useState(false)

  const searchDebounced = useDebounced(searchTerm, 300)
  const mountedRef = useRef(false)

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    // analytics: search_opened
    console.debug('analytics:event', 'search_opened')
  }, [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  // Initial load: check active session and load groups
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    ;(async () => {
      try {
        const active = await api.getActiveForCoach(coachId)
        if (active) {
          // Backward compatibility: ensure groupIds is always an array
          const groupIds = normalizeGroupIds(active.groupIds)
          setActiveSession({
            ...active,
            groupIds
          })
          setStatusMessage(null)
        }
        const fetchedGroups = await api.fetchTrainingGroups()
        setGroups(fetchedGroups)
        // analytics: landing_groups_loaded
        console.debug('analytics:event', 'landing_groups_loaded')
      } catch (error) {
        const normalizedError = normalizeError(error)
        notify({
          variant: 'danger',
          title: 'Kunne ikke hente data',
          description: normalizedError.message
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [coachId, notify, opts])

  // Run player search
  useEffect(() => {
    if (!searchOpen) return
    const run = async () => {
      const q = searchDebounced.trim()
      if (!q) {
        setSearchResults([])
        return
      }
      try {
        const results = await api.searchPlayers({ q, limit: 50 })
        setSearchResults(results)
      } catch (error) {
        // fail silently; UI already conveys empty state
        console.warn('Player search failed', error)
      }
    }
    void run()
  }, [searchDebounced, searchOpen])

  const addCrossGroupPlayer = useCallback((p: PlayerLite) => {
    setCrossGroupPlayers((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))
    // analytics: player_selected_from_search
    console.debug('analytics:event', 'player_selected_from_search', { playerId: p.id })
  }, [])

  const removeCrossGroupPlayer = useCallback((id: string) => {
    setCrossGroupPlayers((prev) => prev.filter((p) => p.id !== id))
  }, [])

  /**
   * Toggles a group ID in the selected groups array.
   * Adds the group if not selected, removes it if already selected.
   * 
   * @param id - Group ID to toggle
   */
  const handleToggleGroupId = useCallback((id: string) => {
    setSelectedGroupIds((prev) => toggleGroupId(prev, id))
  }, [])

  const start = useCallback(async () => {
    if (starting) return
    
    // Validate that at least one group is selected or cross-group players exist
    if (selectedGroupIds.length === 0 && crossGroupPlayers.length === 0) {
      notify({
        variant: 'danger',
        title: 'Kunne ikke starte træning',
        description: 'Vælg mindst én gruppe eller tilføj spillere'
      })
      return
    }
    
    setStarting(true)
    try {
      // analytics: session_start_attempt
      console.debug('analytics:event', 'session_start_attempt')

      const payload = {
        coachId,
        groupIds: selectedGroupIds,
        date: new Date().toISOString(),
        allowedCrossGroupPlayerIds: crossGroupPlayers.map((p) => p.id)
      }
      const result = await api.startSession(payload)
      // analytics: session_start_success
      console.debug('analytics:event', 'session_start_success')
      setActiveSession(result)
      opts?.onRedirectToCheckin?.(result.sessionId)
    } catch (error) {
      // analytics: session_start_failed
      console.debug('analytics:event', 'session_start_failed')
      const normalizedError = normalizeError(error)
      notify({
        variant: 'danger',
        title: 'Kunne ikke starte træning',
        description: normalizedError.message
      })
    } finally {
      setStarting(false)
    }
  }, [coachId, crossGroupPlayers, notify, opts, selectedGroupIds, starting])

  const goToCheckIn = useCallback(() => {
    if (activeSession) {
      opts?.onRedirectToCheckin?.(activeSession.sessionId)
    }
  }, [activeSession, opts])

  const [ending, setEnding] = useState(false)
  const endSession = useCallback(async () => {
    if (ending) return
    setEnding(true)
    try {
      // Load persisted match data from localStorage if available
      let matchesData: Array<{ round: number; matches: CourtWithPlayers[] }> | undefined
      if (activeSession) {
        const persisted = loadPersistedState(activeSession.sessionId)
        if (persisted?.inMemoryMatches && Object.keys(persisted.inMemoryMatches).length > 0) {
          // Convert persisted matches to the format expected by endActiveSession
          matchesData = Object.entries(persisted.inMemoryMatches).map(([round, matches]) => ({
            round: Number(round),
            matches: matches as CourtWithPlayers[]
          }))
          console.log('[endSession] Loaded match data from persistence:', {
            rounds: matchesData.length,
            totalMatches: matchesData.reduce((sum, r) => sum + r.matches.length, 0)
          })
        }
      }
      
      await api.endActiveSession(matchesData)
      setActiveSession(null)
      // Refresh groups after ending
      const fetchedGroups = await api.fetchTrainingGroups()
      setGroups(fetchedGroups)
      notify({ variant: 'success', title: 'Træning afsluttet', description: 'Sessionen er afsluttet' })
    } catch (error) {
      const normalizedError = normalizeError(error)
      notify({ variant: 'danger', title: 'Kunne ikke afslutte træning', description: normalizedError.message })
    } finally {
      setEnding(false)
    }
  }, [ending, notify, activeSession])

  return {
    loading,
    statusMessage,
    activeSession,
    groups,
    selectedGroupIds,
    toggleGroupId: handleToggleGroupId,
    crossGroupPlayers,
    addCrossGroupPlayer,
    removeCrossGroupPlayer,
    openSearch,
    closeSearch,
    searchOpen,
    searchTerm,
    setSearchTerm,
    searchResults,
    starting,
    start,
    goToCheckIn,
    ending,
    endSession
  }
}

export default useLandingState
