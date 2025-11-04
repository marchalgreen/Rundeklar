# Backend Foundation Plan (v3)

## Executive Summary
- Clairity's backend is a Next.js 15 App Router deployment that exposes a small surface of server actions and RESTful API routes, all backed by a Prisma 6 data layer on Postgres. Key runtime adapters live under `src/lib`, keeping transport concerns (HTTP handlers) thin while concentrating domain logic in reusable modules.
- Foundational capabilities cover store + employee authentication, catalog ingestion (MOSCOT), inventory reads, purchase request export, calendar stubs, and address validation. Background scripts bootstrap demo data and keep vendor catalogs synchronized.
- This document inventories the current architecture, API surface, background jobs, authentication flows, and normalized database schema to align future backend work with the "version3" scope.

## 1. Architecture Overview
### 1.1 Runtime & Framework
- **Framework** — Next.js 15 with the App Router; API route handlers explicitly opt into the Node runtime for access to long-lived Prisma connections (`export const runtime = 'nodejs';`).
- **Language & Tooling** — TypeScript 5 with ESLint flat config, Prettier, and `npm run validate` (typecheck + lint) guarding CI builds (`package.json`).
- **Data Layer** — Prisma client instantiated via `src/lib/db.ts`, which memoizes the client on `globalThis` to avoid connection churn across hot reloads. Prisma schema (`prisma/schema.prisma`) models products, store inventory, movement logs, vendor catalog cache, stores, employees, and sessions.

### 1.2 Module Layout
- `src/lib/auth/*` encapsulates cookie helpers, JWT utilities, mock/seed data, and service-to-service token verification.
- `src/lib/catalog/*` handles vendor catalog ingestion (`moscotSync.ts`), read-only mappings to inventory rows, and auto-link heuristics between catalog and stock data.
- `src/lib/export/prCsv.ts` serializes purchase requests for email delivery; `src/lib/email.ts` wraps the Resend SDK.
- `src/lib/ocr/address.ts` parses & normalizes Danish addresses to support `/api/dawa` validation.
- `src/lib/scrapers/moscot.ts` and companion scripts perform vendor scraping & enrichment prior to DB sync.

### 1.3 Request Flow & Middleware
- Global middleware (`src/middleware.ts`) exempts public auth endpoints and static assets, redirecting unauthenticated store users to `/store/login` and unauthenticated employees to `/login` based on `STORE_SESS` and `EMP_SESS` cookies.
- API routes reside under `src/app/api/*`, organized by domain (auth, catalog, inventory, email, calendar, id-scan, dawa). Each handler pulls shared services from `src/lib` modules to enforce consistent behavior.

## 2. API Surface (App Router)
| Route | Method(s) | Handler | Purpose | AuthN / Preconditions |
| --- | --- | --- | --- | --- |
| `/api/auth/store/start` | POST | `src/app/api/auth/store/start/route.ts` | Verify store email/password, seed `STORE_PENDING` cookie for MFA. | Requires database connectivity and valid credentials; anonymous access.
| `/api/auth/store/send-code` | POST | `src/app/api/auth/store/send-code/route.ts` | Issue 6-digit email OTP via Resend (or dev fallback) and persist hashed code in pending cookie. | Requires existing, unexpired `STORE_PENDING`; optional email override; Resend API key for production send.
| `/api/auth/store/verify-2fa` | POST | `src/app/api/auth/store/verify-2fa/route.ts` | Validate OTP, create long-lived store `Session`, promote to `STORE_SESS` cookie. | Requires hashed code in pending cookie; 5 attempt lockout.
| `/api/auth/employee/login` | POST | `src/app/api/auth/employee/login/route.ts` | Validate employee PIN for active store session, mint 4-hour employee `Session`. | Requires valid `STORE_SESS`; Argon2 PIN verification.
| `/api/auth/me` | GET | `src/app/api/auth/me/route.ts` | Introspect current store/employee session state. | Reads Prisma-backed sessions via cookies.
| `/api/auth/logout` | POST | `src/app/api/auth/logout/route.ts` | Invalidate store & employee sessions, clear cookies. | Requires cookies but tolerates missing sessions.
| `/api/auth/dev-mint` | POST | `src/app/api/auth/dev-mint/route.ts` | Development helper: issues store JWT + cookie redirect. | Disabled in production (`NODE_ENV === 'production'`).
| `/api/catalog/moscot` | GET | `src/app/api/catalog/moscot/route.ts` | Serve cached MOSCOT catalog rows from DB or local JSON fallback. | Optional `?path=` override (blocked in production).
| `/api/catalog/moscot/sync` | POST | `src/app/api/catalog/moscot/sync/route.ts` | Kick off catalog diff/import, returning sync summary. | Requires service JWT with `catalog:sync` + `catalog:sync:moscot` scopes.
| `/api/inventory` | GET | `src/app/api/inventory/route.ts` | Return up to 800 inventory rows joined with product metadata. | Reads first Store; no per-request auth enforced yet.
| `/api/email/pr` | POST | `src/app/api/email/pr/route.ts` | Generate & send purchase request CSV email via Resend. | Validates draft payload; requires `RESEND_API_KEY` to send.
| `/api/dawa` | POST | `src/app/api/dawa/route.ts` | Normalize Danish addresses using DAWA autocomplete with throttled fetch + scoring. | Public; enforces payload shape via internal parsing.
| `/api/id-scan` | POST | `src/app/api/id-scan/route.ts` | Mock ID lookup returning CPR-style hints for demo flows. | Public; Zod request validation.
| `/api/calendar/events` | GET, POST | `src/app/api/calendar/events/route.ts` | Stubbed calendar listing & creation (echo). | No auth; returns dummy data.
| `/api/calendar/availability` | GET | `src/app/api/calendar/availability/route.ts` | Stub staff availability schedule. | No auth; static response.
| `/api/calendar/reminders` | POST | `src/app/api/calendar/reminders/route.ts` | Stub reminder creation returning queued status. | No auth; echoes request.

