# Statistik Modul - Komplet Udviklingsplan

## Overordnet Vision

Statistikmodulet skal være et omfattende analytics-dashboard der giver trænere og spillere indsigt i både træningsfremmøde og individuelle kampresultater. Modulet skal være opdelt i to hovedområder: generel træningsstatistik og individuel spillerstatistik, hvilket gør det nemt at navigere mellem forskellige typer analyser.

## 1. Navigation og Struktur

### Landing Page
Når brugeren åbner statistik-siden, skal de først se en landing page med to klare valgmuligheder:

1. **"Træning & Fremmøde"** - For generel træningsstatistik og fremmødeanalyse
2. **"Individuel Statistik"** - For spiller-specifik data og kampresultater

Dette gør det tydeligt, at der er to forskellige typer statistik, og brugeren kan nemt vælge den retning de ønsker at udforske.

## 2. Træning & Fremmøde View

### 2.1 Filter Sektion

**Træningsgruppe Filter:**
- Skal være åben og synlig som standard (ikke gemt i dropdown)
- Vises som "chips" eller knapper ved siden af hinanden
- Multi-select funktionalitet - brugeren kan vælge én eller flere grupper
- Alle træningsgrupper hentes automatisk fra spillerdata
- Når ingen grupper er valgt, vises data for alle grupper

**Periode Filter:**
- Default værdi skal være "Denne sæson" (ikke "Hele perioden")
- Mulige perioder:
  - "Sidste 7 dage"
  - "Sidste måned"
  - "Denne sæson" (default)
  - "Sidste sæson"
  - "Hele perioden" (skal være sidst i listen)
  - "Vælg måned" (dropdown med måneder)
  - "Tilpasset periode" (custom date range picker)

**Custom Date Range:**
- Når "Tilpasset periode" er valgt, skal der vises to dato-felter
- "Fra dato" og "Til dato" med date pickers
- Validering skal sikre at "til dato" ikke er før "fra dato"

### 2.2 KPI Cards

Fire centrale nøgletal vises øverst på siden:

1. **Total Indtjekninger** - Samlet antal check-ins i den valgte periode
2. **Total Sessions** - Antal træningssessioner i perioden
3. **Gennemsnitligt Fremmøde** - Gennemsnitligt antal spillere pr. session
4. **Unikke Spillere** - Antal forskellige spillere der har tjekket ind

Disse KPI'er skal opdateres dynamisk baseret på de valgte filtre.

### 2.3 Charts og Visualiseringer

**Fremmøde pr. Træningsgruppe (Bar Chart):**
- Søjlediagram der viser antal indtjekninger for hver træningsgruppe
- X-akse: Træningsgrupper
- Y-akse: Antal indtjekninger
- Farvekodning for at skelne mellem grupper
- Interaktiv tooltip der viser præcise tal ved hover

**Fremmøde pr. Ugedag (Bar Chart):**
- Søjlediagram der viser gennemsnitligt fremmøde for hver ugedag
- X-akse: Ugedage (Mandag, Tirsdag, osv.)
- Y-akse: Gennemsnitligt antal spillere pr. session
- Hjælper med at identificere hvilke dage der typisk har højest fremmøde

**Fremmøde over Tid pr. Ugedag (Line Chart):**
- Linjediagram der viser udviklingen i fremmøde over tid, opdelt på ugedage
- X-akse: Tidsperiode (datoer)
- Y-akse: Antal indtjekninger
- Forskellige linjer for hver ugedag
- Viser trends og mønstre i fremmøde over tid

**Player Check-In Long-Tail View (Bar Chart):**
- Søjlediagram der viser individuelle spillere og deres antal indtjekninger
- X-akse: Spillere (sorteret efter antal indtjekninger, højest først)
- Y-akse: Antal indtjekninger
- Viser "long-tail" distributionen - hvilke spillere er mest aktive
- Hjælper med at identificere core spillere vs. casual spillere

### 2.4 Insights og Analyser

**Træningsdag Sammenligning:**
- Intelligent analyse der sammenligner typiske træningsdage (fx Tirsdag vs. Torsdag)
- Viser procentvis forskel i fremmøde mellem dage
- Viser absolut forskel i antal indtjekninger
- Formateret som læsbar tekst med highlights

