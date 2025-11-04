'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '@/store/ui';
import { kundekortSearch, getCustomerById, SearchHit } from '@/lib/search/kundekortSearch';
import { useDesktop } from '@/store/desktop';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils/cn';

// Motion helpers (match Window.tsx style)
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ease = 'cubic-bezier(.2,.8,.2,1)';

export default function SearchOverlay() {
  const { searchOpen, query, closeSearch, setQuery } = useUI(
    useShallow((s) => ({
      searchOpen: s.searchOpen,
      query: s.query,
      closeSearch: s.closeSearch,
      setQuery: s.setQuery,
    }))
  );
  const openWin = useDesktop(useShallow((s) => s.open));
  const [mounted, setMounted] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  // autofocus & animate on open
  useEffect(() => {
    if (!searchOpen) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());

    if (!prefersReducedMotion()) {
      const card = cardRef.current;
      if (card) {
        card.animate(
          [
            { transform: 'translateY(-6px) scale(.98)', opacity: 0 },
            { transform: 'translateY(0) scale(1)', opacity: 1 },
          ],
          { duration: 180, easing: ease, fill: 'both' }
        );
      }
    }
    return () => cancelAnimationFrame(id);
  }, [searchOpen]);

  // close on global Escape as well
  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, closeSearch]);

  // results
  const results = useMemo(() => kundekortSearch(query), [query]);
  const flat = results.flat;

  const select = (hit: SearchHit | undefined) => {
    if (!hit) return;
    const customer = getCustomerById(hit.id);
    if (!customer) return;
    closeSearch();
    openWin({
      type: 'customerForm',
      title: `Kundekort — ${customer.firstName} ${customer.lastName}`,
      payload: { customer },
    });
  };

  // list render animation (animate only new items to prevent flicker)
  const prevKeysRef = useRef<string[]>([]);
  useEffect(() => {
    if (!listRef.current || prefersReducedMotion()) return;

    const keys = results.flat.map((i) => `${i.id}|${i.field}`);
    const prev = prevKeysRef.current;
    prevKeysRef.current = keys;

    const els = Array.from(listRef.current.querySelectorAll<HTMLButtonElement>('[data-anim-item]'));
    const byKey = new Map(els.map((el) => [el.getAttribute('data-key') || '', el]));

    keys.forEach((k, i) => {
      const el = byKey.get(k);
      if (!el) return;

      if (!prev.includes(k)) {
        el.animate(
          [
            { transform: 'translateY(3px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          { duration: 120, delay: Math.min(i * 12, 120), easing: ease, fill: 'both' }
        );
      } else {
        (el as HTMLElement).style.opacity = '1';
        (el as HTMLElement).style.transform = 'none';
      }
    });
  }, [results.flat]);

  // preview crossfade
  const prevIdxRef = useRef<number>(-1);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const prev = prevIdxRef.current;
    prevIdxRef.current = focusedIdx;
    if (prev === focusedIdx) return;
    const pv = previewRef.current;
    if (!pv) return;
    pv.animate([{ opacity: 0.001 }, { opacity: 1 }], { duration: 140, easing: ease, fill: 'both' });
  }, [focusedIdx]);

  if (!mounted) return null;
  return createPortal(
    <div
      aria-hidden={!searchOpen}
      className={cn(
        // backdrop is now *very* glassy & more transparent
        'pointer-events-none fixed inset-0 z-[95] transition-opacity duration-150',
        searchOpen ? 'opacity-100' : 'opacity-0'
      )}
      style={{ display: searchOpen ? 'block' : 'none' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeSearch();
      }}
    >
      {/* Glassy backdrop with soft aurora + noise (tokens/utilities) */}
      <div className="pointer-events-auto absolute inset-0" onMouseDown={() => closeSearch()}>
        <div
          className="absolute inset-0 opacity-95"
          style={{
            backdropFilter: 'blur(28px) saturate(150%)',
            WebkitBackdropFilter: 'blur(28px) saturate(150%)',
            background:
              'linear-gradient(to bottom, hsl(var(--bg-aqua-1)/.55), hsl(var(--bg-aqua-2)/.55))',
          }}
        />
        <div
          className="absolute inset-0 mix-blend-soft-light opacity-80"
          style={{
            background:
              'radial-gradient(900px 520px at 50% -10%, hsl(var(--accent)/.20), transparent 60%), radial-gradient(800px 480px at 60% -8%, hsl(var(--accent-2)/.22), transparent 55%)',
          }}
        />
        <div className="absolute inset-0 pointer-events-none overlay-noise" />
      </div>

      {/* Spotlight Card */}
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Kundekort søgning"
        ref={cardRef}
        className="pointer-events-auto mx-auto mt-20 w-[min(980px,92vw)] overflow-hidden rounded-2xl border border-border card-surface shadow-[0_30px_120px_rgba(0,0,0,.18)] ring-1 ring-white/40"
        style={{ backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)' }}
      >
        {/* Input */}
        <div className="relative border-b border-border/70 p-2">
          <div className="flex items-center gap-2 rounded-xl bg-surface/65 px-3 py-2 ring-1 ring-border">
            {/* icon */}
            <svg aria-hidden className="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIdx(-1);
              }}
              onKeyDown={(e) => {
                if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(e.key))
                  e.preventDefault();
                if (e.key === 'ArrowDown')
                  setFocusedIdx((i) => (flat.length ? (i + 1) % flat.length : -1));
                if (e.key === 'ArrowUp')
                  setFocusedIdx((i) => (flat.length ? (i - 1 + flat.length) % flat.length : -1));
                if (e.key === 'Tab')
                  setFocusedIdx((i) => (flat.length ? (i + 1) % flat.length : -1));
                if (e.key === 'Enter') select(flat[focusedIdx] || flat[0]);
                if (e.key === 'Escape') closeSearch();
              }}
              placeholder="Søg kundekort: navn, adresse, by, email, telefon, #kundenr, tags…"
              className="flex-1 bg-transparent placeholder:text-foreground/65 text-[15px] outline-none"
              spellCheck={false}
              autoComplete="off"
            />
            {/* Key-hints */}
            <div className="ml-1 hidden items-center gap-1 text-[11px] text-foreground/60 sm:flex">
              <kbd className="rounded border border-border px-1">↑</kbd>
              <kbd className="rounded border border-border px-1">↓</kbd>
              <span>vælg</span>
              <kbd className="ml-2 rounded border border-border px-1">Enter</kbd>
              <span>åbn</span>
              <kbd className="ml-2 rounded border border-border px-1">Esc</kbd>
              <span>luk</span>
            </div>
          </div>
        </div>

        {/* Body: results + preview */}
        <div className="grid grid-cols-1 md:grid-cols-3">
          {/* Results (2/3) */}
          <div ref={listRef} className="md:col-span-2 max-h-[52vh] overflow-auto p-2">
            {!query && (
              <div className="px-2 py-6 text-[15px] text-foreground/75">
                Start med at søge efter en kunde…
              </div>
            )}

            {query && results.groups.length === 0 && (
              <div className="px-2 py-6 text-[15px] text-foreground/75">
                Ingen resultater for “{query}”.
              </div>
            )}

            {results.groups.map((g, gi) => (
              <div
                key={g.category}
                className={cn('px-1 py-1', gi > 0 && 'mt-2 border-t border-border/60')}
              >
                <div className="sticky top-0 z-10 -mx-1 mb-1 bg-surface/80 px-2 py-1 text-[12px] uppercase tracking-wide text-foreground/70 backdrop-blur">
                  {g.category}
                </div>
                {g.items.map((item) => {
                  const indexFlat = results.flat.indexOf(item);
                  const active = indexFlat === focusedIdx;
                  return (
                    <button
                      key={item.id + item.field}
                      role="option"
                      aria-selected={active}
                      data-anim-item
                      data-key={`${item.id}|${item.field}`}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg transition-[background,box-shadow,transform] duration-150',
                        active
                          ? 'bg-accent/12 ring-1 ring-ring/40 shadow-[0_4px_14px_rgba(16,156,241,.10)]'
                          : 'hover:bg-surface-2'
                      )}
                      onMouseEnter={() => setFocusedIdx(indexFlat)}
                      onClick={() => select(item)}
                    >
                      <div className="text-[15px] md:text-base font-medium">{item.label}</div>
                      {item.sub && <div className="text-[13px] text-foreground/80">{item.sub}</div>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Preview (1/3) */}
          <aside className="hidden md:block border-l border-border/70 bg-surface/65 p-3">
            <div ref={previewRef}>
              {!flat[focusedIdx] ? (
                <div className="text-[15px] text-foreground/65 mt-8 px-3">Forhåndsvisning…</div>
              ) : (
                (() => {
                  const p = getCustomerById(flat[focusedIdx].id)!;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 ring-1 ring-ring/30 text-sm font-semibold">
                          {p.firstName.charAt(0)}
                          {p.lastName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-base">
                            {p.firstName} {p.lastName}
                          </div>
                          <div className="text-xs text-foreground/65">#{p.customerNo ?? '—'}</div>
                        </div>
                      </div>
                      <div className="text-[13px] text-foreground/80">{p.address.street}</div>
                      <div className="text-[13px] text-foreground/80">
                        {p.address.postalCode} {p.address.city}
                      </div>
                      {p.email && <div className="text-[13px] text-foreground/80">{p.email}</div>}
                      {(p.tags?.length ?? 0) > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {p.tags!.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-border/70 bg-surface px-2 py-0.5 text-[11px] text-foreground/80"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => select(flat[focusedIdx])}
                        className="mt-3 rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-2 transition-colors"
                      >
                        Åbn kundekort
                      </button>
                    </div>
                  );
                })()
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>,
    document.body
  );
}
