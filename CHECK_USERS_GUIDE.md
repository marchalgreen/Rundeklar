# Guide til at tjekke brugere i produktion

## Problem
Du kan ikke logge ind i produktion. Dette kan skyldes:
1. Der er ingen brugere i databasen
2. Brugere har forkert role (coach vs admin)
3. Brugere mangler password_hash eller email_verified
4. Login endpointet understøtter ikke den login metode du prøver

## Løsning 1: Brug check-users API endpoint

Efter du har deployet den nye endpoint, kan du kalde:

```bash
curl https://herlev-hjorten.rundeklar.dk/api/admin/check-users
```

Eller åbn direkte i browseren:
```
https://herlev-hjorten.rundeklar.dk/api/admin/check-users
```

Dette vil vise:
- Alle brugere og deres roller
- Hvilke brugere der har password vs PIN
- Email verification status
- Tenant information

## Løsning 2: Tjek login endpointet

Det nuværende login endpoint (`packages/webapp/api/auth/login.ts`) understøtter **kun email/password login**.

Hvis du har coaches med username/PIN, vil de ikke kunne logge ind med den nuværende kode.

### Hvad login endpointet gør nu:
1. Søger efter bruger med `email` og `tenant_id`
2. Tjekker `password_hash`
3. Kræver `email_verified = true`

### Hvis du har coaches:
- De har sandsynligvis `username` og `pin_hash` i stedet for `email` og `password_hash`
- De kan ikke logge ind med den nuværende kode

## Næste skridt

1. **Deploy check-users endpoint** så vi kan se hvad der er i databasen
2. **Tjek resultatet** - se om der er brugere og hvilke roller de har
3. **Fix login endpointet** hvis nødvendigt:
   - Hvis der er coaches, skal login endpointet understøtte username/PIN
   - Hvis der er admins uden email_verified, skal vi fikse det
   - Hvis der er brugere uden password_hash, skal vi fikse det

## Debugging

Hvis du får fejl når du prøver at logge ind, tjek:

1. **Browser console** - se fejlbeskeden
2. **Network tab** - se hvad API'et returnerer
3. **Server logs** - se om der er database fejl

## Eksempel på hvad der kan være galt:

```sql
-- Hvis du har en coach:
SELECT * FROM clubs WHERE role = 'coach';
-- Denne bruger har sandsynligvis:
-- - username (ikke email)
-- - pin_hash (ikke password_hash)
-- - email_verified kan være false eller NULL

-- Men login endpointet søger efter:
-- - email (findes ikke for coaches)
-- - password_hash (findes ikke for coaches)
-- - email_verified = true (kan være false)
```

Dette vil resultere i "Invalid email or password" selvom brugeren eksisterer.

