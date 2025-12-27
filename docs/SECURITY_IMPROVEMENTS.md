# Security Improvements - Brute-force og Credential Stuffing Beskyttelse

**Dato:** 2024-12-19  
**Status:** Implementeret  
**Prioritet:** Høj

## Oversigt

Dette dokument beskriver alle security improvements implementeret for at beskytte mod brute-force angreb, credential stuffing og online password guessing. Alle forbedringer er designet til at være production-ready og følge security best practices.

---

## 1. IP-baseret Rate Limiting

### Implementering

**Fil:** `packages/webapp/src/lib/auth/rateLimit.ts`

**Features:**
- Rate limiting per IP adresse (20 forsøg per 15 minutter)
- Rate limiting per konto (5 forsøg per 15 minutter)
- Begge checks køres før database lookup
- IP adresser anonymiseres (første 3 octets) for GDPR compliance

**Konfiguration:**
```typescript
MAX_LOGIN_ATTEMPTS_PER_ACCOUNT = 5 (default, kan overrides via env)
MAX_LOGIN_ATTEMPTS_PER_IP = 20 (default, kan overrides via env)
WINDOW_MINUTES = 15 (default, kan overrides via env)
```

**Environment Variables:**
- `MAX_LOGIN_ATTEMPTS_PER_ACCOUNT` - Max forsøg per konto
- `MAX_LOGIN_ATTEMPTS_PER_IP` - Max forsøg per IP
- `RATE_LIMIT_WINDOW_MINUTES` - Time window for rate limiting

**Hvordan det virker:**
1. Tjekker IP-baseret rate limiting først
2. Tjekker konto-baseret rate limiting
3. Begge skal være under grænsen for at tillade login

**Database Migration:**
- `database/migrations/016_enhance_rate_limiting.sql` - Tilføjer indexes for IP-baseret queries

---

## 2. Progressive Lockout

### Implementering

**Fil:** `packages/webapp/src/lib/auth/rateLimit.ts`

**Features:**
- Eskalerende lockout varigheder baseret på antal lockouts
- Første lockout: 15 minutter
- Anden lockout: 30 minutter (2x)
- Tredje lockout: 60 minutter (4x)
- Maksimum: 24 timer

**Konfiguration:**
```typescript
INITIAL_LOCKOUT_DURATION_MINUTES = 15 (default)
MAX_LOCKOUT_DURATION_MINUTES = 1440 (24 timer, default)
PROGRESSIVE_LOCKOUT_MULTIPLIER = 2.0 (default)
```

**Environment Variables:**
- `INITIAL_LOCKOUT_DURATION_MINUTES` - Start lockout varighed
- `MAX_LOCKOUT_DURATION_MINUTES` - Maksimum lockout varighed
- `PROGRESSIVE_LOCKOUT_MULTIPLIER` - Multiplikator for progressive lockout

**Hvordan det virker:**
1. Tæller antal lockouts i sidste 24 timer
2. Beregner lockout varighed: `initial * (multiplier ^ (lockoutCount - 1))`
3. Capper ved maksimum varighed

---

## 3. reCAPTCHA v3 Bot Detection

### Implementering

**Fil:** `packages/webapp/src/lib/auth/recaptcha.ts`  
**Integration:** `packages/webapp/api/auth/login.ts`  
**Frontend:** `packages/webapp/src/routes/auth/Login.tsx`

**Features:**
- reCAPTCHA v3 (invisible, ingen user interaction)
- Score-baseret verifikation (threshold: 0.5)
- Fail-open design (hvis reCAPTCHA fejler, tillader login)
- Kører i baggrunden uden at forstyrre brugeren

**Konfiguration:**

**Environment Variables:**
- `VITE_RECAPTCHA_SITE_KEY` - reCAPTCHA site key (frontend)
- `RECAPTCHA_SECRET_KEY` - reCAPTCHA secret key (backend)
- `RECAPTCHA_SCORE_THRESHOLD` - Minimum score (default: 0.5)

**Setup:**
1. Opret reCAPTCHA v3 keys på https://www.google.com/recaptcha/admin
2. Tilføj `VITE_RECAPTCHA_SITE_KEY` til `.env.local`
3. Tilføj `RECAPTCHA_SECRET_KEY` til Vercel environment variables
4. (Optional) Juster `RECAPTCHA_SCORE_THRESHOLD` hvis nødvendigt

**Hvordan det virker:**
1. Frontend loader reCAPTCHA script automatisk
2. Ved login, eksekverer reCAPTCHA og får token
3. Token sendes til backend med login request
4. Backend verificerer token mod Google API
5. Hvis score < threshold, logger warning (men blokerer ikke login)

**CSP Updates:**
- `packages/webapp/index.html` - Opdateret CSP for at tillade reCAPTCHA scripts

---

## 4. Registration Enumeration Fix

### Implementering

**Fil:** `packages/webapp/api/auth/register.ts`

**Problem:**
- Tidligere returnerede 409 Conflict hvis email/tenant_id eksisterede
- Dette afslørede om konti eksisterede (user enumeration)

