# Statistics Root Cause Analysis

## Problem Statement

1. **Delta beregning viser samme tal som total** - "vs. forrige periode" viser samme tal som totalen, hvilket indikerer at forrige periode var 0
2. **Kun 3 træningssessioner** - Statistikken viser kun 3 sessions, men mange check-ins (713)
3. **Gennemsnit per session er +1.000** - Dette hænger sammen med problem 2

## Root Cause Analysis

### Snapshot Creation Flow

Når en træningssession afsluttes manuelt:

1. `endActiveSession()` kaldes (via `useSession` hook)
2. Session status opdateres til `'ended'` i databasen
3. Matches opdateres med `endedAt`
4. Cache invalideres
5. **Snapshot oprettes** via `statsApi.snapshotSession(sessionId)`

**Kritisk observation:** Snapshot-oprettelsen er wrapped i `try-catch` og fejler stille:

```typescript
try {
  await statsApi.snapshotSession(active.id)
  logger.info('[endActiveSession] Statistics snapshot created successfully')
} catch (err) {
  // Log error but don't fail the session ending
  logger.error('[endActiveSession] Failed to create statistics snapshot', err)
}
```

### Potential Issues

1. **Silent Failures**: Hvis snapshot-oprettelsen fejler (fx pga. cache-problemer, database-problemer, etc.), bliver sessionen stadig markeret som 'ended', men der oprettes ikke et snapshot
2. **Race Conditions**: Der er en 200ms delay før snapshot-oprettelse, men der kan stadig være race conditions
3. **Cache Issues**: `snapshotSession` invalidere cache, men der kan være stale data
4. **Missing Data**: Hvis der ikke er matches eller check-ins når snapshot oprettes, kan det fejle

### Data Consistency Problem

- **Sessions** kan have status `'ended'` uden snapshots
- **Check-ins** kan eksistere for sessions uden snapshots
- **Statistics** tæller kun fra snapshots, så disse check-ins/sessions bliver ikke talt

## Verification

Kør diagnostic script for at verificere problemet:

```bash
pnpm tsx packages/webapp/scripts/diagnose-statistics.ts [tenantId]
```

Dette vil vise:
- Antal ended sessions vs. snapshots
- Antal check-ins vs. check-ins i snapshots
- Sessions uden snapshots
- Check-ins uden snapshots

## Solution

### Short-term Fix

1. **Run fix script** to create missing snapshots:
   ```bash
   pnpm tsx packages/webapp/scripts/fix-missing-snapshots.ts [tenantId]
   ```

2. **Verify** data consistency:
   ```bash
   pnpm tsx packages/webapp/scripts/diagnose-statistics.ts [tenantId]
   ```

### Long-term Fix

1. **Improve Error Handling**: Snapshot-oprettelse skal ikke fejle stille - enten skal den retry eller skal fejlen vises til brugeren
2. **Add Database Trigger**: Overvej at oprette snapshots via database trigger når session status ændres til 'ended'
3. **Add Monitoring**: Log alle snapshot-oprettelser og fejl til monitoring system
4. **Add Validation**: Valider at snapshot blev oprettet efter session afslutning

## Files Changed

- `packages/webapp/src/lib/statistics/kpiCalculation.ts` - Fixed delta calculation to use same logic as current period
- `packages/webapp/src/hooks/statistics/useTrainingAttendance.ts` - Pass groupNames to delta calculation
- `packages/webapp/scripts/diagnose-statistics.ts` - New diagnostic script
- `packages/webapp/scripts/fix-missing-snapshots.ts` - New fix script

## Next Steps

1. Run diagnostic script to identify the exact problem
2. Run fix script if missing snapshots are found
3. Verify statistics page shows correct data
4. Consider implementing long-term fixes

