import type { Metadata } from 'next';
import { ReactNode } from 'react';
import SiteHeader from '@/components/docs/SiteHeader';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Clairity Docs',
  description: 'Clairity documentation — Ops-first guides with inline developer details.',
};

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        'min-h-screen w-width relative',
        'bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--surface-2))_100%)]',
      )}
    >
      {/* subtle noise / glass layer */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_70%)] opacity-60 mix-blend-overlay"
        aria-hidden
      />

      <SiteHeader />

      {/* Plain container, no framed card */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
