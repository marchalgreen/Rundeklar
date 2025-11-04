# Herlev/Hjorten – Webapp

En letvægts webapplikation til den lokale badmintonklub. Alt kører i browseren og gemmes lokalt i IndexedDB; ingen server eller desktop-wrapper er nødvendig.

## Funktioner
- **Spilleradministration** med søgning, CRUD og aktiv/inaktiv-toggle
- **Check ind**-skærm i kiosk-stil med virtuel liste og hurtig feedback
- **Kampprogram** med start/stop af træning, bænkliste, auto-match på 8 baner, drag & drop og manuelle flytninger
- Auto-seed af 40 demo-spillere og 8 baner for hurtig demo

## Tech Stack
– Vite + React 19 + TypeScript + Tailwind CSS
- IndexedDB administreret via Dexie & dexie-react-hooks
- Zod til inputvalidering
- Delt typer i `packages/common`

## Kom godt i gang
### Krav
- Node.js ≥ 20
- pnpm ≥ 9

### Installation
```bash
pnpm install
```

### Udvikling
```bash
pnpm dev
```
Starter Vite-devserver på http://127.0.0.1:5173 med hot reloading.

### Produktion
```bash
pnpm build
```
Bygger `packages/common` og webappen (output i `packages/webapp/dist`).

### Test
```bash
pnpm test
```
Kører Vitest-tests for matchmaker-logikken.

## Manuel smoke-test
1. `pnpm dev` og åbn http://127.0.0.1:5173.
2. Gå til **Spillere**: opret/ret en spiller og toggl aktiv-status.
3. Skift til **Kampprogram** og tryk “Start træning”.
4. I **Check ind**: søg efter spillere og tryk “Check ind”.
5. Tilbage i **Kampprogram**: brug “Auto-match”, træk spillere mellem bænken og banerne, og afprøv “Nulstil kampe”.
6. Afslut træningen og bekræft at **Check ind**-skærmen viser “Ingen aktiv træning”.

## Projektstruktur
```
packages/
  common/   → delte TypeScript-typer
  webapp/   → Vite + React-klient, Dexie API, matcher mv.
```

## Noter
- Appen seedes automatisk første gang IndexedDB initialiseres.
- Alle operationer kører lokalt i browseren; rydning af site-data nulstiller databasen.
- Matchmaker-logikken er isoleret i `packages/webapp/src/lib/matchmaker.ts` og dækket af Vitest.
