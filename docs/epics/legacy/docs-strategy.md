🧩 Docs strategy

Audience
• Primary: Ops (product-leaning narrative, step-by-step flows)
• Secondary (inline): Developers — expandable sections under each Ops topic: “Developer details”

Format
• Pages under /docs/vendor-sync/\*
• Left nav + content area
• Components: Callout, Code (copy), Endpoint, DevToggle (“Developer details” accordion/tab)

Content model (Ops first, Dev inline)
• Quickstart (Ops) → Dev details: dev token mint, scopes, curl auth
• Onboarding Wizard (Ops) → Dev details: POST /vendors payload
• Registry (Ops) → Dev details: PATCH/POST creds shape
• Vendor List (Ops) → Dev details: registry/test-all
• Observability (Ops) → Dev details: /overview and /history
• Adapter SDK (Ops just overview) → Dev details: CLI scaffold/validate, adapter anatomy
• Normalization (Ops summary) → Dev details: NormalizedProduct example

⸻

🧪 Swagger / OpenAPI — should we include it?

Short answer: Yes, but keep it optional and lightweight.

Options 1. OpenAPI JSON route only (recommended baseline)
• Programmatically generate an OpenAPI 3.1 JSON object from a small module and serve at:

GET /api/docs/vendor-sync.json

    •	Pros: No deps, CI-friendly, other tools can consume it.
    •	Cons: No interactive UI (unless you view via external tools).

    2.	Swagger UI (no new deps) — simple CDN embed behind a feature flag
    •	Page at /docs/vendor-sync/api/swagger that includes Swagger UI from CDN (e.g., unpkg) and points to /api/docs/vendor-sync.json.
    •	Pros: Interactive, copyable, familiar to Devs; no npm dependency.
    •	Cons: External resource (CDN) — acceptable if your CSP allows, and it’s dev-only.

We’ll implement (1) by default and (2) behind a NEXT_PUBLIC_SWAGGER_EMBED=true flag. No lockfile changes; PR-safe.

⸻

# Example:

🚀 One-shot Codex command (integrated docs with Dev reveals + OpenAPI + optional Swagger)

Paste this in Codex Web:

/implement vendor docs integrated --smart --include-ui --include-api --validate

Body

context:
branch: codex/implement-vendor-sync-read-api
goal: Integrated Vendor Sync docs site for Ops + inline Developer details, with OpenAPI JSON and optional Swagger UI embed.
tone: Product-leaning for Ops; developer sections inline via collapsible reveal.
brand: Clairity
rules:

- Reuse existing UI primitives (button, badge, input, label, tooltip).
- No new npm dependencies, no binaries.
- Build-safe Next.js (no <Html>/<Head>/<Main>/<NextScript> outside \_document).
- Keep validations green: pnpm typecheck, pnpm lint, pnpm exec tsx --test, pnpm build.

scope:
ui: # Layout + core docs pages - add: - src/app/docs/vendor-sync/layout.tsx - src/app/docs/vendor-sync/page.tsx # Landing + nav links - src/app/docs/vendor-sync/quickstart/page.tsx # Ops quickstart w/ Dev reveal - src/app/docs/vendor-sync/ui-guide/page.tsx # Onboarding, Vendors list, Observability, Registry (Ops+Dev toggles) - src/app/docs/vendor-sync/sdk/page.tsx # Adapter scaffold/validate (Dev) - src/app/docs/vendor-sync/normalization/page.tsx # NormalizedProduct overview + example (Dev) - src/app/docs/vendor-sync/api/page.tsx # API intro (auth, scopes, curl pattern) - src/app/docs/vendor-sync/api/overview/page.tsx # GET /overview - src/app/docs/vendor-sync/api/history/page.tsx # GET /history?limit= - src/app/docs/vendor-sync/api/test-all/page.tsx # POST /registry/test-all - src/app/docs/vendor-sync/api/vendors/page.tsx # POST /vendors - src/app/docs/vendor-sync/api/normalize-preview/page.tsx # POST /[slug]/normalize/preview - src/app/docs/vendor-sync/api/apply/page.tsx # POST /[slug]/apply # Docs components - add: - src/components/docs/DocLayout.tsx # left nav + content slot - src/components/docs/Callout.tsx # info/warn/error callouts using Badge/alerts - src/components/docs/Code.tsx # code block with copy button (curl/JSON) - src/components/docs/Endpoint.tsx # simple endpoint header (METHOD + PATH) - src/components/docs/DevToggle.tsx # collapsible Developer section (Ops-first) - src/components/docs/Table.tsx # minimal docs table
api: # OpenAPI JSON (no deps) - add: - src/lib/docs/vendorSyncOpenAPI.ts # builds OpenAPI JSON object for vendor-sync endpoints - src/app/api/docs/vendor-sync.json/route.ts # returns the object as JSON (force-dynamic, runtime: nodejs) # Optional Swagger UI (no deps; CDN) - add: - src/app/docs/vendor-sync/api/swagger/page.tsx
details: >
Client page that, if NEXT_PUBLIC_SWAGGER_EMBED=true, loads Swagger UI from CDN (unpkg) and points it to /api/docs/vendor-sync.json.
Otherwise, shows link "Download OpenAPI JSON" and a note on enabling embed.
content:

