import api from '../api'
import type { Group, PlayerLite, ActiveSession, StartSessionPayload } from '../routes/landing/types'
import type { CourtWithPlayers } from '@rundeklar/common'
import { normalizeGroupIds } from '../lib/groupSelection'

/**
 * Thin adapter matching the landing page contract.
 * Internally maps to existing API (players + sessions) and derives groups.
 *
 * Notes on timezone handling:
 * - We display Europe/Copenhagen elsewhere via formatting utilities.
 * - Here, we send ISO timestamps in UTC (Date.toISOString()).
 * - Downstream consumers format via existing formatters.
 */

const PENDING_SEED_KEY = 'coach-landing:pending-session-seed'
const LAST_GROUP_KEY = 'coach-landing:last-group-id'

/**
 * Seed data persisted for handoff to CheckIn page.
 * Supports backward compatibility: old format with `groupId` will be converted to `groupIds` array.
 * @property groupIds - Array of selected training group IDs. Empty array means no specific groups selected.
 * @property extraPlayerIds - Array of player IDs allowed to participate from other groups.
 */
type PendingSeed = { groupIds: string[]; extraPlayerIds: string[] }

/**
 * Persists seed data for handoff to CheckIn page.
 * Stores group IDs and extra player IDs in localStorage.
 * 
 * @param seed - Seed data containing groupIds and extraPlayerIds
 * @throws Does not throw - silently handles localStorage errors (quota exceeded, etc.)
 */
export const persistPendingSeed = (seed: PendingSeed) => {
  try {
    localStorage.setItem(PENDING_SEED_KEY, JSON.stringify(seed))
  } catch {
    // Silently handle localStorage errors (quota exceeded, etc.)
    // This is not critical - CheckIn page can work without seed
  }
}

/**
 * Reads and clears pending seed data from localStorage.
 * Handles backward compatibility by converting old format (groupId) to new format (groupIds).
 * 
 * @returns Seed data with groupIds array, or null if not found or invalid
 */
export const readAndClearPendingSeed = (): PendingSeed | null => {
  try {
    const raw = localStorage.getItem(PENDING_SEED_KEY)
    if (!raw) return null
    
    localStorage.removeItem(PENDING_SEED_KEY)
    const parsed = JSON.parse(raw) as PendingSeed | { groupId?: string | null; groupIds?: string[]; extraPlayerIds?: string[] }
    
    // Backward compatibility: check for old format with groupId
    if ('groupId' in parsed && !('groupIds' in parsed)) {
      // Old format - convert to new format
      return {
        groupIds: normalizeGroupIds(parsed.groupId),
        extraPlayerIds: parsed.extraPlayerIds ?? []
      }
    }
    
    // New format or mixed format
    if ('groupIds' in parsed) {
      return {
        groupIds: normalizeGroupIds(parsed.groupIds),
        extraPlayerIds: parsed.extraPlayerIds ?? []
      }
    }
    
    // Invalid format
    return null
  } catch {
    // Handle JSON parse errors or corrupted data
    return null
  }
}

/**
 * Persists last selected group IDs (sticky across navigations).
 * Stores as JSON array for multi-group support.
 * 
 * @param groupIds - Array of group IDs to persist, or empty array to clear
 * @throws Does not throw - silently handles localStorage errors
 */
export const persistLastGroupId = (groupIds: string[]) => {
  try {
    if (groupIds.length > 0) {
      localStorage.setItem(LAST_GROUP_KEY, JSON.stringify(groupIds))
    } else {
      localStorage.removeItem(LAST_GROUP_KEY)
    }
  } catch {
    // Silently handle localStorage errors
  }
}

/**
 * Reads last selected group IDs (non-destructive).
 * Handles backward compatibility by converting old format (single string) to new format (array).
 * 
 * @returns Array of group IDs, or empty array if not found or invalid
 */
