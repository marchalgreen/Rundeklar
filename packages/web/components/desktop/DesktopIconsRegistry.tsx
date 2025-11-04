'use client';

import React, { useEffect, useRef, useState, memo } from 'react';
import { Rnd } from 'react-rnd';
import { useIcons } from '@/store/icons';
import { useDesktop } from '@/store/desktop';
import { useUI } from '@/store/ui';
import { cn } from '@/lib/utils/cn';
import DesktopIcon, { type DesktopIconAction } from '@/components/desktop/DesktopIcon';
import type { IconId } from '@/store/icons';
import type { LucideIcon } from 'lucide-react';
import { User, FileText, Package, Keyboard, Plus } from 'lucide-react';

const TYPE_COLORS = {
  kundekort: '#10b981', // emerald
  logbog: '#7c3aed', // violet
  varer: '#f59e0b', // amber
  genveje: '#64748b', // slate
} as const;

type Cfg = {
  id: IconId;
  label: string;
  Icon: LucideIcon;
  tint: string;
  open: () => void;
  actions?: DesktopIconAction[];
  peekContent?: React.ReactNode;
  badge?: number;
  shortcut?: string;
  progress?: number;
};

type DraggableProps = {
  cfg: Cfg;
  x: number;
  y: number;
  visible: boolean;
  snap: number;
  setPos: (id: IconId, pos: { x: number; y: number }) => void;
  throttledSetPos: (id: IconId, pos: { x: number; y: number }) => void;
};

const IconDraggable = memo(function IconDraggable({
  cfg,
  x,
  y,
  visible,
  snap,
  setPos,
  throttledSetPos,
}: DraggableProps) {
  const [isDragging, setIsDragging] = useState(false);
  if (!visible) return null;

  return (
    <Rnd
      key={cfg.id}
      bounds="window"
      dragGrid={[snap, snap]}
      resizeGrid={[snap, snap]}
      enableResizing={false}
      position={{ x, y }}
      size={{ width: 110, height: 124 }}
      onDragStart={() => {
        setIsDragging(true);
        document.body.style.pointerEvents = 'none';
      }}
      onDrag={(e, d) => throttledSetPos(cfg.id, { x: d.x, y: d.y })}
      onDragStop={(e, d) => {
        setIsDragging(false);
        document.body.style.pointerEvents = '';
        setPos(cfg.id, {
          x: Math.round(d.x / snap) * snap,
          y: Math.round(d.y / snap) * snap,
        });
      }}
      style={{
        zIndex: 11,
        transform: 'translateZ(0)',
        willChange: 'transform',
        transition: isDragging ? 'none' : 'transform 0.18s ease-out',
      }}
      className={cn('absolute')}
    >
      <div className={cn(isDragging && 'pointer-events-none')}>
        <DesktopIcon
          id={`icon-${cfg.id}`}
          label={cfg.label}
          Icon={cfg.Icon}
          tint={cfg.tint}
          badgeCount={cfg.badge}
          progress={cfg.progress}
          shortcutHint={cfg.shortcut}
          actions={cfg.actions}
          peekContent={cfg.peekContent}
          onOpen={cfg.open}
        />
      </div>
    </Rnd>
  );
});

export default function DesktopIconsRegistry() {
  const { icons, setPos: setIconPos, snap } = useIcons();
  const { open } = useDesktop();
  const { openSearch } = useUI();

  // SSR/hydration guard + hooks (order must be stable)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // perf helpers (raf throttle) — must be declared before any early return
  const rafRef = useRef<number | null>(null);
  const throttledSetPos = (id: IconId, pos: { x: number; y: number }) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setIconPos(id, pos);
      rafRef.current = null;
    });
  };
  if (!mounted) return null;

  // icon config (stable in render)
  const list: Cfg[] = [
    {
      id: 'kundekort',
      label: 'Kundekort',
      Icon: User,
      tint: TYPE_COLORS.kundekort,
      open: () => openSearch(),
      actions: [
        {
          id: 'new',
          label: 'Ny',
          icon: <Plus className="h-3.5 w-3.5" />,
          onClick: () => openSearch(),
        },
      ],
      peekContent: (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Seneste</div>
          <ul className="space-y-1">
            <li>Camilla Madsen</li>
            <li>Henrik Sørensen</li>
            <li>Peter Poulsen</li>
          </ul>
        </div>
      ),
      badge: 3,
      shortcut: '⌘1',
    },
    {
      id: 'logbog',
      label: 'Logbog',
      Icon: FileText,
      tint: TYPE_COLORS.logbog,
      open: () => open({ type: 'logbook', title: 'Logbog', payload: {} }),
      actions: [
        {
          id: 'new',
          label: 'Nyt notat',
          onClick: () =>
            open({ type: 'logbook', title: 'Logbog', payload: { intent: 'newEntry' } }),
        },
      ],
      peekContent: <div>Seneste notater…</div>,
      shortcut: '⌘2',
    },
    {
      id: 'varer',
      label: 'Varer',
      Icon: Package,
      tint: TYPE_COLORS.varer,
      open: () => open({ type: 'inventory', title: 'Varer', payload: {} }),
      peekContent: <div>Lav beholdning: 6 varer</div>,
      progress: 0.38,
      shortcut: '⌘3',
    },
    {
      id: 'genveje',
      label: 'Genveje',
      Icon: Keyboard,
      tint: TYPE_COLORS.genveje,
      open: () => open({ type: 'hotkeys', title: 'Keyboard Shortcuts', payload: {} }),
      shortcut: '⌘4',
    },
  ];

  return (
    <>
      {list.map((cfg) => {
        const s = icons[cfg.id];
        if (!s) return null;
        return (
          <IconDraggable
            key={cfg.id}
            cfg={cfg}
            x={s.x}
            y={s.y}
            visible={s.visible}
            snap={snap}
            setPos={setIconPos}
            throttledSetPos={throttledSetPos}
          />
        );
      })}
    </>
  );
}
