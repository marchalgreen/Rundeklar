# Guardrails Omstrukturering - Analyse og Forslag

## 📊 Nuværende Struktur

### Guardrails Filer (Core)
1. **`guards.md`** (225 linjer) - Hovedguardrails
   - Architecture & File Structure
   - Styling & Design System
   - Responsive Design
   - Docs & Documentation System
   - Database / Prisma
   - Build & Quality Gates
   - Code Comments & JSDoc
   - Accessibility & Localization
   - Performance
   - Windowing & Desktop Behavior
   - Security & Data Integrity
   - Code Organization & Best Practices

2. **`design-tokens.md`** (163 linjer) - Design tokens og UI konventioner
   - Token source & mapping
   - Core HSL/OKLCH tokens
   - Hairlines & rings
   - Ready utility classes
   - UI patterns & motion rules

3. **`commit.md`** (128 linjer) - Git commit workflow
   - Conventional commit standards
   - Atomic commit principles
   - Interactive workflow

4. **`aw.md`** (51 linjer) - Always Works™ testing checklist
   - Core philosophy
   - Reality check questions
   - Test requirements

### Workflow & Context Filer
5. **`workflow-playbook.md`** (148 linjer) - Epic workflow og delivery
   - Required gates
   - Branch & PR ritual
   - Epic template
   - Plan-First output format
   - Database changes
   - Docs pipeline

6. **`PastethisintheInstructionsbox.md`** (36 linjer) - Baseline instructions
   - Role definition
   - Stack reference
   - Must pass gates
   - Output format
   - Style & UX
   - Safety

7. **`project-context.md`** (155 linjer) - Projektoversigt
   - Overview
   - Core stack
   - Scripts
   - Directory structure
   - Prisma models
   - Environment variables
   - Visual language & motion
   - Conventions
   - Documentation system

8. **`ConversationStarter.md`** (64 linjer) - Canned prompts
   - Core development starters
   - Code & architecture starters
   - Design & UX starters
   - Docs & knowledge starters

### Specifikke Dokumenter (Ikke guardrails)
9. **`auto-arrange-issue.md`** - Specifik issue dokumentation
10. **`matchprogram-refactor-plan.md`** - Specifik refactoring plan

---

## 🔍 Identificerede Problemer

### 1. Overlap og Duplikation
- **Tailwind tokens**: Nævnt i både `guards.md` og `design-tokens.md`
- **Responsive design**: Detaljeret i `guards.md`, men kun kort nævnt i `PastethisintheInstructionsbox.md`
- **Plan-First workflow**: Beskrevet i både `workflow-playbook.md` og `PastethisintheInstructionsbox.md`
- **Validation gates**: Nævnt i flere filer med lidt forskellige formuleringer
- **Database changes**: Beskrevet i både `guards.md` og `workflow-playbook.md`

### 2. Manglende Cross-References
- Filer refererer ikke konsekvent til hinanden
- `guards.md` nævner `design-tokens.md`, men ikke `aw.md` eller `commit.md`
- `workflow-playbook.md` refererer ikke til `guards.md` for specifikke regler

### 3. Strukturelle Uklarheder
- `guards.md` er meget omfattende (225 linjer) og kunne være bedre organiseret
- `aw.md` er isoleret og kunne være integreret bedre
- `PastethisintheInstructionsbox.md` og `workflow-playbook.md` overlapper betydeligt

### 4. Prioritering og Hierarki
- Ingen klar indikation af hvilke regler der er mest kritiske
- Alle guardrails præsenteres som lige vigtige
- Mangler "quick reference" for de mest almindelige regler

---

## 💡 Forslag til Omstrukturering

### Option 1: Hierarkisk Struktur (Anbefalet)

```
prompts/agentPrompts/
├── README.md                          # Master index med oversigt
├── guards.md                          # Hovedguardrails (reorganiseret)
├── design-tokens.md                   # Behold som er (reference)
├── commit.md                          # Behold som er (workflow)
├── aw.md                              # Behold som er (testing)
├── workflow-playbook.md               # Konsolideret med PastethisintheInstructionsbox
├── project-context.md                 # Behold som er (reference)
└── ConversationStarter.md            # Behold som er (reference)
```

**Ændringer:**
1. **Opret `README.md`** - Master index der:
   - Beskriver hver fils formål
   - Viser hvornår man skal bruge hvilken fil
   - Giver quick reference til de mest kritiske regler
   - Linker til alle guardrails filer

