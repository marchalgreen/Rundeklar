# Demo Tenant Browser Isolation - Implementeringsplan

## Formål
Implementere browser-baseret isolation for demo tenant, så hver browser session oplever at være den eneste bruger, selvom der er mange samtidige brugere.

## Problem
Når flere brugere tilgår demo.rundeklar.dk samtidigt:
- De ser hinandens sessions, check-ins og matches
- De kan overskrive hinandens data når de afslutter sessions
- Dårlig brugeroplevelse ved samtidig brug

## Løsning
Hver browser får en unik `isolation_id` (UUID) gemt i localStorage. For demo tenant filtreres alle queries efter både `tenant_id` og `isolation_id`, så hver browser kun ser sine egne data.

## Sikkerhed for Produktion
- ✅ `isolation_id` kolonne er nullable (NULL for alle eksisterende rækker)
- ✅ Kun demo tenant får `isolation_id` sat
- ✅ Produktions queries virker uændret (filtrerer efter `isolation_id IS NULL`)
- ✅ Backward compatible - eksisterende kode virker stadig

---

## Fase 1: Database Migration

### 1.1 Opret migration fil
**Fil:** `database/migrations/XXX_add_isolation_id.sql`

```sql
-- Migration: Add isolation_id for demo tenant browser isolation
-- This allows multiple users on demo tenant to have isolated experiences
-- Production tenants are unaffected (isolation_id remains NULL)

-- Add isolation_id column to relevant tables
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS isolation_id TEXT;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS isolation_id TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS isolation_id TEXT;
ALTER TABLE match_players ADD COLUMN IF NOT EXISTS isolation_id TEXT;

-- Create indexes for performance (only for rows with isolation_id)
CREATE INDEX IF NOT EXISTS idx_training_sessions_isolation 
  ON training_sessions(tenant_id, isolation_id) 
  WHERE isolation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_check_ins_isolation 
  ON check_ins(tenant_id, isolation_id) 
  WHERE isolation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_isolation 
  ON matches(tenant_id, isolation_id) 
  WHERE isolation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_players_isolation 
  ON match_players(tenant_id, isolation_id) 
  WHERE isolation_id IS NOT NULL;

-- Verify migration
-- All existing rows should have isolation_id = NULL
-- SELECT COUNT(*) FROM training_sessions WHERE isolation_id IS NOT NULL; -- Should return 0
```

### 1.2 Test migration lokalt
```bash
# Test migration på lokal/dev database først
cd packages/webapp
pnpm exec tsx scripts/test-migration.ts XXX_add_isolation_id.sql
```

### 1.3 Anvend migration på demo database
```bash
# Anvend på demo database (ikke produktion endnu!)
# Via Neon dashboard SQL Editor eller via CLI
```

---

## Fase 2: Isolation ID Management

### 2.1 Opret isolation utility
**Fil:** `packages/webapp/src/lib/isolation.ts`

```typescript
/**
 * Browser session isolation for demo tenant.
 * Each browser gets a unique isolation_id stored in localStorage.
 * This ensures demo users don't see each other's data.
 */

const ISOLATION_ID_KEY = 'rundeklar_isolation_id'

/**
 * Gets or creates an isolation ID for the current browser session.
 * Only used for demo tenant to provide per-browser isolation.
 * 
 * @param tenantId - Current tenant ID
 * @returns Isolation ID for demo tenant, null for other tenants
 */
export const getIsolationId = (tenantId: string): string | null => {
  // Only use isolation for demo tenant
  if (tenantId !== 'demo') {
    return null
  }

  if (typeof window === 'undefined') {
    return null
  }

  try {
    let isolationId = localStorage.getItem(ISOLATION_ID_KEY)
    
    if (!isolationId) {
      // Generate new UUID for this browser session
      isolationId = crypto.randomUUID()
      localStorage.setItem(ISOLATION_ID_KEY, isolationId)
      console.log('[isolation] Generated new isolation_id:', isolationId)
    }
    
    return isolationId
  } catch (error) {
    console.error('[isolation] Failed to get isolation_id:', error)
    return null
  }
}

/**
 * Clears isolation ID (useful for testing or reset).
 * User will get a new isolation_id on next page load.
 */
export const clearIsolationId = (): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(ISOLATION_ID_KEY)
    console.log('[isolation] Cleared isolation_id')
  } catch (error) {
    console.error('[isolation] Failed to clear isolation_id:', error)
  }
}

/**
 * Gets current isolation ID without creating one.
 * Useful for checking if isolation is active.
 */
export const peekIsolationId = (tenantId: string): string | null => {
  if (tenantId !== 'demo') {
    return null
  }

  if (typeof window === 'undefined') {
    return null
  }

  try {
    return localStorage.getItem(ISOLATION_ID_KEY)
  } catch {
    return null
  }
}
```

