'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

type Option = string;

export interface MultiSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  limit?: number;
  emptyMessage?: string;
}

/**
 * MultiSelect (chips inline + input)
 * - Wrapper owns border/bg → no double borders
 * - Focused: subtle blue ring/bg (using --accent-blue)
 * - Dropdown: solid white card, max-height + scroll, animated
 * - Keeps open after select for rapid multi-pick
 * - Enter adds; Backspace (when input empty) removes last chip
 * - Up/Down navigate; Enter picks; Esc closes
 * - Option uses onMouseDown + stopPropagation to prevent outside-close
 * - Chips are solid brand blue, high-contrast, safe removal (stopPropagation)
 */
export default function MultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Vælg…',
  className,
  limit = 8,
  emptyMessage = 'Ingen forslag',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Filter options not yet selected
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const pool = options.filter((opt) => !value.includes(opt));
    const list = !s ? pool : pool.filter((x) => x.toLowerCase().includes(s));
    return list.slice(0, limit);
  }, [q, options, value, limit]);

  const add = (t: string) => {
    const token = t.trim();
    if (!token || value.includes(token)) return;
    onChange([...value, token]);
    setQ('');
    setIdx(-1);
    // keep open; refocus allows continuous typing
    setOpen(true);
    requestAnimationFrame(() => setOpen(true));
    inputRef.current?.focus();
  };

  const remove = (t: string) => onChange(value.filter((x) => x !== t));

  // click-outside → close (pointerdown; options stopPropagation)
  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative rounded-md border border-border bg-paper p-1 transition-all duration-150',
        'focus-within:ring-2 ring-[hsl(var(--accent-blue)/.35)] focus-within:bg-[hsl(var(--accent-blue)/.03)]',
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {/* chips + input inline; grows when chips wrap */}
      <div className="flex flex-wrap items-center gap-1">
        {value.map((t) => (
          <button
            key={t}
            type="button"
            // Solid brand blue chip — high contrast, no blending
            className={cn(
              'h-7 rounded-full border px-2 text-[12px] transition-all duration-150 flex items-center gap-1',
              'border-[hsl(var(--accent-blue)/.55)] bg-[hsl(var(--accent-blue)/.92)] text-white',
              'hover:bg-[hsl(var(--accent-blue)/1)] hover:shadow-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue)/.45)]'
            )}
            title="Fjern"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              remove(t);
            }}
          >
            <span>{t}</span>
            <span className="text-[13px] opacity-90 hover:opacity-100 transition-opacity">×</span>
          </button>
        ))}

        {/* borderless input → no double border; flex-1 keeps line tight */}
        <input
          ref={inputRef}
          value={q}
          placeholder={value.length === 0 ? `${placeholder} (flere mulig)` : ''}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setIdx(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (open && filtered.length > 0) add(idx >= 0 ? filtered[idx] : filtered[0]);
              else if (q.trim()) add(q.trim());
            }
            if (e.key === 'Backspace' && !q && value.length > 0) {
              e.preventDefault();
              remove(value[value.length - 1]);
            }
            if (!open) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setIdx((i) => (filtered.length ? (i + 1) % filtered.length : -1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setIdx((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : -1));
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          className="min-w-[10ch] flex-1 bg-transparent outline-none h-9 px-2 text-sm placeholder:text-foreground/65"
          autoComplete="off"
        />
      </div>

      {/* dropdown */}
      {open && (
        <div
          className={cn(
            'absolute left-0 right-0 z-[70] mt-1 overflow-hidden rounded-lg border border-border bg-paper shadow-xl',
            'animate-in fade-in-0 zoom-in-95'
          )}
        >
          <div className="max-h-64 overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-foreground/65">{emptyMessage}</div>
            ) : (
              filtered.map((opt, i) => {
                const active = i === idx;
                return (
                  <div
                    key={opt + i}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors',
                      active ? 'bg-accent/10' : 'hover:bg-surface-2'
                    )}
                    onMouseEnter={() => setIdx(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      add(opt);
                    }}
                    role="option"
                    aria-selected={false}
                  >
                    <span className="flex-1 text-foreground">{opt}</span>
                    <span className="ml-2 text-[12px] text-foreground/70 opacity-0 transition-opacity hover:opacity-100">
                      + Tilføj
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <div className="border-t border-border/70 px-3 py-1.5 text-[11px] text-foreground/70">
            Enter: tilføj · Esc: luk · Backspace: fjern seneste
          </div>
        </div>
      )}
    </div>
  );
}