**Automatiske Insights:**
- Mest aktive træningsdag (baseret på gennemsnitligt fremmøde)
- Mest aktive træningsgruppe (baseret på gennemsnitligt fremmøde)
- Mest aktive spiller (baseret på total antal indtjekninger)
- Disse insights skal genereres dynamisk baseret på data

**Ugedags Analyse:**
- "Klog analyse på tværs af ugedage" som brugeren specifikt ønskede
- Sammenligning mellem typiske træningsdage (fx Tirsdag vs. Torsdag)
- Viser ikke kun gennemsnit, men også variation og trends
- Hjælper klubber med at forstå hvilke dage der trækker flest spillere

### 2.5 Data Krav

**Altid Fresh Data:**
- Der må ALDRIG vises cached data for statistik
- Alle queries skal altid hente frisk data fra databasen
- Dette er et kritisk krav fra brugeren - ingen kompromiser

**Isolation ID Filtering:**
- For demo tenants skal data korrekt filtreres på `isolation_id`
- Sikrer at forskellige demo sessions ikke ser hinandens data
- Production tenants skal filtrere på `isolation_id IS NULL`

## 3. Individuel Statistik View

### 3.1 Spiller Valg

**Søgefunktion:**
- Debounced søgeinput (300ms delay)
- Søger i både spiller navn og alias
- Dropdown med søgeresultater
- Valg af spiller loader deres statistik

**Sammenligning:**
- Mulighed for at vælge en anden spiller til sammenligning
- To søgefelter - én for hver spiller
- Viser sammenlignende statistik side-ved-side

### 3.2 Spiller Statistik

**Overordnede Nøgletal:**
- Total antal indtjekninger (check-ins)
- Total antal kampe med resultater
- Total vundne kampe
- Total tabte kampe
- Win rate (procent)
- Gennemsnitlig score difference (hvor meget vinder/taber spilleren typisk med)

**Sæson-baseret Opdeling:**
- Vundne kampe pr. sæson (fx "2023/2024: 15 sejre")
- Tabte kampe pr. sæson
- Mulighed for at se udvikling over tid

**Seneste Kampe:**
- Viser de seneste 5 kampe spilleren har spillet
- For hver kamp vises:
  - Modstander(ne)
  - Dato
  - Resultat (vundet/tabt)
  - Score (fx "21-19, 21-17" eller "21-19, 19-21, 21-16")
  - Match type (1v1, 2v2, mix)
- Visuelt design der gør det nemt at scanne resultaterne

**Historisk Data:**
- Alle individuelle kampresultater skal gemmes permanent
- Man skal kunne gå tilbage og se historiske resultater
- Data skal være tilgængelig for analyse over tid

### 3.3 Spiller Sammenligning

**Head-to-Head Resultater:**
- Viser alle kampe mellem de to valgte spillere
- Total head-to-head statistik:
  - Antal kampe sammen
  - Antal sejre for spiller 1
  - Antal sejre for spiller 2
  - Win rate for hver spiller
- Detaljeret liste over alle head-to-head kampe:
  - Dato
  - Resultat (hvem vandt)
  - Score
  - Match type
- Sorteret efter dato (nyeste først)

**Sammenlignende Statistik:**
- Side-ved-side sammenligning af:
  - Total indtjekninger
  - Total kampe
  - Win rate
  - Gennemsnitlig score difference
- Visuelt design der gør det nemt at sammenligne

## 4. Match Resultater Integration

### 4.1 Score Regler

**Badminton Score Regler:**
- Et sæt kan ikke ende 21-20 (skal have minimum 2-points forskel)
- Gyldige scores: 21-19, 22-20, 23-21, osv.
- Special case: 30-29 er tilladt (max score er 30)
- Minimum score difference: 2 points (undtagen 30-29)

**Match Format:**
- 3-sæts kampe skal forekomme ca. 40% af tiden (ikke 20%)
- 2-sæts kampe forekommer de resterende 60%
- Realistisk fordeling af match længder

### 4.2 Data Struktur

