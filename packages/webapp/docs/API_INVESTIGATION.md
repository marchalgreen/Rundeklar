# BadmintonPlayer.dk API Investigation

## Oversigt

Dette dokument beskriver vores undersøgelse af BadmintonPlayer.dk API'et som nembadminton.dk bruger.

## Undersøgelsesresultater

### API Eksistens

✅ **API'et eksisterer:**
- Ifølge nembadminton.dk har Badminton Danmark udviklet et API til dataoverførsel fra badmintonplayer.dk
- Se: https://nembadminton.dk - "Badminton Danmark - Dataejer. Har udviklet api til dataoverførsel fra badmintonplayer.dk"

### API Tilgængelighed

❌ **API'et er IKKE offentligt tilgængeligt:**
- API'et er sandsynligvis privat/partner-only
- Kræver sandsynligvis partnership eller autorisation fra Badminton Danmark
- Netværksanalyse af nembadminton.dk viser ingen offentlige API endpoints
- API-kald sker sandsynligvis server-side eller kræver autentificering

### Undersøgelsesmetoder

1. **Netværksanalyse:**
   - Inspiceret nembadminton.dk's netværkskald
   - Ingen offentlige API endpoints fundet
   - API-kald sker sandsynligvis server-side

2. **JavaScript Bundle Analyse:**
   - Ingen API endpoints fundet i klient-side JavaScript
   - Bekræfter at API-kald sker server-side

3. **Dokumentation:**
   - Ingen offentlig dokumentation fundet
   - API'et er sandsynligvis kun dokumenteret for partnere

## Konklusion

**API'et eksisterer, men er ikke offentligt tilgængeligt.**

For at bruge API'et skal man:
1. Kontakte Badminton Danmark for API adgang
2. Få API credentials/keys
3. Implementere API client med de opdagede endpoints

## Nuværende Løsning

Da API'et ikke er tilgængeligt, bruger vi:
- **Web scraping** med Playwright til at hente ranking data
- **Ranking list URL** til at hente alle spillere fra en klub på én gang
- **Individuelle spillerprofiler** til at hente alle tre ranking-typer (Single, Double, Mix)

## Fremtidige Muligheder

Hvis API adgang opnås:
1. Opdater `badmintonplayer-api.ts` med faktiske endpoints
2. Tilføj API credentials til environment variabler
3. Opdater `ranking-service.ts` til at prioritere API over scraping
4. API vil være hurtigere og mere pålidelig end scraping

## Noter

- nembadminton.dk synkroniserer med badmintonplayer.dk (se FAQ på deres side)
- Synkronisering sker sandsynligvis via API'et (server-side)
- Vi kan kontakte Badminton Danmark eller nembadminton.dk's udvikler (Daniel Fly Nygaard) for mere information