---

## Fase 3: Opdater Postgres API

### 3.1 Tilføj isolation helper til postgres.ts
**Fil:** `packages/webapp/src/api/postgres.ts`

Tilføj helper funktion efter `getTenantId()`:

```typescript
/**
 * Gets isolation ID for current tenant (only demo tenant uses this).
 * @returns Isolation ID or null
 */
const getIsolationIdForCurrentTenant = async (): Promise<string | null> => {
  try {
    const tenantId = getTenantId()
    if (tenantId !== 'demo') {
      return null
    }
    
    const { getIsolationId } = await import('../lib/isolation')
    return getIsolationId(tenantId)
  } catch (error) {
    console.error('[postgres] Failed to get isolation_id:', error)
    return null
  }
}
```

### 3.2 Opdater getSessions()
Find `getSessions()` funktionen og opdater:

```typescript
export const getSessions = async (): Promise<TrainingSession[]> => {
  // Check cache first
  if (tableCaches.sessions) {
    return tableCaches.sessions
  }

  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  let sessions
  if (isolationId) {
    // Demo tenant: filter by isolation_id
    sessions = await sql`
      SELECT * FROM training_sessions 
      WHERE tenant_id = ${tenantId} AND isolation_id = ${isolationId}
      ORDER BY created_at DESC
    `
  } else {
    // Production tenants: filter by NULL isolation_id
    sessions = await sql`
      SELECT * FROM training_sessions 
      WHERE tenant_id = ${tenantId} AND (isolation_id IS NULL OR isolation_id = '')
      ORDER BY created_at DESC
    `
  }
  
  const converted = sessions.map(rowToSession)
  
  // Update cache
  tableCaches.sessions = converted
  if (cachedState) {
    cachedState.sessions = converted
  }
  
  return converted
}
```

### 3.3 Opdater createSession()
Find `createSession()` funktionen og opdater:

```typescript
export const createSession = async (session: Omit<TrainingSession, 'id' | 'createdAt'>): Promise<TrainingSession> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  const [created] = await sql`
    INSERT INTO training_sessions (date, status, tenant_id, isolation_id)
    VALUES (${session.date}, ${session.status}, ${tenantId}, ${isolationId})
    RETURNING *
  `
  const converted = rowToSession(created)
  
  // Optimistic cache update
  if (tableCaches.sessions) {
    tableCaches.sessions = [converted, ...tableCaches.sessions]
  }
  if (cachedState) {
    cachedState.sessions = [converted, ...cachedState.sessions]
  }
  
  return converted
}
```

### 3.4 Opdater getCheckIns()
Find `getCheckIns()` funktionen og opdater:

