# TODO Overblik - Rundeklar App Forbedringer

**Opdateret:** 2024-12-27  
**Status:** 20/32 Completed (62.5%)

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

### Sprint 2: Vigtige Forbedringer ✅ (62.5%)
- ✅ Statistics Data Loading Optimization - Preload implementeret
- ✅ Cross-group Search - Multiple Exclude GroupIds
- ✅ Level System - Bedre Labeling (tooltips)
- ✅ Partner Preferences - Bedre Onboarding (tooltips og dialogs)

### Sprint 3: Nice-to-Have Features ✅ (50%)
- ✅ Players Export - CSV export
- ✅ Players Import - CSV import med validation
- ✅ Bulk Edit Players - Checkbox selection og bulk edit modal
- ✅ Bulk Check-in - Check flere spillere ind samtidigt
- ✅ Standard Button Variants - Standardiseret
- ✅ Standard Card Patterns - Standardiseret

### Sprint 4: Tech Debt & Cleanup ✅ (75%)
- ✅ Kritiske TODOs - Dokumenteret
- ✅ Remove Old Supabase Files
- ✅ Remove PrismTest
- ✅ Simplify Hook Dependencies - Completed

### Sprint 5: Testing & Documentation ✅ (50%)
- ✅ Missing JSDoc - Forbedret dokumentation for API funktioner

---

## ⏳ Pending Todos (11)

## 🔄 Deferred Todos (1)

### Sprint 2: Vigtige Forbedringer (3 pending)

#### Epic 2.1: Mobile Responsiveness
- ⏳ **mobile-players-table** - Players Table - Mobile Responsive Layout
  - **Effort:** 2 dage
  - **Beskrivelse:** Implementer card-based layout på mobile (< 768px), behold table layout på desktop
  - **File:** `packages/webapp/src/routes/PlayersDB.tsx`

- ⏳ **mobile-match-program** - Match Program - Mobile Interaction Pattern
  - **Effort:** 2-3 dage
  - **Beskrivelse:** Overvej alternativ interaction pattern på mobile (fx tap-to-select, dropdown menus) eller forbedre drag-and-drop med touch-friendly targets
  - **File:** `packages/webapp/src/routes/MatchProgram.tsx`

#### Epic 2.2: Performance Forbedringer
- ⏳ **perf-list-virtualization** - List Virtualization
  - **Effort:** 2-3 dage
  - **Beskrivelse:** Implementer react-window eller react-virtual for lange lister. Start med Players table, derefter Check-In liste
  - **Files:** `packages/webapp/src/routes/PlayersDB.tsx`, `packages/webapp/src/routes/CheckIn.tsx`

#### Epic 2.3: API Forbedringer
- ⏳ **api-type-safety** - Type Safety - Fix any Types
  - **Effort:** 2-3 dage
  - **Beskrivelse:** Review alle any types, fix hvor muligt, dokumenter hvor any er nødvendigt med TODO comments
  - **Files:** `packages/webapp/src/components/players/EditablePartnerCell.tsx`, `packages/webapp/src/api/postgres.ts`

#### Epic 2.4: UX Forbedringer
- 🔄 **ux-auto-match-balance** - Auto-match - Balance Scoring (DEFERRED)
  - **Effort:** 2-3 dage
  - **Beskrivelse:** Overvej at tilføje balance scoring baseret på levels, giv mulighed for at vælge mellem random og balanced
  - **File:** `packages/webapp/src/api/matches.ts`
  - **Status:** DEFERRED - Skal implementeres på separat branch efter fokuseret dialog. Nuværende løsning fungerer, og tidligere implementeringer har haft problemer.

### Sprint 3: Nice-to-Have Features (1 pending)

#### Epic 3.1: Import/Export Funktionalitet
- ⏳ **feature-statistics-export** - Statistics Export
  - **Effort:** 2 dage
  - **Beskrivelse:** Tilføj mulighed for at eksportere statistikker til CSV/PDF. Tilføj export button til statistics views, export til CSV/PDF, inkluder charts som billeder hvis muligt
  - **File:** `packages/webapp/src/routes/Statistics.tsx`
  - **Note:** CSV export er allerede implementeret, mangler PDF export og chart images

### Sprint 4: Tech Debt & Cleanup (1 pending)

#### Epic 4.3: Code Quality Improvements
- ⏳ **refactor-reusable-hooks** - Extract Reusable Hooks
  - **Effort:** 2-3 dage
  - **Beskrivelse:** Identificer duplikeret code (scroll restoration, animation handling) og extract til reusable hooks
  - **Files:** Multiple

### Sprint 5: Testing & Documentation (3 pending)

#### Epic 5.1: Test Coverage
- ⏳ **test-unit-hooks** - Unit Tests for Hooks
  - **Effort:** 3-4 dage
  - **Beskrivelse:** Tilføj unit tests for alle hooks, test edge cases, test error handling
  - **Files:** `packages/webapp/src/hooks/`

- ⏳ **test-e2e-stabilization** - E2E Test Stabilization
  - **Effort:** 2-3 dage
  - **Beskrivelse:** Review alle E2E tests og fix fragile tests, tilføj missing tests for kritiske flows
  - **Files:** `packages/webapp/tests/e2e/`

#### Epic 5.2: Documentation Improvements
- ⏳ **doc-api** - API Documentation
  - **Effort:** 2-3 dage
  - **Beskrivelse:** Dokumenter alle API endpoints, tilføj request/response examples, dokumenter error cases
  - **Files:** `packages/webapp/src/api/`

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

**Total Todos:** 32  
**Completed:** 20 (62.5%)  
**Pending:** 11 (34.4%)  
**Deferred:** 1 (3.1%)

**Sprint 1:** ✅ 100% Complete (10/10)  
**Sprint 2:** ✅ 62.5% Complete (5/8, 1 deferred)  
**Sprint 3:** ✅ 83% Complete (5/6)  
**Sprint 4:** ✅ 75% Complete (3/4)  
**Sprint 5:** ✅ 50% Complete (2/4)

---

## 🎯 Prioriteret Liste af Resten Todos

### Høj Priority (Sprint 2)
1. **mobile-players-table** - Mobile responsive layout for players table
2. **perf-list-virtualization** - Performance optimization for lange lister
3. **api-type-safety** - Type safety improvements

### Mellem Priority (Sprint 2-3)
4. **mobile-match-program** - Mobile interaction pattern for match program
5. **feature-statistics-export** - PDF export og chart images

### Lavest Priority (Deferred - Separat Branch)
6. **ux-auto-match-balance** - Balance scoring for auto-match (DEFERRED - kræver fokuseret dialog først)

### Lav Priority (Sprint 4-5)
7. **test-e2e-stabilization** - E2E test stabilization
8. **doc-api** - API documentation

---

## 📝 Noter

- Alle kritiske fixes (Sprint 1) er implementeret og klar til test
- Bulk operations (bulk edit, bulk check-in) er implementeret
- CSV import/export er implementeret
- Design consistency (buttons, cards) er standardiseret
- JSDoc dokumentation er forbedret for API funktioner

**Næste skridt:** Fokus på mobile responsiveness og performance optimeringer.

