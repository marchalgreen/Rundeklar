/**
 * Courts in use — simple per-tenant persistence in localStorage.
 * Remembers the last chosen number of courts and exposes helpers
 * to read/write it during and between sessions.
 */

const key = (tenantId: string) => `courtsInUse:${tenantId}`

export const getStoredCourtsInUse = (tenantId: string): number | null => {
  try {
    const raw = localStorage.getItem(key(tenantId))
    if (!raw) return null
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export const setStoredCourtsInUse = (tenantId: string, value: number) => {
  try {
    localStorage.setItem(key(tenantId), String(value))
    // Dispatch a custom event in the same window to allow subscribers to update immediately
    window.dispatchEvent(new CustomEvent('courtsInUse:changed', { detail: { tenantId, value } }))
  } catch {}
}

export const getEffectiveCourtsInUse = (tenantId: string, fallbackDefault: number): number => {
  const stored = getStoredCourtsInUse(tenantId)
  if (stored && stored > 0) return stored
  return fallbackDefault
}

export default {
  getStoredCourtsInUse,
  setStoredCourtsInUse,
  getEffectiveCourtsInUse
}
