/**
 * Constants for match result validation and display.
 */

/**
 * Error message keys used in validation.
 */
export const MATCH_RESULT_ERROR_KEYS = {
  BOTH_PLAYERS_MUST_HAVE_SCORE: 'BOTH_PLAYERS_MUST_HAVE_SCORE',
  PLAYER_MUST_WIN_2_SETS: 'PLAYER_MUST_WIN_2_SETS'
} as const

/**
 * Badminton scoring rules.
 */
export const BADMINTON_RULES = {
  MAX_SCORE: 30,
  MIN_WINNING_SCORE: 21,
  MIN_SCORE_DIFFERENCE: 2,
  MAX_SETS: 3,
  SPECIAL_SCORE: { winner: 30, loser: 29 } // 30-29 is valid
} as const

