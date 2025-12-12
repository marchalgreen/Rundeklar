/**
 * Local landing types kept small and UI-focused.
 * They map to the external contract described in the task
 * and are adapted from the project domain types when possible.
 */

export type Coach = { id: string; displayName?: string }

export type Group = {
  id: string
  name: string
  color?: string | null
  playersCount: number
  lastSessionAt?: string | null
}

export type PlayerLite = {
  id: string
  displayName: string
  groupId: string | null
  avatarUrl?: string | null
  active: boolean
}

/**
 * Active training session information.
 * Supports both single-group (backward compatible) and multi-group sessions.
 * @property groupIds - Array of selected training group IDs. Empty array means no specific groups selected.
 */
export type ActiveSession = {
  sessionId: string
  startedAt: string
  groupIds: string[]
}

/**
 * Payload for starting a new training session.
 * Supports both single-group (backward compatible) and multi-group sessions.
 * @property groupIds - Array of selected training group IDs. Empty array means no specific groups selected.
 * @property allowedCrossGroupPlayerIds - Optional array of player IDs allowed to participate from other groups.
 */
export type StartSessionPayload = {
  coachId: string
  groupIds: string[]
  date: string // ISO (UTC)
  allowedCrossGroupPlayerIds?: string[]
}

