# Vendor onboarding wizard

Denne guide beskriver, hvordan du bruger Clairitys vendor onboarding wizard til at oprette nye leverandører i vendor sync modulet.

## Adgang til wizard

1. Navigér til `/vendor-sync/vendors` i dashboardet.
2. Klik på **Tilføj leverandør** for at åbne det guidede sheet.
3. Følg de fire trin for at indsende en ny leverandør:
   - **Leverandør**: Angiv slug (små bogstaver/tal/bindestreg) og visningsnavn.
   - **Integration**: Vælg om leverandøren integreres via et scraper-script eller et API.
   - **Legitimationsoplysninger**: Udfyld de påkrævede felter for den valgte integrationstype.
   - **Review**: Kontrollér oplysningerne og opret leverandøren.

## Efter oprettelse

Når leverandøren er oprettet, viser wizard to kommandoer, som udviklere kan bruge til at oprette og validere en ny adapter i vendor SDK’et. Kommandoerne kan kopieres direkte via knapperne i interfacet.

```
pnpm tsx scripts/vendors/new-adapter.ts <slug>
pnpm tsx scripts/vendors/validate-adapter.ts <slug>
```

SDK-kommandoerne er også tilgængelige i anmeldelses-trinnet efter oprettelse, så du kan dele dem direkte i dit udviklerteam.

## Opdatering af oversigten

- Klik på **Opdater liste** for at hente den seneste vendor-liste.
- Listen viser integrationstype, credential-status og om der findes en registreret adapter i SDK’et via en tekst-badge.