**Match Results Storage:**
- Alle kampresultater gemmes i `match_results` tabel
- `score_data` gemmes som JSONB med struktur:
  ```json
  {
    "sets": [
      {"team1": 21, "team2": 19},
      {"team1": 21, "team2": 17}
    ],
    "winner": "team1" // eller "team2"
  }
  ```
- `winner_team` gemmes eksplicit for nem querying
- `sport` felt identificerer sport type (fx "badminton")

**Historisk Persistens:**
- Resultater kan ikke slettes eller redigeres (kun tilføjes)
- Fuldt historisk overblik over alle kampe
- Mulighed for at analysere trends over tid

## 5. Data Seeding og Demo Data

### 5.1 Realistisk Data Generation

**Tidsperiode:**
- Generer data for både nuværende og sidste sæson
- Normaliseret distribution - ikke mere data for nuværende sæson end sidste
- Realistisk spredning over et år

**Træningsmønstre:**
- Primært træning på Tirsdag og Torsdag (typiske klubdage)
- Nogle sessioner på andre dage for variation
- Realistiske tider (fx 18:00-20:00)

**Spiller Aktivitet:**
- Core spillere: 80-90% fremmøde
- Casual spillere: 30-50% fremmøde
- Varieret mønstre for at simulere virkelighed

**Match Resultater:**
- Realistiske scores der følger badminton regler
- 40% 3-sæts kampe, 60% 2-sæts kampe
- Varieret match types (1v1, 2v2, mix)
- Realistisk fordeling af sejre/nederlag

### 5.2 Script Funktionalitet

**generate-dummy-statistics.ts:**
- Genererer træningssessioner over flere måneder
- Opretter check-ins for hver session
- Genererer matches med realistiske resultater
- Sikrer at alle data følger de definerede regler
- Kan køres på demo tenant for at populere med test data

## 6. Performance og Optimering

### 6.1 Client-Side Filtering

**Spiller Liste:**
- Hent alle spillere én gang ved load
- Filtrer client-side baseret på søgning
- Debounce søgeinput (300ms) for at reducere re-renders

**Data Aggregation:**
- Aggreger data client-side hvor muligt
- Reducer antal database queries
- Cache kun non-statistics data (fx spillerliste)

### 6.2 Data Fetching

**Conditional Loading:**
- Kun load data når view er aktivt
- "Træning & Fremmøde" data kun loades når view er åbnet
- Player statistics kun loades når spiller er valgt

**Parallel Loading:**
- Load uafhængig data parallelt hvor muligt
- Sequential loading kun når data er afhængig af hinanden

### 6.3 Cache Strategi

**Ingen Cache for Statistics:**
- Statistics data skal ALTID være fresh
- Ingen in-memory cache for statistics queries
- Dette er et eksplicit krav fra brugeren

**Cache for Static Data:**
- Spillerliste kan caches (opdateres kun ved CRUD operationer)
- Training groups kan caches
- Men invalidér cache når data ændres

## 7. Teknisk Arkitektur

### 7.1 Komponent Struktur

**Statistics Page (`Statistics.tsx`):**
- Hovedkomponent der håndterer navigation mellem views
- State management for view mode (landing/training/player)
- Orchestrerer data loading baseret på aktivt view

**Landing Component (`StatisticsLanding.tsx`):**
- Viser to store knapper/kort
- "Træning & Fremmøde" og "Individuel Statistik"
- Simpelt og klart design

**Filter Component (`StatisticsFilters.tsx`):**
- Træningsgruppe chips (multi-select)
- Periode dropdown
- Custom date range picker
- Håndterer filter state

**KPI Cards (`KPICards.tsx`):**
- Viser fire KPI cards
- Modtager data som props
- Formaterer tal pænt

**Insights Component (`StatisticsInsights.tsx`):**
- Genererer og viser tekst-baserede insights
- Formateret med highlights og bold text
- Dynamisk baseret på data

**Recent Matches (`RecentMatches.tsx`):**
- Viser seneste 5 kampe for en spiller
- Liste format med score og resultat
- Visuelt design der gør det nemt at scanne

