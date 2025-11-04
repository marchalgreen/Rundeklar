Docs Module Foundation

Executive Summary
• The Clairity Docs module delivers a unified documentation workspace built directly into the Next.js 15 App Router, providing both static and interactive guides for all product domains (Calendar, Vendor Sync, Testing, Inventory, etc.).
• It uses a shared layout architecture (UnifiedDocLayout) with a global header, sticky sidebar navigation, and token-driven glass design consistent with the macOS-style “Tahoe” aesthetic.
• The system enables product, engineering, and ops teams to maintain live documentation alongside feature code — each feature’s guides, SDK references, and API explorers live within the same repository and deploy pipeline.
• This plan describes the module’s architecture, component hierarchy, navigation model, layout system, and integration points with other Clairity domains (e.g., Calendar APIs).

⸻

1. Architecture Overview

1.1 Runtime & Framework
• Framework — Next.js 15 (App Router) rendering static and RSC pages under /src/app/docs/\*\*.
• Language & Tooling — TypeScript 5 (strict mode), Tailwind v4, shadcn/ui primitives, and Lucide/Phosphor icons.
• Styling System — HSL design tokens (--surface, --surface-2, --line, --accent-blue, etc.) declared in globals.css, guaranteeing consistent glass layers and borders across all modules.
• State & Motion — Minimal; layouts are static. Sidebar open state and path awareness rely on next/navigation.

1.2 Module Layout

Path Purpose
src/app/docs/layout.tsx Global Docs wrapper that renders the shared header (SiteHeader) and top-level gradient background.
src/app/docs/page.tsx Docs hub page (“Unified docs hub”) with FeatureCard grid linking to each domain.
src/app/docs/[section]/layout.tsx Section layouts (Calendar, Vendor Sync, Testing) wrapping children with UnifiedDocLayout.
src/components/docs/UnifiedDocLayout.tsx Core layout: sticky sidebar + main content grid + skip link for a11y.
src/components/docs/SidebarUnified.tsx Token-driven sidebar with NavProvider context and aria-current highlighting.
src/components/docs/SiteHeader.tsx Global header with logo, section dropdown, search, and quick links.
src/components/docs/nav/\* Typed nav schema (DocSection, DocGroup, DocLink), preset builders, and registry (getSectionNav).
src/components/docs/FeatureCard.tsx Soft-glass card component used on hub pages.
src/components/docs/DocPageHeader.tsx Standard page header for section intros and API pages.

1.3 Design Language
• Glass + Ring System — All surfaces use ring-1 ring-[hsl(var(--line)/.12)] instead of hard borders.
• Motion — 120–200 ms cubic-bezier(.2,.8,.2,1) transitions; no large-scale animation.
• A11y — Skip links, aria-current, visible focus rings (.ring-focus), and keyboard-accessible dropdowns.

⸻

2. Layout & Components

2.1 Global Header (SiteHeader)
• Fixed glass header with logo (/branding/Clairity_blue.svg), “Sections” dropdown, search input (/ hotkey), “All docs,” and “Back to app” buttons.
• Replaces legacy borders with inset shadow + ring system to avoid black hairlines.
• Built with shadcn/ui DropdownMenu, Button, and Input primitives for consistency.

2.2 UnifiedDocLayout
• Provides a responsive two-column grid (md:grid-cols-[264px_minmax(0,1fr)]) containing a sticky sidebar and scrollable main content area.
• Adds a “skip to content” link for keyboard users.
• Consumed by all section layouts: Calendar, Vendor Sync, Testing.

2.3 SidebarUnified
• Reads the current nav tree from NavProvider.
• Highlights the active route using aria-current="page" and a soft accent bar (before:bg-[hsl(var(--accent-blue))]).
• Automatically normalizes links (/docs/<section>/…) to prevent duplication (e.g., /calendar/calendar/events).

2.4 DocPageHeader
• Shared header component for all docs pages: eyebrow, title, description, optional actions.
• Ensures uniform spacing, typography, and color contrast.

2.5 FeatureCard
• Soft-glass CTA card for hub/overview pages.
• Uses gradient background (from-white/82 to-white/60), accent ring, and hover lift + shadow motion.

⸻

3. Navigation System

3.1 Nav Schema
• DocLink — { title, href, icon?, badge? }
• DocGroup — { label, items: DocLink[] }
• DocSection — { id, title, groups: DocGroup[] }

3.2 Registry
• Implemented in src/components/docs/nav/index.ts.
• getSectionNav('calendar'), getSectionNav('vendor-sync'), getSectionNav('testing'), and getSectionNav('home') each return a parsed DocSection.
• Presets (makeQuickstart, makeGuides, makeApiSet, testingWorkflow) define reusable link groups shared by multiple sections.

3.3 Sidebar Behavior
• Sticky at top-20, scrollable within the viewport.
• Collapses to hidden on small screens; responsive grid restores full width content.

⸻

4. Page Templates & Example: Calendar

4.1 Calendar Section
• Located under src/app/docs/calendar/\*_.
• Pages include:
• /docs/calendar/quickstart – onboarding and setup steps.
• /docs/calendar/ui-guide – visual and accessibility guidelines.
• /docs/calendar/api/_ – live API references mapped from backend endpoints (/api/calendar/events, /availability, /reminders).
• Each page imports DocPageHeader for uniform heading and description, then uses markdown-like prose with examples and FeatureCard or Table components as needed.

4.2 Integration Example
• /docs/calendar/api/events/page.tsx documents the corresponding REST route defined in src/app/api/calendar/events/route.ts.
• Docs automatically reflect API behavior by reusing shared types (EventPayload, AvailabilitySlot) from the backend library, ensuring type parity.

⸻

5. Integration & Extensibility
   • Backend Linkage — Docs reference live API routes under /api/\*, allowing Swagger or OpenAPI components to embed directly.
   • Component Reuse — Feature modules (Inventory, Vendor Sync, Testing) register themselves in nav/index.ts without touching layout code.
   • Styling Consistency — All components rely on Tailwind tokens; global updates (e.g., lightening --line) propagate everywhere instantly.
   • Localization Ready — All copy lives inline; can migrate to next-intl or @lingui without structural change.

⸻

6. Accessibility & Design System Alignment
   • Uses semantic HTML (<nav>, <main>, <header>, <section>).
   • All focusable controls (Button, DropdownMenuItem, Link) respect focus-ring tokens.
   • Light/dark themes supported automatically via HSL tokens; dark mode flips contrast ratios in .dark { }.
   • No hardcoded colors; everything derived from tokens (--line, --accent-blue, --muted, --surface-2).

⸻

7. Validation & Operational Notes
   • Build & Typecheck — pnpm run validate then pnpm build.
   • Manual Smoke Tests — Open /docs, /docs/calendar, /docs/vendor-sync, and /docs/testing/playwright; confirm unified header, sidebar, and focus states.
   • Lint & Prettier — Enforced via pnpm run validate.
   • Performance — Static rendering; no dynamic data fetches, ensuring instant loads and SEO-friendly output.
   • A11y Verification — Run Lighthouse or Axe; all headings and landmarks should pass 100%.

⸻

8. Next Steps & Gaps

Area Action
Mobile UX Add collapsible sidebar or hamburger for ≤ 768 px.
Search Integration Wire search input to a lightweight client-side index (Fuse.js or Algolia).
Dynamic API Docs Replace static Swagger embeds with auto-generated OpenAPI pages using server actions.
Localization Introduce translation wrapper around titles and descriptions.
Authoring Pipeline Explore MDX import support for long-form guides.
