# Roles and Permissions Guide

This guide explains the role-based access control (RBAC) system.

## Overview

The system uses a three-tier role hierarchy:

1. **System Administrator (Sysadmin)** (highest)
2. **Admin** (middle)
3. **Coach** (lowest)

## Role Hierarchy

```
System Administrator (sysadmin)
    ↓
Admin (admin)
    ↓
Coach (coach)
```

Higher roles inherit permissions from lower roles.

## Roles

### System Administrator (Sysadmin)

**Role**: `sysadmin` (previously `super_admin`)

**Access Level**: System-wide

**Permissions**:
- Create/manage all tenants
- Create/manage tenant admin users
- Access all tenants' data (read-only)
- System configuration
- View all users across all tenants

**Use Cases**:
- Platform administrators
- System operators
- Initial setup

**Login Method**: Email + Password

**Note**: The role was renamed from `super_admin` to `sysadmin` for better clarity. `super_admin` is still supported for backward compatibility.

### Admin (Tenant Admin)

**Access Level**: Tenant-specific

**Permissions**:
- Manage coaches within their tenant
- Create/edit/delete coaches
- Reset coach PINs
- View tenant users
- Tenant settings (future)

**Use Cases**:
- Club administrators
- Badminton club managers
- Tenant owners

**Login Method**: Email + Password

### Coach

**Access Level**: Standard user

**Permissions**:
- Access tenant features
- Check in players
- View match programs
- View statistics
- No admin access

**Use Cases**:
- Badminton coaches
- Training staff
- Regular users

**Login Method**: Username + PIN (6 digits)

## Role Checks

### In Code

```typescript
import { UserRole, isSysAdmin, isSuperAdmin, isAdmin, hasMinimumRole } from './lib/auth/roles'

// Check exact role (new way)
if (user.role === UserRole.SYSADMIN) {
  // Sysadmin only
}

// Check exact role (backward compatible)
if (user.role === UserRole.SUPER_ADMIN || user.role === 'super_admin') {
  // Still works for backward compatibility
}

// Check if admin or higher
if (isAdmin(user.role)) {
  // Admin or super admin
}

// Check minimum role
if (hasMinimumRole(user.role, UserRole.ADMIN)) {
  // Admin or super admin
}
```

### In Components

```typescript
<ProtectedRoute requireRole={UserRole.SYSADMIN}>
  <SysAdminComponent />
</ProtectedRoute>

<ProtectedRoute requireMinRole={UserRole.ADMIN}>
  <AdminComponent />
</ProtectedRoute>
```

### In API Routes

```typescript
import { requireAuth, requireSysAdmin, requireSuperAdmin, requireAdmin } from './lib/auth/middleware'

// Require sysadmin (new way)
await requireAuth(req)
requireSysAdmin(req)

// Require sysadmin (backward compatible - still works)
await requireAuth(req)
requireSuperAdmin(req) // Still works, but use requireSysAdmin for new code

// Require admin or super admin
await requireAuth(req)
requireAdmin(req)
```

## Permission Matrix

| Action | Coach | Admin | Super Admin |
|--------|-------|-------|-------------|
| View own data | ✅ | ✅ | ✅ |
| Check in players | ✅ | ✅ | ✅ |
| View statistics | ✅ | ✅ | ✅ |
| Manage coaches | ❌ | ✅ (own tenant) | ✅ (all tenants) |
| Create coaches | ❌ | ✅ (own tenant) | ✅ (all tenants) |
| Reset coach PIN | ❌ | ✅ (own tenant) | ✅ (all tenants) |
| Manage tenants | ❌ | ❌ | ✅ |
| Create tenants | ❌ | ❌ | ✅ |
| Manage tenant admins | ❌ | ❌ | ✅ |
| View all tenants | ❌ | ❌ | ✅ |

**Note**: "Super Admin" in the table above refers to the `sysadmin` role.

## Role Assignment

### During User Creation

**System Administrator (Sysadmin)**:
- Created manually in database
- Or via sysadmin interface (future)
- Role: `sysadmin` (previously `super_admin`)

**Admin**:
- Created by super admin
- Via `/api/admin/tenants/:id/admins` endpoint
- Assigned to specific tenant

**Coach**:
- Created by tenant admin
- Via `/api/:tenantId/admin/coaches` endpoint
- Assigned to specific tenant

## Multi-Tenant Considerations

### Tenant Isolation

- Admins can only access their own tenant
- Coaches can only access their own tenant
- Sysadmins can access all tenants

### Cross-Tenant Access

- Not allowed for admins or coaches
- Sysadmins have read-only access to all tenants
- Tenant data is isolated by `tenant_id` in all queries

## JWT Token

Roles are included in JWT tokens:

```typescript
{
  clubId: "uuid",
  tenantId: "herlev-hjorten",
  role: "admin",
  email: "admin@example.com",
  type: "access"
}
```

## Role Utilities

Located in `packages/webapp/src/lib/auth/roles.ts`:

- `UserRole` - Role enum (`COACH`, `ADMIN`, `SYSADMIN`)
- `isSysAdmin()` - Check if sysadmin (new)
- `isSuperAdmin()` - Check if sysadmin (backward compatible, deprecated)
- `isAdmin()` - Check if admin or sysadmin
- `isCoach()` - Check if coach
- `hasMinimumRole()` - Check if role meets minimum
- `hasExactRole()` - Check exact role match
- `getRoleDisplayName()` - Get human-readable role name

## Middleware

Located in `packages/webapp/src/lib/auth/middleware.ts`:

- `requireAuth()` - Require authentication
- `requireSuperAdmin()` - Require super admin role
- `requireAdmin()` - Require admin or super admin
- `requireCoach()` - Require coach role

## Best Practices

### Role Checks

- Always check roles server-side
- Client-side checks are for UX only
- Never trust client-provided role information

### Permission Granularity

- Use minimum role required
- Prefer `requireMinRole` over `requireRole` when possible
- Check tenant_id for tenant-specific actions

### Security

- Roles are set during user creation
- Roles cannot be changed by users themselves
- Only super admins can change roles (future feature)

## Troubleshooting

### Cannot Access Admin Features

- Verify role in JWT token
- Check role in database (`clubs.role`)
- Ensure middleware is applied correctly

### Wrong Tenant Access

- Verify `tenant_id` in JWT matches request
- Check tenant isolation in queries
- Ensure `requireClub()` is called

### Role Not Updating

- Check JWT token expiration
- Verify database role is correct
- Re-login to refresh token

## Future Enhancements

- Role permissions matrix (granular permissions)
- Role groups (custom roles)
- Permission inheritance
- Role audit log
- Role-based UI customization

