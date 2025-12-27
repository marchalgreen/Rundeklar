# Implementeringsplan - Rundeklar App Forbedringer

**Oprettet:** 2024-12-XX  
**Baseret på:** Kritisk Gennemgang Findings  
**Status:** Klar til implementering

---

## Oversigt

Denne plan organiserer alle findings fra den kritiske gennemgang i prioriterede epics og issues, klar til implementering. Planen er struktureret i sprints/epics med klare deliverables.

---

## Sprint 1: Kritiske Fixes (Høj Priority)

**Mål:** Fix kritiske bugs og dokumentationsfejl der påvirker brugeroplevelsen eller forvirrer udviklere.

**Varighed:** 1-2 uger  
**Effort:** ~5-8 dage

### Epic 1.1: Dokumentation Fixes

**Beskrivelse:** Fix kritiske dokumentations inconsistencies der kan forvirre udviklere og brugere.

**Issues:**

1. **Fix README.md - Opdater til Postgres/Neon**
   - **File:** `README.md`
   - **Problem:** README nævner IndexedDB men app bruger Postgres (Vercel Neon)
   - **Løsning:** Opdater README til at reflektere faktisk implementering (Postgres/Neon backend via Vercel API routes)
   - **Effort:** 1 time
   - **Acceptance Criteria:**
     - README beskriver korrekt tech stack (Postgres/Neon, ikke IndexedDB eller Supabase)
     - Setup instruktioner er korrekte
     - Architecture diagram opdateret hvis nødvendigt

2. **Review og opdater ARCHITECTURE.md**
   - **File:** `packages/webapp/ARCHITECTURE.md`
   - **Problem:** Kan være outdated vs faktisk implementering
   - **Løsning:** Review hele filen og opdater hvor nødvendigt
   - **Effort:** 2-3 timer
   - **Acceptance Criteria:**
     - ARCHITECTURE.md matcher faktisk implementering
     - Alle referenced patterns er korrekte
     - Data flow diagrammer er opdateret

**Deliverables:**
- Opdateret README.md
- Opdateret ARCHITECTURE.md

---

### Epic 1.2: Admin Funktionalitet - Manglende Features

**Beskrivelse:** Implementer manglende admin funktionalitet identificeret via TODO comments.

**Issues:**

1. **Implementer Edit Tenant Modal**
   - **File:** `packages/webapp/src/routes/admin/TenantDetails.tsx:194`
   - **Problem:** TODO comment "Open edit modal" - funktionalitet mangler
   - **Løsning:** 
     - Opret `EditTenantModal` component
     - Implementer form med tenant fields
     - Integrer med tenant update API
   - **Effort:** 1 dag
   - **Acceptance Criteria:**
     - Edit button åbner modal
     - Form kan opdatere tenant data
     - Success/error handling fungerer
     - Modal kan lukkes og annulleres

2. **Implementer Create Admin Modal**
   - **File:** `packages/webapp/src/routes/admin/TenantDetails.tsx:285`
   - **Problem:** TODO comment "Open create admin modal" - funktionalitet mangler
   - **Løsning:**
     - Opret `CreateAdminModal` component
     - Implementer form med admin fields (email, password, role)
     - Integrer med admin creation API
   - **Effort:** 1 dag
   - **Acceptance Criteria:**
     - Create button åbner modal
     - Form kan oprette ny admin
     - Validation fungerer
     - Success/error handling fungerer

**Deliverables:**
- EditTenantModal component
- CreateAdminModal component
- Integration med admin API
- Tests for nye modals

---

### Epic 1.3: Players Management - Kritiske Fixes

**Beskrivelse:** Fix kritiske problemer i Players Management der påvirker funktionalitet.

**Issues:**

1. **Fix Double Search/Filtering**
   - **File:** `packages/webapp/src/routes/PlayersDB.tsx`
   - **Problem:** Søgning sker både i API (`usePlayers` med `q` filter) og client-side (`filteredPlayers` useMemo)
   - **Løsning:** 
     - **Option A (anbefalet):** Fjern client-side filtering, brug kun API filtering
     - **Option B:** Fjern API filtering, brug kun client-side (hvis alle spillere allerede er hentet)
     - Anbefaling: Option A for bedre performance med store datasets
   - **Effort:** 2-3 timer
   - **Acceptance Criteria:**
     - Søgning sker kun ét sted (enten API eller client)
     - Performance er forbedret
     - Søgning fungerer korrekt

