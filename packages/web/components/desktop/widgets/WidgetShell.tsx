'use client';

import { Rnd } from 'react-rnd';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import { useWidgets } from '@/store/widgets';
import type { WidgetId, WidgetTone, WidgetState } from '@/store/widgets';
import { EASE_POP } from '@/lib/ui/motion';

const toneCls = (tone: WidgetTone | undefined, dragging: boolean) =>
  tone === 'primary'
    ? dragging
      ? 'bg-white/60 backdrop-blur-sm'
      : 'bg-white/70 backdrop-blur-2xl'
    : dragging
    ? 'bg-white/45 backdrop-blur-sm'
    : 'bg-white/55 backdrop-blur-lg';

export default React.memo(function WidgetShell({
  id,
  title,
  children,
  tone: toneProp,
}: {
  id: WidgetId;
  title: string;
  children: React.ReactNode;
  tone?: WidgetTone;
}) {
  const { widgets, setPos, setMinimized, reset, snap } = useWidgets();
  const w = widgets[id];

  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  const throttledSetPos = useCallback(
    (pos: Partial<Pick<WidgetState, 'x' | 'y' | 'w' | 'h'>>) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setPos(id, pos);
        rafRef.current = null;
      });
    },
    [id, setPos, rafRef]
  );

  const showGrid = useCallback(() => window.dispatchEvent(new CustomEvent('widget-grid:show')), []);
  const hideGrid = useCallback(() => window.dispatchEvent(new CustomEvent('widget-grid:hide')), []);

  if (!mounted || !w?.visible) return null;

  const tone = toneProp ?? w.tone ?? 'secondary';
  const snapVal = (v: number) => Math.round(v / snap) * snap;

  return (
    <>
      <Rnd
        bounds="window"
        dragGrid={[snap, snap]}
        resizeGrid={[snap, snap]}
        position={{ x: w.x, y: w.y }}
        size={{ width: w.w, height: w.h }}
        minWidth={280}
        minHeight={w.minimized ? 40 : 180}
        dragHandleClassName="widget-handle"
        enableUserSelectHack={false}
        style={{
          zIndex: 15,
          transform: 'translateZ(0)',
          willChange: 'transform',
          transition: isDragging ? 'none' : 'transform 0.18s ease-out',
        }}
        onDragStart={() => {
          setIsDragging(true);
          showGrid();
          document.body.style.pointerEvents = 'none';
        }}
        onDrag={(e, d) => throttledSetPos({ x: d.x, y: d.y })}
        onDragStop={(e, d) => {
          setIsDragging(false);
          hideGrid();
          document.body.style.pointerEvents = '';
          setPos(id, { x: snapVal(d.x), y: snapVal(d.y) });
        }}
        onResizeStart={() => {
          setIsDragging(true);
          showGrid();
        }}
        onResize={(e, dir, ref, delta, pos) => {
          throttledSetPos({
            w: snapVal(ref.offsetWidth),
            h: snapVal(ref.offsetHeight),
            x: snapVal(pos.x),
            y: snapVal(pos.y),
          });
        }}
        onResizeStop={(e, dir, ref, delta, pos) => {
          setIsDragging(false);
          hideGrid();
          setPos(id, {
            w: snapVal(ref.offsetWidth),
            h: snapVal(ref.offsetHeight),
            x: snapVal(pos.x),
            y: snapVal(pos.y),
          });
        }}
      >
        <div
          className={cn(
            'desk-widget relative h-full w-full rounded-2xl border',
            toneCls(tone, isDragging),
            'border-white/50 ring-1 ring-white/50',
            'shadow-[0_12px_40px_rgba(0,0,0,.08)]',
            !isDragging &&
              'hover:scale-[1.01] hover:-translate-y-[1px] transition-transform duration-150'
          )}
          style={{
            willChange: 'transform',
            transform: 'translateZ(0)',
            transition: isDragging ? 'none' : undefined,
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setCtx({ x: e.clientX, y: e.clientY });
          }}
        >
          {/* Titlebar */}
          <div
            className={cn(
              'widget-handle select-none cursor-move flex items-center justify-between px-3 py-2',
              'border-b border-white/50 bg-white/30 rounded-t-2xl'
            )}
            onDoubleClick={() => setMinimized(id)}
          >
            <div className="relative">
              <div className="text-[13px] font-semibold text-zinc-800">{title}</div>
              <div className="absolute inset-x-0 top-[18px] h-[1.25px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
            </div>
            {w.minimized && (
              <div className="text-[11px] text-zinc-500">Double-click to restore</div>
            )}
          </div>

          {/* Body */}
          <div
            className={cn(
              'transition-[height,opacity] duration-200 p-3 overflow-auto',
              w.minimized
                ? 'h-[0px] opacity-0 pointer-events-none'
                : 'h-[calc(100%-40px)] opacity-100'
            )}
            style={{
              transitionTimingFunction: EASE_POP,
              pointerEvents: isDragging ? 'none' : undefined,
              userSelect: isDragging ? 'none' : undefined,
            }}
          >
            {children}
          </div>
        </div>
      </Rnd>

      {/* Context menu */}
      {ctx && (
        <div
          className="fixed z-[9999] rounded-xl border border-white/60 bg-white/80 backdrop-blur-lg shadow-lg text-[13px] min-w-[160px]"
          style={{ left: ctx.x, top: ctx.y }}
          onMouseLeave={() => setCtx(null)}
        >
          <button
            className="block w-full text-left px-3 py-2 hover:bg-white/70"
            onClick={() => {
              setMinimized(id, true);
              setCtx(null);
            }}
          >
            Minimize
          </button>
          <button
            className="block w-full text-left px-3 py-2 hover:bg-white/70"
            onClick={() => {
              reset(id);
              setCtx(null);
            }}
          >
            Reset position
          </button>
          <button
            className="block w-full text-left px-3 py-2 hover:bg-white/70 text-rose-600"
            onClick={() => {
              useWidgets.getState().toggle(id, false);
              setCtx(null);
            }}
          >
            Hide
          </button>
        </div>
      )}
    </>
  );
});
