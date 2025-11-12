/**
 * coachAdapter — centralized coach resolution.
 *
 * Single place to determine the effective coach for the session.
 * - If a coach prop/object is provided, use that id.
 * - Otherwise fallback to DEFAULT_COACH_ID from env/config.
 *
 * TODO(auth): Replace implementation to use real auth provider once available.
 * Only this file should change when adding multi-coach auth.
 */

export type CoachInput = { coach?: { id: string; displayName?: string } | null }

/**
 * Resolve the coach id safely.
 * Reads from Vite env `VITE_DEFAULT_COACH_ID` with a stable fallback.
 */
export const resolveCoachId = (input?: CoachInput): string => {
  if (input?.coach?.id) return input.coach.id
  // Read from env. Keep a stable default for local/dev.
  const envId = (import.meta as any)?.env?.VITE_DEFAULT_COACH_ID as string | undefined
  return envId && envId.trim().length > 0 ? envId : 'coach-default'
}

/**
 * Optional helper that returns the coach object shape used by the landing page.
 * Useful for future extensions where we may enrich the coach context here.
 */
export const resolveCoach = (input?: CoachInput): { id: string; displayName?: string } => {
  const id = resolveCoachId(input)
  // Display name intentionally minimal for now.
  return { id, displayName: input?.coach?.displayName }
}