2. **Training Groups Creation - Synkroniser med Backend**
   - **File:** `packages/webapp/src/components/players/PlayerForm.tsx`
   - **Problem:** Nye training groups oprettes kun lokalt i form - ikke synkroniseret med backend
   - **Løsning:**
     - Opret API endpoint til at oprette training groups
     - Opdater `PlayerForm` til at kalde API når ny gruppe tilføjes
     - Opdater `fetchTrainingGroups` til at inkludere nye groups
   - **Effort:** 1 dag
   - **Acceptance Criteria:**
     - Nye training groups gemmes i backend
     - Groups forsvinder ikke ved refresh
     - Groups er synlige for alle brugere
     - Error handling fungerer

**Deliverables:**
- Fixed search/filtering logic
- Training groups API endpoint
- Updated PlayerForm component
- Tests for training groups creation

---

## Sprint 2: Vigtige Forbedringer (Mellem Priority)

**Mål:** Forbedre UX og performance i kritiske flows.

**Varighed:** 2-3 uger  
**Effort:** ~10-15 dage

### Epic 2.1: Mobile Responsiveness

**Beskrivelse:** Forbedre mobile UX for kritiske features.

**Issues:**

1. **Players Table - Mobile Responsive Layout**
   - **File:** `packages/webapp/src/routes/PlayersDB.tsx`
   - **Problem:** Players table kan være svær at bruge på mobile
   - **Løsning:**
     - Implementer card-based layout på mobile (< 768px)
     - Behold table layout på desktop
     - Tilføj sticky headers på mobile hvis table bruges
   - **Effort:** 2 dage
   - **Acceptance Criteria:**
     - Players vises som cards på mobile
     - Alle funktioner er tilgængelige på mobile
     - Layout er responsivt og brugervenligt
     - Performance er god på mobile

2. **Match Program - Mobile Interaction Pattern**
   - **File:** `packages/webapp/src/routes/MatchProgram.tsx`
   - **Problem:** Drag-and-drop kan være kompleks på mobile
   - **Løsning:**
     - Overvej alternativ interaction pattern på mobile (fx tap-to-select, dropdown menus)
     - Eller forbedre drag-and-drop med touch-friendly targets
   - **Effort:** 2-3 dage
   - **Acceptance Criteria:**
     - Match program er brugbart på mobile
     - Alternative interaction pattern fungerer godt
     - Alle funktioner er tilgængelige

**Deliverables:**
- Responsive Players table/cards
- Mobile-friendly Match Program interaction
- Tests for mobile layouts

---

### Epic 2.2: Performance Forbedringer

**Beskrivelse:** Forbedre performance for lange lister og store datasets.

**Issues:**

1. **List Virtualization**
   - **Files:** 
     - `packages/webapp/src/routes/PlayersDB.tsx`
     - `packages/webapp/src/routes/CheckIn.tsx`
   - **Problem:** Lange lister bruger ikke virtualization
   - **Løsning:**
     - Implementer `react-window` eller `react-virtual` for lange lister
     - Start med Players table (mest kritisk)
     - Derefter Check-In liste
   - **Effort:** 2-3 dage
   - **Acceptance Criteria:**
     - Virtualization fungerer korrekt
     - Performance er forbedret med 100+ items
     - Scroll fungerer smooth
     - Alle funktioner fungerer med virtualization

2. **Statistics Data Loading Optimization**
   - **File:** `packages/webapp/src/routes/Statistics.tsx`
   - **Problem:** Training attendance kun loades når training view er aktiv - langsomt første gang
   - **Løsning:**
     - Preload data i baggrunden når Statistics page åbnes
     - Vis loading state bedre
     - Overvej caching strategi
   - **Effort:** 1 dag
   - **Acceptance Criteria:**
     - Data preloades i baggrunden
     - Loading state er tydelig
     - Performance er forbedret

