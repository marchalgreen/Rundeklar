Inventory

Executive Summary
• The Inventory module is Clairity’s unified platform for managing stock, catalog data, purchasing, and supplier synchronization across optometry and retail stores.
• It delivers a fast, glass-based workspace with rich product context, reliable quantity tracking, and an analytics dashboard for owners and managers.
• Core capabilities include multi-source inventory views (store, partner, catalog), real-time adjustments with undo, purchase request flows, and dashboard insights on stock health and trends.
• This plan defines the Inventory module’s architecture, UI system, data flow, and extension points for future networked inventory and supplier automation.

⸻

1. Architecture Overview

1.1 Runtime & Framework
• Framework — Next.js 15 App Router with client-side windows running inside the Clairity Desktop.
• Language & Tooling — TypeScript 5 (strict), Tailwind v4, shadcn/ui primitives, Zustand for state management, Lucide + Phosphor icons for visuals.
• Data Layer — Prisma 6 (Postgres) modeling products, store stock, stock movements, vendor catalog items, and sync state.
• Design System — HSL token palette (e.g., --svc-check, --svc-repair, --accent-blue, --surface-2, --line) ensuring Tahoe visual parity.
• Architecture Style — Client-driven window system layered on shared backend API routes (/api/inventory, /api/catalog, /api/email/pr) and reusable libs under src/lib.

1.2 Module Layout

Path Purpose
src/components/windows/InventoryWindow.tsx Primary workspace window — tabs: Overview · Detail · Movements · Suppliers · Dashboard.
src/components/inventory/\*\* Composable UI: grid columns, toolbar controls, dialogs (Adjust, Labels, Import/Export, Link Catalog).
src/store/inventory.ts Zustand store for grid state, filters, and quantity updates with undo.
src/store/catalogLink.ts Manages relationships between local items and vendor catalog entries.
src/lib/catalog/toInventoryRows.ts Converts catalog products into normalized grid rows.
src/lib/analytics/inventory.ts Produces dashboard metrics (stock health, KPIs, brand trends).

⸻

2. Core Features

2.1 Overview Grid
• Built on Glide Data Grid for instant virtualization and 60 fps scrolling with 10 k + rows.
• Columns: product photo, brand/model, quantity, status pill (På lager / Lav / Udsolgt), and sync badge (✓ Linked · 〰 Manual · ⚠ Unlinked).
• Hover preview, column resizing, and persistent layout via local storage.
• Keyboard parity: Enter = open, Space = preview, ± = adjust quantity.

2.2 Filters & Saved Views
• Facet sidebar with filters for brand, model, size, category, color, and stock state.
• Saved views (e.g., Critical, Low Stock, Sunglasses, Unlinked) persisted between sessions.
• Immediate filter apply with local persistence.

2.3 Item Detail & Movements
• Tabbed panel with Overview · Variants · Movements · Suppliers · Notes.
• Photo rail, supplier link CTA, and movement timeline with undoable adjustments.
• Local state mirrors backend movements for smooth offline use.

2.4 Purchase Requests
• Draft → Export / Email → Mark Received workflow.
• CSV and email export handled by src/lib/export/prCsv.ts and the Resend API adapter.
• “Mark Received” automatically posts a new stock movement event.

2.5 Multi-Source Inventory
• Source modes switchable via toolbar segmented control:
• My Store – local stock (useInventory)
• Partner Stores – network stock (useNetworkInventory)
• Vendor Catalog – read-only supplier data (useCatalog)
• All – merged dataset with “Kilde” (source) column
• Source state persisted in local storage for consistency.

2.6 Owner Dashboard
• Visual analytics: stock health ring, KPI cards, 30-day trend line, top brands list.
• Click-to-filter integration — selecting ring segments or KPIs updates grid facets.
• All charts colored via service tokens (--svc-check, --svc-pickup, --svc-repair).

⸻

3. UX & Design System
   • Visual Language — macOS / Tahoe aesthetic: translucent glass surfaces, soft elevation, and neutral tone hairlines.
   • Interaction — 120–200 ms cubic-bezier(.2,.8,.2,1) motion; always respects prefers-reduced-motion.
   • Accessibility — Full keyboard navigation, focus rings (.ring-focus), labeled controls, and visible hover states.
   • Color System — All colors from tokens; no hard-coded hex values.
   • Layout — Responsive within window chrome; grids adapt to available width.

⸻

4. Data Flow & Persistence
   • State Management — Zustand slices for items, filters, and movements with undo buffer.
   • Data Sources — Prisma models accessed via Next API routes or mocked via local JSON for offline mode.
   • Vendor Links — useCatalogLink() synchronizes catalog IDs with inventory items.
   • Analytics — Computed client-side with safe fallbacks for disconnected mode.
   • Exports / Imports — CSV, XLSX, and demo JSON ingestion from src/lib/mock.

⸻

5. Integration Points

Integration Purpose
/api/inventory Retrieves stock rows with product metadata for UI hydration.
/api/email/pr Sends purchase request emails with CSV attachments.
/api/catalog/\* Reads vendor catalog and sync metadata.
src/lib/analytics/inventory.ts Shared analytics used by dashboard and backend reports.
src/store/catalogLink.ts Bridges catalog ↔ inventory data flow.

⸻

6. Analytics & Owner Insights
   • Health Ring — visual stock status (OK / Low / Empty).
   • KPI Cards — summarized metrics for total SKUs, low stock, pending PRs.
   • Trend Chart — 30-day stock movement visualization.
   • Top Brands — aggregated sales / stock leaders.
   • Click-to-Filter — all dashboard widgets trigger corresponding grid filters.

⸻

7. Accessibility & Quality Gates
   • Build Validation — pnpm run validate (typecheck + lint) and pnpm build.
   • Performance Check — 10 k-row scroll smoothness @ 60 fps.
   • Focus Audit — All buttons, tabs, and grid cells keyboard accessible.
   • Design Audit — All borders replaced with ring-1 ring-[hsl(var(--line)/.12)].
   • Dark Mode Test — Ensures contrast parity with .dark token overrides.

⸻

8. Risks & Mitigations

Risk Mitigation
Scraper variance from vendor feeds Centralized normalization adapters.
Persisted state drift Versioned Zustand migrations with safe defaults.
Visual token drift Palette reader for unified color tokens.
Search performance under multi-source Separate Fuse indices per source + merged results.
Over-fetching on grid updates Debounced API calls + local diff reconciliation.

⸻

9. Next Steps & Extension Areas

Focus Action
Supplier Integration Implement purchase order (PO) API and automated restocking.
Network Sync Real-time partner stock transfer via service tokens or WebSocket bridge.
Analytics Expansion Add supplier coverage, fill-rate, and cost metrics.
Offline Mirror Introduce IndexedDB cache for long-session reliability.
Schema Versioning Stabilize Prisma models with reproducible migration snapshots.

⸻

Summary

The Inventory Module is Clairity’s core operational workspace for product and stock intelligence.
It unifies catalog, network, and store data in one glass-layered interface, balancing precision and speed.
Future extensions will deepen automation (PO API, network sync) and analytics, ensuring every store maintains clear, real-time insight into its inventory health, supplier performance, and replenishment pipeline.
