# Demo Isolation - Quick Checklist

## 🎯 Formål
Implementere browser isolation for demo tenant så hver bruger oplever at være alene, selvom der er mange samtidige brugere.

## ⚠️ Vigtigt
- ✅ Produktion påvirkes IKKE (isolation_id er NULL for produktion)
- ✅ Backward compatible (eksisterende kode virker stadig)
- ✅ Kun demo tenant bruger isolation

## 📋 Implementation Steps

### 1. Database Migration
- [ ] Opret `supabase/migrations/XXX_add_isolation_id.sql`
- [ ] Tilføj `isolation_id TEXT` kolonne til:
  - [ ] `training_sessions`
  - [ ] `check_ins`
  - [ ] `matches`
  - [ ] `match_players`
- [ ] Opret indexes (kun for rows med isolation_id)
- [ ] Test migration lokalt

### 2. Isolation Utility
- [ ] Opret `src/lib/isolation.ts`
- [ ] Implementer `getIsolationId()`
- [ ] Implementer `clearIsolationId()`
- [ ] Implementer `peekIsolationId()`

### 3. Postgres API Updates
- [ ] Tilføj `getIsolationIdForCurrentTenant()` helper
- [ ] Opdater `getSessions()` - filtrer efter isolation_id
- [ ] Opdater `createSession()` - sæt isolation_id
- [ ] Opdater `getCheckIns()` - filtrer efter isolation_id
- [ ] Opdater `createCheckIn()` - sæt isolation_id
- [ ] Opdater `getMatches()` - filtrer efter isolation_id
- [ ] Opdater `createMatch()` - sæt isolation_id
- [ ] Opdater `getMatchPlayers()` - filtrer efter isolation_id
- [ ] Opdater `createMatchPlayer()` - sæt isolation_id
- [ ] Opdater `loadState()` - alle queries

### 4. Cache Management
- [ ] Opdater cache invalidation når isolation skifter
- [ ] Test cache invalidation

### 5. Testing
- [ ] Test produktion FØR migration
- [ ] Test migration lokalt
- [ ] Test demo isolation (to browsers)
- [ ] Test produktion EFTER migration

### 6. Deployment
- [ ] Deploy kode til demo
- [ ] Kør migration på demo database
- [ ] Verificer demo isolation
- [ ] Deploy kode til produktion
- [ ] Kør migration på produktion database
- [ ] Verificer produktion virker

## 🔍 Verification Commands

```sql
-- Check existing data has NULL isolation_id
SELECT COUNT(*) FROM training_sessions WHERE isolation_id IS NOT NULL;
-- Should return 0 before migration

-- Check demo sessions have isolation_id
SELECT COUNT(*) FROM training_sessions 
WHERE tenant_id = 'demo' AND isolation_id IS NOT NULL;
-- Should return > 0 after demo users create sessions

-- Check production sessions have NULL isolation_id
SELECT COUNT(*) FROM training_sessions 
WHERE tenant_id = 'herlev-hjorten' AND isolation_id IS NULL;
-- Should return all production sessions
```

## 🚨 Rollback (hvis nødvendigt)

```sql
ALTER TABLE training_sessions DROP COLUMN IF EXISTS isolation_id;
ALTER TABLE check_ins DROP COLUMN IF EXISTS isolation_id;
ALTER TABLE matches DROP COLUMN IF EXISTS isolation_id;
ALTER TABLE match_players DROP COLUMN IF EXISTS isolation_id;
```

## 📚 Se også
- `DEMO_ISOLATION_PLAN.md` - Detaljeret implementeringsplan
- `MULTI_TENANT_SETUP.md` - Multi-tenant dokumentation

