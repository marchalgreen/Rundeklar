// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import GlobalHotkeys from '@/components/GlobalHotkeys';
import { Toaster } from '@/components/ui/sonner';

// 🔔 Favicon badge (client) — mount once; pass your unread count later
import FaviconBadge from '@/components/FaviconBadge';
import CommandPalette from '@/components/command/CommandPalette';
import RouteTransition from '@/components/RouteTransition';

export const metadata: Metadata = {
  title: 'Clairity',
  description: 'Clairity — optometry software suite',
  icons: {
    icon: [
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  other: {
    'apple-mobile-web-app-title': 'Clairity',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>{/* Next injects icons/manifest from metadata */}</head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Global hotkeys and window-level logic */}
        <GlobalHotkeys />

        {/* Favicon badge: wire 'count' to your store later (e.g., unread notifications) */}
        <FaviconBadge />

        {/* App content */}
        {children}

        {/* Minimal login/logout transition overlay */}
        <RouteTransition />

        {/* Sonner Toaster (global toast renderer) */}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              borderRadius: '12px',
              background: 'hsl(var(--surface))',
              color: 'hsl(var(--foreground))',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            },
          }}
        />
        <CommandPalette />
        <div id="portal" />
      </body>
    </html>
  );
}
