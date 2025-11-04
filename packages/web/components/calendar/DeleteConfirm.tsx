'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useCalendar, focusRestoreAnchor } from '@/store/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type DeleteState = {
  open: boolean;
  eventId?: string;
  openFor: (id: string) => void;
  close: () => void;
};

const useDeleteState = create<DeleteState>((set) => ({
  open: false,
  eventId: undefined,
  openFor: (id) => set({ open: true, eventId: id }),
  close: () => set({ open: false, eventId: undefined }),
}));

export function openDeleteConfirm(id: string) {
  const active = document.activeElement as HTMLElement | null;
  useCalendar.getState().setFocusAnchor(active);
  useDeleteState.getState().openFor(id);
}

export default function DeleteConfirm() {
  const { open, eventId, close } = useDeleteState();
  const { remove, setSelection, events } = useCalendar();

  const wasOpenRef = useRef(open);
  useEffect(() => {
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

  const title = eventId && events[eventId]?.title ? events[eventId].title : 'Ny aftale';

  const onConfirm = async () => {
    if (!eventId) return;
    await remove(eventId);
    setSelection(undefined);
    close();
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => (!v ? close() : undefined)}>
      <AlertDialogContent className="bg-white/85 backdrop-blur-md border border-hair rounded-xl shadow-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Slet aftale?</AlertDialogTitle>
          <AlertDialogDescription>
            {title} — denne handling kan ikke fortrydes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="tahoe-ghost">Annuller</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" onClick={onConfirm}>
              Slet
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