## 3. Background Jobs & CLI Utilities
| Script | Location | Description |
| --- | --- | --- |
| `pnpm sync:moscot` → `scripts/sync-moscot.ts` | Streams MOSCOT catalog JSON into Postgres via `syncMoscotCatalog`, tracking create/update/delete metrics and persisting `VendorSyncState` metadata.
| `pnpm scrape:moscot` / `pnpm scrape:moscot:quick` → `scripts/moscot-scrape.ts` | Polite storefront crawler that assembles enriched catalog products (variants, imagery, Shopify data) and writes `/tmp/moscot.catalog.json` (or configured path).
| `pnpm tsx scripts/import-demo-catalog.ts` | Converts scraped catalog into demo inventory JSON consumed by the UI (`src/lib/mock/inventory.demo.json`).
| `pnpm tsx scripts/seed-demo-stock.ts` | Idempotently upserts demo `Product` + `StoreStock` rows (≤600 variants) seeded from catalog JSON.
| `pnpm tsx scripts/seed-demo-movements.ts` | Generates historical `StockMovement` entries and keeps `StoreStock.qty` in sync, simulating sales/restocks over a configurable window.

## 4. Authentication & Authorization
- **Store Login Flow** — Three-stage process: password verification (`/api/auth/store/start`), Resend-backed OTP delivery (`/api/auth/store/send-code`), and OTP verification (`/api/auth/store/verify-2fa`) culminating in a 180-day store `Session` persisted as `STORE_SESS`.
- **Employee Login** — Requires an active store session; employees authenticate with Argon2-hashed PINs via `/api/auth/employee/login`, producing a 4-hour `EMP_SESS` cookie for per-device scoping.
- **Session Storage** — Both store & employee sessions live in the Prisma `Session` model with `expiresAt` enforcement; `/api/auth/logout` removes DB rows and clears cookies.
- **Service-to-Service Auth** — Operational jobs call `/api/catalog/moscot/sync` using HS256 service JWTs verified by `src/lib/auth/serviceToken.ts`, which enforces audience + scope claims and supports `Authorization` or `x-service-token` headers.
- **Middleware Enforcement** — `src/middleware.ts` guards UI routes, redirecting unauthenticated users before they hit protected resources. API routes rely on cookie checks and Prisma lookups; additional hardening (e.g., tying `/api/inventory` to store session) remains future work.

## 5. Database Schema Reference
### Enumerations
- `ProductCategory`: `Frames`, `Sunglasses`, `Lenses`, `Accessories`, `Contacts`.

### Models
- **Product** — Catalog of sellable items (`id`, unique `sku`, descriptive fields, optional supplier metadata) with relations to `StoreStock` and `StockMovement`.
- **StoreStock** — Join table linking `Store` ↔ `Product`, tracking quantity, barcode, and `updatedAt`; composite unique index enforces one row per store/product pair.
- **StockMovement** — Event log capturing inventory deltas (`qtyBefore`, `qtyAfter`, `delta`, `reason`, `note`, timestamp) per store/product; indexed by `(storeId, productId, at)` for analytics.
- **VendorCatalogItem** — Cached vendor catalog payloads with hash diffing to detect changes; unique per `(vendor, catalogId)`.
- **VendorSyncState** — Stores last sync metadata (hash, source path, counts, durations, errors) per vendor.
- **Store** — Top-level tenant identity with unique email, Argon2 password hash, optional TOTP secret, and relations to employees, sessions, stocks, and movements.
- **Employee** — Store-scoped personnel records with unique `(slug, storeId)` constraint and Argon2 PIN hash; relation to sessions via named relation `EmployeeSessions`.
- **Session** — Generic session container referencing store + optional employee, with expiration timestamp.

> See `prisma/schema.prisma` for field-level definitions and relation annotations.

## 6. Validation & Operational Notes
- Run `npm run validate` (typecheck + lint) before deployment; `npm run build` chains `validate`, `prisma generate`, and Next build.
- `postbuild` runs `prisma migrate deploy` so production deploys apply migrations automatically (requires `DATABASE_URL`).
- Environment expectations: `DATABASE_URL`, `AUTH_JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `SERVICE_JWT_SECRET`, and optional `CATALOG_MOSCOT_PATH` / `RESEND_TEST_TO` for preview flows. Telemetry can be silenced locally with `TELEMETRY_DISABLED=1|true|on`, and future providers should read `TELEMETRY_PROVIDER` / `TELEMETRY_ENDPOINT` / `TELEMETRY_API_KEY` (reserved) before wiring custom emitters via `src/lib/telemetry`.

## 7. Next Steps & Gaps
- Tighten API authorization (e.g., gate `/api/inventory`, `/api/calendar/*`) using store/employee session context or service tokens.
- Promote calendar & reminder endpoints from stubs to real persistence backed by Prisma models once product scope matures.
- Expand observability around catalog sync jobs (structured logging, failure alerts) leveraging `VendorSyncState.lastError`.
