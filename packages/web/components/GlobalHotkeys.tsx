'use client';

import { useEffect } from 'react';
import { useDesktop } from '@/store/desktop';
import { matchHotkey } from '@/lib/hotkeys';

export default function GlobalHotkeys() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const action = matchHotkey(e);
      if (!action) return;

      e.preventDefault();
      e.stopPropagation();

      const s = useDesktop.getState();
      const id = s.getFocusedId?.();
      if (!id) return;

      switch (action.type) {
        case 'cycleFocus':
          s.cycleFocus?.(1);
          break;
        case 'closeFocused':
          s.close?.(id);
          break;
        case 'toggleMinimizeFocused':
          s.toggleMinimize?.(id);
          break;
        case 'minimizeFocused':
          s.minimize?.(id);
          break;
        case 'maximizeFocused':
          s.toggleMaximize?.(id);
          break;
        // snapFocused intentionally omitted for now per your request
      }
    };

    const listenerOptions: AddEventListenerOptions = { capture: true };
    window.addEventListener('keydown', onKeyDown, listenerOptions);
    document.addEventListener('keydown', onKeyDown, listenerOptions);
    return () => {
      window.removeEventListener('keydown', onKeyDown, listenerOptions);
      document.removeEventListener('keydown', onKeyDown, listenerOptions);
    };
  }, []);

  return null;
}
