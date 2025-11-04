// src/lib/hotkeys.ts
'use client';

export const isMac = () =>
  typeof navigator !== 'undefined' &&
  navigator.platform &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform);

export const isMod = (e: KeyboardEvent) => (isMac() ? e.metaKey : e.ctrlKey);

export const isEditingElement = (el: EventTarget | null): boolean => {
  if (!(el instanceof Element)) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  const role = el.getAttribute('role');
  if (role && /textbox|combobox|searchbox|spinbutton/.test(role)) return true;
  return !!el.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"]');
};

export type Direction = 'left' | 'right' | 'up' | 'down';

export type HotkeyAction =
  | { type: 'cycleFocus' } // Mod + `
  | { type: 'closeFocused' } // Mod + Shift + X
  | { type: 'toggleMinimizeFocused' } // Mod + M
  | { type: 'minimizeFocused' } // Esc OR Mod + ↓
  | { type: 'maximizeFocused' } // Mod + ↑
  | { type: 'snapFocused'; dir: Exclude<Direction, 'up' | 'down'> }; // Mod + ←/→

export function matchHotkey(e: KeyboardEvent): HotkeyAction | null {
  if (isEditingElement(e.target)) return null;

  // Esc => minimize
  if (e.key === 'Escape' && !e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    return { type: 'minimizeFocused' };
  }

  if (isMod(e)) {
    // Mod + `
    if (!e.shiftKey && !e.altKey && (e.key === '`' || e.key === '~')) {
      return { type: 'cycleFocus' };
    }
    // Mod + M
    if (!e.shiftKey && !e.altKey && (e.key === 'm' || e.key === 'M')) {
      return { type: 'toggleMinimizeFocused' };
    }
    // Mod + Shift + X → Close (browser-safe)
    if (e.shiftKey && !e.altKey && (e.key === 'x' || e.key === 'X')) {
      return { type: 'closeFocused' };
    }
    // Mod + Arrows
    if (!e.shiftKey && !e.altKey) {
      if (e.key === 'ArrowLeft') return { type: 'snapFocused', dir: 'left' };
      if (e.key === 'ArrowRight') return { type: 'snapFocused', dir: 'right' };
      if (e.key === 'ArrowUp') return { type: 'maximizeFocused' };
      if (e.key === 'ArrowDown') return { type: 'minimizeFocused' };
    }
  }
  return null;
}