# Fill the docs with product-leaning copy for Ops and inline Dev reveals:

- Quickstart:
  ops: How to open /vendor-sync pages, onboard a vendor (4 steps), test connections, and see health.
  dev: How to mint a dev token (service JWT) and auth header example.
- UI Guide:
  ops: Onboarding wizard, Vendor list (filters, CSV, test-all), Observability (Health Summary, trend blocks, Queue), Registry editing.
  dev: Each section shows request/responses of relevant endpoints (POST /vendors, POST /registry/test-all, etc.).
- SDK:
  dev: Commands, adapter anatomy (Zod schema, normalize()), test placement.
- Normalization:
  dev: NormalizedProduct annotated example, constraints, common pitfalls.
- API pages:
  for each endpoint provide: - method + path - scopes required (e.g., catalog:sync:write) - sample curl (with `Authorization: Bearer $SERVICE_JWT`) - sample request/response JSON
  validation:
- pnpm typecheck
- pnpm lint
- pnpm exec tsx --test
- pnpm build
  constraints:
- No new dependencies or lockfile changes
- No images/binaries
- All new API routes: export const runtime='nodejs'; export const dynamic='force-dynamic'
  tests:
- add: - tests/ui/docs-vendor-sync-nav.spec.ts # navigate /docs/vendor-sync → links exist - tests/ui/docs-vendor-sync-api.spec.ts # curl blocks + copy buttons present, OpenAPI JSON route returns ok
  acceptance_criteria:
- /docs/vendor-sync renders left nav and all pages load.
- Each Ops section includes a “Developer details” collapsible panel.
- /api/docs/vendor-sync.json returns OpenAPI JSON describing vendor-sync endpoints.
- /docs/vendor-sync/api/swagger loads Swagger UI only when NEXT_PUBLIC_SWAGGER_EMBED=true; otherwise shows JSON download link.
- All validations pass; no schema changes; no binaries.

⸻

ℹ️ Implementation notes (what Codex will generate)
• DevToggle.tsx → small accordion/<details> pattern with a “Developer details” label, so Ops aren’t overwhelmed but Devs get the context they need.
• vendorSyncOpenAPI.ts → a programmatic OpenAPI 3.1 object; we’ll include tags, paths, request bodies, and response schemas for:
• POST /api/catalog/vendor-sync/registry/test-all
• GET /api/catalog/vendor-sync/overview
• GET /api/catalog/vendor-sync/history
• POST /api/catalog/vendor-sync/vendors
• POST /api/catalog/vendor-sync/[slug]/normalize/preview
• POST /api/catalog/vendor-sync/[slug]/apply
• Swagger UI is optional and no-deps (CDN embed). It’s disabled by default; Devs can enable via env:

NEXT_PUBLIC_SWAGGER_EMBED=true

⸻

📋 Quick answers to your decisions

“Ops users, product leaning, Clairity — integrated with Dev reveals?”
Yes. That’s exactly what the DevToggle pattern solves.

“Would it make sense to pull in Swagger?”
Yes, as an optional aid. We’ll generate OpenAPI JSON and provide a Swagger UI page without adding dependencies. That keeps your repo lean and your PR safe.

⸻

If you give me any preferred wording for Quickstart/Policies (e.g., “Ops must test-all before Apply”), I’ll bake that copy into the pages; otherwise I’ll write concise, product-leaning defaults.
