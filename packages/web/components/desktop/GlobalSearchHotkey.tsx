'use client';

import { useEffect } from 'react';
import { useUI } from '@/store/ui';

// Guards so we don't hijack normal typing
function isEditable(el: Element | null) {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName?.toLowerCase();
  return (
    (el as HTMLElement).isContentEditable ||
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select'
  );
}

export default function GlobalSearchHotkey() {
  const { openSearch, toggleSearch } = useUI();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (isEditable(el)) return;

      // "/" opens kundekort search quickly
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        openSearch();
        return;
      }
      // Cmd/Ctrl+K toggles overlay
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSearch, toggleSearch]);

  return null;
}
