/**
 * UI variant for player rendering.
 * We now keep only option A (initials avatar + matched rail).
 */

export type PlayerUiVariant = 'A'

const _STORAGE_KEY = 'ui:playerCardVariant'
export const VARIANT_CHANGED_EVENT = 'ui:playerCardVariant:changed'

export const getPlayerUiVariant = (): PlayerUiVariant => {
  return 'A'
}

export const setPlayerUiVariant = (_variant: PlayerUiVariant) => {
  window.dispatchEvent(new CustomEvent(VARIANT_CHANGED_EVENT, { detail: { variant: 'A' } }))
}