**Head-to-Head Results (`HeadToHeadResults.tsx`):**
- Viser alle kampe mellem to spillere
- Total statistik og detaljeret liste
- Sammenlignende layout

**Chart Components:**
- `BarChart.tsx` - Generel bar chart wrapper (recharts)
- `LineChart.tsx` - Generel line chart wrapper (recharts)
- `PieChart.tsx` - Generel pie chart wrapper (recharts)
- Alle bruger recharts biblioteket

### 7.2 Hooks Struktur

**useStatisticsFilters:**
- Håndterer filter state (periode, grupper, datoer)
- Loader tilgængelige træningsgrupper
- Beregner date ranges baseret på valgt periode

**useTrainingAttendance:**
- Loader alle trænings-relateret data
- Training group attendance
- Weekday attendance
- Long-tail data
- Over-time data
- Training day comparison
- Kun loader når view er aktivt

**usePlayerStatistics:**
- Loader individuel spiller statistik
- Check-ins, matches, win/loss, win rate
- Recent matches
- Sæson-baseret opdeling
- Kun loader når spiller er valgt

**usePlayerComparison:**
- Loader sammenlignende statistik
- Head-to-head resultater
- Kun loader når begge spillere er valgt

**useDebounce:**
- Generel debounce utility hook
- Bruges til søgeinput og andre inputs der skal debounces

### 7.3 API Struktur

**stats.ts API Module:**
- `getTrainingGroupAttendance()` - Fremmøde pr. gruppe
- `getWeekdayAttendance()` - Fremmøde pr. ugedag
- `getPlayerCheckInLongTail()` - Long-tail view
- `getWeekdayAttendanceOverTime()` - Fremmøde over tid
- `getTrainingDayComparison()` - Sammenligning af dage
- `getPlayerStatistics(playerId)` - Spiller statistik
- `getPlayerComparison(playerId1, playerId2)` - Sammenligning
- Alle funktioner skal ALTID hente fresh data (ingen cache)

**postgres.ts Data Access:**
- `getStatisticsSnapshots()` - Henter statistics snapshots (altid fresh)
- `getStateCopy()` - Henter state copy (altid fresh for statistics)
- `getMatches()` - Henter matches
- `getMatchResults()` - Henter match results
- `getCheckIns()` - Henter check-ins
- `getPlayers()` - Henter spillere (kan caches)

### 7.4 Utility Functions

**lib/statistics/dateRange.ts:**
- `useDateRange()` hook
- Beregner date ranges baseret på valgt periode
- Håndterer alle period typer (last7days, lastMonth, lastSeason, custom, month, all)

**lib/statistics/kpiCalculation.ts:**
- `calculateTrainingKPIs()` function
- Beregner KPI'er fra training group attendance data
- Total check-ins, sessions, average attendance, unique players

**lib/statistics/insights.ts:**
- `generateTrainingInsights()` function
- Genererer tekst-baserede insights fra data
- Training day comparison, most active day/group/player

## 8. UI/UX Krav

### 8.1 Design Principper

**Klar Navigation:**
- Landing page skal være tydelig og simpel
- To store, klare valgmuligheder
- Ingen forvirring om hvor man skal klikke

**Filter Prominence:**
- Træningsgruppe filter skal være synligt og åbent som standard
- Ikke gemt i dropdown - det er kritisk funktionalitet
- Chips design gør det nemt at se og vælge grupper

**Visual Hierarchy:**
- KPI cards øverst for hurtig oversigt
- Charts i midten for detaljeret analyse
- Insights nederst for kontekst og fortolkning

**Responsive Design:**
- Fungerer på både desktop og mobile
- Charts skal være responsive og tilpasse sig skærmstørrelse
- Filters skal være brugbare på mobile

### 8.2 Fejlhåndtering

**Loading States:**
- Vis loading indicators når data loader
- Skeleton screens eller spinners
- Klar feedback til brugeren

**Error States:**
- Vis fejlbeskeder hvis data ikke kan loades
- Retry funktionalitet
- Graceful degradation

**Empty States:**
- Vis pæne empty states når der ikke er data
- Forklar hvad der mangler og hvorfor
- Call-to-action hvis relevant

