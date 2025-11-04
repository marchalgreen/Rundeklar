// src/components/calendar/MoveConfirm.tsx
'use client';

import * as React from 'react';
import { useCalendar, focusRestoreAnchor } from '@/store/calendar';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export default function MoveConfirm() {
  const pending = useCalendar((s) => s.pendingMove);
  const staff = useCalendar((s) => s.staff);
  const events = useCalendar((s) => s.events);
  const confirm = useCalendar((s) => s.confirmPendingMove);

  const open = !!pending;
  const ev = pending ? events[pending.eventId] : undefined;

  const wasOpenRef = React.useRef(open);
  React.useEffect(() => {
    const prev = wasOpenRef.current;
    wasOpenRef.current = open;
    if (open && !prev) {
      const state = useCalendar.getState();
      if (!state.focusAnchor) {
        const active = document.activeElement as HTMLElement | null;
        state.setFocusAnchor(active);
      }
    } else if (!open && prev) {
      focusRestoreAnchor();
    }
  }, [open]);

  const fromStaff = pending ? staff[pending.fromStaffId] : undefined;
  const toStaff = pending ? staff[pending.toStaffId] : undefined;

  const title = ev?.title || 'Aftale';
  const oldTime = pending ? fmtRange(pending.originalStartISO, pending.originalEndISO) : '';
  const newTime = pending ? fmtRange(pending.newStartISO, pending.newEndISO) : '';

  return (
    <AlertDialog open={open} onOpenChange={(v) => (!v ? confirm(false) : undefined)}>
      <AlertDialogContent className="bg-white/85 backdrop-blur-md border border-hair rounded-xl shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Flyt aftale?</AlertDialogTitle>
          <AlertDialogDescription>
            Bekræft at du vil flytte denne aftale mellem medarbejdere.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* WHAT */}
        <div className="mt-2 mb-3 rounded-md border border-hair/60 bg-white/70 p-3">
          <div className="text-[12px] font-medium text-zinc-500">Aftale</div>
          <div className="text-sm font-semibold">{title}</div>
        </div>

        {/* WHO */}
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-hair/60 bg-white/70 p-3">
            <div className="text-[12px] font-medium text-zinc-500">Fra</div>
            <div className="text-sm">
              {fromStaff ? (
                <>
                  <span className="font-medium">{fromStaff.name}</span>{' '}
                  <span className="text-zinc-500">• {cap(fromStaff.role)}</span>
                </>
              ) : (
                '—'
              )}
            </div>
          </div>
          <div className="rounded-md border border-hair/60 bg-white/70 p-3">
            <div className="text-[12px] font-medium text-zinc-500">Til</div>
            <div className="text-sm">
              {toStaff ? (
                <>
                  <span className="font-medium">{toStaff.name}</span>{' '}
                  <span className="text-zinc-500">• {cap(toStaff.role)}</span>
                </>
              ) : (
                '—'
              )}
            </div>
          </div>
        </div>

        {/* WHEN */}
        <div className="mb-2 rounded-md border border-hair/60 bg-white/70 p-3">
          <div className="text-[12px] font-medium text-zinc-500 mb-1">Tid</div>
          <div className="text-sm">
            <div className="line-through text-zinc-500">{oldTime || '—'}</div>
            <div>
              → <span className="font-medium">{newTime || '—'}</span>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="gap-2 sm:justify-end">
          <Button variant="ghost" className="tahoe-ghost" onClick={() => confirm(false)}>
            Annuller
          </Button>
          <Button onClick={() => confirm(true)}>Flyt aftale</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function fmtRange(a: string, b: string) {
  const s = new Date(a),
    e = new Date(b);
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${fmt(s)}–${fmt(e)}`;
}
