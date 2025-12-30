/**
 * Role-based access control utilities
 * Three-tier system: COACH < ADMIN < SYSADMIN
 */

export enum UserRole {
  COACH = 'coach',
  ADMIN = 'admin',
  SYSADMIN = 'sysadmin'
}

/**
 * Role hierarchy (higher number = more permissions)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.COACH]: 1,
  [UserRole.ADMIN]: 2,
  [UserRole.SYSADMIN]: 3
}

/**
 * Check if a role has at least the minimum required level
 * @param userRole - User's role
 * @param minRole - Minimum required role
 * @returns True if user role meets or exceeds minimum
 */
export function hasMinimumRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

/**
 * Check if user has exact role
 * @param userRole - User's role
 * @param requiredRole - Required role
 * @returns True if roles match
 */
export function hasExactRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return userRole === requiredRole
}

/**
 * Check if user is sysadmin
 * @param role - User role
 * @returns True if sysadmin
 */
export function isSysAdmin(role: string | UserRole): boolean {
  return role === UserRole.SYSADMIN
}

/**
 * @deprecated Use isSysAdmin instead
 * @param role - User role
 * @returns True if sysadmin
 */
export function isSuperAdmin(role: string | UserRole): boolean {
  return role === UserRole.SYSADMIN || role === 'sysadmin' || role === 'super_admin' // Backward compatibility
}

/**
 * Check if user is admin or sysadmin
 * @param role - User role
 * @returns True if admin or sysadmin
 */
export function isAdmin(role: string | UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SYSADMIN || role === 'sysadmin' || role === 'super_admin' // Backward compatibility
}

/**
 * Check if user is coach
 * @param role - User role
 * @returns True if coach
 */
export function isCoach(role: string | UserRole): boolean {
  return role === UserRole.COACH
}

/**
 * Get role display name
 * @param role - User role
 * @returns Human-readable role name
 */
export function getRoleDisplayName(role: string | UserRole): string {
  switch (role) {
    case UserRole.SYSADMIN:
    case 'super_admin': // Backward compatibility
      return 'System Administrator'
    case UserRole.ADMIN:
      return 'Administrator'
    case UserRole.COACH:
      return 'Træner'
    default:
      return 'Ukendt rolle'
  }
}

