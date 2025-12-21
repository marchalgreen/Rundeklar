# BadmintonPlayer.dk Automatisk Player Matching

## Oversigt

Dette dokument beskriver hvordan man automatisk matcher spillere fra databasen med BadmintonPlayer.dk profiler.

## Problem

BadmintonPlayer.dk bruger ASP.NET WebForms med postback, hvilket gør det komplekst at scrape søgefunktionen direkte. Derfor bruger vi en alternativ tilgang baseret på klub-sider.

## Løsning: Klub-baseret Matching

I stedet for at søge efter individuelle spillere, henter vi alle spillere fra klubben på BadmintonPlayer.dk og matcher dem med spillere i databasen.

## Implementering

### 1. Find Klub-ID på BadmintonPlayer.dk

1. Gå til badmintonplayer.dk
2. Find din klub (fx "Herlev Hjorten")
3. Se URL'en - den vil se ud som: `https://badmintonplayer.dk/DBF/Klub/VisKlub/{klubId}`
4. Noter klub-ID'et

### 2. Opdater Tenant Config (Fremtidig)

Fremover kan vi tilføje `badmintonplayerClubId` til tenant config filen:

```json
{
  "id": "herlev-hjorten",
  "name": "HERLEV/HJORTEN",
  "badmintonplayerClubId": "12345"
}
```

### 3. Kør Matching Script

```bash
# Dry run (se hvad der ville blive opdateret)
pnpm --filter webapp exec tsx scripts/match-players-badmintonplayer.ts herlev-hjorten --dry-run

# Opdater kun høj confidence matches
pnpm --filter webapp exec tsx scripts/match-players-badmintonplayer.ts herlev-hjorten --min-confidence=high

# Opdater alle matches (inkl. medium confidence)
pnpm --filter webapp exec tsx scripts/match-players-badmintonplayer.ts herlev-hjorten --min-confidence=medium
```

## Nuværende Status

**⚠️ Funktionen er delvist implementeret:**

- ✅ Grundstruktur og matching-logik er på plads
- ✅ Script til at køre matching er oprettet
- ⚠️ `getPlayersFromClub()` funktionen skal implementeres baseret på faktisk klub-side struktur
- ⚠️ Klub-ID skal findes manuelt første gang

## Næste Skridt

1. **Find klub-ID for Herlev Hjorten:**
   - Gå til badmintonplayer.dk
   - Find "Herlev Hjorten" klubben
   - Noter URL'en og klub-ID'et

2. **Implementer `getPlayersFromClub()`:**
   - Inspicer klub-siden på badmintonplayer.dk
   - Find HTML-strukturen for spillerlisten
   - Implementer parsing af spillerdata (navn, numeric ID, officielt BadmintonID)

3. **Test matching:**
   - Kør scriptet med `--dry-run` først
   - Verificer matches ser korrekte ud
   - Kør uden `--dry-run` for at opdatere databasen

## Alternativ: Manuel Opdatering

Hvis automatisk matching ikke virker, kan du manuelt opdatere spillere:

```sql
-- Opdater en spiller med numeric ID
UPDATE players 
SET badmintonplayer_id = '25886' 
WHERE name = 'Phillip Ørbæk' 
  AND tenant_id = 'herlev-hjorten';
```

## Noter

- Numeric ID (fx "25886") er det der bruges til URL'er og scraping
- Officielt BadmintonID (fx "881203-09") findes automatisk på spillerprofilen
- Scraperen kan bruge begge typer ID'er, men numeric ID er påkrævet for URL-konstruktion

