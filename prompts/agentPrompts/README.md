# Clairity Guardrails - Master Index

Dette er master indexet for alle Clairity guardrails og engineering guidelines. Brug denne oversigt til at finde de relevante regler og workflows.

**Note:** Denne fil er en del af `prompts/agentPrompts/`. For repository-wide guidelines, se [`AGENTS.md`](../../AGENTS.md) i roden af projektet.

---

## 🚨 Quick Reference - CRITICAL Rules

Disse regler skal **altid** følges:

1. **Responsive Design**: ALL UI components MUST be responsive by default (mobile-first approach)
2. **Design Tokens**: Use `hsl(var(--token))` - never hardcoded hex values
3. **Error Handling**: Always use `normalizeError` from `src/lib/errors.ts` - never console.log/error
4. **Testing**: Always Works™ - test before claiming it works (see [aw.md](./aw.md))
5. **Plan First**: Always propose plan before implementation (see [workflow-playbook.md](./workflow-playbook.md))
6. **Code Organization**: Think architecturally - extract reusable logic to hooks/services/utilities
7. **JSDoc**: Required for all exported functions, classes, components, hooks, and services
8. **No Secrets**: Never commit secrets, connection strings, or real URLs

---

## 📚 Guardrails Dokumentation

### Core Guardrails

- **[guards.md](./guards.md)** - Complete engineering guardrails
  - Architecture & File Structure
  - Styling & Design System
  - Responsive Design (CRITICAL)
  - Docs & Documentation System
  - Database / Prisma
  - Build & Quality Gates
  - Code Comments & JSDoc (CRITICAL)
  - Accessibility & Localization
  - Performance
  - Windowing & Desktop Behavior
  - Security & Data Integrity
  - Code Organization & Best Practices (CRITICAL)

- **[design-tokens.md](./design-tokens.md)** - Design system tokens and UI conventions
  - Token source & mapping
  - Core HSL/OKLCH tokens
  - Hairlines & rings (global rule)
  - Ready utility classes
  - UI patterns & motion rules

### Workflows & Processes

- **[workflow-playbook.md](./workflow-playbook.md)** - Epic workflow and delivery process
  - Required gates (validate, build, smoke test)
  - Branch & PR ritual
  - Epic template
  - Plan-First output format
  - Database changes
  - Docs pipeline

- **[commit.md](./commit.md)** - Git commit workflow
  - Conventional commit standards
  - Atomic commit principles
  - Interactive workflow
  - Quality standards

- **[aw.md](./aw.md)** - Always Works™ testing checklist
  - Core philosophy
  - 30-second reality check
  - Test requirements
  - Embarrassment test

### Reference Documentation

- **[project-context.md](./project-context.md)** - Project overview and stack reference
  - Overview and goals
  - Core stack (Next.js, TypeScript, Tailwind, Prisma, etc.)
  - Scripts and commands
  - Directory structure
  - Prisma models
  - Environment variables
  - Visual language & motion
  - Conventions

- **[ConversationStarter.md](./ConversationStarter.md)** - Canned prompts for common tasks
  - Core development starters
  - Code & architecture starters
  - Design & UX starters
  - Docs & knowledge starters

---

## 🎯 Hvornår Bruger Jeg Hvilken Fil?

### Når jeg skal implementere noget nyt:
1. Start med **[workflow-playbook.md](./workflow-playbook.md)** - følg Plan-First workflow
2. Tjek **[guards.md](./guards.md)** - sikr compliance med alle regler
3. Tjek **[design-tokens.md](./design-tokens.md)** - brug korrekte tokens og patterns
4. Test med **[aw.md](./aw.md)** - sikr det virker før commit

### Når jeg skal committe:
1. Følg **[commit.md](./commit.md)** - brug conventional commits
2. Tjek **[aw.md](./aw.md)** - sikr det virker
3. Valider med `pnpm run validate` og `pnpm build` (se [workflow-playbook.md](./workflow-playbook.md))

### Når jeg er i tvivl om:
- **Styling/Design**: Se [design-tokens.md](./design-tokens.md)
- **Code struktur**: Se [guards.md](./guards.md) → Code Organization
- **Workflow**: Se [workflow-playbook.md](./workflow-playbook.md)
- **Projekt setup**: Se [project-context.md](./project-context.md)

---

## 🔗 Cross-References

Alle guardrails filer refererer til hinanden:
- `guards.md` → `design-tokens.md`, `aw.md`, `commit.md`
- `workflow-playbook.md` → `guards.md` for specifikke regler
- `commit.md` → `aw.md` for test requirements
- Alle filer → `README.md` (denne fil) for oversigt

---

## 📝 Opdateringslog

- **2024-12-XX**: Oprettet master index og omstruktureret guardrails
  - Oprettet `README.md` som master index med quick reference
  - Reorganiseret `guards.md` med quick reference sektion og cross-references
  - Konsolideret `PastethisintheInstructionsbox.md` ind i `workflow-playbook.md`
  - Tilføjet cross-references til alle guardrails filer
  - Alle filer opdateret med bedre organisation og links

---

## 💡 Tips

1. **Læs Quick Reference først** - de kritiske regler er samlet her
2. **Brug Plan-First workflow** - altid plan før implementation
3. **Test før commit** - følg Always Works™ checklist
4. **Tjek cross-references** - hvis en fil nævner en anden, læs den også
5. **Opdater guardrails** - hvis du finder gaps eller forbedringer, opdater filerne

