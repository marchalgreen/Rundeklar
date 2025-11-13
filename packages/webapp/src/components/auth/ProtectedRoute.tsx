import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTenant } from '../../contexts/TenantContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Protected route component that requires authentication
 * Redirects to login if not authenticated, preserving the intended destination
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const { buildPath } = useTenant()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-[hsl(var(--muted))]">Indlæser...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving the intended destination
    const loginPath = buildPath('/login')
    const returnTo = location.pathname + location.search
    return <Navigate to={loginPath} state={{ from: returnTo }} replace />
  }

  return <>{children}</>
}