**Deliverables:**
- Virtualized lists
- Optimized data loading
- Performance tests

---

### Epic 2.3: API Forbedringer

**Beskrivelse:** Forbedre API funktionalitet og type safety.

**Issues:**

1. **Cross-group Search - Multiple Exclude GroupIds**
   - **File:** `packages/webapp/src/routes/CheckIn.tsx:100`
   - **Problem:** API understøtter kun single excludeGroupId
   - **Løsning:**
     - **Option A:** Opdater API til at understøtte array af excludeGroupIds
     - **Option B:** Fix client-side filtering til at håndtere multiple groups
     - Anbefaling: Option A for bedre separation of concerns
   - **Effort:** 1 dag
   - **Acceptance Criteria:**
     - Cross-group search ekskluderer alle valgte grupper
     - API understøtter multiple excludeGroupIds
     - Client-side filtering fungerer korrekt

2. **Type Safety - Fix `any` Types**
   - **Files:**
     - `packages/webapp/src/components/players/EditablePartnerCell.tsx`
     - `packages/webapp/src/api/postgres.ts`
   - **Problem:** Nogle `any` types bruges uden dokumentation
   - **Løsning:**
     - Review alle `any` types
     - Fix hvor muligt
     - Dokumenter hvor `any` er nødvendigt med TODO comments
   - **Effort:** 2-3 dage
   - **Acceptance Criteria:**
     - Alle `any` types er enten fixed eller dokumenteret
     - Type safety er forbedret
     - Code er lettere at vedligeholde

**Deliverables:**
- Updated API endpoints
- Improved type safety
- Documentation updates

---

### Epic 2.4: UX Forbedringer - Badminton-specifikke

**Beskrivelse:** Forbedre UX for badminton-specifikke features.

**Issues:**

1. **Level System - Bedre Labeling**
   - **File:** `packages/webapp/src/routes/PlayersDB.tsx`
   - **Problem:** "Rangliste" navn kan være forvirrende
   - **Løsning:**
     - Tilføj tooltips der forklarer systemet
     - Overvej at ændre label til "Rangliste (BadmintonPlayer.dk)" eller lignende
     - Tilføj help text i form
   - **Effort:** 2-3 timer
   - **Acceptance Criteria:**
     - Labels er tydelige
     - Tooltips forklarer systemet
     - Help text er tilgængelig

2. **Partner Preferences - Bedre Onboarding**
   - **File:** `packages/webapp/src/components/players/EditablePartnerCell.tsx`
   - **Problem:** Bidirectional relationships kan være forvirrende
   - **Løsning:**
     - Tilføj tooltip der forklarer partner relationships
     - Forbedre confirmation dialog tekst
     - Overvej onboarding flow første gang
   - **Effort:** 1 dag
   - **Acceptance Criteria:**
     - Partner relationships er tydelige
     - Confirmation dialogs er informative
     - Onboarding hjælper nye brugere

3. **Auto-match - Balance Scoring**
   - **File:** `packages/webapp/src/api/matches.ts`
   - **Problem:** Auto-match giver random matches - ingen garanti for balance
   - **Løsning:**
     - Overvej at tilføje balance scoring baseret på levels
     - Giv mulighed for at vælge mellem random og balanced
   - **Effort:** 2-3 dage
   - **Acceptance Criteria:**
     - Balance scoring fungerer
     - Bruger kan vælge mellem random og balanced
     - Matches er mere balancerede

**Deliverables:**
- Improved labeling and tooltips
- Better onboarding
- Balance scoring for auto-match

---

## Sprint 3: Nice-to-Have Features (Lav Priority)

**Mål:** Tilføj features der forbedrer brugeroplevelsen men ikke er kritiske.

**Varighed:** 2-3 uger  
**Effort:** ~8-12 dage

### Epic 3.1: Import/Export Funktionalitet

**Beskrivelse:** Tilføj mulighed for at importere/eksportere data.

**Issues:**

1. **Players Export**
   - **File:** `packages/webapp/src/routes/PlayersDB.tsx`
   - **Løsning:**
     - Tilføj export button
     - Export til CSV format
     - Inkluder alle player fields
   - **Effort:** 1 dag
   - **Acceptance Criteria:**
     - Export fungerer korrekt
     - CSV format er korrekt
     - Alle fields er inkluderet

