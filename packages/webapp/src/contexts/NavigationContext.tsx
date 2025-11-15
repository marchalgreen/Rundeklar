import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Page = 'coach' | 'check-in' | 'match-program' | 'players' | 'statistics' | 'prism-test'

interface NavigationContextType {
  currentPage: Page
  setCurrentPage: (page: Page) => void
  navigate: (page: Page) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export const useNavigation = () => {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}

interface NavigationProviderProps {
  children: ReactNode
  initialPage?: Page
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ 
  children, 
  initialPage = 'coach' 
}) => {
  const [currentPage, setCurrentPage] = useState<Page>(initialPage)

  const navigate = (page: Page) => {
    setCurrentPage(page)
    // Keep URL clean - don't update hash or pathname
    // URL will always stay at root (e.g., rundeklar.vercel.app)
  }

  // Initialize from URL hash if present (for backward compatibility)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#/, '')
      if (hash) {
        const path = hash.split('/').pop() || ''
        const knownPages: Page[] = ['coach', 'check-in', 'match-program', 'players', 'statistics', 'prism-test']
        if (knownPages.includes(path as Page)) {
          setCurrentPage(path as Page)
          // Clear hash to keep URL clean
          window.history.replaceState(null, '', window.location.pathname)
        }
      }
    }
  }, [])

  return (
    <NavigationContext.Provider value={{ currentPage, setCurrentPage, navigate }}>
      {children}
    </NavigationContext.Provider>
  )
}

