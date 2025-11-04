<div align="center">

# Clairity

_A glass-styled, cloud-native desktop OS for opticians_

</div>

Clairity (codename: **VisionSuite**) is a modern, web-based operating environment for independent opticians.  
It combines customer records, appointment booking, inventory, orders, notes, and analytics in a macOS-inspired multi-window UI.

Built with **Next.js 15**, **TypeScript 5**, **Tailwind v4**, and **Prisma 6** on **Neon Postgres**.

---

## ⚙️ Tech Stack

| Layer         | Tools / Details                                                                  |
| ------------- | -------------------------------------------------------------------------------- |
| **Framework** | Next.js 15 (App Router, Turbopack, Node runtime)                                 |
| **Language**  | TypeScript 5 (strict)                                                            |
| **Styling**   | Tailwind v4 + custom _Tahoe_ glass / motion system                               |
| **State**     | Zustand stores (desktop, inventory, catalog, observability)                      |
| **Database**  | Prisma 6 → Neon Postgres                                                         |
| **Auth**      | Store login (email + OTP), Employee PIN (Argon2), Service-to-Service JWT (HS256) |
| **Email**     | Resend (preview / dev test inbox supported)                                      |
| **Deploy**    | Vercel (auto deploy on `main`)                                                   |
| **Tooling**   | ESLint v9 (flat config), Prettier, `tsc --noEmit`, Playwright for E2E            |

---

## 🧠 Key Features

- **Desktop shell** — draggable windows, widgets, HUD, keyboard shortcuts
- **Auth flows** — store login (email + OTP) + employee 4-digit PIN
- **Inventory** — fast grid, exports, labels, barcode scan, vendor linking
- **Vendor catalog ingest** — MOSCOT scraper → JSON → DB sync (diff & snapshot)
- **Observability v1.1 (NEW)**
  - `/vendor-sync` window with date / status / vendor filters, paginated runs, detail drawer
  - **Run history** (`VendorSyncRun`) + **snapshot** (`VendorSyncState`)
  - **Write API** `POST /api/catalog/moscot/sync` (scoped service token)

---

## 🧩 Workspace Layout (high-level)

The repository is a pnpm-powered monorepo that can host multiple services
alongside the Next.js desktop app. Current packages:

packages/
├─ web/ # Next.js desktop shell + API routes
│ ├─ app/ # App Router, auth flows, documentation pages
│ ├─ components/ # Shared UI, windows, desktop widgets, docs layout
│ ├─ lib/ # Auth, Prisma client, catalog ingest, utilities
│ ├─ store/ # Zustand desktop/inventory/catalog slices
│ ├─ prisma/ # Schema + migrations
│ └─ public/ # Static assets bundled with the web app
├─ device-agent/ # Local ingest companion (Node service, WIP)
└─ (future packages) # Shared protocol/types, desktop tooling, etc.

Repository-wide assets remain at the root:

- `tests/` – API + UI Playwright suites
- `scripts/` – Scrapers, sync jobs, docs reset utilities
- `docs/epics/` – Source-of-truth product epics (docs generation inputs)
- `prompts/` – Agent prompts, onboarding, workflow playbooks
- `public/` – Shared static assets
- `pnpm-workspace.yaml` – Workspace definition and build allowlist

---

## 🚀 Getting Started (Local)

1. **Install dependencies**

   ```bash
   pnpm install

   	2.	Environment
   Copy .env.example → .env (root) and ensure credentials are filled.
   Then follow the environment setup below.
   	3.	Prisma (Dev)
   ```

pnpm prisma:migrate:dev --name init

    4.	Run the desktop app

pnpm dev

Visit http://localhost:3000/store/login

⸻

🧩 Environment Setup (Monorepo + Prisma)

Because Clairity runs inside a pnpm monorepo, both Next.js and Prisma
need to see the same .env file from the app’s package folder (packages/web).

✅ Local setup 1. Symlink or copy the root env file:

# from repo root

ln -sf ../../.env packages/web/.env
ln -sf ../../.env packages/web/.env.local

    2.	Remove Prisma’s duplicate env file (important):

rm -f packages/web/prisma/.env

Prisma automatically loads both .env and prisma/.env.
If both exist with identical keys (like DATABASE_URL), Prisma will fail.

    3.	Verify Prisma can reach the database:

pnpm --filter @clairity/web exec prisma db pull

You should not see “Environment variable not found” or “conflicting env vars”.

    4.	Start the app:

pnpm dev

Visit http://localhost:3000/store/login￼.
You should see the login screen without db_disabled.

🧠 Why this matters
• Next.js loads .env\* from the package root (packages/web).
• Prisma loads .env and prisma/.env from that same package.
• Keeping only one copy (or symlinks) prevents duplicate-variable conflicts.

💡 If the database URL or credentials change, update the root .env —
symlinks in packages/web automatically stay in sync.

⸻

🚀 Deployment (Vercel) — Monorepo (single project)

Clairity uses one Vercel project. The deployment pipeline builds only packages/web.

⚙️ Project Settings → Build & Development

Setting Value
Framework Preset Next.js
Root Directory packages/web
Include files outside Root Directory ✅ Enabled
Install Command (Override) pnpm i --frozen-lockfile
Build Command (Override) pnpm run build
Output Directory (leave blank; Next.js default .next)
Development Command (leave blank)

⸻

🧠 Project Settings → Git

Setting Value
Production Branch main
Deploy Previews ✅ Enabled (each branch/PR builds automatically)
Automatic Deployments ✅ Enabled

Every push to a branch triggers a Preview Deployment.
Merges to main create the Production Deployment.

⸻

🚦 Ignored Build Step (monorepo skip logic)

Settings → Build & Development → Ignored Build Step (Override):

bash ../../scripts/should-build-web.sh

Skips builds when commits don’t affect packages/web or shared dependencies.

⸻

🧭 Dev Notes
• Motion: 120–240 ms, cubic-bezier(.2,.8,.2,1)
• Tailwind tokens: tailwind.config.ts
• Prisma client memoized in src/lib/db.ts
• Codex workflow: one epic branch → validate → merge
• Docs regeneration: docs/epics/<Module>/EPIC-<module>.md → src/app/docs/<module>/\*\*

⸻

🐞 Troubleshooting
• invalid_token → check SERVICE_JWT_SECRET
• E2E redirect /login → make /api/auth/dev-mint public
• P2028 (transaction closed) → increase Prisma timeout if dataset grows

⸻

🔐 Demo Credentials (dev)

Type Credential
Store Login owner@clairity.demo / demo1234
Employee PIN 1111

⸻

© 2025 Clairity — Desktop Web
