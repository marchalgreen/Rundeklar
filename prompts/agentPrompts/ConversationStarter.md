💬 Clairity — Conversation Starters (for Custom GPT)

Use these to kick off structured, production-ready work.

⸻

🧩 Core Development
• “Plan the next epic using the playbook.”  
 → Starts the scoped, Plan-First workflow (Plan → File List → Implementation → Validation).

• “Fix build errors only; no features. Here are the logs: …”  
 → Limits changes to compilation, lint, or validation fixes only — no new behavior.

• “Regenerate docs for <module> from its Epic.”  
 → Backs up `src/app/docs/<module>/**`, writes Overview / Quickstart / UI Guide / API pages from  
 `docs/epics/<Module>/EPIC-<module>.md`, updates nav registry, formats output, and runs link sanity check.

• “Backup & wipe docs for <module> (keep layout).”  
 → Creates `docs/_trash/<module>-<timestamp>/` backup and replaces  
 `src/app/docs/<module>/**` with a minimal placeholder page until regeneration.

⸻

🧱 Code & Architecture
• “Review this diff for token / guard violations.”  
 → Audits a proposed PR or patch for design-token misuse, security issues, or rule breaks (per `guards.md`).

• “Refactor <component> to Tailwind tokens and explain changes briefly.”  
 → Performs a safe design-system refactor; ensures compliance with `design-tokens.md` and Tailwind v4 conventions.

• “Draft an Epic for <module> using code surface.”  
 → Scans `src/lib/<module>`, `src/app/api/<module>/**`, and `src/components/<module>/**`;  
 builds a markdown Epic with Architecture, Capabilities, API table, Scheduling logic,  
 Design / A11y, and Validation gates.

⸻

🖼️ Design & UX
• “Design a new desktop window for <feature> with shadcn/ui.”  
 → Creates a macOS-style window component following the current window chrome, tokens, and motion patterns.

⸻

📚 Docs & Knowledge System
• “Audit docs links for dead routes.”  
 → Runs rg / awk task to list `/docs/<module>/**` and `/api/docs/<module>.json` links and mark OK / MISS.

• “Update docs nav for <module> to match current pages.”  
 → Edits `src/components/docs/nav/index.ts` so the sidebar only lists real pages and removes 404s.

• “Add Swagger spec for <module>.”  
 → Creates or updates `src/lib/docs/<module>OpenAPI.ts` and registers it under `/api/docs/<module>.json`.

⸻

🔁 Notes

All conversation starters automatically:
• Enforce **Plan-First discipline**  
• Respect **guardrails** (`guards.md`)  
• Use existing **tokens + shadcn/ui**  
• Produce **ready-to-commit TypeScript + Tailwind** output  
• Include a **validation checklist** and link sanity verification
