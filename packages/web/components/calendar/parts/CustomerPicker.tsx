// src/components/calendar/parts/CustomerPicker.tsx
'use client';

import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { kundekortSearch, getCustomerById } from '@/lib/search/kundekortSearch';
import type { CustomerId } from '@/lib/mock/customers';

type Props = {
  value?: CustomerId;
  onChange: (id: CustomerId | undefined) => void;
  placeholder?: string;
  withinDialog?: boolean; // when true, portal into AlertDialog content
  buttonClassName?: string;
};

export default function CustomerPicker({
  value,
  onChange,
  placeholder = 'Vælg kunde',
  withinDialog = false,
  buttonClassName,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Portal target (to avoid inert areas inside dialogs)
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!withinDialog) return;
    const el = document.querySelector('[data-radix-dialog-content]') as HTMLElement | null;
    setContainer(el);
  }, [withinDialog]);

  const hits = React.useMemo(() => (q ? kundekortSearch(q, 6).flat : []), [q]);

  // Keep active index in range
  React.useEffect(() => {
    setActive((i) => (hits.length ? Math.max(0, Math.min(i, hits.length - 1)) : 0));
  }, [hits.length]);

  const selected = value ? getCustomerById(value as string) : undefined;

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      setQ('');
      setActive(0);
      // focus after paint
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const choose = (id: CustomerId | undefined) => {
    onChange(id);
    setOpen(false);
    setQ('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!hits.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const h = hits[active];
      if (!h) return;
      choose(h.id as CustomerId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={['tahoe-input w-full justify-between', buttonClassName || ''].join(' ')}
        >
          <span className="truncate text-left">
            {selected
              ? `${selected.firstName} ${selected.lastName}` +
                (selected.customerNo ? ` • #${selected.customerNo}` : '')
              : placeholder}
          </span>
          <span className="text-zinc-400 text-xs">▾</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal container={withinDialog ? container ?? undefined : undefined}>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-[1100] w-[min(520px,90vw)] p-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-hair
                     data-[state=open]:animate-in data-[state=closed]:animate-out
                     data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <input
            ref={inputRef}
            className="tahoe-input w-full mb-2"
            placeholder="Søg navn, tlf, e-mail eller kundenr."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
          />

          <div className="max-h-72 overflow-auto">
            {hits.length === 0 && q ? (
              <div className="text-sm text-zinc-500 px-2 py-6 text-center">Ingen kunder fundet</div>
            ) : null}
            <ul>
              {hits.map((h, i) => {
                const c = getCustomerById(h.id);
                if (!c) return null;
                return (
                  <li key={`${h.category}-${c.id}`}>
                    <button
                      type="button"
                      className={[
                        'w-full px-2 py-2 rounded-md text-left text-[13px]',
                        i === active ? 'bg-zinc-100' : 'hover:bg-zinc-100',
                      ].join(' ')}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(c.id as CustomerId)}
                    >
                      <div className="font-medium truncate">
                        {c.firstName} {c.lastName}{' '}
                        {c.customerNo ? (
                          <span className="text-zinc-500 font-normal">• #{c.customerNo}</span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {c.phoneMobile || c.phoneWork || '—'} {c.email ? `• ${c.email}` : ''}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selected && (
            <div className="pt-2 mt-2 border-t border-hair/70 flex items-center justify-between">
              <div className="text-[12px] text-zinc-600 truncate">
                Valgt:{' '}
                <span className="font-medium">
                  {selected.firstName} {selected.lastName}
                </span>
                {selected.customerNo ? (
                  <span className="text-zinc-500"> • #{selected.customerNo}</span>
                ) : null}
              </div>
              <button type="button" className="tahoe-ghost" onClick={() => choose(undefined)}>
                Ryd
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
