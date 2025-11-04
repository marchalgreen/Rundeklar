# NewCustomerApp

Stack: Next.js 15 (App Router), React 19, Tailwind v4, Prisma 6, pnpm monorepo, Playwright.

Quickstart:

Scope: all 3 workspace projects
Lockfile is up to date, resolution step is skipped
Progress: resolved 1, reused 0, downloaded 0, added 0
Packages: +731
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

   ╭───────────────────────────────────────────────────────────────────╮
   │                                                                   │
   │                Update available! 9.11.0 → 10.20.0.                │
   │   Changelog: https://github.com/pnpm/pnpm/releases/tag/v10.20.0   │
   │                 Run "pnpm add -g pnpm" to update.                 │
   │                                                                   │
   │         Follow @pnpmjs for updates: https://x.com/pnpmjs          │
   │                                                                   │
   ╰───────────────────────────────────────────────────────────────────╯

Progress: resolved 731, reused 731, downloaded 0, added 280
Progress: resolved 731, reused 731, downloaded 0, added 647
Progress: resolved 731, reused 731, downloaded 0, added 728
Progress: resolved 731, reused 731, downloaded 0, added 731, done

devDependencies:
+ playwright 1.56.1

packages/web postinstall$ prisma generate || echo "(prisma generate skipped)"
packages/web postinstall: Environment variables loaded from .env
packages/web postinstall: Prisma schema loaded from prisma/schema.prisma
packages/web postinstall: ✔ Generated Prisma Client (v6.17.1) to ./../../node_modules/.pnpm/@prisma+client@6.17.1_prisma@6.17.1_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client in 61ms
packages/web postinstall: Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
packages/web postinstall: Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
packages/web postinstall: Done
Done in 5.2s

> new-customer-app@0.1.0 prisma:migrate:dev /Users/mhalgreen/projects/NewCustomerApp
> pnpm --filter @clairity/web exec prisma migrate dev

No projects matched the filters in "/Users/mhalgreen/projects/NewCustomerApp"

> new-customer-app@0.1.0 dev /Users/mhalgreen/projects/NewCustomerApp
> pnpm --filter @clairity/web dev

No projects matched the filters in "/Users/mhalgreen/projects/NewCustomerApp"
