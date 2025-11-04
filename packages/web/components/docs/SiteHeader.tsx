'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function SiteHeader() {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const pathname = usePathname();

  // Centralized list of docs sections (extend here to add more)
  const sections = useMemo(
    () => [
      { label: 'Calendar', href: '/docs/calendar' },
      { label: 'Vendor Sync', href: '/docs/vendor-sync' },
      { label: 'Testing', href: '/docs/testing/playwright' },
    ],
    [],
  );

  // Resolve the active section from the current path
  const activeSection = useMemo(() => {
    const match = sections.find((s) => pathname?.startsWith(s.href));
    return match?.label ?? null;
  }, [pathname, sections]);

  // Focus search with "/" like in most doc portals
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName.toLowerCase() !== 'input' &&
        document.activeElement?.tagName.toLowerCase() !== 'textarea'
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <header
      suppressHydrationWarning
      className={cn(
        'sticky top-0 z-40 w-full backdrop-blur-md',
        // soft glass gradient
        'bg-[linear-gradient(to_bottom,rgba(255,255,255,0.8),rgba(255,255,255,0.6))]',
        // subtle separator (no hard border)
        'shadow-[inset_0_-1px_0_hsl(var(--line)/.08)]',
        // gentle ambient drop
        'shadow-[0_6px_20px_rgba(0,0,0,0.03)]',
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand / breadcrumb */}
        <Link
          href="/docs"
          className="group inline-flex items-center gap-3 transition-colors"
          aria-label="Clairity Docs home"
        >
          {/* Logo */}
          <div className="relative h-6 w-6 shrink-0 transition-transform duration-200 group-hover:scale-[1.04]">
            <Image
              src="/branding/Clairity_blue.svg"
              alt="Clairity logo"
              fill
              sizes="24px"
              priority
            />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--accent-blue))]">
            Clairity Docs
          </span>
          {activeSection ? (
            <span className="hidden text-[13px] text-foreground/70 transition-colors group-hover:text-foreground sm:inline">
              / {activeSection}
            </span>
          ) : null}
        </Link>

        {/* Sections dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="soft"
              size="pill"
              className="ml-2 hidden rounded-2xl transition-transform hover:-translate-y-[1px] sm:inline-flex"
            >
              Sections <CaretDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            // ring-1 instead of border for soft tone
            className="w-56 rounded-2xl bg-white/90 shadow-lg backdrop-blur-md ring-1 ring-[hsl(var(--line)/.12)]"
          >
            <DropdownMenuLabel>Available sections</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sections.map((s) => (
              <DropdownMenuItem key={s.href} asChild>
                <Link href={s.href} className="flex w-full items-center">
                  {s.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Search pill */}
          <div
            className={cn(
              'hidden items-center gap-2 rounded-2xl px-2 py-1 shadow-sm backdrop-blur sm:flex',
              // ring-1 instead of border
              'bg-white/75 ring-1 ring-[hsl(var(--line)/.12)] hover:ring-[hsl(var(--accent-blue)/.35)] transition-colors',
            )}
          >
            <MagnifyingGlass size={16} className="text-foreground/60" />
            <Input
              ref={searchRef}
              className="h-8 w-72 border-0 bg-transparent p-0 text-sm shadow-none focus:outline-none focus:ring-0"
              placeholder="Search docs (press /)…"
              aria-label="Search docs"
            />
          </div>

          {/* Docs home */}
          <Link href="/docs" className="hidden sm:inline-flex">
            <Button
              variant="soft"
              size="pill"
              className="rounded-2xl transition-transform hover:-translate-y-[1px] ring-1 ring-[hsl(var(--line)/.12)] hover:ring-[hsl(var(--accent-blue)/.30)]"
            >
              All docs
            </Button>
          </Link>

          {/* Back to app */}
          <Button
            asChild
            variant="tahoe"
            size="pill"
            className="rounded-2xl transition-transform hover:-translate-y-[1px]"
          >
            <Link href="/">Back to app</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
