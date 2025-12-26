# Rollback Guide - Tilbage til Før Statistik Udvikling

## Nuværende Status

Vi er på commit `631b91a` (chore(scripts): clean up generate-dummy-statistics script). Dette commit indeholder allerede det fulde statistik modul. Vi skal fjerne alle uncommitted changes fra i dag (timeout fixes osv.) for at gå tilbage til den rene tilstand af commit 631b91a.

## Uncommitted Changes

Følgende filer har uncommitted changes:

1. `packages/webapp/api/db.ts` - Timeout tilføjelser
2. `packages/webapp/src/api/postgres.ts` - Timeout tilføjelser
3. `packages/webapp/src/api/stats.ts` - Mulige ændringer
4. `packages/webapp/src/hooks/statistics/useTrainingAttendance.ts` - Mulige ændringer
5. `packages/webapp/src/hooks/usePlayers.ts` - Mulige ændringer
6. `packages/webapp/src/routes/PlayersDB.tsx` - Mulige ændringer
7. `packages/webapp/src/routes/Statistics.tsx` - Mulige ændringer

## Untracked Files

Følgende nye filer er ikke committet:

1. `REFACTORING_PLAN.md` - Skal slettes
2. `ROLLBACK_ANALYSIS.md` - Skal slettes eller beholdes som reference
3. `STATISTIK_MODUL_PLAN.md` - **SKAL BEHOLDES** - Dette er den nye plan
4. `packages/webapp/src/lib/useDebounce.ts` - **SKAL SLETTES** - Eksisterede ikke i commit 631b91a

## Rollback Kommandoer

### Option 1: Fuldt Rollback (Anbefalet)

Dette vil fjerne ALLE uncommitted changes og untracked files (undtagen STATISTIK_MODUL_PLAN.md):

```bash
# Gem den nye plan først (hvis den ikke allerede er committet)
git add STATISTIK_MODUL_PLAN.md
git commit -m "docs: add comprehensive statistics module plan"

# Fjern alle andre uncommitted changes
git checkout -- packages/webapp/api/db.ts
git checkout -- packages/webapp/src/api/postgres.ts
git checkout -- packages/webapp/src/api/stats.ts
git checkout -- packages/webapp/src/hooks/statistics/useTrainingAttendance.ts
git checkout -- packages/webapp/src/hooks/usePlayers.ts
git checkout -- packages/webapp/src/routes/PlayersDB.tsx
git checkout -- packages/webapp/src/routes/Statistics.tsx

# Slet untracked files (undtagen planen)
rm -f REFACTORING_PLAN.md ROLLBACK_ANALYSIS.md
rm -f packages/webapp/src/lib/useDebounce.ts  # Eksisterede ikke i commit 631b91a

# Verificer at vi er clean
git status
```

### Option 2: Stash Changes (Hvis du vil beholde dem)

```bash
# Gem den nye plan først
git add STATISTIK_MODUL_PLAN.md
git commit -m "docs: add comprehensive statistics module plan"

# Stash alle andre ændringer
git stash push -m "WIP: Statistics module changes from today"

# Slet untracked files
rm -f REFACTORING_PLAN.md ROLLBACK_ANALYSIS.md
rm -f packages/webapp/src/lib/useDebounce.ts  # Eksisterede ikke i commit 631b91a

# Verificer
git status
```

### Option 3: Hard Reset (Hvis du er sikker)

**ADVARSEL:** Dette vil fjerne ALLE uncommitted changes permanent!

```bash
# Gem planen først
git add STATISTIK_MODUL_PLAN.md
git commit -m "docs: add comprehensive statistics module plan"

# Hard reset til nuværende commit (fjerner alle uncommitted changes)
git reset --hard HEAD

# Slet untracked files
rm -f REFACTORING_PLAN.md ROLLBACK_ANALYSIS.md
rm -f packages/webapp/src/lib/useDebounce.ts

# Verificer
git status
```

## Efter Rollback

Efter rollback skal du:

1. ✅ Verificer at `git status` viser "working tree clean"
2. ✅ Verificer at `STATISTIK_MODUL_PLAN.md` stadig eksisterer
3. ✅ Test at applikationen stadig kører (hvis den gjorde før)
4. ✅ Læs `STATISTIK_MODUL_PLAN.md` for at forstå den komplette vision
5. ✅ Begynd implementering fra bunden baseret på planen

## Hvad Sker Der Med Statistik Modulet?

Efter rollback vil statistik modulet være i den tilstand det var i commit `631b91a`. Dette inkluderer:

- ✅ Alle komponenter (StatisticsLanding, StatisticsFilters, KPICards, etc.)
- ✅ Alle hooks (useStatisticsFilters, useTrainingAttendance, etc.)
- ✅ Alle utility functions (dateRange, kpiCalculation, insights)
- ✅ Chart komponenter (BarChart, LineChart, PieChart)
- ✅ Data seeding script (generate-dummy-statistics.ts)
- ✅ Alle types i @rundeklar/common

**Dette betyder at statistik modulet stadig vil være funktionelt efter rollback!**

## Næste Skridt

1. **Læs STATISTIK_MODUL_PLAN.md** - Dette dokument beskriver den komplette vision
2. **Identificer gaps** - Hvad mangler der i nuværende implementering?
3. **Planlæg implementering** - Brug planen som roadmap
4. **Implementer systematisk** - Følg planens prioritering (Fase 1 → 2 → 3 → 4)

## Vigtigt

**STATISTIK_MODUL_PLAN.md skal bevares!** Dette dokument indeholder alle brugerens ønsker og krav og skal bruges som reference for fremtidig udvikling.