```typescript
export const getCheckIns = async (): Promise<CheckIn[]> => {
  if (tableCaches.checkIns) {
    return tableCaches.checkIns
  }

  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  let checkIns
  if (isolationId) {
    checkIns = await sql`
      SELECT ci.* FROM check_ins ci
      INNER JOIN training_sessions ts ON ci.session_id = ts.id
      WHERE ci.tenant_id = ${tenantId} 
        AND ts.isolation_id = ${isolationId}
      ORDER BY ci.created_at
    `
  } else {
    checkIns = await sql`
      SELECT ci.* FROM check_ins ci
      INNER JOIN training_sessions ts ON ci.session_id = ts.id
      WHERE ci.tenant_id = ${tenantId} 
        AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
      ORDER BY ci.created_at
    `
  }
  
  const converted = checkIns.map(rowToCheckIn)
  
  tableCaches.checkIns = converted
  if (cachedState) {
    cachedState.checkIns = converted
  }
  
  return converted
}
```

### 3.5 Opdater createCheckIn()
Find `createCheckIn()` funktionen og opdater:

```typescript
export const createCheckIn = async (checkIn: Omit<CheckIn, 'id' | 'createdAt'>): Promise<CheckIn> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  // Get session to verify isolation_id matches
  const [session] = await sql`
    SELECT isolation_id FROM training_sessions 
    WHERE id = ${checkIn.sessionId} AND tenant_id = ${tenantId}
  `
  
  if (!session) {
    throw new Error('Session not found')
  }
  
  // Verify isolation_id matches (for demo tenant)
  if (isolationId && session.isolation_id !== isolationId) {
    throw new Error('Session isolation mismatch')
  }
  
  // Try to insert, but if it already exists (duplicate key), return the existing one
  const result = await sql`
    INSERT INTO check_ins (session_id, player_id, max_rounds, tenant_id, isolation_id)
    VALUES (${checkIn.sessionId}, ${checkIn.playerId}, ${checkIn.maxRounds ?? null}, ${tenantId}, ${isolationId})
    ON CONFLICT ON CONSTRAINT check_ins_session_id_player_id_tenant_id_key DO NOTHING
    RETURNING *
  `
  
  // ... rest of function (handle conflict case)
}
```

### 3.6 Opdater getMatches()
Find `getMatches()` funktionen og opdater:

```typescript
export const getMatches = async (): Promise<Match[]> => {
  if (tableCaches.matches) {
    return tableCaches.matches
  }

  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  let matches
  if (isolationId) {
    matches = await sql`
      SELECT m.* FROM matches m
      INNER JOIN training_sessions ts ON m.session_id = ts.id
      WHERE m.tenant_id = ${tenantId} 
        AND ts.isolation_id = ${isolationId}
      ORDER BY m.started_at
    `
  } else {
    matches = await sql`
      SELECT m.* FROM matches m
      INNER JOIN training_sessions ts ON m.session_id = ts.id
      WHERE m.tenant_id = ${tenantId} 
        AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
      ORDER BY m.started_at
    `
  }
  
  const converted = matches.map(rowToMatch)
  
  tableCaches.matches = converted
  if (cachedState) {
    cachedState.matches = converted
  }
  
  return converted
}
```

### 3.7 Opdater createMatch()
Find `createMatch()` funktionen og opdater:

```typescript
export const createMatch = async (match: Omit<Match, 'id'>): Promise<Match> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  // Get session to get isolation_id
  const [session] = await sql`
    SELECT isolation_id FROM training_sessions 
    WHERE id = ${match.sessionId} AND tenant_id = ${tenantId}
  `
  
  if (!session) {
    throw new Error('Session not found')
  }
  
  // Use session's isolation_id (null for production)
  const matchIsolationId = session.isolation_id
  
  const [created] = await sql`
    INSERT INTO matches (session_id, court_id, started_at, ended_at, round, tenant_id, isolation_id)
    VALUES (
      ${match.sessionId},
      ${match.courtId},
      ${match.startedAt},
      ${match.endedAt ?? null},
      ${match.round ?? null},
      ${tenantId},
      ${matchIsolationId}
    )
    RETURNING *
  `
  // ... rest of function
}
```

