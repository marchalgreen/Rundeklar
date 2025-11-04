# ADR-G1 — Grid Library Choice for Varelager

**Date:** 2025-10-14  
**Status:** Accepted  
**Epic:** [EPIC-Varelager](../epics/EPIC-varelager.md)

## Context

The Varelager (Inventory) module needs a performant, feature-rich data grid for thousands of items.

**Requirements**

- React/TypeScript compatible (Next.js App Router, client components)
- Virtual scrolling for large datasets
- Editable cells and column resize/reorder
- Works visually within our macOS/Tahoe design system (Tailwind v4 tokens + shadcn/ui)
- Open-source license compatible with commercial use

## Options Considered

1. **TanStack Table + TanStack Virtual**
   - ✅ Headless, fully typed
   - ✅ Easy styling integration (DOM-based)
   - ❌ More setup to reach spreadsheet feel
   - ❌ Needs extra code for cell editing/keyboard nav

2. **Glide Data Grid**
   - ✅ Canvas-based; extremely fast for 10k+ rows
   - ✅ Built-in column resize, reorder, editing, keyboard navigation
   - ✅ MIT license (commercial safe)
   - ⚠️ Needs wrapper for SSR (`dynamic(() => import(), { ssr: false })`)
   - ⚠️ Theming limited to header/toolbars (cells drawn on canvas)

## Decision

Use **Glide Data Grid** for the first implementation.

**Rationale**

- Spreadsheet-level UX immediately
- Zero licensing risk
- Integrates well with our window system (rendered inside `InventoryWindow`)
- Headless enough to keep Tailwind tokens in toolbar/filter UI

**Consequences**

- Canvas-rendered cells don’t inherit Tailwind font tokens directly; we theme via Grid props.
- If accessibility or styling limits appear, fallback to TanStack Table + Virtual is feasible.
- Import grid client-side only:
  ```ts
  const DataEditor = dynamic(() => import('@glideapps/glide-data-grid').then((m) => m.default), {
    ssr: false,
  });
  ```

## Status Update (2025-10-15)

- Integrated **Glide Data Grid** with header sorting, +/- keyboard adjusts, column visibility, and persisted view state.
- Toolbar refactor prevents overlap; actions moved into compact groups with overflow.
- Performance validated on ~120 rows mock; next: test 1k+ rows in M7.
