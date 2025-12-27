# TODO Overblik - Rundeklar App Forbedringer

**Opdateret:** 2024-12-XX  
**Status:** ~31/33 Completed (~94%) - 1-2 todos tilbage

---

## ✅ Completed Todos (20)

### Sprint 1: Kritiske Fixes ✅ (100%)
- ✅ Fix README.md - Opdateret til Postgres/Neon
- ✅ Review ARCHITECTURE.md - Opdateret til Postgres/Neon
- ✅ Implementer Edit Tenant Modal
- ✅ Implementer Create Admin Modal
- ✅ Fix Double Search/Filtering
- ✅ Training Groups Creation - Dokumenteret
- ✅ Remove Old Supabase Files
- ✅ Remove PrismTest
- ✅ Remove packages/main
- ✅ Kritiske TODOs - Dokumenteret

### Sprint 2: Vigtige Forbedringer ✅ (~88%)
- ✅ Statistics Data Loading Optimization - Preload implementeret
- ✅ Cross-group Search - Multiple Exclude GroupIds
- ✅ Level System - Bedre Labeling (tooltips)
- ✅ Partner Preferences - Bedre Onboarding (tooltips og dialogs)
- ✅ Players Table - Mobile Responsive Layout - Card-based layout implementeret
- ✅ Match Program - Mobile Interaction Pattern - Move button modal implementeret
- ✅ Type Safety - Fix any Types - De fleste any types er fixet eller dokumenteret

### Sprint 3: Nice-to-Have Features ✅ (50%)
- ✅ Players Export - CSV export
- ✅ Players Import - CSV import med validation
- ✅ Bulk Edit Players - Checkbox selection og bulk edit modal
- ✅ Bulk Check-in - Check flere spillere ind samtidigt
- ✅ Standard Button Variants - Standardiseret
- ✅ Standard Card Patterns - Standardiseret

### Sprint 4: Tech Debt & Cleanup ✅ (100%)
- ✅ Kritiske TODOs - Dokumenteret
- ✅ Remove Old Supabase Files
- ✅ Remove PrismTest
- ✅ Simplify Hook Dependencies - Completed
- ✅ Extract Reusable Hooks - useScrollRestoration og useSelection ekstraheret

### Sprint 5: Testing & Documentation ✅ (~75%)
- ✅ Missing JSDoc - Forbedret dokumentation for API funktioner
- ✅ API Documentation - Omfattende API_DOCUMENTATION.md eksisterer

---

## ⏳ Pending Todos (0-1)

## 🔄 Deferred Todos (1)

### Sprint 2: Vigtige Forbedringer (0 pending)

#### Epic 2.2: Performance Forbedringer
- ✅ **perf-list-virtualization** - List Virtualization
  - **Effort:** 2-3 dage (COMPLETED)
  - **Beskrivelse:** Implementeret react-window for lange lister:
    - `DataTable` component (automatisk for 50+ items)
    - `PlayersDB` mobile card view (30+ items)
    - `CheckIn` available players liste (30+ items)
    - `CheckIn` checked-in players liste (20+ items, med gender grouping)
  - **Files:** `packages/webapp/src/components/ui/Table.tsx`, `packages/webapp/src/routes/PlayersDB.tsx`, `packages/webapp/src/routes/CheckIn.tsx`

### Sprint 3: Nice-to-Have Features (1 pending)

#### Epic 3.1: Import/Export Funktionalitet
- 🔄 **feature-statistics-export** - Statistics Export (DEFERRED - ikke prioriteret)
  - **Effort:** 2 dage
  - **Beskrivelse:** Tilføj mulighed for at eksportere statistikker til CSV/PDF. Tilføj export button til statistics views, export til CSV/PDF, inkluder charts som billeder hvis muligt
  - **File:** `packages/webapp/src/routes/Statistics.tsx`
  - **Note:** CSV export er allerede implementeret, mangler PDF export og chart images. Ikke prioriteret - fokus på test stability.

### Sprint 5: Testing & Documentation (1-2 pending)

#### Epic 5.1: Test Coverage
- ✅ **test-unit-hooks** - Unit Tests for Hooks (COMPLETED)
  - **Effort:** 1-2 dage (COMPLETED)
  - **Beskrivelse:** Unit test for useScrollRestoration er implementeret
  - **Files:** `packages/webapp/tests/unit/hooks/useScrollRestoration.test.ts`

- ⏳ **test-e2e-stabilization** - E2E Test Stabilization
  - **Effort:** 2-3 dage
  - **Beskrivelse:** Review alle E2E tests og fix fragile tests, tilføj missing tests for kritiske flows
  - **Files:** `packages/webapp/tests/e2e/`

---

## 🔄 Deferred Todos (1)

### Epic 2.4: UX Forbedringer (Deferred)
- 🔄 **ux-auto-match-balance** - Auto-match - Balance Scoring (DEFERRED)
  - **Effort:** 2-3 dage
  - **Beskrivelse:** Overvej at tilføje balance scoring baseret på levels, giv mulighed for at vælge mellem random og balanced
  - **File:** `packages/webapp/src/api/matches.ts`
  - **Status:** DEFERRED - Skal implementeres på separat branch efter fokuseret dialog. Nuværende løsning fungerer, og tidligere implementeringer har haft problemer. Kræver grundig diskussion om implementeringsstrategi først.

---

## 📊 Statistik

**Total Todos:** 33 (inkl. 1 deferred)  
**Completed:** ~31 (~94%)  
**Pending:** 1-2 (~6%)  
**Deferred:** 1 (~3%)

**Sprint 1:** ✅ 100% Complete (10/10)  
**Sprint 2:** ✅ ~88% Complete (7/8, 1 deferred)  
**Sprint 3:** ✅ ~83% Complete (5/6)  
**Sprint 4:** ✅ 100% Complete (4/4)  
**Sprint 5:** ✅ ~75% Complete (3/4)

---

## 🎯 Prioriteret Liste af Resten Todos

### Høj Priority (Sprint 2)
1. ✅ **perf-list-virtualization** - Performance optimization for lange lister (COMPLETED)

### Mellem Priority (Sprint 3)
2. **feature-statistics-export** - PDF export og chart images

### Lav Priority (Sprint 5)
3. **test-unit-hooks** - Unit test for useScrollRestoration (useSelection har allerede test)
4. **test-e2e-stabilization** - E2E test stabilization

### Deferred (Separat Branch)
- 🔄 **ux-auto-match-balance** - Balance scoring for auto-match (DEFERRED - kræver fokuseret dialog først)

### Deferred (Separat Branch)
- 🔄 **ux-auto-match-balance** - Balance scoring for auto-match (DEFERRED - kræver fokuseret dialog først)

---

## 📝 Noter

- **Næsten færdig:** ~94% af alle todos er completed (31/33)
- Alle kritiske fixes (Sprint 1) er implementeret og klar til test
- Mobile improvements: Players table og Match Program mobile interaction er implementeret
- Bulk operations (bulk edit, bulk check-in) er implementeret
- CSV import/export er implementeret
- Design consistency (buttons, cards) er standardiseret
- Reusable hooks: useScrollRestoration og useSelection er ekstraheret og bruges
- API documentation: Omfattende API_DOCUMENTATION.md eksisterer (616+ linjer)
- Type safety: De fleste any types er fixet eller dokumenteret
- JSDoc dokumentation er forbedret for API funktioner

**Næste skridt:** Fokus på E2E test stabilization - erstat waitForTimeout med proper waiting strategies.

