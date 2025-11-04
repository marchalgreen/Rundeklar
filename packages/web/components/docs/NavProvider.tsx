'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { DocSection } from './nav/types';

const NavContext = createContext<DocSection | null>(null);

interface NavProviderProps {
  section: DocSection;
  children: ReactNode;
}

export function NavProvider({ section, children }: NavProviderProps) {
  return <NavContext.Provider value={section}>{children}</NavContext.Provider>;
}

export function useDocsNav() {
  const context = useContext(NavContext);

  if (!context) {
    throw new Error('useDocsNav must be used within a NavProvider.');
  }

  return context;
}
