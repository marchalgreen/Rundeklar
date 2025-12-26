# Seed Script Analysis - Før Eksekvering

## 1. Fjernelse af eksisterende data

**Status: ✅ SIKKERT - Scriptet fjerner KUN data for den specifikke tenant**

### Sikkerhedsforanstaltninger:

1. **Production tenant blokering:**
   - Scriptet blokerer automatisk kørsel på production tenants (`default`, `herlev-hjorten`)
   - Vil fejle med fejlbesked hvis man prøver at køre på production

2. **Tenant-specifik sletning:**
   - Alle DELETE statements bruger `WHERE tenant_id = ${tenantId}` filter
   - Dette sikrer at kun data for den specifikke tenant slettes
   - Data for andre tenants påvirkes IKKE

3. **Logging:**
   - Scriptet logger præcist hvor mange rækker der slettes fra hver tabel
   - Dette gør det nemt at verificere at kun den rigtige tenants data slettes

### Tabeller der ryddes (kun for den specifikke tenant):
- `statistics_snapshots` WHERE `tenant_id = ${tenantId}`
- `match_results` WHERE `tenant_id = ${tenantId}`
- `match_players` WHERE `tenant_id = ${tenantId}`
- `matches` WHERE `tenant_id = ${tenantId}`
- `check_ins` WHERE `tenant_id = ${tenantId}`
- `training_sessions` WHERE `tenant_id = ${tenantId}`
- `players` WHERE `tenant_id = ${tenantId}`
- `courts` WHERE `tenant_id = ${tenantId}`

**Sikkerhed:** Scriptet kan kun køres på `demo` tenant. Production tenants er blokeret.

---

## 2. Kampresultater efter gældende regler

**Status: ⚠️ DELVIST - Mindre forskel**

**Hvad der er korrekt:**
- Match results oprettes i `match_results` tabellen
- Strukturen matcher `MatchResult` typen
- Score data gemmes som JSONB

**Forskel fra rigtigt system:**
- I rigtigt system: `createMatchResult()` bruger `ON CONFLICT DO UPDATE` (upsert)
- I seed scriptet: Direkte `INSERT` uden conflict handling

**Konsekvens:** Da vi sletter alt før seeding, er dette ikke et problem. Men hvis scriptet køres flere gange, kan det give fejl.

**Anbefaling:** Tilføj `ON CONFLICT DO UPDATE` eller slet match_results før seeding.

---

## 3. Præcis samme struktur som manuelle sessions

**Status: ❌ NEJ - Flere kritiske problemer fundet**

### Problem 1: Match structure har ekstra felt

**I rigtigt system (`rowToMatch`):**
```typescript
{
  id: string
  sessionId: string
  courtId: string
  startedAt: string  // ISO string
  endedAt?: string | null  // ISO string eller null
  round?: number | null
}
```

**I seed scriptet (linje 680-688):**
```typescript
{
  id: row.id,
  sessionId: row.session_id,
  courtId: row.court_id,
  startedAt: row.started_at?.toISOString() || null,  // ❌ Kan være null
  endedAt: row.ended_at?.toISOString() || null,
  round: row.round,
  createdAt: row.created_at?.toISOString() || null  // ❌ IKKE en del af Match type!
}
```

**Problemer:**
- `createdAt` er IKKE en del af `Match` typen og skal fjernes
- `startedAt` kan ikke være `null` - det skal være en ISO string

### Problem 2: MatchPlayer structure har ekstra felt

**I rigtigt system (`rowToMatchPlayer`):**
```typescript
{
  id: string
  matchId: string
  playerId: string
  slot: number
}
```

**I seed scriptet (linje 691-697):**
```typescript
{
  id: row.id,
  matchId: row.match_id,
  playerId: row.player_id,
  slot: row.slot,
  createdAt: row.created_at?.toISOString() || null  // ❌ IKKE en del af MatchPlayer type!
}
```

**Problem:**
- `createdAt` er IKKE en del af `MatchPlayer` typen og skal fjernes

### Problem 3: isolation_id mangler på matches

**I rigtigt system:**
- Matches kopierer `isolation_id` fra session når de oprettes
- Dette er kritisk for demo tenant isolation

**I seed scriptet:**
- Matches oprettes uden `isolation_id`
- Dette kan forårsage problemer med isolation filtering

### Problem 4: CheckIn structure

**Status: ✅ KORREKT**
- Strukturen matcher `CheckIn` typen perfekt

---

## Konklusion og Anbefalinger

### Kritiske fixes nødvendige:

1. **Fjern `createdAt` fra Match og MatchPlayer i snapshots**
2. **Sikr at `startedAt` altid er en ISO string (ikke null)**
3. **Tilføj `isolation_id` til matches når de oprettes**
4. **Overvej at bruge samme snapshot creation flow som rigtigt system**

### Mindre vigtige:

5. **Tilføj `ON CONFLICT DO UPDATE` til match_results INSERT**
6. **Slet match_results før seeding for konsistens**

---

## Foreslåede ændringer

### ✅ Fixes implementeret:

1. **✅ Fjernet `createdAt` fra Match og MatchPlayer i snapshots**
   - Matches har nu kun: id, sessionId, courtId, startedAt, endedAt, round
   - MatchPlayers har nu kun: id, matchId, playerId, slot

2. **✅ Sikret at `startedAt` altid er en ISO string**
   - Tilføjet validering der kaster fejl hvis startedAt er null
   - Konverterer Date objekter til ISO strings

3. **✅ Tilføjet `isolation_id` til alle relevante tabeller**
   - Sessions: isolation_id = null (for demo tenant seed data)
   - Check-ins: isolation_id = null
   - Matches: isolation_id = null
   - Match players: isolation_id = null

4. **✅ Tilføjet `ON CONFLICT DO UPDATE` til match_results INSERT**
   - Matcher nu production behavior

5. **✅ Tilføjet sletning af match_results før seeding**
   - Konsistens med andre tabeller

### ⚠️ Resterende overvejelser:

- **CheckIn createdAt**: CheckIns har stadig `createdAt` i snapshots, hvilket er korrekt (det er en del af CheckIn typen)
- **isolation_id = null**: For demo tenant seed data er isolation_id sat til NULL, så data er synlig for alle demo brugere. Dette er korrekt for seed data.

