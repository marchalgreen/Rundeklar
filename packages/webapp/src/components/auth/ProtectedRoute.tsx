import React, { useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigation } from '../../contexts/NavigationContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Protected route component that requires authentication
 * Redirects to login if not authenticated
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const { navigateToAuth } = useNavigation()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigateToAuth('login')
    }
  }, [loading, isAuthenticated, navigateToAuth])

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
    return null // Will redirect via useEffect
  }

  return <>{children}</>
}