**Løsning:**
- Altid returnerer 201 Created med generisk besked
- Logger forsøg på eksisterende konti (for monitoring)
- Sender kun verification email hvis konto faktisk oprettes

**Response:**
```json
{
  "success": true,
  "message": "If an account with this email does not exist, a verification email has been sent. Please check your email to verify your account."
}
```

**Både eksisterende og nye konti får samme response.**

---

## 5. Token Rotation

### Implementering

**Fil:** `packages/webapp/api/auth/refresh.ts`

**Features:**
- Genererer ny refresh token ved hver refresh
- Invaliderer gamle refresh token automatisk
- Atomisk operation (transaction) for at undgå race conditions
- Returnerer både ny access token og ny refresh token

**Hvordan det virker:**
1. Client sender refresh token
2. Server validerer token
3. Server genererer ny refresh token
4. Server sletter gammel session og opretter ny (i transaction)
5. Server returnerer ny access token og ny refresh token

**Sikkerhedsfordele:**
- Stjålne refresh tokens kan kun bruges én gang
- Reducerer risiko ved token theft
- Gør det sværere at bruge stjålne tokens samtidigt

**Client-side:**
- `packages/webapp/src/contexts/AuthContext.tsx` - Opdateret til at håndtere ny refresh token

---

## 6. HttpOnly Cookies Option

### Implementering

**Fil:** `packages/webapp/src/lib/auth/cookies.ts`  
**Integration:** `packages/webapp/api/auth/login.ts`, `refresh.ts`, `logout.ts`

**Features:**
- HttpOnly cookies for tokens (beskytter mod XSS)
- Secure flag i production (HTTPS only)
- SameSite=Strict (beskytter mod CSRF)
- Fallback til localStorage hvis cookies ikke er aktiveret

**Konfiguration:**

**Environment Variable:**
- `USE_HTTPONLY_COOKIES=true` - Aktiverer HttpOnly cookies

**Hvordan det virker:**
1. Hvis `USE_HTTPONLY_COOKIES=true`:
   - Tokens sendes kun i HttpOnly cookies
   - Ikke tilgængelige via JavaScript (beskytter mod XSS)
   - Automatisk inkluderet i requests
2. Hvis ikke aktiveret:
   - Fallback til localStorage (eksisterende behavior)

**Cookie Settings:**
- `Secure`: Kun i production (HTTPS)
- `HttpOnly`: Kun server-side (ikke tilgængelig via JavaScript)
- `SameSite=Strict`: Beskytter mod CSRF
- `Path=/`: Tilgængelig på hele sitet

---

## 7. Password Breach Detection

### Implementering

**Fil:** `packages/webapp/src/lib/auth/passwordBreach.ts`  
**Integration:** `packages/webapp/src/lib/auth/password.ts`

**Features:**
- Integration med Have I Been Pwned API
- K-anonymity model (kun sender første 5 chars af hash)
- Fail-open design (hvis API fejler, tillader password)
- Tjekker mod 11+ milliarder lækkede passwords

**Konfiguration:**
- Ingen konfiguration nødvendig (bruger public API)
- Automatisk aktiveret ved password validation

**Hvordan det virker:**
1. Hash password med SHA-1
2. Send kun første 5 karakterer til HIBP API (k-anonymity)
3. Modtag liste af hashes der matcher prefix
4. Tjek om resten af hash er i listen
5. Hvis fundet, afvis password med besked om antal breaches

**Integration Points:**
- Registration (`packages/webapp/api/auth/register.ts`)
- Password reset (`packages/webapp/api/auth/reset-password.ts`)
- Password change (`packages/webapp/api/auth/change-password.ts`)

**Response ved breached password:**
```json
{
  "error": "Password does not meet requirements",
  "details": [
    "This password has been found in 1234 data breaches. Please choose a different password."
  ],
  "breachCount": 1234
}
```

---

## Database Migrations

### Migration 016: Enhance Rate Limiting

**Fil:** `database/migrations/016_enhance_rate_limiting.sql`

**Ændringer:**
- Tilføjer index på `ip_address` for IP-baseret rate limiting
- Tilføjer composite index på `email, created_at, success`
- Forbedrer query performance for rate limiting checks

**Kør migration:**
```bash
psql $DATABASE_URL -f database/migrations/016_enhance_rate_limiting.sql
```

---

## Environment Variables

### Nye Environment Variables

**Rate Limiting:**
- `MAX_LOGIN_ATTEMPTS_PER_ACCOUNT` - Max forsøg per konto (default: 5)
- `MAX_LOGIN_ATTEMPTS_PER_IP` - Max forsøg per IP (default: 20)
- `RATE_LIMIT_WINDOW_MINUTES` - Time window (default: 15)
- `INITIAL_LOCKOUT_DURATION_MINUTES` - Start lockout (default: 15)
- `MAX_LOCKOUT_DURATION_MINUTES` - Max lockout (default: 1440)
- `PROGRESSIVE_LOCKOUT_MULTIPLIER` - Multiplikator (default: 2.0)

