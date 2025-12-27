# Smoke Test Manual - Rundeklar App

**Dato:** 2024-12-XX  
**Version:** Post-implementation review  
**Formål:** Verificer at alle implementerede ændringer fungerer korrekt

---

## Forudsetninger

1. **Miljø Setup:**
   - Node.js ≥ 20 installeret
   - pnpm ≥ 9 installeret
   - Vercel CLI installeret (`npm i -g vercel`)
   - Postgres database (Vercel Neon) konfigureret
   - `.env.local` oprettet i `packages/webapp/` med `DATABASE_URL`

2. **Start Applikation:**
   ```bash
   # Terminal 1: Start Vite dev server
   pnpm dev
   
   # Terminal 2: Start Vercel API routes
   cd packages/webapp
   vercel dev
   ```

3. **Åbn Browser:**
   - Naviger til http://127.0.0.1:5173
   - Log ind med admin credentials

---

## Test Suite 1: Dokumentation & Cleanup

### Test 1.1: README.md Opdateringer
**Mål:** Verificer at README reflekterer korrekt tech stack

**Steps:**
1. Åbn `README.md` i projektet
2. Verificer at følgende er korrekt:
   - ✅ Tech stack nævner Postgres/Neon (ikke IndexedDB)
   - ✅ Setup instruktioner inkluderer Vercel CLI
   - ✅ Database setup sektion eksisterer
   - ✅ Tenant configuration dokumenteret

**Expected Result:**
- README beskriver korrekt Postgres/Neon backend
- Setup instruktioner er komplette

---

### Test 1.2: ARCHITECTURE.md Opdateringer
**Mål:** Verificer at ARCHITECTURE.md reflekterer faktisk implementering

**Steps:**
1. Åbn `packages/webapp/ARCHITECTURE.md`
2. Verificer at følgende er korrekt:
   - ✅ Overview nævner Postgres/Neon (ikke Supabase)
   - ✅ Data Access Layer beskriver Postgres client proxy
   - ✅ Data Flow diagram viser Vercel API routes
   - ✅ Integration Tests nævner Postgres client

**Expected Result:**
- ARCHITECTURE.md matcher faktisk implementering
- Alle Supabase referencer er erstattet med Postgres/Neon

---

### Test 1.3: Supabase Files Fjernet
**Mål:** Verificer at gamle Supabase filer er fjernet

**Steps:**
1. Verificer at følgende filer IKKE eksisterer:
   - ❌ `packages/webapp/src/lib/supabase.ts`
   - ❌ `packages/webapp/src/api/supabase.ts`

2. Verificer at ingen imports refererer til disse filer:
   ```bash
   grep -r "from.*supabase" packages/webapp/src
   grep -r "import.*supabase" packages/webapp/src
   ```

**Expected Result:**
- Supabase filer er fjernet
- Ingen imports til Supabase filer

---

### Test 1.4: PrismTest Fjernet
**Mål:** Verificer at PrismTest er fjernet

**Steps:**
1. Verificer at følgende fil IKKE eksisterer:
   - ❌ `packages/webapp/src/routes/PrismTest.tsx`

2. Verificer at navigation IKKE inkluderer 'prism-test':
   - Åbn `packages/webapp/src/contexts/NavigationContext.tsx`
   - Verificer at `Page` type ikke inkluderer 'prism-test'
   - Verificer at `knownPages` array ikke inkluderer 'prism-test'

3. Verificer at App.tsx ikke renderer PrismTestPage

**Expected Result:**
- PrismTest fil er fjernet
- Ingen referencer til 'prism-test' i navigation

---

## Test Suite 2: Admin Funktionalitet

### Test 2.1: Edit Tenant Modal
**Mål:** Verificer at Edit Tenant Modal fungerer

**Steps:**
1. Log ind som super admin
2. Naviger til Admin → Tenants
3. Klik på en tenant for at se detaljer
4. Klik på "Rediger" knap
5. Verificer at Edit Tenant Modal åbner
6. Test følgende:
   - ✅ Opdater tenant navn
   - ✅ Opdater logo filnavn
   - ✅ Opdater max baner
   - ✅ Klik "Gem ændringer"
   - ✅ Verificer success toast notification
   - ✅ Verificer at tenant data er opdateret
   - ✅ Test "Annuller" knap

**Expected Result:**
- Modal åbner korrekt
- Form kan opdatere tenant data
- Success/error handling fungerer
- Modal kan lukkes og annulleres

---

### Test 2.2: Create Admin Modal
**Mål:** Verificer at Create Admin Modal fungerer

