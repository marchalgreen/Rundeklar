---
epic: Varelager (Inventory) — Platform v2.5.1 → v2.6.1
owner: Core Team (Clairity)
status: active
lastUpdated: 2025-10-28
---

## Purpose

Evolve the Inventory workspace into a complete **Inventory Platform** for optometry teams: reliable stock data, rich product context, fast purchasing, cross-store visibility, and catalog insight — while staying consistent with the macOS/Tahoe design system and engineering guardrails.

## Product intent

**Staff (opticians/retail)**

- Find any item instantly (scan/search).
- Adjust quantities with reasons + undo; print labels; copy barcodes.
- Add to Purchase Requests when low.
- In network views, request stock from partner stores.
- In catalog views, inspect variants and add to PR.

**Owners / managers**

- Trust numbers (movements = source of truth).
- See what needs attention (critical/low/aging).
- Reorder cleanly (PR drafts → export/email → received).
- Compare partner availability and supplier coverage.

## Scope (in)

- Inventory core (Overview Grid, Item Detail, Movements, PR).
- Saved Views + Faceted Filters (persisted).
- Owner Dashboard (ring, KPIs, trend, top brands; click-to-filter).
- Multi-source views (Store / Network / Catalog / All) + unified search.
- Catalog variant expansion + linkage badges.
- Partner breakdown drawer + transfer request flow (mock).
- Visual Harmony & a11y parity (focus rings, reduced motion).

## Scope (out)

- Real supplier PO API (preview in v2.6; full v2.7+).
- Multi-region reconciliation logic.
- Realtime external sync (phase 2).

## What shipped

- **v2.5 / v2.5.1**

  - Status pills (På lager / Lav / Udsolgt).
  - Product sync badges (✓ Bekræftet / 〰 Manuel / ⚠ Ikke linket).
  - Dashboard 1.0 + click-to-filter; token-driven colors; Danish tooltips.
  - Facet sidebar foundation, Saved Views (seeded presets).
  - Import normalization; state migrations hardened; keyboard parity.

- **v2.6 — Inventory Networks**

  - Source mode: **Store / Network / Catalog / All** (persisted).
  - Network mock store and merged “All” dataset with **Kilde** column.
  - Unified fuzzy search across sources; legend chips for per-source toggles.
  - Source color tokens and toolbar legend.

- **v2.6.1 — Network & Catalog deepening**
  - **Partner Breakdown Drawer** with per-store qty + updatedAt; **Send Request** modal.
  - **Catalog Variant Matrix** (sizes/colors/coatings), **linkage badges**, context menu actions  
    (Add to PR / Open in Vendor Catalog / See Variants).
  - Visual polish for network & catalog rows; calm motion (120–160ms).

## Features (canonical list)

1. Overview Grid with Product cell (thumb + sync badge) and Brand column.
2. Item Detail tabs: Overview · Variants · Movements · Suppliers · Notes.
3. Purchase Requests: draft → CSV/email → mark received → Movements.
4. Faceted Filters & Saved Views (persisted).
5. Owner Dashboard: ring with counts/% · KPI cards · 30-day trend · Top brands · click-to-filter.
6. Source modes: Store / Network / Catalog / All; **Kilde** column in All.
7. Unified search across sources; legend chips to toggle sources.
8. Partner Breakdown Drawer + Transfer Request dialog (mock).
9. Catalog Variant Matrix + linkage badges + context actions.
10. A11y & performance: visible focus rings, keyboard parity, smooth 10k-row scroll.

## Acceptance criteria

- Grid renders status pills, product cell thumbnails, and sync badges with localized tooltips.
- Facets apply instantly; saved views persist and include seeded presets.
- Item Detail shows photo rail and Supplier link CTA; Movements supports undo.
- PR flow exports CSV/email and “Mark received” posts movements.
- Dashboard ring, KPIs, trend, top brands work and **apply filters on click**.
- Source mode segmented control persists; **All** merges datasets and shows **Kilde**.
- Unified search covers Store/Network/Catalog; per-source legend chips filter results.
- Partner drawer opens on Network row; **Send Request** opens modal and enqueues mock request; success toast.
- Catalog rows expand to Variant Matrix; linkage badges show correct tone; context menu actions work.
- A11y: keyboardable controls; `.ring-focus` visible; respects `prefers-reduced-motion`.
- Performance: 60 fps scroll at 10k rows; cross-source search < 250 ms.