2. **Statistics Export**
   - **File:** `packages/webapp/src/routes/Statistics.tsx`
   - **Løsning:**
     - Tilføj export button til statistics views
     - Export til CSV/PDF
     - Inkluder charts som billeder hvis muligt
   - **Effort:** 2 dage
   - **Acceptance Criteria:**
     - Export fungerer for begge views
     - Format er korrekt
     - Charts eksporteres korrekt

3. **Players Import**
   - **File:** `packages/webapp/src/routes/PlayersDB.tsx`
   - **Løsning:**
     - Tilføj import button
     - Parse CSV fil
     - Validate data
     - Bulk create players
   - **Effort:** 2-3 dage
   - **Acceptance Criteria:**
     - Import fungerer korrekt
     - Validation fungerer
     - Error handling er god
     - Bulk create fungerer

**Deliverables:**
- Export functionality
- Import functionality
- CSV parsing and validation

---

### Epic 3.2: Bulk Operations

**Beskrivelse:** Tilføj mulighed for bulk operations på spillere.

**Issues:**

1. **Bulk Edit Players**
   - **File:** `packages/webapp/src/routes/PlayersDB.tsx`
   - **Løsning:**
     - Tilføj checkbox selection til table
     - Tilføj bulk edit modal
     - Support for at opdatere training groups, active status, etc.
   - **Effort:** 2-3 dage
   - **Acceptance Criteria:**
     - Selection fungerer korrekt
     - Bulk edit modal fungerer
     - Updates fungerer korrekt

2. **Bulk Check-in**
   - **File:** `packages/webapp/src/routes/CheckIn.tsx`
   - **Løsning:**
     - Tilføj checkbox selection til player list
     - Tilføj bulk check-in button
     - Check flere spillere ind samtidigt
   - **Effort:** 1-2 dage
   - **Acceptance Criteria:**
     - Selection fungerer korrekt
     - Bulk check-in fungerer
     - Animation feedback fungerer

**Deliverables:**
- Bulk selection UI
- Bulk edit functionality
- Bulk check-in functionality

---

### Epic 3.3: Design System Consistency

**Beskrivelse:** Standardiser design components for konsistens.

**Issues:**

1. **Standard Button Variants**
   - **Files:** Multiple
   - **Løsning:**
     - Review alle custom button styles
     - Erstat med standard variants hvor muligt
     - Extract til reusable component hvis nødvendigt
   - **Effort:** 1-2 dage
   - **Acceptance Criteria:**
     - Alle buttons bruger standard variants
     - Design er konsistent
     - Custom styles er minimeret

2. **Standard Card Patterns**
   - **Files:** Multiple
   - **Løsning:**
     - Review alle card implementations
     - Erstat med PageCard component hvor muligt
     - Extract til reusable component hvis nødvendigt
   - **Effort:** 1-2 dage
   - **Acceptance Criteria:**
     - Alle cards bruger PageCard eller standard pattern
     - Design er konsistent
     - Custom implementations er minimeret

**Deliverables:**
- Standardized components
- Consistent design
- Updated component library

---

## Sprint 4: Tech Debt & Cleanup

**Mål:** Rydde op i tech debt og forbedre code quality.

**Varighed:** 1-2 uger  
**Effort:** ~5-8 dage

### Epic 4.1: TODO Cleanup

**Beskrivelse:** Håndter eller fjern alle TODO comments.

**Issues:**

1. **Kritiske TODOs**
   - **Files:**
     - `packages/webapp/src/lib/rankings/badmintonplayer-api.ts:75`
     - `packages/webapp/src/lib/statistics/kpiCalculation.ts:231`
   - **Løsning:**
     - Review hver TODO
     - Implementer hvor nødvendigt
     - Fjern hvis ikke længere relevant
     - Dokumenter hvorfor hvis ikke implementeret
   - **Effort:** 2-3 dage
   - **Acceptance Criteria:**
     - Alle kritiske TODOs er håndteret
     - Code er opdateret eller dokumenteret

