#!/bin/bash
# Rollback Script - Fjerner alle uncommitted changes fra i dag
# Dette vil gøre working directory clean og matche commit 631b91a

set -e  # Exit on error

echo "🔄 Starter rollback til commit 631b91a..."

# Gem den nye plan først (hvis den ikke allerede er committet)
if [ -f "STATISTIK_MODUL_PLAN.md" ]; then
    echo "📄 Gemmer STATISTIK_MODUL_PLAN.md..."
    git add STATISTIK_MODUL_PLAN.md
    git commit -m "docs: add comprehensive statistics module plan" || echo "Plan allerede committet eller ingen ændringer"
fi

# Fjern alle uncommitted changes
echo "🗑️  Fjerner uncommitted changes..."
git checkout -- packages/webapp/api/db.ts || true
git checkout -- packages/webapp/src/api/postgres.ts || true
git checkout -- packages/webapp/src/api/stats.ts || true
git checkout -- packages/webapp/src/hooks/statistics/useTrainingAttendance.ts || true
git checkout -- packages/webapp/src/hooks/usePlayers.ts || true
git checkout -- packages/webapp/src/routes/PlayersDB.tsx || true
git checkout -- packages/webapp/src/routes/Statistics.tsx || true

# Slet untracked files (undtagen planen og rollback guiden)
echo "🗑️  Sletter untracked files..."
rm -f REFACTORING_PLAN.md
rm -f ROLLBACK_ANALYSIS.md
rm -f packages/webapp/src/lib/useDebounce.ts

# Verificer status
echo ""
echo "✅ Rollback fuldført!"
echo ""
echo "📊 Nuværende status:"
git status

echo ""
echo "📋 Næste skridt:"
echo "1. Læs STATISTIK_MODUL_PLAN.md for den komplette vision"
echo "2. Verificer at applikationen kører korrekt"
echo "3. Begynd implementering baseret på planen"



