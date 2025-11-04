'use client';

import { useEffect, useRef, ComponentType } from 'react';
import { useCalendar, focusRestoreAnchor } from '@/store/calendar';
import CalendarToolbar from './CalendarToolbar';
import CalendarGrid from './CalendarGrid'; // Dag
import WeekGrid from './WeekGrid'; // Uge
import MonthGrid from './MonthGrid'; // Måned
import MiniSidebar from './MiniSidebar';
import EventInspector from './EventInspector';
import { ContextMenuProvider } from './ContextMenu';
import DeleteConfirm, { openDeleteConfirm } from './DeleteConfirm';
import MoveConfirm from './MoveConfirm';
import EventDetailsDialog from './EventDetailsDialog';
import { openEventEditor } from './eventEditor';

function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName?.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    t.isContentEditable ||
    (!!t.closest && !!t.closest('input,textarea,[contenteditable="true"]'))
  );
}

export default function CalendarWindow() {
  const { init, view, dateISO, setSelection } = useCalendar();
  const scrollRef = useRef<HTMLDivElement>(null!);

  // Initial data load
  useEffect(() => {
    init();
  }, [init]);

  // Keep main scroller sensible when switching view or jumping date
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollTo({ top: 0 });
  }, [view, dateISO]);

  // Global hotkeys (not when typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) {
        // Allow browser/system combos
        return;
      }

      const state = useCalendar.getState();

      // Delete selection
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const id = state.selection?.eventId;
        if (!id) return;
        e.preventDefault();
        openDeleteConfirm(id);
        return;
      }

      // Navigation applies only in day/week views
      if (state.view === 'day' || state.view === 'week') {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            state.moveUp();
            return;
          case 'ArrowDown':
            e.preventDefault();
            state.moveDown();
            return;
          case 'ArrowLeft':
            e.preventDefault();
            state.moveLeft();
            return;
          case 'ArrowRight':
            e.preventDefault();
            state.moveRight();
            return;
          case 'Home':
            e.preventDefault();
            state.home();
            return;
          case 'End':
            e.preventDefault();
            state.end();
            return;
          case 'PageUp':
            e.preventDefault();
            state.pagePrev();
            return;
          case 'PageDown':
            e.preventDefault();
            state.pageNext();
            return;
          default:
            break;
        }
      }

      // Enter => open editor on selected event
      if (e.key === 'Enter') {
        const id = state.selection?.eventId;
        if (!id) return;
        e.preventDefault();
        openEventEditor(id);
        return;
      }

      if (e.key === 'Escape') {
        const sel = state.selection;
        if (sel?.eventId || sel?.range) {
          e.preventDefault();
          setSelection(undefined);
          return;
        }
        if (state.focusedSlot) {
          e.preventDefault();
          state.focusClear();
          focusRestoreAnchor();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSelection]);

  // Pick content component without nested ternaries
  const Content: ComponentType<{ scrollRef: typeof scrollRef }> =
    view === 'week' ? WeekGrid : view === 'month' ? MonthGrid : CalendarGrid;

  return (
    <ContextMenuProvider>
      <div className="flex h-full w-full flex-col overflow-hidden bg-paper">
        {/* Top toolbar */}
        <CalendarToolbar />

        <div
          className="grid flex-1 overflow-hidden"
          style={{ gridTemplateColumns: '280px 1fr 320px' }}
        >
          {/* Venstre sidepanel */}
          <aside className="border-r border-hair bg-paper/85 backdrop-blur overflow-auto">
            <MiniSidebar />
          </aside>

          {/* Hovedområde – skemaer tegnes under scrollbar-gut */}
          <main
            ref={scrollRef}
            className="relative overflow-auto bg-paper bg-grid bg-grid-halves bg-grid-lines"
          >
            <Content scrollRef={scrollRef} />
          </main>

          {/* Højre inspektør */}
          <aside className="border-l border-hair bg-paper/85 backdrop-blur overflow-auto">
            <EventInspector />
          </aside>
        </div>
      </div>

      {/* Globale dialoger */}
      <DeleteConfirm />
      <MoveConfirm />
      <EventDetailsDialog />
    </ContextMenuProvider>
  );
}