2. **Type-related TODOs**
   - **File:** `packages/webapp/src/api/postgres.ts`
   - **Løsning:**
     - Review alle type TODOs
     - Fix hvor muligt
     - Dokumenter hvor `any` er nødvendigt
   - **Effort:** 1-2 dage
   - **Acceptance Criteria:**
     - Alle type TODOs er håndteret
     - Types er forbedret eller dokumenteret

**Deliverables:**
- Cleaned up TODOs
- Improved type safety
- Documentation updates

---

### Epic 4.2: Outdated Code Cleanup

**Beskrivelse:** Fjern eller dokumenter outdated code.

**Issues:**

1. **Remove PrismTest**
   - **File:** `packages/webapp/src/routes/PrismTest.tsx`
   - **Løsning:**
     - Review om PrismTest stadig bruges
     - Fjern hvis ikke længere nødvendig
     - Dokumenter formål hvis det skal beholdes
   - **Effort:** 1 time
   - **Acceptance Criteria:**
     - PrismTest er enten fjernet eller dokumenteret
     - Navigation er opdateret hvis nødvendigt

2. **Remove packages/main**
   - **Directory:** `packages/main/`
   - **Løsning:**
     - Review om package skal bruges
     - Fjern hvis tom og ikke planlagt
   - **Effort:** 30 minutter
   - **Acceptance Criteria:**
     - Package er fjernet eller dokumenteret
     - Workspace config er opdateret

3. **Remove Old Supabase Files**
   - **Files:**
     - `packages/webapp/src/lib/supabase.ts`
     - `packages/webapp/src/api/supabase.ts`
   - **Problem:** Gamle Supabase filer eksisterer stadig men bruges ikke (migreret til Postgres)
   - **Løsning:**
     - Verificer at filerne ikke bruges (grep for imports)
     - Fjern filerne hvis de ikke bruges
     - Opdater imports hvis nogen filer stadig refererer til dem
   - **Effort:** 1 time
   - **Acceptance Criteria:**
     - Gamle Supabase filer er fjernet
     - Ingen imports til Supabase filer
     - Codebase bruger kun Postgres/Neon

**Deliverables:**
- Removed outdated code
- Updated navigation/config
- Documentation updates

---

### Epic 4.3: Code Quality Improvements

**Beskrivelse:** Forbedre code quality gennem refactoring.

**Issues:**

1. **Extract Reusable Hooks**
   - **Files:** Multiple
   - **Løsning:**
     - Identificer duplikeret code (scroll restoration, animation handling)
     - Extract til reusable hooks
     - Update alle usages
   - **Effort:** 2-3 dage
   - **Acceptance Criteria:**
     - Reusable hooks er oprettet
     - Code duplication er reduceret
     - All usages er opdateret

2. **Simplify Hook Dependencies**
   - **Files:** Multiple hooks
   - **Løsning:**
     - Review alle hook dependency arrays
     - Simplificer hvor muligt
     - Fix potentielle stale closure issues
   - **Effort:** 1-2 dage
   - **Acceptance Criteria:**
     - Dependency arrays er simplificeret
     - Stale closure issues er fixed
     - Code er lettere at forstå

**Deliverables:**
- Reusable hooks
- Simplified dependencies
- Improved code quality

---

## Sprint 5: Testing & Documentation

**Mål:** Forbedre test coverage og dokumentation.

**Varighed:** 1-2 uger  
**Effort:** ~5-8 dage

### Epic 5.1: Test Coverage

**Beskrivelse:** Øg test coverage for kritiske flows.

**Issues:**

1. **Unit Tests for Hooks**
   - **Files:** `packages/webapp/src/hooks/`
   - **Løsning:**
     - Tilføj unit tests for alle hooks
     - Test edge cases
     - Test error handling
   - **Effort:** 3-4 dage
   - **Acceptance Criteria:**
     - Alle hooks har tests
     - Coverage er > 80%
     - Edge cases er testet

