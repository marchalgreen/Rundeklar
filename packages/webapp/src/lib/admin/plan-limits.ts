export type PlanId = 'basic' | 'professional' | 'enterprise'

export interface PlanLimits {
  maxTrainingGroups: number | null // null = unlimited
  maxCoaches: number | null // null = unlimited
}

/**
 * Get plan limits for a given plan ID
 * @param planId - Plan ID ('basic', 'professional', or 'enterprise')
 * @returns Plan limits
 */
export function getPlanLimits(planId: PlanId | undefined): PlanLimits {
  switch (planId) {
    case 'basic':
      return {
        maxTrainingGroups: 1,
        maxCoaches: 2
      }
    case 'professional':
      return {
        maxTrainingGroups: 5,
        maxCoaches: null // unlimited
      }
    case 'enterprise':
      return {
        maxTrainingGroups: null, // unlimited
        maxCoaches: null // unlimited
      }
    default:
      // Default to basic if plan not set
      return {
        maxTrainingGroups: 1,
        maxCoaches: 2
      }
  }
}

/**
 * Validate if tenant can add another training group
 * @param planId - Plan ID ('basic', 'professional', or 'enterprise')
 * @param currentGroupCount - Current number of training groups
 * @returns Object with isValid and error message if invalid
 */
export function validateTrainingGroupLimit(
  planId: PlanId | undefined,
  currentGroupCount: number
): { isValid: boolean; error?: string } {
  const limits = getPlanLimits(planId)
  
  if (limits.maxTrainingGroups === null) {
    // Unlimited
    return { isValid: true }
  }
  
  if (currentGroupCount >= limits.maxTrainingGroups) {
    return {
      isValid: false,
      error: `Din pakke tillader maksimalt ${limits.maxTrainingGroups} træningsgruppe${limits.maxTrainingGroups > 1 ? 'r' : ''}. Opgrader til en højere pakke for at tilføje flere.`
    }
  }
  
  return { isValid: true }
}

/**
 * Validate if tenant can add another coach
 * @param planId - Plan ID ('basic', 'professional', or 'enterprise')
 * @param currentCoachCount - Current number of coaches
 * @returns Object with isValid and error message if invalid
 */
export function validateCoachLimit(
  planId: PlanId | undefined,
  currentCoachCount: number
): { isValid: boolean; error?: string } {
  const limits = getPlanLimits(planId)
  
  if (limits.maxCoaches === null) {
    // Unlimited
    return { isValid: true }
  }
  
  if (currentCoachCount >= limits.maxCoaches) {
    return {
      isValid: false,
      error: `Din pakke tillader maksimalt ${limits.maxCoaches} trænerlogin${limits.maxCoaches > 1 ? 's' : ''}. Opgrader til Professionel pakke for ubegrænsede trænerlogins.`
    }
  }
  
  return { isValid: true }
}

