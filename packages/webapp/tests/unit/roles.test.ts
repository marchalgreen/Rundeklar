/**
 * Unit tests for auth roles functions
 */

import { describe, it, expect } from 'vitest'
import {
  UserRole,
  hasMinimumRole,
  hasExactRole,
  getRoleDisplayName,
  isSysAdmin,
  isSuperAdmin,
  isAdmin,
  isCoach
} from '../../src/lib/auth/roles'

describe('hasMinimumRole', () => {
  it('should return true when user role equals minimum role', () => {
    expect(hasMinimumRole(UserRole.COACH, UserRole.COACH)).toBe(true)
    expect(hasMinimumRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true)
    expect(hasMinimumRole(UserRole.SYSADMIN, UserRole.SYSADMIN)).toBe(true)
  })

  it('should return true when user role exceeds minimum role', () => {
    expect(hasMinimumRole(UserRole.ADMIN, UserRole.COACH)).toBe(true)
    expect(hasMinimumRole(UserRole.SYSADMIN, UserRole.COACH)).toBe(true)
    expect(hasMinimumRole(UserRole.SYSADMIN, UserRole.ADMIN)).toBe(true)
  })

  it('should return false when user role is below minimum role', () => {
    expect(hasMinimumRole(UserRole.COACH, UserRole.ADMIN)).toBe(false)
    expect(hasMinimumRole(UserRole.COACH, UserRole.SYSADMIN)).toBe(false)
    expect(hasMinimumRole(UserRole.ADMIN, UserRole.SYSADMIN)).toBe(false)
  })
})

describe('hasExactRole', () => {
  it('should return true when roles match', () => {
    expect(hasExactRole(UserRole.COACH, UserRole.COACH)).toBe(true)
    expect(hasExactRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true)
    expect(hasExactRole(UserRole.SYSADMIN, UserRole.SYSADMIN)).toBe(true)
  })

  it('should return false when roles do not match', () => {
    expect(hasExactRole(UserRole.COACH, UserRole.ADMIN)).toBe(false)
    expect(hasExactRole(UserRole.ADMIN, UserRole.COACH)).toBe(false)
    expect(hasExactRole(UserRole.SYSADMIN, UserRole.COACH)).toBe(false)
  })
})

describe('isSysAdmin', () => {
  it('should return true for sysadmin role', () => {
    expect(isSysAdmin('sysadmin')).toBe(true)
    expect(isSysAdmin(UserRole.SYSADMIN)).toBe(true)
  })

  it('should return false for other roles', () => {
    expect(isSysAdmin('admin')).toBe(false)
    expect(isSysAdmin('coach')).toBe(false)
    expect(isSysAdmin(UserRole.ADMIN)).toBe(false)
    expect(isSysAdmin(UserRole.COACH)).toBe(false)
  })
})

describe('isSuperAdmin (backward compatibility)', () => {
  it('should return true for sysadmin and super_admin roles', () => {
    expect(isSuperAdmin('sysadmin')).toBe(true)
    expect(isSuperAdmin('super_admin')).toBe(true)
    expect(isSuperAdmin(UserRole.SYSADMIN)).toBe(true)
  })

  it('should return false for other roles', () => {
    expect(isSuperAdmin('admin')).toBe(false)
    expect(isSuperAdmin('coach')).toBe(false)
    expect(isSuperAdmin(UserRole.ADMIN)).toBe(false)
    expect(isSuperAdmin(UserRole.COACH)).toBe(false)
  })
})

describe('isAdmin', () => {
  it('should return true for admin role', () => {
    expect(isAdmin('admin')).toBe(true)
    expect(isAdmin(UserRole.ADMIN)).toBe(true)
  })

  it('should return true for sysadmin role', () => {
    expect(isAdmin('sysadmin')).toBe(true)
    expect(isAdmin(UserRole.SYSADMIN)).toBe(true)
  })

  it('should return true for super_admin role (backward compatibility)', () => {
    expect(isAdmin('super_admin')).toBe(true)
  })

  it('should return false for coach role', () => {
    expect(isAdmin('coach')).toBe(false)
    expect(isAdmin(UserRole.COACH)).toBe(false)
  })
})

describe('isCoach', () => {
  it('should return true for coach role', () => {
    expect(isCoach('coach')).toBe(true)
    expect(isCoach(UserRole.COACH)).toBe(true)
  })

  it('should return false for admin roles', () => {
    expect(isCoach('admin')).toBe(false)
    expect(isCoach('sysadmin')).toBe(false)
    expect(isCoach('super_admin')).toBe(false)
    expect(isCoach(UserRole.ADMIN)).toBe(false)
    expect(isCoach(UserRole.SYSADMIN)).toBe(false)
  })
})

describe('getRoleDisplayName', () => {
  it('should return correct display name for sysadmin', () => {
    expect(getRoleDisplayName('sysadmin')).toBe('System Administrator')
    expect(getRoleDisplayName(UserRole.SYSADMIN)).toBe('System Administrator')
  })

  it('should return correct display name for super_admin (backward compatibility)', () => {
    expect(getRoleDisplayName('super_admin')).toBe('System Administrator')
  })

  it('should return correct display name for admin', () => {
    expect(getRoleDisplayName('admin')).toBe('Administrator')
    expect(getRoleDisplayName(UserRole.ADMIN)).toBe('Administrator')
  })

  it('should return correct display name for coach', () => {
    expect(getRoleDisplayName('coach')).toBe('Træner')
    expect(getRoleDisplayName(UserRole.COACH)).toBe('Træner')
  })

  it('should return "Ukendt rolle" for unknown role', () => {
    expect(getRoleDisplayName('unknown')).toBe('Ukendt rolle')
    expect(getRoleDisplayName('')).toBe('Ukendt rolle')
  })
})

