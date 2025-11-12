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

export type ActiveSession = {
  sessionId: string
  startedAt: string
  groupId: string | null
}

export type StartSessionPayload = {
  coachId: string
  groupId: string | null
  date: string // ISO (UTC)
  allowedCrossGroupPlayerIds?: string[]
}