## Milestones

- **M8** — Item Detail & Movements foundation ✅
- **M9** — Variants Matrix ✅
- **M10** — Purchase Requests ✅
- **M11** — Filters & Saved Views ✅
- **M12** — Owner Dashboard + click-to-filter ✅
- **M13** — Source Mode foundations ✅
- **M14** — Network store integration ✅
- **M15** — Unified dataset & cross-search 🟡
- **M17** — Partner drawer + transfer request ✅
- **M18** — Catalog variant matrix + linkage badges 🟡

## UX / Design language

- macOS/Tahoe glass, soft shadows; motion 120–200 ms (cubic-bezier(.2,.8,.2,1)).
- Tailwind v4 **tokens only** (`hsl(var(--token))`), shadcn/ui primitives [oai_citation:4‡design-tokens.md](file-service://file-U7rG2GXkNgLzmEpv6WZp7d).
- Source and service hues: `--source-store`, `--source-network`, `--source-catalog`, `--accent-blue`, plus `--svc-*`.
- Accessibility: visible focus rings via `.ring-focus`; keyboard parity [oai_citation:5‡guards.md](file-service://file-KBxuDcbMuB8WBW3DBMAZdD).

## Foundation in code (pointers)

- Window: `src/components/windows/InventoryWindow.tsx`
- Toolbar/commands & context menus: `src/components/inventory/**`
- State: `src/store/inventory.ts`, `src/store/catalogLink.ts`, `src/store/networkInventory.ts`
- Catalog mapping: `src/lib/catalog/toInventoryRows.ts`
- Fuzzy search: `src/lib/fuseSearch.ts`
- Demo data: `src/lib/mock/inventory.demo.json`

## Success metrics

- Locate & act on any item < **3 s**.
- 60 fps scroll at **10k rows**.
- Cross-source search response < **250 ms**.
- ≥ **80%** first-session users adopt a seeded view.
- Owners identify stock health at a glance from Dashboard.

## Risks & mitigations

- **Search perf** degradation → index per source, merge results.
- **State drift** on reload → versioned migrations + safe defaults.
- **Token drift** across grid/charts → centralize palette reader; enforce tokens.
- **Link rot** for routes → CI link checks (see Validation).

## Validation

- **Build gates:** `pnpm run validate` (tsc+eslint) → `pnpm build` [oai_citation:6‡project-context.md](file-service://file-FYUc62CEbDJ5JdTM2MpHxk) [oai_citation:7‡workflow-playbook.md](file-service://file-6Cx76VcS4B4bNXpKCeHqGF).
- **Manual smoke:** open **/docs**, Inventory window, Dashboard; test click-to-filter; Network row → drawer → request.
- **A11y:** tab through controls; focus ring visible; reduced-motion respected [oai_citation:8‡guards.md](file-service://file-KBxuDcbMuB8WBW3DBMAZdD) [oai_citation:9‡design-tokens.md](file-service://file-U7rG2GXkNgLzmEpv6WZp7d).
- **Link check:** verify internal `/docs/**` and API routes exist (script below).

## Rollout & rollback

- Branch per playbook: `feature/inventory-platform-v2_6` [oai_citation:10‡workflow-playbook.md](file-service://file-6Cx76VcS4B4bNXpKCeHqGF).
- Merge after green gates + smoke.
- Rollback: revert feature PR; no schema changes involved [oai_citation:11‡guards.md](file-service://file-KBxuDcbMuB8WBW3DBMAZdD).

## Appendix (traceability)

- Consolidated from:
  - `EPIC-varelager.md` (v2.5.1)
  - `Epic-varelger-2.6-inventory-network.md` (v2.6)
  - `EPIC: Varelager (Inventory) v2.6.1.md` (v2.6.1)
  - `inventory-module.md` (module reference)