**Steps:**
1. Log ind som super admin
2. Naviger til Admin → Tenants
3. Klik på en tenant for at se detaljer
4. Gå til "Administratorer" tab
5. Klik på "Opret Administrator" knap
6. Verificer at Create Admin Modal åbner
7. Test følgende:
   - ✅ Indtast email
   - ✅ Indtast password (minimum 8 tegn)
   - ✅ Bekræft password
   - ✅ Test validation (password mismatch, for kort password)
   - ✅ Klik "Opret administrator"
   - ✅ Verificer success toast notification
   - ✅ Verificer at admin vises i listen
   - ✅ Test "Annuller" knap

**Expected Result:**
- Modal åbner korrekt
- Form kan oprette ny admin
- Validation fungerer korrekt
- Success/error handling fungerer
- Ny admin vises i listen

---

## Test Suite 3: Players Management

### Test 3.1: Search/Filtering Fix
**Mål:** Verificer at søgning kun sker i API (ikke client-side)

**Steps:**
1. Naviger til Spillere siden
2. Verificer at der er spillere i listen
3. Test søgning:
   - ✅ Indtast søgeterm i søgefeltet
   - ✅ Verificer at resultater filtreres korrekt
   - ✅ Åbn browser DevTools → Network tab
   - ✅ Verificer at API request sendes med `q` parameter
   - ✅ Verificer at kun API filtering sker (ingen client-side filtering)

**Expected Result:**
- Søgning fungerer korrekt
- Kun API filtering sker (bedre performance)
- Network requests viser korrekt `q` parameter

---

### Test 3.2: Training Groups Creation
**Mål:** Verificer at training groups synkroniseres med backend

**Steps:**
1. Naviger til Spillere siden
2. Klik "Ny spiller" eller rediger eksisterende spiller
3. Scroll til "Træningsgrupper" sektion
4. Test følgende:
   - ✅ Indtast navn på ny gruppe i input felt
   - ✅ Tryk Enter eller klik "Tilføj"
   - ✅ Verificer at gruppen vises i listen
   - ✅ Verificer at gruppen er valgt (highlighted)
   - ✅ Gem spilleren
   - ✅ Refresh siden
   - ✅ Verificer at den nye gruppe stadig eksisterer
   - ✅ Åbn en anden spiller
   - ✅ Verificer at den nye gruppe vises i available groups liste

**Expected Result:**
- Nye training groups gemmes når spiller gemmes
- Groups forsvinder ikke ved refresh
- Groups er synlige for alle brugere efter spiller er gemt

---

### Test 3.3: Level System Labeling & Tooltips
**Mål:** Verificer at level system har bedre labeling og tooltips

**Steps:**
1. Naviger til Spillere siden
2. Test tooltips på level kolonner:
   - ✅ Hover over info ikon ved "Rangliste Single" header
   - ✅ Verificer at tooltip vises med forklaring
   - ✅ Test samme for "Rangliste Double" og "Rangliste Mix"
   - ✅ Verificer at tooltips forklarer BadmintonPlayer.dk systemet
3. Test i PlayerForm:
   - ✅ Åbn "Ny spiller" eller rediger spiller
   - ✅ Scroll til "Rangliste (BadmintonPlayer.dk)" sektion
   - ✅ Verificer at header inkluderer "(BadmintonPlayer.dk)"
   - ✅ Hover over info ikoner ved hver rangliste field
   - ✅ Verificer at tooltips vises

**Expected Result:**
- Tooltips vises korrekt på alle level kolonner
- Header inkluderer "(BadmintonPlayer.dk)" i form
- Tooltips forklarer systemet tydeligt

---

### Test 3.4: Partner Preferences Onboarding
**Mål:** Verificer at partner preferences har bedre onboarding

**Steps:**
1. Naviger til Spillere siden
2. Test tooltips på partner kolonner:
   - ✅ Hover over info ikon ved "Double makker" header
   - ✅ Verificer at tooltip forklarer tovejs relationer
   - ✅ Test samme for "Mix makker"
3. Test partner selection:
   - ✅ Klik på en spiller's partner cell
   - ✅ Vælg en spiller der allerede har en partner
   - ✅ Verificer at confirmation dialog vises
   - ✅ Verificer at dialog forklarer tovejs relationer tydeligt
   - ✅ Verificer at info box vises med tip om partner relationer
   - ✅ Test "Overskriv" og "Annuller" knapper

**Expected Result:**
- Tooltips forklarer tovejs relationer
- Confirmation dialog er informativ
- Info box hjælper brugeren med at forstå systemet

---

### Test 3.5: Players Export to CSV
**Mål:** Verificer at spillere kan eksporteres til CSV