## 9. Test og Validering

### 9.1 Funktional Test

**Træning & Fremmøde:**
- Test alle filter kombinationer
- Verificer at data opdateres korrekt ved filter ændringer
- Test at charts viser korrekt data
- Verificer at insights genereres korrekt

**Individuel Statistik:**
- Test spiller søgning og valg
- Verificer at alle statistik vises korrekt
- Test sammenligning mellem spillere
- Verificer at head-to-head resultater er komplette

**Data Freshness:**
- Verificer at data ALTID er fresh
- Test at cache ikke bruges for statistics
- Verificer at nye data vises umiddelbart

### 9.2 Performance Test

- Test med store datasæt (1000+ sessions, 100+ spillere)
- Verificer at queries ikke timeout
- Test at client-side filtering er hurtig
- Verificer at debouncing virker korrekt

### 9.3 Edge Cases

- Test med ingen data
- Test med kun én træningsgruppe
- Test med spillere uden kampe
- Test med spillere uden check-ins
- Test med custom date ranges der ikke matcher data

## 10. Fremtidige Udvidelser (Ikke i Scope Nu)

Disse features er ikke en del af nuværende plan, men kan tilføjes senere:

- Eksport af statistik til PDF/Excel
- Email rapporter med statistik
- Avancerede filtre (fx "kun vundne kampe", "kun mix matches")
- Trend analyser med predictions
- Spiller ranking baseret på statistik
- Team statistik (for doubles/mix teams)
- Træningsgruppe sammenligning
- Sæson-sammenligning
- Custom dashboard widgets
- Real-time statistik updates

## 11. Kritisk Krav: Data Freshness

Dette er det vigtigste krav og skal altid overholdes:

**"Der må ALDRIG blive vist andet end fuldt opdateret view på databasen"**

Dette betyder:
- Ingen cache for statistics queries
- Alle statistics funktioner skal altid hente fresh data
- `getStatisticsSnapshots()` skal altid force refresh
- `getStateCopy()` skal altid force refresh når brugt til statistics
- Dette er et non-negotiable krav fra brugeren

## 12. Implementering Prioritet

### Fase 1: Grundlæggende Struktur
1. Landing page med navigation
2. Basis filter funktionalitet
3. KPI cards med data
4. Enkel bar chart

### Fase 2: Træning & Fremmøde
1. Alle filter typer (grupper, perioder, custom dates)
2. Alle charts (bar, line, long-tail)
3. Insights generation
4. Training day comparison

### Fase 3: Individuel Statistik
1. Spiller søgning og valg
2. Player statistics visning
3. Recent matches
4. Head-to-head comparison

### Fase 4: Polish og Optimering
1. Performance optimering
2. Error handling
3. Loading states
4. Responsive design
5. Data freshness sikring

## 13. Teknisk Stack

- **Frontend Framework:** React med TypeScript
- **Charts:** Recharts bibliotek
- **Styling:** Tailwind CSS med custom design tokens
- **State Management:** React hooks (useState, useEffect, useMemo, useCallback)
- **Data Fetching:** Custom API moduler med fetch
- **Database:** PostgreSQL via Vercel API routes
- **Date Handling:** Native JavaScript Date + Intl.DateTimeFormat

## 14. Success Kriterier

Modulet er succesfuldt når:

1. ✅ Landing page giver klart valg mellem to retninger
2. ✅ Træning & Fremmøde viser alle ønskede charts og insights
3. ✅ Filters virker korrekt og opdaterer data dynamisk
4. ✅ Individuel statistik viser komplet spiller data
5. ✅ Head-to-head sammenligning viser alle kampe
6. ✅ Data er ALTID fresh (ingen cache issues)
7. ✅ Performance er god selv med store datasæt
8. ✅ UI er intuitivt og responsivt
9. ✅ Alle edge cases håndteres gracefully
10. ✅ Koden følger alle guardrails og best practices

---

**Dette dokument beskriver den komplette vision for statistikmodulet baseret på alle brugerens ønsker gennem udviklingsprocessen. Det skal bruges som reference når modulet genimplementeres fra bunden.**