2. **E2E Test Stabilization**
   - **Files:** `packages/webapp/tests/e2e/`
   - **Løsning:**
     - Review alle E2E tests
     - Fix fragile tests
     - Tilføj missing tests for kritiske flows
   - **Effort:** 2-3 dage
   - **Acceptance Criteria:**
     - Alle E2E tests er stabile
     - Kritiske flows er testet
     - Tests kører konsistent

**Deliverables:**
- Increased test coverage
- Stable E2E tests
- Test documentation

---

### Epic 5.2: Documentation Improvements

**Beskrivelse:** Forbedre dokumentation for developers.

**Issues:**

1. **Missing JSDoc**
   - **Files:** Multiple
   - **Løsning:**
     - Review alle exported functions
     - Tilføj manglende JSDoc
     - Forbedre eksisterende JSDoc
   - **Effort:** 2-3 dage
   - **Acceptance Criteria:**
     - Alle exported functions har JSDoc
     - JSDoc er informativt
     - Examples er inkluderet hvor relevant

2. **API Documentation**
   - **Files:** `packages/webapp/src/api/`
   - **Løsning:**
     - Dokumenter alle API endpoints
     - Tilføj request/response examples
     - Dokumenter error cases
   - **Effort:** 2-3 dage
   - **Acceptance Criteria:**
     - Alle API endpoints er dokumenteret
     - Examples er inkluderet
     - Error handling er dokumenteret

**Deliverables:**
- Complete JSDoc coverage
- API documentation
- Developer guides

---

## Prioriteringsmatrix

### Høj Priority (Sprint 1)
- Kritiske bugs der påvirker funktionalitet
- Dokumentationsfejl der forvirrer udviklere
- Manglende features der er påbegyndt (TODOs)

### Mellem Priority (Sprint 2)
- UX forbedringer der påvirker brugeroplevelsen
- Performance forbedringer
- Type safety improvements

### Lav Priority (Sprint 3-5)
- Nice-to-have features
- Design consistency
- Tech debt cleanup
- Testing improvements

---

## Success Metrics

### Sprint 1
- ✅ Alle kritiske bugs fixed
- ✅ Dokumentation er korrekt
- ✅ Manglende admin features implementeret

### Sprint 2
- ✅ Mobile UX er forbedret
- ✅ Performance er forbedret (målt via Lighthouse)
- ✅ Type safety er forbedret

### Sprint 3
- ✅ Import/Export funktionalitet tilgængelig
- ✅ Bulk operations tilgængelige
- ✅ Design er konsistent

### Sprint 4
- ✅ Tech debt er reduceret
- ✅ Code quality er forbedret
- ✅ Outdated code er fjernet

### Sprint 5
- ✅ Test coverage er > 80%
- ✅ Dokumentation er komplet
- ✅ E2E tests er stabile

---

## Næste Skridt

1. **Review plan** - Gennemgå planen med team
2. **Prioriter** - Juster prioriteter baseret på business needs
3. **Opret issues** - Opret issues i projekt management tool
4. **Start Sprint 1** - Begynd implementering af kritiske fixes
5. **Track progress** - Opdater planen løbende med status

---

## Noter

- Alle epics skal følge guidelines fra `prompts/agentPrompts/`
- Plan-first workflow skal bruges for større ændringer
- Alle changes skal testes før merge
- Documentation skal opdateres løbende

---

## Appendix: Quick Reference

### Files der skal ændres (Høj Priority)

1. `README.md` - Opdater tech stack (Postgres/Neon, ikke IndexedDB eller Supabase)
2. `packages/webapp/src/routes/admin/TenantDetails.tsx` - Implementer modals
3. `packages/webapp/src/routes/PlayersDB.tsx` - Fix search, training groups
4. `packages/webapp/src/components/players/PlayerForm.tsx` - Training groups API
5. `packages/webapp/src/lib/supabase.ts` - Fjern (gammel Supabase fil)
6. `packages/webapp/src/api/supabase.ts` - Fjern (gammel Supabase fil)

### Estimated Total Effort

- **Sprint 1:** 5-8 dage
- **Sprint 2:** 10-15 dage
- **Sprint 3:** 8-12 dage
- **Sprint 4:** 5-8 dage
- **Sprint 5:** 5-8 dage

**Total:** ~33-51 dage (6-10 uger med 1 developer)