**reCAPTCHA:**
- `VITE_RECAPTCHA_SITE_KEY` - Site key (frontend)
- `RECAPTCHA_SECRET_KEY` - Secret key (backend)
- `RECAPTCHA_SCORE_THRESHOLD` - Minimum score (default: 0.5)

**Cookies:**
- `USE_HTTPONLY_COOKIES` - Aktiver HttpOnly cookies (true/false)

### Eksisterende Environment Variables

- `AUTH_JWT_SECRET` - JWT signing secret (påkrævet)
- `DATABASE_URL` - Database connection string (påkrævet)

---

## Testing

### Unit Tests

**Filer:**
- `packages/webapp/tests/unit/rateLimit.test.ts` - Rate limiting tests
- `packages/webapp/tests/unit/enumeration.test.ts` - Enumeration protection tests
- `packages/webapp/tests/unit/tokenRotation.test.ts` - Token rotation tests

**Kør tests:**
```bash
cd packages/webapp
pnpm test
```

---

## Monitoring og Alarmer

### Logging

**Rate Limiting:**
- Alle login forsøg logges i `club_login_attempts` tabel
- IP adresser anonymiseres (første 3 octets)
- Retention: 7 dage (opdateret fra 24 timer)

**reCAPTCHA:**
- Low scores logges som warnings
- Fejl ved verification logges

**Password Breach:**
- Breached passwords logges (men ikke selve password)

### Metrics at Overvåge

1. **Rate Limit Triggers:**
   - Antal lockouts per dag
   - Top IPs der trigger rate limits
   - Top konti der trigger rate limits

2. **reCAPTCHA Scores:**
   - Gennemsnitlig score
   - Antal low scores (< 0.5)
   - Antal failed verifications

3. **Password Breaches:**
   - Antal breached passwords afvist
   - Top breached passwords

---

## Deployment Checklist

### Før Deployment

- [ ] Opret reCAPTCHA v3 keys og tilføj til environment variables
- [ ] Kør database migration 016
- [ ] Verificer alle environment variables er sat
- [ ] Test rate limiting lokalt
- [ ] Test reCAPTCHA integration
- [ ] Test password breach detection
- [ ] Test token rotation
- [ ] Test HttpOnly cookies (hvis aktiveret)

### Efter Deployment

- [ ] Verificer rate limiting virker i production
- [ ] Verificer reCAPTCHA virker i production
- [ ] Monitor logs for rate limit triggers
- [ ] Monitor logs for reCAPTCHA low scores
- [ ] Verificer password breach detection virker

---

## Rollback Plan

Hvis der opstår problemer:

1. **Rate Limiting:**
   - Sæt environment variables til højere værdier
   - Eller revert til gamle `rateLimit.ts` (backup før ændringer)

2. **reCAPTCHA:**
   - Fjern `VITE_RECAPTCHA_SITE_KEY` og `RECAPTCHA_SECRET_KEY`
   - Systemet vil fail-open (tillade alle logins)

3. **Password Breach:**
   - Deaktiver ved at sætte `checkBreach: false` i password validation
   - Eller revert `password.ts` til sync version

4. **Token Rotation:**
   - Revert `refresh.ts` til ikke at rotere tokens

---

## Security Best Practices

### Implementerede Best Practices

1. ✅ **Defense in Depth** - Flere lag af beskyttelse
2. ✅ **Fail-Open Design** - Systemet virker selv hvis security features fejler
3. ✅ **GDPR Compliance** - IP adresser anonymiseres
4. ✅ **Rate Limiting** - Både per konto og per IP
5. ✅ **Progressive Lockout** - Eskalerende straf for gentagne forsøg
6. ✅ **Bot Detection** - reCAPTCHA v3
7. ✅ **Password Security** - Breach detection
8. ✅ **Token Security** - Rotation og HttpOnly cookies
9. ✅ **User Enumeration Protection** - Generiske responses

### Yderligere Anbefalinger

1. **Monitoring:**
   - Setup alerts ved mistænkelig aktivitet
   - Monitor rate limit triggers
   - Track reCAPTCHA scores over tid

2. **WAF/CDN:**
   - Overvej Vercel Edge Middleware for yderligere rate limiting
   - Overvej Cloudflare WAF for ekstra beskyttelse

3. **Geographic Filtering:**
   - Overvej at blokere kendte malicious IP ranges
   - Overvej geografisk baseret rate limiting

---

## Konklusion

Alle kritiske security improvements er implementeret og klar til production. Systemet har nu:

- ✅ IP-baseret rate limiting
- ✅ Progressive lockout
- ✅ reCAPTCHA bot detection
- ✅ Registration enumeration protection
- ✅ Token rotation
- ✅ HttpOnly cookies option
- ✅ Password breach detection
- ✅ Comprehensive tests
- ✅ Database optimizations

**Systemet er nu signifikant bedre beskyttet mod brute-force angreb og credential stuffing.**