### 3.8 Opdater getMatchPlayers()
Find `getMatchPlayers()` funktionen og opdater:

```typescript
export const getMatchPlayers = async (): Promise<MatchPlayer[]> => {
  if (tableCaches.matchPlayers) {
    return tableCaches.matchPlayers
  }

  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  let matchPlayers
  if (isolationId) {
    matchPlayers = await sql`
      SELECT mp.* FROM match_players mp
      INNER JOIN matches m ON mp.match_id = m.id
      INNER JOIN training_sessions ts ON m.session_id = ts.id
      WHERE mp.tenant_id = ${tenantId} 
        AND ts.isolation_id = ${isolationId}
    `
  } else {
    matchPlayers = await sql`
      SELECT mp.* FROM match_players mp
      INNER JOIN matches m ON mp.match_id = m.id
      INNER JOIN training_sessions ts ON m.session_id = ts.id
      WHERE mp.tenant_id = ${tenantId} 
        AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
    `
  }
  
  const converted = matchPlayers.map(rowToMatchPlayer)
  
  tableCaches.matchPlayers = converted
  if (cachedState) {
    cachedState.matchPlayers = converted
  }
  
  return converted
}
```

### 3.9 Opdater createMatchPlayer()
Find `createMatchPlayer()` funktionen og opdater:

```typescript
export const createMatchPlayer = async (matchPlayer: Omit<MatchPlayer, 'id'>): Promise<MatchPlayer> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  
  // Get match to get isolation_id from session
  const [match] = await sql`
    SELECT m.isolation_id, ts.isolation_id as session_isolation_id
    FROM matches m
    INNER JOIN training_sessions ts ON m.session_id = ts.id
    WHERE m.id = ${matchPlayer.matchId} AND m.tenant_id = ${tenantId}
  `
  
  if (!match) {
    throw new Error('Match not found')
  }
  
  // Use session's isolation_id (null for production)
  const isolationId = match.session_isolation_id
  
  const [created] = await sql`
    INSERT INTO match_players (match_id, player_id, slot, tenant_id, isolation_id)
    VALUES (
      ${matchPlayer.matchId},
      ${matchPlayer.playerId},
      ${matchPlayer.slot},
      ${tenantId},
      ${isolationId}
    )
    RETURNING *
  `
  // ... rest of function
}
```

### 3.10 Opdater loadState()
Find `loadState()` funktionen og opdater alle queries til at inkludere isolation filter:

```typescript
export const loadState = async (): Promise<DatabaseState> => {
  if (cachedState) return cachedState

  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  // Build isolation filter
  const isolationFilter = isolationId 
    ? sql`AND isolation_id = ${isolationId}`
    : sql`AND (isolation_id IS NULL OR isolation_id = '')`
  
  // Update all queries to include isolation filter
  // ... (similar pattern for all tables)
}
```

---

## Fase 4: Opdater Cache Invalidation

### 4.1 Opdater invalidateCache() når isolation skifter
**Fil:** `packages/webapp/src/contexts/TenantContext.tsx`

Når tenant skifter, skal cache også invalideres hvis isolation_id ændres:

```typescript
// In TenantProvider, when config changes:
useEffect(() => {
  if (!config) return
  
  // Check if isolation_id changed
  const currentIsolationId = peekIsolationId(tenantId)
  const previousIsolationIdRef = useRef<string | null>(null)
  
  if (currentIsolationId !== previousIsolationIdRef.current) {
    invalidateCache()
    previousIsolationIdRef.current = currentIsolationId
  }
}, [config, tenantId])
```

---

## Fase 5: Testing

### 5.1 Test produktion før migration
```bash
# Verificer at alle queries virker
# Test at sessions, check-ins, matches loader korrekt
# Dokumenter antal rækker i hver tabel
```

