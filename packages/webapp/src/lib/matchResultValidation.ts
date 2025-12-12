/**
 * Match result validation utilities.
 * 
 * Provides sport-specific validation functions for match scores.
 */

import type { BadmintonScoreData, TennisScoreData, PadelScoreData } from '@rundeklar/common'
import { MATCH_RESULT_ERROR_KEYS, BADMINTON_RULES } from '../constants/matchResults'

/**
 * Validation result type.
 */
export type ValidationResult = {
  valid: boolean
  error?: string
  errorKey?: string
}

/**
 * Options for badminton score validation.
 */
export type BadmintonValidationOptions = {
  playerLabelPlural?: string
  playerLabelDefinite?: string
}

/**
 * Validates badminton score data.
 * 
 * Rules:
 * - Maximum score is 30
 * - A set must be won by at least 2 points, unless the final score is 30-29
 * - Valid scores: 21-19, 22-20, 29-27, 30-29, but not 21-20, 31-29, 40-38
 * - A player/team must win at least 2 sets
 * 
 * @param sets - Array of sets with team1 and team2 scores
 * @param options - Optional validation options for dynamic error messages
 * @returns Validation result with valid flag and optional error message
 */
export const validateBadmintonScore = (
  sets: Array<{ team1: number | null; team2: number | null }>,
  options?: BadmintonValidationOptions
): ValidationResult => {
  if (sets.length === 0) {
    return { valid: false, error: 'Mindst ét sæt skal indtastes' }
  }
  
  if (sets.length > BADMINTON_RULES.MAX_SETS) {
    return { valid: false, error: 'Maksimum 3 sæt tilladt' }
  }
  
  let team1Wins = 0
  let team2Wins = 0
  
  for (const set of sets) {
    // Skip empty sets (both teams are null/empty)
    if ((set.team1 === null || set.team1 === 0) && (set.team2 === null || set.team2 === 0)) {
      continue
    }
    
    // Check if scores are valid (at least 0, maximum 30)
    if (set.team1 !== null && set.team1 < 0) {
      return { valid: false, error: 'Score kan ikke være negativ' }
    }
    if (set.team2 !== null && set.team2 < 0) {
      return { valid: false, error: 'Score kan ikke være negativ' }
    }
    
    if (set.team1 !== null && set.team1 > BADMINTON_RULES.MAX_SCORE) {
      return { valid: false, error: 'Maksimum score er 30 point' }
    }
    if (set.team2 !== null && set.team2 > BADMINTON_RULES.MAX_SCORE) {
      return { valid: false, error: 'Maksimum score er 30 point' }
    }
    
    // Check if there's a winner (both teams must have scores)
    if (set.team1 === null || set.team2 === null) {
      const errorMessage = options?.playerLabelPlural 
        ? `${options.playerLabelPlural} skal have en score`
        : 'Begge hold skal have en score'
      return { 
        valid: false, 
        error: errorMessage,
        errorKey: MATCH_RESULT_ERROR_KEYS.BOTH_PLAYERS_MUST_HAVE_SCORE
      }
    }
    
    if (set.team1 === set.team2) {
      return { valid: false, error: 'Sæt skal have en vinder' }
    }
    
    // Determine set winner and validate score difference
    const team1Score = set.team1!
    const team2Score = set.team2!
    
    if (team1Score > team2Score) {
      // Team 1 wins
      if (team1Score < BADMINTON_RULES.MIN_WINNING_SCORE) {
        return { valid: false, error: 'Vinder skal have mindst 21 point' }
      }
      
      // Check if score difference is valid
      const diff = team1Score - team2Score
      if (team1Score === BADMINTON_RULES.SPECIAL_SCORE.winner && team2Score === BADMINTON_RULES.SPECIAL_SCORE.loser) {
        // Special case: 30-29 is valid
        team1Wins++
      } else if (diff < BADMINTON_RULES.MIN_SCORE_DIFFERENCE) {
        return { valid: false, error: 'Vinder skal have mindst 2 point mere end modstanderen (undtagen 30-29)' }
      } else {
        team1Wins++
      }
    } else {
      // Team 2 wins
      if (team2Score < BADMINTON_RULES.MIN_WINNING_SCORE) {
        return { valid: false, error: 'Vinder skal have mindst 21 point' }
      }
      
      // Check if score difference is valid
      const diff = team2Score - team1Score
      if (team2Score === BADMINTON_RULES.SPECIAL_SCORE.winner && team1Score === BADMINTON_RULES.SPECIAL_SCORE.loser) {
        // Special case: 30-29 is valid
        team2Wins++
      } else if (diff < BADMINTON_RULES.MIN_SCORE_DIFFERENCE) {
        return { valid: false, error: 'Vinder skal have mindst 2 point mere end modstanderen (undtagen 30-29)' }
      } else {
        team2Wins++
      }
    }
  }
  
  // Check if a team has won 2 sets
  if (team1Wins < 2 && team2Wins < 2) {
    const errorMessage = options?.playerLabelDefinite
      ? `${options.playerLabelDefinite} skal have vundet mindst 2 sæt`
      : 'Et hold skal have vundet mindst 2 sæt'
    return { 
      valid: false, 
      error: errorMessage,
      errorKey: MATCH_RESULT_ERROR_KEYS.PLAYER_MUST_WIN_2_SETS
    }
  }
  
  // Check if match is complete (winner has 2 sets)
  if (team1Wins === 2 || team2Wins === 2) {
    return { valid: true }
  }
  
  return { valid: false, error: 'Ugyldigt resultat' }
}

/**
 * Validates tennis score data.
 * 
 * @param _scoreData - Tennis score data
 * @returns Validation result
 */
export const validateTennisScore = (_scoreData: TennisScoreData): ValidationResult => {
  // Placeholder for future tennis support
  return { valid: false, error: 'Tennis scoring not yet implemented' }
}

/**
 * Validates padel score data.
 * 
 * @param _scoreData - Padel score data
 * @returns Validation result
 */
export const validatePadelScore = (_scoreData: PadelScoreData): ValidationResult => {
  // Placeholder for future padel support
  return { valid: false, error: 'Padel scoring not yet implemented' }
}

/**
 * Validates match result based on sport type.
 * 
 * @param sport - Sport type ('badminton', 'tennis', 'padel')
 * @param scoreData - Score data (sport-specific format)
 * @param options - Optional validation options
 * @returns Validation result
 */
export const validateMatchResult = (
  sport: 'badminton' | 'tennis' | 'padel',
  scoreData: BadmintonScoreData | TennisScoreData | PadelScoreData,
  options?: BadmintonValidationOptions
): ValidationResult => {
  switch (sport) {
    case 'badminton':
      if ('sets' in scoreData && Array.isArray(scoreData.sets)) {
        return validateBadmintonScore(scoreData.sets, options)
      }
      return { valid: false, error: 'Invalid badminton score data format' }
    case 'tennis':
      return validateTennisScore(scoreData as TennisScoreData)
    case 'padel':
      return validatePadelScore(scoreData as PadelScoreData)
    default:
      return { valid: false, error: `Unknown sport: ${sport}` }
  }
}

/**
 * Type guard to check if score data is BadmintonScoreData.
 * 
 * @param scoreData - Score data to check
 * @returns True if score data is BadmintonScoreData
 */
export const isBadmintonScoreData = (
  scoreData: unknown
): scoreData is BadmintonScoreData => {
  return (
    typeof scoreData === 'object' &&
    scoreData !== null &&
    'sets' in scoreData &&
    Array.isArray((scoreData as any).sets) &&
    'winner' in scoreData
  )
}

