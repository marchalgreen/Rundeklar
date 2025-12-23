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

**✅ Funktionen er implementeret:**

- ✅ Grundstruktur og matching-logik er på plads
- ✅ Script til at køre matching er oprettet
- ✅ `getPlayersFromRankingList()` funktionen er implementeret
- ✅ Ranking list URL er tilføjet til Herlev Hjorten tenant config
- ⚠️ HTML parsing skal testes og justeres baseret på faktisk side-struktur

## Ranking List URL

Ranking list URL'en er nu tilføjet til tenant config:
```json
{
  "badmintonplayerRankingListUrl": "https://badmintonplayer.dk/DBF/Ranglister/#287,2025,,0,,,1148,0,,,,15,,,,0,,,,,,"
}
```

URL'en ser ud til at være "levende" og indeholder parametre om:
- Klub-ID (fx `287`)
- Sæson/år (fx `2025`)
- Andre filtre/parametre

### Vigtigt om Ranking Data

**Ranking-listen viser IKKE ranking pointene:**
- Tallet i parenteserne (fx "(246)", "(324)") er spillerens **placering** på ranglisten i Danmark, IKKE ranking pointene
- Ranking-listen viser kun én ranking-type ad gangen (Single, Double eller Mix)
- `<td class="points"></td>` kolonnerne er tomme i ranking-listen
- **For at få ranking pointene** skal man scrape individuelle spillerprofiler

**Ranking pointene skal hentes fra individuelle spillerprofiler:**
- Brug `update-rankings.ts` scriptet til at hente alle tre ranking-typer (Single, Double, Mix)
- Dette scraper hver spiller individuelt, hvilket tager længere tid men giver alle data

## Næste Skridt

1. **Test HTML parsing:**
   - Kør scriptet med `--dry-run` først
   - Inspicer output for at se om spillere bliver fundet korrekt
   - Juster CSS-selectorer i `getPlayersFromRankingList()` hvis nødvendigt

2. **Test matching:**
   - Kør scriptet med `--dry-run` først
   - Verificer matches ser korrekte ud
   - Kør uden `--dry-run` for at opdatere databasen

3. **Tilføj ranking list URL til andre tenants:**
   - Find ranking list URL for andre klubber
   - Tilføj `badmintonplayerRankingListUrl` til deres tenant config filer

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

