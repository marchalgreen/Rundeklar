'use client';

import * as React from 'react';
import { NavProvider } from './NavProvider';
import SidebarUnified from './SidebarUnified';
import type { DocSection } from './nav/types';

export default function UnifiedDocLayout({
  section,
  children,
}: {
  section: DocSection;
  children: React.ReactNode;
}) {
  // Header is rendered by src/app/docs/layout.tsx.
  // This shell provides: skip link + sticky left rail + content area.
  return (
    <NavProvider section={section}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* 264px sticky rail + flexible content; min-w-0 prevents overflow */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[264px_minmax(0,1fr)]">
          <SidebarUnified />
          <main id="docs-content" className="min-w-0">
            {children}
          </main>
        </div>
      </div>
    </NavProvider>
  );
}