### 5.2 Test migration lokalt
```bash
# Kør migration på lokal database
# Verificer at alle eksisterende rækker har isolation_id = NULL
# Test at produktions queries stadig virker
```

### 5.3 Test demo isolation
```bash
# Åbn demo.rundeklar.dk i to forskellige browsers
# Verificer at hver browser får sin egen isolation_id
# Test at de ser forskellige sessions/check-ins/matches
# Test at de kan arbejde samtidigt uden konflikter
```

### 5.4 Test produktion efter migration
```bash
# Verificer at alle eksisterende data har isolation_id = NULL
# Test at produktions queries stadig virker
# Test at nye produktions sessions oprettes med isolation_id = NULL
```

---

## Fase 6: Deployment

### 6.1 Deployment rækkefølge
1. **Deploy kode først** (isolation logik er inaktiv indtil migration kører)
2. **Kør migration på demo database**
3. **Test demo isolation**
4. **Kør migration på produktion database** (kun hvis alt virker)
5. **Verificer produktion stadig virker**

### 6.2 Rollback plan
Hvis noget går galt:

```sql
-- Rollback migration (kun hvis nødvendigt)
-- Dette sletter isolation_id kolonne (data går tabt, men produktion bruger den ikke)
ALTER TABLE training_sessions DROP COLUMN IF EXISTS isolation_id;
ALTER TABLE check_ins DROP COLUMN IF EXISTS isolation_id;
ALTER TABLE matches DROP COLUMN IF EXISTS isolation_id;
ALTER TABLE match_players DROP COLUMN IF EXISTS isolation_id;
```

---

## Fase 7: Dokumentation

### 7.1 Opdater dokumentation
- Opdater `MULTI_TENANT_SETUP.md` med isolation info
- Tilføj note om demo tenant isolation
- Dokumenter hvordan isolation virker

### 7.2 Tilføj developer notes
- Kommenter isolation logik i koden
- Tilføj JSDoc kommentarer
- Dokumenter edge cases

---

## Checklist

### Pre-deployment
- [x] Migration fil oprettet og testet lokalt
- [x] Isolation utility oprettet
- [x] Alle Postgres queries opdateret
- [x] Cache invalidation opdateret
- [x] TypeScript kompilerer uden fejl
- [x] Linting passerer

### Testing
- [x] Migration kørt i Neon database
- [x] Demo isolation testet i to browsers ✅
- [x] Verificeret at hver browser får unik isolation_id
- [x] Verificeret at sessions isoleres korrekt
- [x] Cache invalidation testet og virker

### Deployment
- [x] Kode implementeret og testet lokalt
- [x] Migration kørt på Neon database
- [x] Demo isolation verificeret og virker ✅
- [x] Localhost default til demo tenant konfigureret

### Post-deployment
- [x] Dokumentation opdateret
- [ ] Deploy til produktion (når klar)
- [ ] Kør migration på produktion database (når klar)

---

## Noter

- **Sikkerhed**: Produktion påvirkes ikke - alle eksisterende data har `isolation_id = NULL`
- **Performance**: Indexes kun for rækker med isolation_id (demo)
- **Backward compatible**: Eksisterende kode virker stadig
- **Isolation**: Kun demo tenant bruger isolation_id

---

## Fremtidige forbedringer (ikke i scope)

1. **Auto-cleanup**: Slet gamle isolation sessions efter X timer
2. **Visual feedback**: Vis "Demo Mode" badge når isolation er aktiv
3. **Reset knap**: Mulighed for at nulstille isolation_id (til testing)
4. **Analytics**: Track antal aktive isolation sessions
5. **Rate limiting**: Begræns antal sessions per isolation_id

---

## Support

Hvis der opstår problemer:
1. Tjek browser console for isolation_id logs
2. Verificer at migration er kørt korrekt
3. Tjek at localStorage indeholder isolation_id for demo tenant
4. Verificer at queries filtrerer korrekt efter isolation_id