**Steps:**
1. Naviger til Spillere siden
2. Verificer at der er spillere i listen
3. Test export:
   - ✅ Klik på "Eksporter CSV" knap
   - ✅ Verificer at CSV fil downloades
   - ✅ Åbn CSV filen (fx i Excel eller Numbers)
   - ✅ Verificer at alle kolonner er inkluderet:
     - Navn, Kaldenavn, Rangliste Single/Double/Mix
     - Køn, Primær kategori, Træningsgrupper
     - Double makker, Mix makker, Status, Oprettet
   - ✅ Verificer at data er korrekt formateret
   - ✅ Verificer at success toast notification vises
4. Test med filtre:
   - ✅ Aktivér "Vis inaktive" filter
   - ✅ Eksporter igen
   - ✅ Verificer at inaktive spillere er inkluderet
   - ✅ Søg efter specifik spiller
   - ✅ Eksporter igen
   - ✅ Verificer at kun søgeresultater er inkluderet

**Expected Result:**
- CSV fil downloades korrekt
- Alle kolonner er inkluderet
- Data er korrekt formateret
- Export respekterer aktive filtre
- Success notification vises

---

## Test Suite 4: Performance & UX

### Test 4.1: Search Performance
**Mål:** Verificer at søgning er hurtigere (kun API filtering)

**Steps:**
1. Naviger til Spillere siden
2. Verificer at der er mange spillere (100+ hvis muligt)
3. Test søgning performance:
   - ✅ Indtast søgeterm
   - ✅ Mål responstid (skal være < 500ms)
   - ✅ Verificer at ingen lag i UI
   - ✅ Test med forskellige søgetermer

**Expected Result:**
- Søgning er hurtig (< 500ms)
- Ingen lag i UI
- Bedre performance end før (ingen double filtering)

---

### Test 4.2: Cross-group Search - Multiple Exclude Groups
**Mål:** Verificer at cross-group search kan ekskludere flere grupper

**Steps:**
1. Naviger til Coach landing page
2. Vælg flere træningsgrupper (fx 2-3 grupper)
3. Start en træningssession
4. Gå til Check-In siden
5. Test cross-group search:
   - ✅ Klik på "Søg i andre grupper" eller lignende
   - ✅ Indtast søgeterm
   - ✅ Verificer at spillere fra valgte grupper IKKE vises
   - ✅ Verificer at spillere fra andre grupper vises
   - ✅ Test med forskellige kombinationer af grupper

**Expected Result:**
- Cross-group search ekskluderer alle valgte grupper korrekt
- Spillere fra ekskluderede grupper vises ikke
- Spillere fra andre grupper vises korrekt

---

### Test 4.3: Statistics Data Preloading
**Mål:** Verificer at statistics data preloades i baggrunden

**Steps:**
1. Naviger til Statistikker siden
2. Verificer at landing page vises
3. Test preloading:
   - ✅ Åbn browser DevTools → Network tab
   - ✅ Verificer at API requests sendes for training attendance data
   - ✅ Vælg "Training & Attendance" view
   - ✅ Verificer at data vises hurtigt (ikke loading state)
   - ✅ Verificer at data allerede er loaded i baggrunden

**Expected Result:**
- Data preloades når Statistics page åbnes
- Training view viser data hurtigt (ingen loading delay)
- Bedre perceived performance

---

## Test Suite 5: Integration Tests

### Test 5.1: End-to-End Flow - Admin Tenant Management
**Mål:** Test komplet flow for tenant management

**Steps:**
1. Log ind som super admin
2. Naviger til Admin → Tenants
3. Klik på en tenant
4. Test komplet flow:
   - ✅ Se tenant detaljer
   - ✅ Rediger tenant (navn, logo, max baner)
   - ✅ Verificer ændringer gemmes
   - ✅ Gå til Administratorer tab
   - ✅ Opret ny administrator
   - ✅ Verificer at admin vises i listen
   - ✅ Log ud og log ind med ny admin credentials
   - ✅ Verificer at login fungerer

**Expected Result:**
- Hele flow fungerer uden fejl
- Data persisteres korrekt
- Ny admin kan logge ind

---

### Test 5.2: End-to-End Flow - Player Management
**Mål:** Test komplet flow for player management

**Steps:**
1. Naviger til Spillere siden
2. Test komplet flow:
   - ✅ Opret ny spiller med training group
   - ✅ Verificer at spiller gemmes
   - ✅ Søg efter spiller
   - ✅ Rediger spiller
   - ✅ Tilføj ny training group
   - ✅ Gem ændringer
   - ✅ Verificer at training group er synlig for andre spillere

**Expected Result:**
- Hele flow fungerer uden fejl
- Training groups synkroniseres korrekt
- Søgning fungerer korrekt

---

## Test Suite 6: Error Handling

### Test 6.1: Edit Tenant Modal - Error Handling
**Mål:** Verificer error handling i Edit Tenant Modal

