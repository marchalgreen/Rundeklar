/**
 * Statistics module constants.
 * 
 * Centralized constants for statistics calculations, comparisons, and visualizations.
 * Prevents magic numbers and improves maintainability.
 */

/**
 * Maximum number of days allowed for period comparison.
 * Comparisons are disabled for periods longer than this.
 */
export const MAX_COMPARISON_PERIOD_DAYS = 365

/**
 * Lightness offset for comparison period colors in charts.
 * Used to darken comparison period lines/bars for visual distinction.
 */
export const COMPARISON_COLOR_LIGHTNESS_OFFSET = 10

/**
 * Gradient lightness offset for chart visualizations.
 * Used when creating gradients from base colors.
 */
export const GRADIENT_LIGHTNESS_OFFSET = 20

/**
 * Maximum lightness value for gradient colors.
 * Prevents colors from becoming too light (unreadable).
 */
export const MAX_GRADIENT_LIGHTNESS = 95

/**
 * Minimum lightness value for gradient colors.
 * Prevents colors from becoming too dark (unreadable).
 */
export const MIN_GRADIENT_LIGHTNESS = 5

/**
 * Saturation increase for gradient dark colors.
 * Used to enhance contrast in gradient visualizations.
 */
export const GRADIENT_SATURATION_INCREASE = 15

/**
 * Maximum saturation value for gradient colors.
 */
export const MAX_GRADIENT_SATURATION = 100

/**
 * Number of top players to display in long-tail visualizations.
 * Limits the chart to most active players for better readability.
 */
export const TOP_PLAYERS_DISPLAY_LIMIT = 20

/**
 * Maximum length for player names in chart labels.
 * Names longer than this are truncated with ellipsis.
 */
export const MAX_PLAYER_NAME_LENGTH = 15

/**
 * Maximum length for group names in chart labels.
 * Group names longer than this are truncated with ellipsis.
 */
export const MAX_GROUP_NAME_LENGTH = 12

