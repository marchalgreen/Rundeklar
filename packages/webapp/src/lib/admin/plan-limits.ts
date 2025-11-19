import type { TenantConfig } from '@rundeklar/common'
import { getTenantConfig } from './tenant-utils.js'

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
        maxCoaches: 1
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
        maxCoaches: 1
      }
  }
}

/**
 * Get tenant plan limits
 * @param tenantId - Tenant ID
 * @returns Plan limits for the tenant
 */
export async function getTenantPlanLimits(tenantId: string): Promise<PlanLimits> {
  const config = await getTenantConfig(tenantId)
  return getPlanLimits(config?.planId)
}

/**
 * Validate if tenant can add another training group
 * @param tenantId - Tenant ID
 * @param currentGroupCount - Current number of training groups
 * @returns Object with isValid and error message if invalid
 */
export async function validateTrainingGroupLimit(
  tenantId: string,
  currentGroupCount: number
): Promise<{ isValid: boolean; error?: string }> {
  const limits = await getTenantPlanLimits(tenantId)
  
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
 * @param tenantId - Tenant ID
 * @param currentCoachCount - Current number of coaches
 * @returns Object with isValid and error message if invalid
 */
export async function validateCoachLimit(
  tenantId: string,
  currentCoachCount: number
): Promise<{ isValid: boolean; error?: string }> {
  const limits = await getTenantPlanLimits(tenantId)
  
  if (limits.maxCoaches === null) {
    // Unlimited
    return { isValid: true }
  }
  
  if (currentCoachCount >= limits.maxCoaches) {
    return {
      isValid: false,
      error: `Din pakke tillader maksimalt ${limits.maxCoaches} trænerlogin. Opgrader til Professionel pakke for ubegrænsede trænerlogins.`
    }
  }
  
  return { isValid: true }
}

