'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDocsNav } from './NavProvider';
import { cn } from '@/lib/utils';

// Ensure links are absolute under /docs and never duplicate section segments.
function normalizeHref(href: string, sectionId: string) {
  let h = href.trim();

  // If it's relative (no leading slash), make it absolute
  if (!h.startsWith('/')) h = '/' + h;

  // Collapse accidental double slashes
  h = h.replace(/\/{2,}/g, '/');

  // If someone wrote 'docs/calendar/...' without the leading slash
  if (!h.startsWith('/docs/')) {
    // allow absolute external links untouched (http/https/mailto)
    if (/^(https?:|mailto:|tel:)/i.test(h)) return h;
    // scope under /docs
    h = `/docs${h}`;
  }

  // Deduplicate '/docs/<section>/<section>/' -> '/docs/<section>/'
  const dup = new RegExp(`^/docs/${sectionId}/${sectionId}(\\/|$)`, 'i');
  if (dup.test(h)) {
    h = h.replace(dup, `/docs/${sectionId}/`);
  }

  // Remove trailing slash except for exact section root
  if (h !== `/docs/${sectionId}`) h = h.replace(/\/$/, '');

  return h;
}

export default function SidebarUnified() {
  const nav = useDocsNav();
  const pathname = usePathname();

  return (
    <aside className={cn('hidden md:block pr-2 md:pr-0')} aria-label={`${nav.title} navigation`}>
      <div className="md:sticky md:top-20 md:h-[calc(100dvh-5rem)]">
        <div className={cn('card-glass-inactive rounded-xl p-2', 'md:h-full md:overflow-y-auto')}>
          <div className="px-2 py-2">
            <h2 className="text-sm font-medium text-[hsl(var(--muted))]">{nav.title}</h2>
          </div>

          <nav className="pb-2">
            {nav.groups.map((group) => (
              <div key={group.label} className="mb-2">
                <div className="px-3 pt-2 pb-1 text-[10px] tracking-wide uppercase text-[hsl(var(--muted))]">
                  {group.label}
                </div>

                <ul className="space-y-1 px-1">
                  {group.items.map((item) => {
                    const href = normalizeHref(item.href, nav.id ?? nav.title.toLowerCase());
                    const active = pathname === href;

                    return (
                      <li key={item.href}>
                        <Link
                          href={href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'group relative block rounded-md px-3 py-2 text-sm outline-none transition',
                            'focus-visible:ring-focus',
                            'text-[hsl(var(--muted))]',
                            'hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-2))/65]',
                            active && [
                              'bg-[hsl(var(--surface-2))] text-[hsl(var(--foreground))]',
                              'shadow-sm',
                              'ring-1 ring-[hsl(var(--ring))/55]',
                              'pl-4',
                              'before:absolute before:left-2 before:top-1 before:bottom-1 before:w-1 before:rounded-full before:bg-[hsl(var(--accent-blue))]',
                            ],
                          )}
                        >
                          <span className="relative z-10">{item.title}</span>
                          {item.badge && (
                            <span className="ml-2 align-middle rounded-full border px-2 py-0.5 text-[10px] text-[hsl(var(--muted))]">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
