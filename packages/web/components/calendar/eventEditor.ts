// src/components/calendar/eventEditor.ts
export type EventEditorOpenOptions = {
  focus?: 'customer' | 'title' | 'none';
};

let __lastOpen = { id: null as string | null, t: 0 };

export function openEventEditor(eventId: string, opts?: EventEditorOpenOptions) {
  const now = Date.now();
  if (__lastOpen.id === eventId && now - __lastOpen.t < 300) return; // guard duplicate
  __lastOpen = { id: eventId, t: now };
  window.dispatchEvent(new CustomEvent('clarity:openEventEditor', { detail: { eventId, opts } }));
}

export function closeEventEditor() {
  window.dispatchEvent(new CustomEvent('clarity:closeEventEditor'));
}

export function subscribeEditorOpen(
  onOpen: (eventId: string, opts?: EventEditorOpenOptions) => void,
  onClose?: () => void
): () => void {
  const handler = (e: Event) => {
    const ce = e as CustomEvent<{ eventId: string; opts?: EventEditorOpenOptions }>;
    onOpen(ce.detail.eventId, ce.detail.opts);
  };
  const closeHandler = () => onClose?.();
  window.addEventListener('clarity:openEventEditor', handler as EventListener);
  window.addEventListener('clarity:closeEventEditor', closeHandler);
  return () => {
    window.removeEventListener('clarity:openEventEditor', handler as EventListener);
    window.removeEventListener('clarity:closeEventEditor', closeHandler);
  };
}
