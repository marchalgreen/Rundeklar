# Opsætning af Natlig Refresh for Statistics Views

## Oversigt

Denne guide viser hvordan du opsætter automatisk natlig refresh af statistics materialized views via Vercel Cron Job.

## Krav

1. ✅ Migration er kørt (views eksisterer i databasen)
2. ✅ Vercel projekt er deployet
3. ✅ `DATABASE_URL` eller `VITE_DATABASE_URL` er sat i Vercel environment variables

## Trin-for-trin Opsætning

### 1. Opret API Endpoint

Filen `packages/webapp/api/cron/refresh-statistics-views.ts` er allerede oprettet og klar til brug.

Denne endpoint:
- ✅ Refresher alle statistics views med CONCURRENTLY (zero-downtime)
- ✅ Logger refresh performance og row counts
- ✅ Håndterer fejl gracefully
- ✅ Kan kaldes manuelt for testing

### 2. Tilføj Cron Job til vercel.json

Cron jobbet er allerede tilføjet til `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-statistics-views",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule:** `0 2 * * *` betyder klokken 2 om natten UTC hver dag (03:00 CET / 04:00 CEST)

### 3. (Valgfrit) Opsæt CRON_SECRET Environment Variable

For ekstra sikkerhed kan du tilføje en `CRON_SECRET` i Vercel:

1. Gå til Vercel Dashboard → Dit Projekt → Settings → Environment Variables
2. Tilføj `CRON_SECRET` med en tilfældig værdi (fx genereret med `openssl rand -hex 32`)
3. Vercel tilføjer automatisk `Authorization: Bearer <CRON_SECRET>` header til cron requests

**Note:** Dette er valgfrit - Vercel cron jobs er allerede sikre, men ekstra secret giver yderligere beskyttelse mod manuelle calls.

### 4. Deploy til Vercel

```bash
git add packages/webapp/api/cron/refresh-statistics-views.ts vercel.json
git commit -m "feat: Add nightly refresh cron job for statistics views"
git push
```

Efter deployment vil Vercel automatisk:
- ✅ Registrere cron jobbet
- ✅ Køre det natligt kl. 2 UTC
- ✅ Logge execution i Vercel Dashboard

## Verificering

### Tjek Cron Job Status

1. Gå til **Vercel Dashboard** → Dit Projekt → **Settings** → **Cron Jobs**
2. Du skulle se `/api/cron/refresh-statistics-views` listed
3. Status skulle være "Active"

### Test Manuelt

Du kan teste endpointet manuelt før første natlige kørsel:

```bash
# Test lokalt (hvis du kører vercel dev)
curl http://localhost:3000/api/cron/refresh-statistics-views

# Test på production (hvis CRON_SECRET er sat)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.vercel.app/api/cron/refresh-statistics-views
```

**Forventet response:**
```json
{
  "success": true,
  "duration": "234ms",
  "viewCounts": {
    "training_group_attendance_view": 15581,
    "weekday_attendance_view": 37,
    "training_group_attendance_aggregated_view": 8
  }
}
```

### Tjek Logs

1. Gå til **Vercel Dashboard** → Dit Projekt → **Functions**
2. Klik på `/api/cron/refresh-statistics-views`
3. Se execution logs for:
   - Refresh duration
   - Row counts efter refresh
   - Eventuelle fejl

### Verificer Views er Opdateret

Efter første natlige kørsel, tjek at views er opdateret:

```sql
-- Tjek row counts
SELECT 
  'training_group_attendance_view' as view_name,
  COUNT(*) as row_count
FROM training_group_attendance_view
UNION ALL
SELECT 
  'weekday_attendance_view' as view_name,
  COUNT(*) as row_count
FROM weekday_attendance_view;

-- Tjek når views sidst blev refreshet (via pg_stat_user_tables)
SELECT 
  schemaname,
  tablename,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename LIKE '%attendance%view%';
```

## Troubleshooting

### Cron Job Kører Ikke

1. **Tjek vercel.json er deployet:**
   ```bash
   # Verificer cron job er i filen
   cat vercel.json | grep refresh-statistics-views
   ```

2. **Tjek Vercel Dashboard:**
   - Settings → Cron Jobs → Se om jobbet er listed
   - Functions → Se om endpointet eksisterer

3. **Tjek Logs:**
   - Vercel Dashboard → Functions → `/api/cron/refresh-statistics-views` → Logs

### Refresh Fejler

1. **Tjek DATABASE_URL:**
   - Vercel Dashboard → Settings → Environment Variables
   - Verificer `DATABASE_URL` eller `VITE_DATABASE_URL` er sat

2. **Tjek Database Connection:**
   - Verificer database er tilgængelig
   - Tjek SSL settings (skal være `require` for Neon)

3. **Tjek Views Eksisterer:**
   ```sql
   SELECT matviewname 
   FROM pg_matviews 
   WHERE matviewname IN (
     'training_group_attendance_view',
     'training_group_attendance_aggregated_view',
     'weekday_attendance_view'
   );
   ```

### Views er Tomme Efter Refresh

1. **Tjek snapshots eksisterer:**
   ```sql
   SELECT COUNT(*) FROM statistics_snapshots;
   ```

2. **Kør diagnostic script:**
   ```bash
   cd packages/webapp
   pnpm tsx scripts/diagnose-statistics-views.ts
   ```

3. **Manuel refresh:**
   ```sql
   SELECT refresh_statistics_views();
   ```

## Ændre Refresh Schedule

Hvis du vil ændre refresh tidspunktet, opdater `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-statistics-views",
      "schedule": "0 3 * * *"  // Kl. 3 om natten i stedet
    }
  ]
}
```

**Cron Schedule Format:** `minute hour day month weekday`
- `0 2 * * *` = Kl. 2 hver dag
- `0 */6 * * *` = Hver 6. time
- `0 2 * * 1` = Kl. 2 hver mandag

## Performance

Typisk refresh varighed:
- **15K rows:** ~200-500ms
- **50K rows:** ~500-1000ms
- **100K+ rows:** ~1-3 sekunder

Refresh kører med CONCURRENTLY, så:
- ✅ Views forbliver tilgængelige under refresh
- ✅ Ingen downtime for læsninger
- ✅ Ikke blokerer INSERT operationer

## Monitoring

Overvej at sætte alerts op hvis:
- Refresh tager længere end 5 sekunder
- Refresh fejler
- Views er tomme efter refresh

Du kan bruge Vercel's built-in monitoring eller eksterne services som:
- Sentry (error tracking)
- Datadog (performance monitoring)
- Custom webhook alerts

## Konklusion

Efter disse trin vil statistics views automatisk blive refreshet natligt kl. 2 UTC. Dette sikrer:
- ✅ Opdateret data hver morgen
- ✅ Ingen performance overhead under dagtimerne
- ✅ Zero-downtime refresh med CONCURRENTLY
- ✅ Automatisk monitoring via Vercel logs

