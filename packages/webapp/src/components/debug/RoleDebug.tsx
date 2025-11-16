import React from 'react'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Debug component to check role and club info
 * Temporary - remove after debugging
 */
export function RoleDebug() {
  const { club, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <div>Not authenticated</div>
  }

  return (
    <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-md mb-4">
      <h3 className="font-semibold mb-2">Debug: Role Information</h3>
      <pre className="text-xs overflow-auto">
        {JSON.stringify(
          {
            club: club,
            role: club?.role,
            isAdmin: club?.role === 'admin' || club?.role === 'super_admin',
            isSuperAdmin: club?.role === 'super_admin'
          },
          null,
          2
        )}
      </pre>
    </div>
  )
}