export const readLastGroupId = (): string[] => {
  try {
    const raw = localStorage.getItem(LAST_GROUP_KEY)
    if (!raw) return []
    
    // Try to parse as JSON array (new format)
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return normalizeGroupIds(parsed)
      }
    } catch {
      // Not JSON - might be old format (single string)
    }
    
    // Backward compatibility: treat as single string
    return normalizeGroupIds(raw)
  } catch {
    return []
  }
}

/**
 * Derives training groups from players.trainingGroups values.
 */
export const fetchTrainingGroups = async (): Promise<Group[]> => {
  const players = await api.players.list({})
  const map = new Map<string, { count: number }>()
  players.forEach((p) => {
    const groups = p.trainingGroups ?? []
    groups.forEach((id) => {
      const prev = map.get(id) || { count: 0 }
      map.set(id, { count: prev.count + 1 })
    })
  })

  const groups: Group[] = Array.from(map.entries()).map(([name, stats]) => ({
    id: name,
    name,
    color: null,
    playersCount: stats.count,
    lastSessionAt: null // Not tracked per-group in current schema
  }))

  // Stable alpha sort by Danish locale
  return groups.sort((a, b) => a.name.localeCompare(b.name, 'da'))
}

/**
 * Lists players for a group (or all) with optional search term.
 */
export const searchPlayers = async (opts: { q?: string; groupId?: string | null; excludeGroupId?: string; limit?: number }): Promise<PlayerLite[]> => {
  const { q, groupId, excludeGroupId, limit = 50 } = opts
  // Existing API supports q, active filtering; group we filter client-side.
  const players = await api.players.list({ q: q?.trim() || undefined, active: true })
  const filtered = players.filter((p) => {
    const groups = p.trainingGroups ?? []
    // If a specific group was requested, only include those in that group
    const includeByGroup = groupId ? groups.includes(groupId) : true
    // Optionally exclude players who belong to a given group (e.g., active group)
    const excludeByGroup = excludeGroupId ? !groups.includes(excludeGroupId) : true
    return includeByGroup && excludeByGroup
  })
  const mapped: PlayerLite[] = filtered.slice(0, limit).map((p) => ({
    id: p.id,
    displayName: p.name,
    groupId: (p.trainingGroups?.[0] ?? null),
    avatarUrl: null,
    active: Boolean(p.active)
  }))
  return mapped
}

/**
 * Returns current active session. Coach id is currently ignored by backend.
 * 
 * @param _coachId - Coach ID (currently ignored by backend)
 * @returns Active session with groupIds array, or null if no active session
 */
export const getActiveForCoach = async (_coachId: string): Promise<ActiveSession | null> => {
  const session = await api.session.getActive()
  if (!session) return null
  
  // Backward compatibility: try to read groupIds from localStorage
  const groupIds = readLastGroupId()
  return { sessionId: session.id, startedAt: session.date, groupIds }
}

/**
 * Starts a session (or returns active) and persists a small seed handoff for the CheckIn page.
 * 
 * @param payload - Session start payload with groupIds and optional cross-group players
 * @returns Active session with groupIds array
 * @throws Propagates errors from API calls
 */
export const startSession = async (payload: StartSessionPayload): Promise<ActiveSession> => {
  // Validate groupIds array
  const groupIds = normalizeGroupIds(payload.groupIds)
  
  // Persist seed for CheckIn to optionally read (groups + extra players)
  persistPendingSeed({ groupIds, extraPlayerIds: payload.allowedCrossGroupPlayerIds ?? [] })
  
  // Also persist last selected groups for future openings while session is active
  persistLastGroupId(groupIds)

  const session = await api.session.startOrGetActive()
  return { sessionId: session.id, startedAt: session.date, groupIds }
}

/** Ends the current active session. */
export const endActiveSession = async (matchesData?: Array<{ round: number; matches: CourtWithPlayers[] }>): Promise<void> => {
  await api.session.endActive(matchesData)
}

export default {
  fetchTrainingGroups,
  searchPlayers,
  getActiveForCoach,
  startSession,
  endActiveSession,
  persistPendingSeed,
  readAndClearPendingSeed,
  persistLastGroupId,
  readLastGroupId
}
