'use client';

import { cn } from '@/lib/utils/cn';
import { useEffect, useRef, useState } from 'react';
import {
  CaretDown,
  Plus,
  CalendarPlus,
  IdentificationBadge,
  ShoppingCartSimple,
} from '@phosphor-icons/react';
import type { IconProps } from '@phosphor-icons/react';

function MenuItem({
  icon: Icon,
  label,
  onClick,
  tintHsl,
}: {
  icon: React.ComponentType<IconProps>;
  label: string;
  onClick: () => void;
  tintHsl?: string;
}) {
  const tint = tintHsl || '210 10% 46%';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-2 rounded-md px-2.5 py-2',
        'text-left text-[13px] text-zinc-800 transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-md opacity-0 scale-[.985] transition-all duration-250 group-hover:opacity-100 group-hover:scale-100"
        style={{
          background: `linear-gradient(to bottom, hsla(${tint} / .14), hsla(${tint} / .08))`,
          boxShadow: `0 6px 16px hsla(${tint} / .14), inset 0 0 0 1px hsla(${tint} / .28)`,
        }}
      />
      <Icon className="relative z-[1] h-4 w-4 text-zinc-600 transition-colors group-hover:text-zinc-700" />
      <span className="relative z-[1]">{label}</span>
    </button>
  );
}

export default function SplitNewButton({
  className,
  onPrimary,
  onNewCustomer,
  onNewBooking,
  onNewOrder,
  tints,
}: {
  className?: string;
  onPrimary: () => void;
  onNewCustomer: () => void;
  onNewBooking: () => void;
  onNewOrder: () => void;
  tints: { customer: string; booking: string; order: string };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node | null;
      if (ref.current && t && !ref.current.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative hidden md:flex items-center', className)}>
      {/* LEFT: primary “Ny” button */}
      <button
        type="button"
        title="Ny (kommando palette)"
        onClick={onPrimary}
        className={cn(
          'inline-flex h-[42px] items-center gap-2 rounded-l-xl px-3',
          'text-zinc-700 hover:text-zinc-900',
          'bg-white/65 hover:bg-white/80 active:bg-white/85',
          'ring-1 ring-white/60 shadow-sm transition-all duration-250 ease-[cubic-bezier(.22,.7,.2,1)]',
        )}
      >
        <Plus className="h-4 w-4" />
        <span className="text-[13px] font-medium">Ny</span>
      </button>

      {/* RIGHT: caret to open dropdown */}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-[42px] items-center justify-center rounded-r-xl px-2',
          'text-zinc-700 hover:text-zinc-900',
          'bg-white/65 hover:bg-white/80 active:bg-white/85',
          'ring-1 ring-l-0 ring-white/60 shadow-sm transition-all duration-250 ease-[cubic-bezier(.22,.7,.2,1)]',
        )}
        title="Vælg hvad der skal oprettes"
      >
        <CaretDown className="h-4 w-4" />
      </button>

      {/* Menu */}
      <div
        className={cn(
          'absolute right-0 top-[110%] z-50 min-w-[180px] rounded-lg border bg-white/90 p-1 ring-1 ring-white/60 shadow-md backdrop-blur-xl',
          open ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-1',
          'transition',
        )}
        role="menu"
      >
        <MenuItem
          icon={IdentificationBadge}
          label="Ny kunde"
          tintHsl={tints.customer}
          onClick={() => {
            setOpen(false);
            onNewCustomer();
          }}
        />
        <MenuItem
          icon={CalendarPlus}
          label="Ny booking"
          tintHsl={tints.booking}
          onClick={() => {
            setOpen(false);
            onNewBooking();
          }}
        />
        <MenuItem
          icon={ShoppingCartSimple}
          label="Ny ordre"
          tintHsl={tints.order}
          onClick={() => {
            setOpen(false);
            onNewOrder();
          }}
        />
      </div>
    </div>
  );
}
