// src/components/desktop/DesktopIcon.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useSmartPosition } from '@/lib/ui/useSmartPosition';

export type DesktopIconAction = {
  id: string;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
};

export type DesktopIconProps = {
  id: string;
  label: string;
  Icon: LucideIcon;
  tint?: string;
  badgeCount?: number;
  progress?: number | null;
  shortcutHint?: string;
  actions?: DesktopIconAction[];
  peekContent?: React.ReactNode;
  onOpen?: () => void;
  onDropFiles?: (files: File[]) => void;
  onDropText?: (text: string) => void;
};

function hexToRGBA(hex?: string, a = 1) {
  if (!hex) return `rgba(0,0,0,${a})`;
  const m = hex.replace('#', '');
  const n = parseInt(
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m,
    16
  );
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

const EASE = 'cubic-bezier(.22,.7,.2,1)';

export default memo(function DesktopIcon({
  label,
  Icon,
  tint = '#64748b',
  badgeCount,
  progress = null,
  shortcutHint,
  actions = [],
  peekContent,
  onOpen,
  onDropFiles,
  onDropText,
}: DesktopIconProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tileRef = useRef<HTMLButtonElement | null>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const peekRef = useRef<HTMLDivElement | null>(null);

  const [hoverAlive, setHoverAlive] = useState(false);
  const [peekAlive, setPeekAlive] = useState(false);
  const leaveTimerRef = useRef<number | null>(null);
  const peekTimerRef = useRef<number | null>(null);

  const [dropOver, setDropOver] = useState(false);
  const acceptDrop = !!onDropFiles || !!onDropText;

  const tintBg = useMemo(() => hexToRGBA(tint, 0.12), [tint]);
  const tintRing = useMemo(() => hexToRGBA(tint, 0.28), [tint]);

  const keepHover = () => {
    if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
    setHoverAlive(true);
  };
  const scheduleHoverHide = () => {
    if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = window.setTimeout(() => setHoverAlive(false), 180);
  };

  const requestPeek = () => {
    if (!peekContent) return;
    if (peekTimerRef.current) window.clearTimeout(peekTimerRef.current);
    peekTimerRef.current = window.setTimeout(() => setPeekAlive(true), 550);
  };
  const cancelPeek = () => {
    if (peekTimerRef.current) window.clearTimeout(peekTimerRef.current);
    setPeekAlive(false);
  };

  useEffect(
    () => () => {
      if (leaveTimerRef.current) window.clearTimeout(leaveTimerRef.current);
      if (peekTimerRef.current) window.clearTimeout(peekTimerRef.current);
    },
    []
  );

  // Keyboard
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement !== el) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        onOpen?.();
      }
      if (e.key === ' ') {
        if (!peekContent) return;
        e.preventDefault();
        setPeekAlive((v) => !v);
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [onOpen, peekContent]);

  // DnD
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropOver(false);
    const dt = e.dataTransfer;
    if (dt?.files && dt.files.length && onDropFiles) {
      onDropFiles(Array.from(dt.files));
      return;
    }
    const text = dt?.getData('text/plain');
    if (text && onDropText) onDropText(text);
  };

  // Smart positions
  const actionPos = useSmartPosition(
    tileRef,
    actionRef,
    hoverAlive && actions.length > 0,
    false,
    6
  );
  const peekPos = useSmartPosition(tileRef, peekRef, peekAlive && !!peekContent, true, 6);

  // Animations
  useEffect(() => {
    const el = actionRef.current;
    if (!el || !(hoverAlive && actions.length > 0)) return;
    el.animate(
      [
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 160, easing: EASE, fill: 'both' }
    );
  }, [hoverAlive, actions.length]);

  useEffect(() => {
    const el = peekRef.current;
    if (!el || !peekAlive || !peekContent) return;
    el.animate(
      [
        { opacity: 0, transform: 'translateY(-4px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 160, easing: EASE, fill: 'both' }
    );
  }, [peekAlive, peekContent]);

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      aria-label={label}
      onMouseEnter={() => {
        keepHover();
        requestPeek();
      }}
      onMouseLeave={() => {
        scheduleHoverHide();
        cancelPeek();
      }}
      onDragOver={(e) => {
        if (acceptDrop) {
          e.preventDefault();
          setDropOver(true);
        }
      }}
      onDragLeave={() => setDropOver(false)}
      onDrop={handleDrop}
      className={cn(
        'desktop-icon group w-[110px] select-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-sky-400/70 rounded-2xl'
      )}
      style={{ transform: 'translateZ(0)' }}
    >
      {/* Icon Tile */}
      <button
        ref={tileRef}
        type="button"
        onClick={() => onOpen?.()}
        className={cn(
          'icon-tile relative w-full rounded-2xl border text-left',
          'bg-white/70 border-white/60 ring-1 ring-white/60',
          'shadow-[0_12px_28px_rgba(0,0,0,.08)]',
          'transition-all duration-150 will-change-transform',
          'hover:scale-[1.02] hover:-translate-y-[1px]'
        )}
      >
        {/* Gloss */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/70 to-transparent" />

        {/* Icon graphic */}
        <div className="flex flex-col items-center pt-4 pb-2">
          <div
            className="icon-badge relative grid h-14 w-14 place-items-center rounded-xl ring-1"
            style={{
              background: tintBg,
              borderColor: tintRing,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.75)',
            }}
          >
            <Icon className="icon-glyph h-6 w-6" style={{ color: tint }} />
            {typeof progress === 'number' && (
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 44 44">
                <circle
                  cx="22"
                  cy="22"
                  r="19"
                  stroke="rgba(0,0,0,.08)"
                  strokeWidth="2"
                  fill="none"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="19"
                  stroke={tint}
                  strokeWidth="2.5"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 19}
                  strokeDashoffset={2 * Math.PI * 19 * (1 - Math.max(0, Math.min(1, progress)))}
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>

          {/* Label */}
          <div className="icon-label mt-2 mb-1 text-[12px] text-center text-zinc-700 font-medium truncate max-w-[96px] mx-auto">
            {label}
          </div>
        </div>

        {/* Badge */}
        {typeof badgeCount === 'number' && badgeCount > 0 && (
          <div className="pointer-events-none absolute -right-1 -top-1 rounded-full bg-sky-600 text-white text-[11px] px-[6px] h-5 min-w-[20px] grid place-items-center shadow">
            {badgeCount > 99 ? '99+' : badgeCount}
          </div>
        )}

        {/* Shortcut hint */}
        {shortcutHint && (
          <div
            className={cn(
              'pointer-events-none absolute left-2 top-2 rounded-md border border-white/60 bg-white/70 px-1.5 py-0.5 text-[10px] text-zinc-600 shadow-sm',
              !hoverAlive && 'opacity-0'
            )}
          >
            {shortcutHint}
          </div>
        )}

        {/* Drop ring */}
        {acceptDrop && dropOver && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{ boxShadow: `0 0 0 2px ${tint}` }}
          />
        )}
      </button>

      {/* Hover Action Bar */}
      {hoverAlive &&
        actions.length > 0 &&
        actionRef &&
        createPortal(
          <div
            ref={actionRef}
            className="fixed z-[10000] rounded-xl border border-white/60 bg-white/92 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,.12)] px-2 py-1.5 flex items-center gap-1"
            style={{ top: actionPos.top, left: actionPos.left }}
            onMouseEnter={keepHover}
            onMouseLeave={scheduleHoverHide}
          >
            {actions.slice(0, 2).map((a) => (
              <button
                key={a.id}
                onClick={(e) => {
                  e.stopPropagation();
                  a.onClick();
                }}
                className="inline-flex items-center gap-1 rounded-md border border-white/60 bg-white px-3 py-1.5 text-[12px] text-zinc-700 hover:bg-zinc-50"
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>,
          document.body
        )}

      {/* Peek panel */}
      {peekAlive &&
        peekContent &&
        peekRef &&
        createPortal(
          <div
            ref={peekRef}
            className={cn(
              'fixed z-[10000] w-[260px]',
              'rounded-xl border bg-white/90 ring-1 ring-white/60 backdrop-blur-xl',
              'shadow-[0_24px_60px_rgba(0,0,0,.12)] p-3 text-[12px] text-zinc-700'
            )}
            style={{ top: peekPos.top, left: peekPos.left }}
            onMouseEnter={requestPeek}
            onMouseLeave={cancelPeek}
          >
            {peekContent}
          </div>,
          document.body
        )}
    </div>
  );
});
