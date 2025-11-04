// src/components/windows/KundekortSearch.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { kundekortSearch, getCustomerById, SearchHit } from '@/lib/search/kundekortSearch';
import { useDesktop } from '@/store/desktop';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils/cn';

type Props = { initialQuery?: string };

export default function KundekortSearch({ initialQuery = '' }: Props) {
  const openWin = useDesktop(useShallow((s) => s.open));
  const [q, setQ] = useState(initialQuery);
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [hasInteracted, setHasInteracted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const result = useMemo(() => kundekortSearch(q), [q]);
  const flat = result.flat;

  useEffect(() => {
    // Autofocus when the window mounts (hydration-safe)
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  // keyboard nav
  useEffect(() => {
    if (!hasInteracted) setFocusedIdx(-1);
  }, [q, hasInteracted]);

  const move = (dir: 1 | -1) => {
    if (!flat.length) return;
    setFocusedIdx((prev) => {
      const next = (prev + dir + flat.length) % flat.length;
      return next;
    });
  };

  const select = (hit: SearchHit | undefined) => {
    if (!hit) return;
    const customer = getCustomerById(hit.id);
    if (!customer) return;

    openWin({
      type: 'customerForm', // must match WINDOW_DEFAULTS key
      title: `Kundekort — ${customer.firstName} ${customer.lastName}`,
      payload: { customer },
    });
  };

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface/80 backdrop-blur-sm px-3 py-2 ring-0 focus-within:ring-2 focus-within:ring-ring transition-shadow duration-150">
          <svg aria-hidden className="h-4 w-4 opacity-60" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) e.preventDefault();
              if (e.key === 'ArrowDown') {
                setHasInteracted(true);
                move(1);
              }
              if (e.key === 'ArrowUp') {
                setHasInteracted(true);
                move(-1);
              }
              if (e.key === 'Enter') {
                select(flat[focusedIdx] || flat[0]);
              }
              if (e.key === 'Escape') {
                setQ('');
                setFocusedIdx(-1);
              }
            }}
            placeholder="Søg navn, adresse, by, email, telefon, #kundenr, tags…"
            className="flex-1 bg-transparent placeholder:text-muted/70 text-sm outline-none"
            spellCheck={false}
            autoComplete="off"
            aria-label="Kundekort søgning"
          />
          {!!q && (
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-2"
              onClick={() => {
                setQ('');
                setFocusedIdx(-1);
                inputRef.current?.focus();
              }}
            >
              Ryd
            </button>
          )}
        </div>

        {/* Results panel */}
        {q && result.groups.length > 0 && (
          <div
            className="absolute left-0 right-0 mt-2 rounded-xl border border-border bg-surface/90 backdrop-blur-md shadow-[0_16px_40px_rgba(0,0,0,.10)] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
            role="listbox"
            aria-label="Søgeresultater"
          >
            {result.groups.map((g, gi) => (
              <div
                key={g.category}
                className={cn('px-2 py-1', gi > 0 && 'border-t border-border/60')}
              >
                <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted">
                  {g.category}
                </div>
                {g.items.map((item) => {
                  const indexFlat = result.flat.indexOf(item);
                  const active = indexFlat === focusedIdx;
                  return (
                    <button
                      key={item.id + item.field}
                      role="option"
                      aria-selected={active}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg transition-colors duration-150',
                        active ? 'bg-accent/10 ring-1 ring-ring/40' : 'hover:bg-surface-2'
                      )}
                      onMouseEnter={() => setFocusedIdx(indexFlat)}
                      onClick={() => select(item)}
                    >
                      <div className="text-sm text-foreground">{item.label}</div>
                      {item.sub && <div className="text-xs text-muted">{item.sub}</div>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {q && result.groups.length === 0 && (
          <div className="absolute left-0 right-0 mt-2 rounded-xl border border-border bg-surface/90 backdrop-blur-md p-3 text-sm text-muted">
            Ingen resultater for “{q}”.
          </div>
        )}
      </div>

      {/* Helper text */}
      <div className="text-[11px] text-muted">
        Brug ↑/↓ for at vælge, <kbd className="rounded border border-border px-1">Enter</kbd> for at
        åbne.
      </div>
    </div>
  );
}