**Steps:**
1. Log ind som super admin
2. Naviger til Admin → Tenants → Rediger tenant
3. Test error cases:
   - ✅ Prøv at gemme med tomt navn (skal vise fejl)
   - ✅ Test med ugyldig data
   - ✅ Test network error (afbryd internet midlertidigt)
   - ✅ Verificer at error messages vises korrekt

**Expected Result:**
- Validation fejl vises korrekt
- Network errors håndteres gracefully
- Error messages er informative

---

### Test 6.2: Create Admin Modal - Error Handling
**Mål:** Verificer error handling i Create Admin Modal

**Steps:**
1. Log ind som super admin
2. Naviger til Admin → Tenants → Administratorer → Opret
3. Test error cases:
   - ✅ Prøv at oprette med eksisterende email (skal vise fejl)
   - ✅ Test med password < 8 tegn (skal vise fejl)
   - ✅ Test med password mismatch (skal vise fejl)
   - ✅ Test med ugyldig email format
   - ✅ Verificer at error messages vises korrekt

**Expected Result:**
- Validation fejl vises korrekt
- Error messages er informative
- Form forhindrer submission med ugyldig data

---

## Test Suite 7: Browser Compatibility

### Test 7.1: Cross-Browser Testing
**Mål:** Verificer at app fungerer i forskellige browsere

**Steps:**
1. Test i følgende browsere:
   - ✅ Chrome/Edge (latest)
   - ✅ Firefox (latest)
   - ✅ Safari (latest)

2. Test følgende features i hver browser:
   - ✅ Login
   - ✅ Admin modals
   - ✅ Player search
   - ✅ Training groups

**Expected Result:**
- App fungerer i alle moderne browsere
- Ingen browser-specifikke fejl

---

## Test Suite 8: Mobile Responsiveness

### Test 8.1: Mobile View Testing
**Mål:** Verificer at app fungerer på mobile devices

**Steps:**
1. Åbn browser DevTools → Toggle device toolbar
2. Test på følgende viewport sizes:
   - ✅ 375px (iPhone SE)
   - ✅ 768px (iPad)
   - ✅ 1024px (iPad Pro)

3. Test følgende features:
   - ✅ Admin modals (skal være brugbare på mobile)
   - ✅ Player search
   - ✅ Navigation

**Expected Result:**
- App er brugbar på mobile devices
- Modals er responsive
- Navigation fungerer på mobile

---

## Checklist Summary

### Dokumentation & Cleanup
- [ ] README.md opdateret til Postgres/Neon
- [ ] ARCHITECTURE.md opdateret til Postgres/Neon
- [ ] Supabase filer fjernet
- [ ] PrismTest fjernet
- [ ] Kritiske TODOs dokumenteret

### Admin Funktionalitet
- [ ] Edit Tenant Modal fungerer
- [ ] Create Admin Modal fungerer
- [ ] Error handling fungerer

### Players Management
- [ ] Search filtering kun i API
- [ ] Training groups synkroniseres korrekt
- [ ] Level system tooltips fungerer
- [ ] Partner preferences tooltips fungerer
- [ ] Players export til CSV fungerer

### Performance & API
- [ ] Search performance forbedret
- [ ] Cross-group search understøtter flere excludeGroupIds
- [ ] Statistics data preloades i baggrunden
- [ ] Ingen lag i UI

### Integration
- [ ] Admin tenant management flow fungerer
- [ ] Player management flow fungerer
- [ ] Export/import funktionalitet fungerer

### Error Handling
- [ ] Edit Tenant Modal error handling
- [ ] Create Admin Modal error handling
- [ ] Export error handling

### Browser Compatibility
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari

### Mobile Responsiveness
- [ ] 375px viewport
- [ ] 768px viewport
- [ ] 1024px viewport

---

## Known Issues & Notes

### Issues Fundet Under Testing:
- [ ] Issue 1: [Beskrivelse]
- [ ] Issue 2: [Beskrivelse]

### Notes:
- [ ] Note 1: [Beskrivelse]
- [ ] Note 2: [Beskrivelse]

---

## Test Resultat

**Test Dato:** _______________  
**Testet Af:** _______________  
**Status:** ⬜ Passed / ⬜ Failed / ⬜ Partial

**Samlet Vurdering:**
- [ ] Alle kritiske tests passed
- [ ] Alle funktionelle tests passed
- [ ] Performance tests passed
- [ ] Browser compatibility tests passed
- [ ] Mobile responsiveness tests passed

**Kommentarer:**
_________________________________________________
_________________________________________________
_________________________________________________

---

## Næste Skridt

Hvis tests fejler:
1. Dokumenter fejl i "Known Issues & Notes" sektion
2. Opret issues i projekt management tool
3. Prioriter fixes baseret på severity
4. Retest efter fixes

Hvis alle tests passer:
1. Mark implementation som complete
2. Opret release notes
3. Planlæg deployment