2. **Reorganiser `guards.md`** - Strukturer med:
   - **CRITICAL** sektioner tydeligt markeret
   - Bedre kategorisering (Code Quality, Architecture, Security, etc.)
   - Cross-references til andre filer
   - Quick reference sektion øverst

3. **Konsolider workflow filer** - Merge `PastethisintheInstructionsbox.md` ind i `workflow-playbook.md`:
   - Behold alle detaljer fra begge
   - Organiser i logiske sektioner
   - Fjern duplikation

4. **Forbedre cross-references** - Tilføj links mellem filer:
   - `guards.md` → `design-tokens.md`, `aw.md`, `commit.md`
   - `workflow-playbook.md` → `guards.md` for specifikke regler
   - Alle filer → `README.md` for oversigt

### Option 2: Flad Struktur med Bedre Organisation

Behold alle filer, men:
- Tilføj tydelige sektioner i `guards.md` med prioritet
- Opret `QUICK_REFERENCE.md` med de mest kritiske regler
- Tilføj cross-references i alle filer
- Konsolider kun `PastethisintheInstructionsbox.md` ind i `workflow-playbook.md`

---

## 🎯 Anbefalet Implementering (Option 1)

### Fase 1: Opret Master Index
- Opret `README.md` med oversigt over alle guardrails
- Inkluder quick reference til kritiske regler
- Link til alle relevante filer

### Fase 2: Reorganiser guards.md
- Tilføj "Quick Reference" sektion øverst
- Markér CRITICAL sektioner tydeligt
- Organiser i logiske kategorier
- Tilføj cross-references til andre filer

### Fase 3: Konsolider Workflow Filer
- Merge `PastethisintheInstructionsbox.md` ind i `workflow-playbook.md`
- Organiser i logiske sektioner
- Fjern duplikation

### Fase 4: Forbedre Cross-References
- Tilføj links i alle filer
- Sikr konsistent referencestil
- Opdater eksisterende referencer

---

## 📋 Quick Reference Template (til README.md)

```markdown
# Guardrails Quick Reference

## 🚨 CRITICAL Rules (Must Always Follow)
1. **Responsive Design**: ALL UI must be responsive (mobile-first)
2. **Design Tokens**: Use `hsl(var(--token))` - never hardcoded colors
3. **Error Handling**: Use `normalizeError` from `src/lib/errors.ts`
4. **Testing**: Always Works™ - test before claiming it works
5. **Plan First**: Always propose plan before implementation
6. **No console.log**: Never use console.log/error in production code

## 📚 Full Documentation
- [guards.md](./guards.md) - Complete engineering guardrails
- [design-tokens.md](./design-tokens.md) - Design system tokens
- [commit.md](./commit.md) - Git commit workflow
- [aw.md](./aw.md) - Testing checklist
- [workflow-playbook.md](./workflow-playbook.md) - Epic workflow
- [project-context.md](./project-context.md) - Project overview
```

---

## ✅ Success Criteria

Efter omstrukturering skal:
1. ✅ Alle kritiske regler være let tilgængelige
2. ✅ Ingen duplikation mellem filer
3. ✅ Klar hierarki og prioritet
4. ✅ Cross-references mellem alle relevante filer
5. ✅ Quick reference for hurtig opslag
6. ✅ Konsistent struktur og formatering

---

## 🔄 Migration Plan

1. **Backup**: Kopier alle eksisterende filer til `_backup/` mappe
2. **Opret README.md**: Master index med quick reference
3. **Reorganiser guards.md**: Tilføj quick reference, markér CRITICAL, bedre struktur
4. **Konsolider workflow**: Merge `PastethisintheInstructionsbox.md` → `workflow-playbook.md`
5. **Tilføj cross-references**: Opdater alle filer med links
6. **Valider**: Test at alle referencer virker
7. **Opdater workspace rules**: Opdater `always_applied_workspace_rules` hvis nødvendigt

---

## 📝 Noter

- Behold alle eksisterende filer som reference (flyt til `_backup/` eller `_archive/`)
- Test at alle referencer virker efter omstrukturering
- Overvej at tilføje "Last Updated" datoer til filer
- Overvej versionering af guardrails hvis der kommer større ændringer

