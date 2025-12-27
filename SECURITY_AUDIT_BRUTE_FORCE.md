# Sikkerhedsrevision: Brute-force og Credential Stuffing Beskyttelse

**Dato:** 2024-12-19  
**Revisor:** Security Audit  
**Omfang:** Authentication flow, rate limiting, password security, session management

---

## 1. Login-endpoints og Flows

### Identificerede Endpoints

#### Hovedlogin Endpoint
**Fil:** `packages/webapp/api/auth/login.ts`  
**Endpoint:** `POST /api/auth/login`  
**Metoder accepteret:** POST (OPTIONS for CORS preflight)

**Understøttede login-typer:**
- Email/password (for admins)
- Username/PIN (for coaches)
- 2FA/TOTP (valgfri, hvis aktiveret)

**Request schema:**
```typescript
{
  tenantId: string (required)
  email?: string (optional, for admin login)
  password?: string (optional, for admin login)
  username?: string (optional, for coach login)
  pin?: string (optional, 6 digits, for coach login)
  totpCode?: string (optional, for 2FA)
}
```

**Login Flow (linje 31-307):**
1. **Rate limit check** (linje 92) - Tjekker om email/username har overskredet grænse
2. **Database lookup** (linje 101-133) - Finder club baseret på login metode
3. **Credential verification** (linje 144-188) - Verificerer password/PIN hash
4. **Email verification check** (linje 198-202) - Kun for email/password login
5. **2FA check** (linje 204-226) - Hvis 2FA er aktiveret
6. **Token generation** (linje 238-240) - Genererer access og refresh tokens
7. **Session creation** (linje 244-247) - Gemmer refresh token hash i database
8. **Success logging** (linje 257) - Logger succesfuldt login forsøg

**Response patterns:**
- `200 OK` - Succesfuldt login (med tokens)
- `200 OK` - 2FA påkrævet (`requires2FA: true`)
- `400 Bad Request` - Validation fejl
- `401 Unauthorized` - Forkerte credentials
- `403 Forbidden` - Email ikke verificeret
- `429 Too Many Requests` - Rate limit overskredet
- `500 Internal Server Error` - Server fejl

**Risiko-niveau:** Lav  
**Observation:** Rate limiting check sker før database lookup, hvilket er godt for performance og sikkerhed.

---

#### Token Refresh Endpoint
**Fil:** `packages/webapp/api/auth/refresh.ts`  
**Endpoint:** `POST /api/auth/refresh`  
**Metoder accepteret:** POST

**Request schema:**
```typescript
{
  refreshToken: string (required)
}
```

**Flow (linje 12-76):**
1. Validerer refresh token format
2. Hasher refresh token (linje 28)
3. Finder session i database (linje 31-37)
4. Genererer ny access token (linje 57)
5. Returnerer ny access token (ingen refresh token rotation)

**Response patterns:**
- `200 OK` - Ny access token genereret
- `400 Bad Request` - Validation fejl
- `401 Unauthorized` - Ugyldig eller udløbet refresh token
- `500 Internal Server Error` - Server fejl

**Risiko-niveau:** Mellem  
**Observation:** Ingen token rotation - samme refresh token kan bruges flere gange indtil expiry eller logout.

---

#### Logout Endpoint
**Fil:** `packages/webapp/api/auth/logout.ts`  
**Endpoint:** `POST /api/auth/logout`  
**Metoder accepteret:** POST

**Request schema:**
```typescript
{
  refreshToken: string (required)
}
```

**Flow (linje 12-52):**
1. Hasher refresh token (linje 27)
2. Sletter session fra database (linje 30-33)
3. Returnerer success

**Response patterns:**
- `200 OK` - Logout succesfuldt
- `400 Bad Request` - Validation fejl
- `500 Internal Server Error` - Server fejl

**Risiko-niveau:** Lav  
**Observation:** Session invalidering fungerer korrekt.

---

#### Password Reset Flow

**Forgot Password Request**
**Fil:** `packages/webapp/api/auth/forgot-password.ts`  
**Endpoint:** `POST /api/auth/forgot-password`

**Flow (linje 14-80):**
1. Finder club baseret på email + tenant_id (linje 31-36)
2. Genererer reset token (linje 43)
3. Gemmer token i database med 1 times expiry (linje 47-52)
4. Sender reset email (linje 56)
5. **Altid returnerer 200 OK** - Ingen enumeration (linje 63-66)

**Risiko-niveau:** Lav  
**Observation:** God beskyttelse mod user enumeration - altid samme response uanset om email findes.

**Reset Password Execution**
**Fil:** `packages/webapp/api/auth/reset-password.ts`  
**Endpoint:** `POST /api/auth/reset-password`

**Flow (linje 13-95):**
1. Validerer password strength (linje 28-34)
2. Finder club med reset token (linje 39-43)
3. Tjekker token expiry (linje 54-58)
4. Hasher nyt password (linje 61)
5. Opdaterer password og sletter token (linje 64-69)
6. **Invalidere alle sessions** (linje 73-76)

**Risiko-niveau:** Lav  
**Observation:** Korrekt session invalidation ved password reset.

---

#### PIN Reset Flow

**Fil:** `packages/webapp/api/auth/reset-pin.ts`  
**Endpoint:** `POST /api/auth/reset-pin?action=request|validate|reset`

**Flow:**
- **Request** (linje 59-144): Finder coach, genererer token, sender email, **altid 200 OK**
- **Validate** (linje 145-179): Validerer token og returnerer username
- **Reset** (linje 180-233): Validerer PIN format, hasher ny PIN, opdaterer database

**Risiko-niveau:** Lav  
**Observation:** God beskyttelse mod enumeration i request flow.

---

#### Registration Endpoint

**Fil:** `packages/webapp/api/auth/register.ts`  
**Endpoint:** `POST /api/auth/register`

**Flow (linje 16-110):**
1. Validerer password strength (linje 31-37)
2. Tjekker om club eksisterer (linje 42-45)
3. **Returnerer 409 Conflict hvis email/tenant_id eksisterer** (linje 47-50)
4. Hasher password (linje 54)
5. Opretter club med email verification token (linje 61-77)
6. Sender verification email (linje 81)

**Risiko-niveau:** Mellem  
**Observation:** 409 status kan bruges til user enumeration - afslører om email/tenant_id eksisterer.

**Hvordan det kan udnyttes:**
- Angriber kan teste om specifikke emails eksisterer ved at forsøge registration
- Kan bruges til at bygge liste over eksisterende konti

---

#### Email Verification Endpoint

**Fil:** `packages/webapp/api/auth/verify-email.ts`  
**Endpoint:** `POST /api/auth/verify-email`

**Flow (linje 11-76):**
1. Finder club med verification token (linje 28-33)
2. Tjekker om token er udløbet (linje 44-48)
3. Markerer email som verificeret (linje 51-57)

**Response patterns:**
- `200 OK` - Email verificeret
- `400 Bad Request` - Ugyldig eller udløbet token

**Risiko-niveau:** Lav  
**Observation:** Generisk fejlbesked - "Invalid or expired verification token" beskytter mod enumeration.

---

## 2. Brute-force og Rate Limiting

### Eksisterende Rate Limiting Implementering

**Fil:** `packages/webapp/src/lib/auth/rateLimit.ts`

**Konfiguration (linje 3-5):**
```typescript
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15
const WINDOW_MINUTES = 15
```

**Implementering:**

**checkLoginAttempts()** (linje 14-59):
- Tjekker fejlede forsøg inden for sidste 15 minutter (linje 24)
- Henter forsøg fra `club_login_attempts` tabel (linje 27-34)
- Tæller kun fejlede forsøg (linje 36-37)
- Hvis ≥5 fejlede forsøg, tjekker lockout periode (linje 39-52)
- Returnerer `allowed: false` hvis i lockout periode

**recordLoginAttempt()** (linje 69-88):
- Logger alle login forsøg (succes og fejl) (linje 77-80)
- Gemmer: club_id, email, ip_address, success, created_at
- Rydder op i forsøg ældre end 24 timer (linje 83-87)

**Integration i Login:**
**Fil:** `packages/webapp/api/auth/login.ts` (linje 90-98)
- Rate limit check sker **før** database lookup (linje 92)
- Bruger email eller username som identifier (linje 91)
- IP adresse logges men bruges **ikke** til rate limiting (linje 92)

---

### Begrænsninger og Gaps

#### 1. Ingen IP-baseret Rate Limiting
**Risiko-niveau:** Høj  
**Fil:** `packages/webapp/src/lib/auth/rateLimit.ts:17`  
**Observation:** IP adresse parameter `_ipAddress` er prefixed med underscore (unused), og bruges ikke i rate limiting logik.

**Hvordan det kan udnyttes:**
- Angriber kan distribuere forsøg på tværs af mange IP adresser
- Kan angribe samme konto fra forskellige IPs samtidigt
- Rate limiting per konto kan omgås ved at bruge forskellige IPs

**Eksempel angreb:**
```
Angriber har liste over 1000 emails
- Bruger 100 forskellige IPs (via proxy/VPN)
- Hver IP angriber 10 konti (1000 total)
- Ingen IP overskrider rate limit per konto
- Kan teste mange passwords per konto
```

---

#### 2. Ingen Global Rate Limiting
**Risiko-niveau:** Mellem  
**Observation:** Rate limiting er kun per email/username, ikke globalt.

**Hvordan det kan udnyttes:**
- Angriber kan angribe mange konti samtidigt
- Hver konto kan have 5 forsøg, så 100 konti = 500 forsøg totalt
- Ingen begrænsning på totalt antal login requests

---

#### 3. Ingen Progressive Lockout
**Risiko-niveau:** Mellem  
**Fil:** `packages/webapp/src/lib/auth/rateLimit.ts:4`  
**Observation:** Lockout varighed er fast 15 minutter, uanset antal forsøg.

**Hvordan det kan udnyttes:**
- Angriber kan vente 15 minutter og prøve igen
- Kan systematisk teste passwords over tid
- Ingen eskalerende straf for gentagne forsøg

**Forslag til forbedring:**
- Progressive lockout: 15 min → 1 time → 24 timer
- Efter X gentagne lockouts, permanent lockout (kræver admin unlock)

---

#### 4. Rate Limit Window Begrænsning
**Risiko-niveau:** Lav  
**Fil:** `packages/webapp/src/lib/auth/rateLimit.ts:24-34`  
**Observation:** Kun tjekker forsøg inden for sidste 15 minutter, men bruger `LIMIT ${MAX_LOGIN_ATTEMPTS}` hvilket kan være ineffektivt.

**Potentielt problem:**
- Hvis der er mange forsøg, kan query være langsom
- Ingen index på `success` kolonne (kun på email og created_at)

---

### Rate Limiting Coverage

**Endpoints med rate limiting:**
- ✅ `/api/auth/login` - Rate limiting implementeret

**Endpoints uden rate limiting:**
- ❌ `/api/auth/refresh` - Ingen rate limiting
- ❌ `/api/auth/forgot-password` - Ingen rate limiting
- ❌ `/api/auth/reset-password` - Ingen rate limiting
- ❌ `/api/auth/reset-pin` - Ingen rate limiting
- ❌ `/api/auth/register` - Ingen rate limiting

**Risiko-niveau:** Mellem  
**Observation:** Kun login endpoint har rate limiting. Andre endpoints kan misbruges til enumeration eller DoS.

---

## 3. Credential Stuffing Beskyttelse

### Manglende Beskyttelsesmekanismer

#### 1. Ingen reCAPTCHA eller Bot Detection
**Risiko-niveau:** Høj  
**Observation:** Ingen reCAPTCHA, hCaptcha, eller lignende bot detection på login eller registration endpoints.

**Hvordan det kan udnyttes:**
- Credential stuffing bots kan angribe uhindret
- Automatiserede angreb kan køre 24/7
- Ingen barrier mod bulk login forsøg

**Eksempel angreb:**
```
Bot med 1M lækkede credentials:
- Ingen CAPTCHA barrier
- Kan teste alle credentials automatisk
- Rate limiting per konto kan omgås med mange IPs
- Kan identificere gyldige konti hurtigt
```

---

#### 2. Ingen Device Fingerprinting
**Risiko-niveau:** Mellem  
**Observation:** Ingen tracking af device fingerprints, browser signatures, eller behavioral patterns.

**Hvordan det kan udnyttes:**
- Angriber kan skjule sig bag forskellige devices
- Ingen detektion af mistænkelige login patterns
- Ingen geografisk anomalidetektion

---

#### 3. Ingen Risikoscore eller Anomalidetektion
**Risiko-niveau:** Mellem  
**Observation:** Ingen scoring system der vurderer risiko baseret på:
- IP reputation
- Geografisk location
- Login tidspunkt
- Device/browser fingerprint
- Behavioral patterns

---

#### 4. Ingen IP Reputation Check
**Risiko-niveau:** Mellem  
**Observation:** IP adresse logges men tjekkes ikke mod:
- Known botnet IPs
- VPN/Proxy services
- Tor exit nodes
- Known malicious IP ranges

---

### Eksisterende Beskyttelse

#### 1. Rate Limiting per Konto
**Risiko-niveau:** Lav  
**Observation:** Rate limiting per email/username begrænser forsøg på samme konto, men kan omgås med IP rotation.

#### 2. Argon2id Password Hashing
**Risiko-niveau:** Lav  
**Observation:** Stærk hashing gør offline brute-force svært, men beskytter ikke mod online credential stuffing.

---

## 4. Fejlhåndtering og User Enumeration

### Login Endpoint Fejlhåndtering

**Fil:** `packages/webapp/api/auth/login.ts`

**Fejlbeskeder:**

**Ingen konto fundet** (linje 135-139):
```typescript
return res.status(401).json({
  error: isPINLogin ? 'Invalid username or PIN' : 'Invalid email or password'
})
```
**Risiko-niveau:** Lav  
**Observation:** Generisk fejlbesked - samme besked uanset om konto findes eller password er forkert.

**Forkerte credentials** (linje 190-194):
```typescript
return res.status(401).json({
  error: isPINLogin ? 'Invalid username or PIN' : 'Invalid email or password'
})
```
**Risiko-niveau:** Lav  
**Observation:** Samme fejlbesked som når konto ikke findes - god beskyttelse mod enumeration.

**Email ikke verificeret** (linje 198-201):
```typescript
return res.status(403).json({
  error: 'Email not verified. Please check your email for verification link.'
})
```
**Risiko-niveau:** Mellem  
**Observation:** Denne fejlbesked kan afsløre at email findes, men kun hvis password er korrekt. Dette er acceptabelt da password allerede er korrekt.

**2FA påkrævet** (linje 207-210):
```typescript
return res.status(200).json({
  requires2FA: true,
  message: 'Two-factor authentication required'
})
```
**Risiko-niveau:** Lav  
**Observation:** Returnerer 200 OK, hvilket er korrekt - afslører kun at password er korrekt og 2FA er aktiveret.

**Forkert 2FA kode** (linje 220-224):
```typescript
return res.status(401).json({
  error: 'Invalid 2FA code'
})
```
**Risiko-niveau:** Lav  
**Observation:** Generisk fejlbesked.

---

### Response Time Analysis

**Potentiel timing attack:**
- Database lookup tager tid (linje 107-127)
- Password/PIN verification tager tid (Argon2id verification)
- Forskelle i response time kan potentielt afsløre om konto findes

**Risiko-niveau:** Lav  
**Observation:** Rate limiting check sker før database lookup, hvilket hjælper med at normalisere response times. Men der kan stadig være subtile forskelle.

**Forslag til forbedring:**
- Simuler database lookup selv når konto ikke findes (dummy query)
- Normaliser response times ved at tilføje kunstig delay

---

### Password Reset Enumeration

**Fil:** `packages/webapp/api/auth/forgot-password.ts`

**Response** (linje 63-66):
```typescript
return res.status(200).json({
  success: true,
  message: 'If an account with that email exists, a password reset link has been sent.'
})
```
**Risiko-niveau:** Lav  
**Observation:** Altid samme response uanset om email findes - god beskyttelse mod enumeration.

---

### PIN Reset Enumeration

**Fil:** `packages/webapp/api/auth/reset-pin.ts`

**Request response** (linje 105-108, 141-144):
```typescript
return res.status(200).json({
  success: true,
  message: 'If a matching account exists, a PIN reset email has been sent.'
})
```
**Risiko-niveau:** Lav  
**Observation:** God beskyttelse mod enumeration.

---

### Registration Enumeration

**Fil:** `packages/webapp/api/auth/register.ts`

**Response hvis konto eksisterer** (linje 47-50):
```typescript
return res.status(409).json({
  error: 'Club with this email or tenant ID already exists'
})
```
**Risiko-niveau:** Mellem  
**Observation:** 409 Conflict status afslører at email/tenant_id eksisterer.

**Hvordan det kan udnyttes:**
- Angriber kan teste om specifikke emails eksisterer
- Kan bygge liste over eksisterende konti
- Kan bruges til targeted phishing angreb

**Forslag til forbedring:**
- Returner altid 201 Created, men send kun verification email hvis konto ikke eksisterer
- Eller returner generisk fejlbesked uden at afsløre om konto eksisterer

---

### Email Verification Enumeration

**Fil:** `packages/webapp/api/auth/verify-email.ts`

**Response ved ugyldig token** (linje 35-38):
```typescript
return res.status(400).json({
  error: 'Invalid or expired verification token'
})
```
**Risiko-niveau:** Lav  
**Observation:** Generisk fejlbesked - afslører ikke om token format er korrekt eller om token er udløbet.

---

## 5. Password Policy og Hashing

### Password Policy

**Fil:** `packages/webapp/src/lib/auth/password.ts:49-78`

**Krav:**
- Minimum 8 karakterer (linje 55)
- Maksimum 128 karakterer (linje 58)
- Skal indeholde mindst ét lowercase bogstav (linje 61)
- Skal indeholde mindst ét uppercase bogstav (linje 64)
- Skal indeholde mindst ét tal (linje 67)
- Skal indeholde mindst ét special karakter (linje 70)

**Validering:**
- Valideres i `validatePasswordStrength()` funktion
- Bruges ved registration (linje 31 i register.ts)
- Bruges ved password reset (linje 28 i reset-password.ts)
- Bruges ved password change (linje 41 i change-password.ts)

**Risiko-niveau:** Lav  
**Observation:** Stærk password policy med alle nødvendige kompleksitetskrav.

---

### Password Hashing

**Fil:** `packages/webapp/src/lib/auth/password.ts:12-42`

**Algoritme:** Argon2id

**Parametre** (linje 12-17):
```typescript
const ARGON2_OPTIONS = {
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  outputLen: 32,
  parallelism: 4
}
```

**Implementering:**
- `hashPassword()` (linje 24-27) - Hasher password med Argon2id
- `verifyPassword()` (linje 35-42) - Verificerer password mod hash

**Salt og Pepper:**
- Argon2id inkluderer automatisk salt i hash output
- Ingen ekstern pepper/secret bruges
- JWT secret (`AUTH_JWT_SECRET`) bruges kun til token signing, ikke password hashing

**Risiko-niveau:** Lav  
**Observation:** 
- Argon2id er moderne og sikker hashing algoritme
- Parametre er rimelige (64 MB memory, time cost 3)
- Salt håndteres automatisk af Argon2id
- Ingen pepper er acceptabelt, men kunne forbedre sikkerhed yderligere

**Hvordan det kan udnyttes:**
- Offline brute-force er svært pga. Argon2id's høje computational cost
- Online brute-force er begrænset af rate limiting
- Hvis database lækkes, er passwords relativt sikre (men pepper ville hjælpe)

---

### PIN Policy og Hashing

**Fil:** `packages/webapp/src/lib/auth/pin.ts`

**PIN Policy:**
- Præcis 6 cifre (linje 27, 48-49)
- Kun tal tilladt (linje 45)

**PIN Hashing:**
**Parametre** (linje 30-35):
```typescript
const ARGON2_OPTIONS = {
  memoryCost: 65536,  // 64 MB
  timeCost: 5,         // Højere end password (5 vs 3)
  outputLen: 32,
  parallelism: 4
}
```

**Risiko-niveau:** Mellem  
**Observation:** 
- PIN er kun 6 cifre (1M muligheder)
- Højere time cost (5) kompenserer for kort længde
- Rate limiting er kritisk for PIN sikkerhed

**Hvordan det kan udnyttes:**
- Med 1M mulige PINs og rate limiting på 5 forsøg per 15 min, ville det tage ~57 år at brute-force
- Men hvis rate limiting omgås (fx med IP rotation), kan PIN brute-forces relativt hurtigt
- PIN er designet til at være nemt at huske, hvilket kompromitterer sikkerhed

---

### Manglende Password Security Features

#### 1. Ingen Password Breach Detection
**Risiko-niveau:** Mellem  
**Observation:** Ingen integration med Have I Been Pwned eller lignende service.

**Hvordan det kan udnyttes:**
- Brugere kan bruge passwords der er lækket i andre breaches
- Credential stuffing angreb kan være mere effektive

**Forslag:**
- Integrer Have I Been Pwned API ved password change/registration
- Advær brugere hvis password er fundet i breaches

---

#### 2. Ingen Password Reuse Prevention
**Risiko-niveau:** Lav  
**Observation:** Ingen check mod tidligere passwords ved password change.

**Hvordan det kan udnyttes:**
- Brugere kan genbruge gamle passwords
- Hvis tidligere password er kompromitteret, kan det genbruges

**Forslag:**
- Gem password history (hashed)
- Forhindre genbrug af sidste N passwords

---

#### 3. Ingen Password History
**Risiko-niveau:** Lav  
**Observation:** Ingen tracking af password history.

---

## 6. Sessions og Tokens

### Token System

**Fil:** `packages/webapp/src/lib/auth/jwt.ts`

**Access Tokens:**
- Type: JWT (JSON Web Token)
- Expiry: 2 timer (linje 21)
- Indeholder: clubId, tenantId, role, email, type: 'access' (linje 37-43)
- Signeret med: `AUTH_JWT_SECRET` (linje 44-47)
- Issuer: 'herlev-hjorten-auth' (linje 46)

**Refresh Tokens:**
- Type: Random hex string (64 karakterer) (linje 74-76)
- Expiry: 7 dage (linje 243 i login.ts)
- Hashed før lagring: SHA-256 (linje 107)
- Gemt i: `club_sessions` tabel (linje 244-247 i login.ts)

**Risiko-niveau:** Lav  
**Observation:** 
- JWT access tokens er standard og sikre
- Refresh tokens er random og hashed før lagring
- Expiry tider er rimelige (2 timer access, 7 dage refresh)

---

### Token Storage

**Fil:** `packages/webapp/src/contexts/AuthContext.tsx`

**Storage location:**
- Access token: `localStorage.getItem('auth_access_token')` (linje 47)
- Refresh token: `localStorage.getItem('auth_refresh_token')` (linje 51)

**Risiko-niveau:** Mellem  
**Observation:** 
- localStorage er sårbar overfor XSS angreb
- Ingen HttpOnly cookies bruges
- Tokens er tilgængelige via JavaScript

**Hvordan det kan udnyttes:**
- XSS angreb kan stjæle tokens fra localStorage
- Malicious JavaScript kan læse tokens
- Ingen beskyttelse mod client-side attacks

**Forslag til forbedring:**
- Overvej HttpOnly cookies for refresh tokens
- Behold access tokens i memory (ikke localStorage)
- Eller brug secure cookies med SameSite=Strict

---

### Cookie Settings

**Observation:** Ingen cookies bruges - kun localStorage.

**Cookie flags (ikke relevant, da ingen cookies):**
- Secure: N/A
- HttpOnly: N/A
- SameSite: N/A
- Domain/Path: N/A

**Risiko-niveau:** Mellem  
**Observation:** Manglende cookie-baserede tokens betyder ingen HttpOnly beskyttelse mod XSS.

---

### Session Management

**Fil:** `packages/webapp/api/auth/login.ts:242-247`

**Session creation:**
```typescript
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
await sql`
  INSERT INTO club_sessions (club_id, token_hash, expires_at)
  VALUES (${club.id}, ${refreshTokenHash}, ${expiresAt})
`
```

**Session invalidation:**

**Ved logout** (`packages/webapp/api/auth/logout.ts:30-33`):
```typescript
await sql`
  DELETE FROM club_sessions
  WHERE token_hash = ${tokenHash}
`
```

**Ved password reset** (`packages/webapp/api/auth/reset-password.ts:73-76`):
```typescript
await sql`
  DELETE FROM club_sessions
  WHERE club_id = ${club.id}
`
```

**Risiko-niveau:** Lav  
**Observation:** 
- Sessions invalideres korrekt ved logout
- Alle sessions invalideres ved password reset (godt)
- Refresh tokens hashes gemmes korrekt

---

### Token Rotation

**Fil:** `packages/webapp/api/auth/refresh.ts`

**Observation:** Ingen token rotation implementeret.

**Nuværende flow:**
1. Client sender refresh token (linje 24)
2. Server validerer token (linje 28-37)
3. Server genererer ny access token (linje 57)
4. Server returnerer kun access token (linje 59-62)
5. **Samme refresh token kan bruges igen**

**Risiko-niveau:** Mellem  
**Observation:** 
- Hvis refresh token stjæles, kan det bruges indtil expiry (7 dage)
- Ingen automatisk invalidation ved brug
- Stjålne tokens kan bruges samtidigt fra forskellige devices

**Hvordan det kan udnyttes:**
- Angriber der stjæler refresh token kan bruge det i op til 7 dage
- Ingen detektion af mistænkelig aktivitet (fx login fra ny location)
- Token kan bruges fra flere devices samtidigt

**Forslag til forbedring:**
- Implementer token rotation: generer ny refresh token ved hver refresh
- Invalider gamle refresh token når ny genereres
- Track device/location og advær ved mistænkelig aktivitet

---

### Token Expiry og Refresh

**Access token expiry:**
- 2 timer (linje 21 i jwt.ts)
- Client skal refresh før expiry

**Refresh token expiry:**
- 7 dage (linje 243 i login.ts)
- Automatisk cleanup i database (via expires_at check)

**Risiko-niveau:** Lav  
**Observation:** Expiry tider er rimelige.

---

## 7. Logging, Overvågning og Alarmer

### Eksisterende Logging

**Fil:** `packages/webapp/src/lib/utils/logger.ts`

**Logger implementation:**
- `logger.error()` - Logger errors til console (linje 17-28)
- `logger.warn()` - Logger warnings (linje 30-33)
- `logger.info()` - Logger info (linje 35-38)
- `logger.debug()` - Logger kun i development (linje 40-45)

**Login attempts logging:**
**Fil:** `packages/webapp/src/lib/auth/rateLimit.ts:69-88`

**Data logged:**
- club_id (kan være null hvis login fejlede før club lookup)
- email (klartekst)
- ip_address (kan være null)
- success (boolean)
- created_at (timestamp)

**Storage:**
- Database tabel: `club_login_attempts` (linje 77-80)
- Cleanup: Sletter forsøg ældre end 24 timer (linje 83-87)

**Risiko-niveau:** Mellem  
**Observation:** 
- Basic logging eksisterer
- Data gemmes i database (godt for forensik)
- Men ingen struktureret security logging eller SIEM integration

---

### Manglende Overvågning

#### 1. Ingen Security Alerts
**Risiko-niveau:** Mellem  
**Observation:** Ingen automatiske alerts ved:
- Mange fejlede login forsøg fra samme IP
- Mange fejlede login forsøg på samme konto
- Login fra ny geografisk location
- Mistænkelige login patterns

**Hvordan det kan udnyttes:**
- Angreb kan fortsætte uhindret uden detektion
- Ingen notifikation til admins ved mistænkelig aktivitet
- Svært at identificere angreb i realtid

---

#### 2. Ingen Metrics/Dashboards
**Risiko-niveau:** Lav  
**Observation:** Ingen Grafana dashboards eller metrics for:
- Login success/failure rates
- Rate limiting triggers
- Geographic distribution of logins
- Device/browser statistics

---

#### 3. Ingen SIEM Integration
**Risiko-niveau:** Lav  
**Observation:** Ingen integration med SIEM systemer som:
- Splunk
- ELK Stack
- Datadog
- CloudWatch

---

### Logging Risici

#### 1. Email i Klartekst
**Risiko-niveau:** Lav  
**Fil:** `packages/webapp/src/lib/auth/rateLimit.ts:78`  
**Observation:** Email gemmes i klartekst i `club_login_attempts` tabel.

**GDPR overvejelser:**
- Email er personlig identifikationsinformation (PII)
- Bør måske hashes eller pseudonymiseres
- Men nødvendig for rate limiting funktionalitet

---

#### 2. IP Adresse Logging
**Risiko-niveau:** Lav  
**Observation:** IP adresse logges, hvilket kan være GDPR relevant.

**Forslag:**
- Anonymiser IP (kun første 3 octets)
- Eller hash IP adresse

---

#### 3. Log Retention
**Risiko-niveau:** Lav  
**Fil:** `packages/webapp/src/lib/auth/rateLimit.ts:83-87`  
**Observation:** Logs ryddes efter 24 timer, hvilket kan være for kort til forensik.

**Forslag:**
- Behold logs i 30-90 dage for forensik
- Eller eksporter til langtidslagring

---

### Error Logging

**Login errors logged:**
- Validation errors (linje 52 i login.ts)
- Parse errors (linje 58)
- Database connection errors (linje 79)
- PIN verification errors (linje 158)
- Password verification errors (linje 175)
- Missing fields errors (linje 231)

**Risiko-niveau:** Lav  
**Observation:** Errors logges, men kun til console. Ingen struktureret error tracking.

---

## 8. Konfiguration og Miljø

### Environment Variables

**Fil:** `packages/webapp/src/lib/auth/jwt.ts:3-8`

**JWT Secret:**
```typescript
const secret = process.env.AUTH_JWT_SECRET || process.env.VITE_AUTH_JWT_SECRET
if (!secret) {
  throw new Error('AUTH_JWT_SECRET environment variable is required')
}
```

**Risiko-niveau:** Lav  
**Observation:** 
- JWT secret er påkrævet
- Fallback til VITE_AUTH_JWT_SECRET (for development)
- Secret bør være mindst 32 karakterer (per docs/AUTH_SETUP.md)

---

### Rate Limit Konfiguration

**Fil:** `packages/webapp/src/lib/auth/rateLimit.ts:3-5`

**Hardcoded konstanter:**
```typescript
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15
const WINDOW_MINUTES = 15
```

**Risiko-niveau:** Lav  
**Observation:** 
- Konstanter er hardcoded
- Ingen environment variable override
- Kan ikke justeres uden code change

**Forslag:**
- Gør konstanter konfigurerbare via environment variables
- Tillad forskellige limits for forskellige miljøer (dev vs prod)

---

### IP Detection

**Fil:** `packages/webapp/api/auth/login.ts:64-66`

**Implementation:**
```typescript
const forwardedFor = req.headers?.['x-forwarded-for'] as string | undefined
const ipAddress = forwardedFor?.split(',')[0]?.trim() || 'unknown'
```

**Risiko-niveau:** Lav  
**Observation:** 
- Korrekt håndtering af X-Forwarded-For header
- Tager første IP (korrekt for proxy/CDN setups)
- Fallback til 'unknown' hvis header mangler

**Potentielle problemer:**
- Hvis appen kører bag proxy/CDN, skal proxy sætte X-Forwarded-For korrekt
- Hvis ikke, kan alle requests se ud til at komme fra samme IP (proxy IP)

**Forslag:**
- Verificer at Vercel/CDN sætter X-Forwarded-For korrekt
- Overvej at bruge `req.socket.remoteAddress` som fallback

---

### WAF/CDN Konfiguration

**Observation:** Ingen WAF eller CDN-level rate limiting identificeret i kodebase.

**Risiko-niveau:** Mellem  
**Observation:** 
- Vercel har indbygget DDoS beskyttelse
- Men ingen eksplicit WAF konfiguration identificeret
- Ingen CDN-level rate limiting identificeret

**Forslag:**
- Overvej Vercel Edge Middleware for rate limiting
- Overvej Cloudflare WAF for ekstra beskyttelse
- Overvej Vercel Rate Limiting features

---

### Load Balancer Konfiguration

**Observation:** Ingen load balancer konfiguration identificeret.

**Risiko-niveau:** Lav  
**Observation:** Vercel håndterer load balancing automatisk.

---

## 9. Testdækning

### Eksisterende Tests

**E2E Tests:**
**Fil:** `packages/webapp/tests/e2e/auth.spec.ts`

**Dækket:**
- Login page visning (linje 11-18)
- Form validation (linje 20-48)
- Invalid credentials handling (linje 50-105)
- Registration page (linje 108-115)
- Password strength requirements (linje 117-135)
- Forgot password flow (linje 138-176)
- PIN reset page (linje 178-186)

**Risiko-niveau:** Lav  
**Observation:** Basic E2E tests eksisterer, men dækker kun happy paths og basic error cases.

---

**Unit Tests:**
**Fil:** `packages/webapp/tests/unit/password.test.ts`

**Dækket:**
- Password validation (alle policy krav)
- Edge cases (min/max length, special characters)

**Risiko-niveau:** Lav  
**Observation:** God dækning af password validation.

---

### Manglende Tests

#### 1. Rate Limiting Tests
**Risiko-niveau:** Mellem  
**Observation:** Ingen tests for:
- Lockout efter 5 fejlede forsøg
- Rate limit reset efter lockout periode
- Rate limit per email/username
- Concurrent login attempts

**Forslag:**
```typescript
test('should lockout after 5 failed attempts', async () => {
  // Test rate limiting
})

test('should reset lockout after 15 minutes', async () => {
  // Test lockout expiry
})
```

---

#### 2. User Enumeration Tests
**Risiko-niveau:** Mellem  
**Observation:** Ingen tests for:
- Login enumeration protection (samme fejlbesked)
- Password reset enumeration protection
- Registration enumeration (409 status)

**Forslag:**
```typescript
test('should return same error for non-existent user and wrong password', async () => {
  // Test enumeration protection
})
```

---

#### 3. Token Security Tests
**Risiko-niveau:** Lav  
**Observation:** Ingen tests for:
- Token expiry
- Token invalidation ved logout
- Token invalidation ved password reset
- Refresh token rotation (hvis implementeret)

---

#### 4. Concurrent Login Tests
**Risiko-niveau:** Lav  
**Observation:** Ingen tests for:
- Mange samtidige login forsøg
- Rate limiting under concurrent load
- Session creation under load

---

#### 5. IP-based Attack Tests
**Risiko-niveau:** Mellem  
**Observation:** Ingen tests for:
- Login fra forskellige IPs
- Rate limiting per IP (hvis implementeret)
- IP rotation attacks

---

## Brute-force Modstand: Opsummering

### Hvad Beskytter Os I Dag

#### 1. Rate Limiting per Konto
- **Beskytter mod:** Brute-force på samme konto
- **Effektivitet:** God, men kan omgås med IP rotation
- **Implementering:** 5 forsøg per 15 minutter, 15 min lockout

#### 2. Argon2id Password Hashing
- **Beskytter mod:** Offline brute-force (hvis database lækkes)
- **Effektivitet:** Meget god - høj computational cost
- **Implementering:** 64 MB memory, time cost 3-5

#### 3. Generiske Fejlbeskeder
- **Beskytter mod:** User enumeration via login
- **Effektivitet:** God - samme fejlbesked uanset om konto findes

#### 4. Password Reset Enumeration Protection
- **Beskytter mod:** User enumeration via password reset
- **Effektivitet:** God - altid samme response

#### 5. 2FA Support
- **Beskytter mod:** Brute-force selv hvis password kompromitteres
- **Effektivitet:** Meget god - ekstra faktor krævet

---

### Hvad Ikke Beskytter Os

#### 1. Ingen IP-baseret Rate Limiting
- **Risiko:** Høj
- **Problem:** Angribere kan distribuere forsøg på tværs af IPs
- **Impact:** Rate limiting per konto kan omgås

#### 2. Ingen Bot Detection
- **Risiko:** Høj
- **Problem:** Credential stuffing bots kan angribe uhindret
- **Impact:** Automatiserede angreb kan køre 24/7

#### 3. Ingen Progressive Lockout
- **Risiko:** Mellem
- **Problem:** Fast 15 min lockout kan omgås ved at vente
- **Impact:** Systematisk password gætning over tid

#### 4. Ingen Global Rate Limiting
- **Risiko:** Mellem
- **Problem:** Kan angribe mange konti samtidigt
- **Impact:** 100 konti × 5 forsøg = 500 forsøg totalt

#### 5. Token Storage i localStorage
- **Risiko:** Mellem
- **Problem:** Sårbar overfor XSS angreb
- **Impact:** Stjålne tokens kan bruges til uautoriseret adgang

#### 6. Ingen Token Rotation
- **Risiko:** Mellem
- **Problem:** Stjålne refresh tokens kan bruges i 7 dage
- **Impact:** Lang levetid for stjålne tokens

#### 7. Registration Enumeration
- **Risiko:** Mellem
- **Problem:** 409 status afslører eksisterende emails
- **Impact:** Kan bruges til at bygge liste over konti

---

### Samlet Vurdering

**Brute-force modstand:** Mellem  
**Credential stuffing modstand:** Lav  

**Stærke sider:**
- Rate limiting per konto
- Stærk password hashing
- Generiske fejlbeskeder
- 2FA support

**Svage sider:**
- Ingen IP-baseret rate limiting
- Ingen bot detection
- Ingen progressive lockout
- Token storage i localStorage

**Anbefalinger:**
1. Implementer IP-baseret rate limiting
2. Tilføj reCAPTCHA eller bot detection
3. Implementer progressive lockout
4. Overvej HttpOnly cookies for tokens
5. Implementer token rotation
6. Fix registration enumeration

---

## Uklarheder / Mangler

### Hvad Kunne Ikke Verificeres

#### 1. Vercel/CDN Konfiguration
- **Hvor:** Vercel dashboard, `vercel.json` konfiguration
- **Hvad:** WAF regler, CDN-level rate limiting, DDoS beskyttelse
- **Forventet location:** Vercel projekt settings, `vercel.json` fil

#### 2. Environment Variables i Production
- **Hvor:** Vercel environment variables
- **Hvad:** Faktiske værdier for `AUTH_JWT_SECRET`, rate limit overrides
- **Forventet location:** Vercel dashboard → Settings → Environment Variables

#### 3. Database Indexes
- **Hvor:** Database migrations, database schema
- **Hvad:** Indexes på `club_login_attempts` tabel for performance
- **Forventet location:** `database/migrations/007_add_club_auth.sql` (delvist verificeret - indexes eksisterer)

#### 4. Logging Infrastructure
- **Hvor:** Vercel logs, external logging services
- **Hvad:** Hvor logger output sendes, retention policies
- **Forventet location:** Vercel dashboard → Logs, eller external service (Datadog, etc.)

#### 5. Monitoring og Alerts
- **Hvor:** Monitoring dashboards, alerting systems
- **Hvad:** Eksisterende monitoring, alert konfiguration
- **Forventet location:** Vercel Analytics, eller external monitoring service

#### 6. Backup og Disaster Recovery
- **Hvor:** Backup konfiguration, recovery procedures
- **Hvad:** Database backups, recovery point objectives
- **Forventet location:** Database provider (Neon) dashboard, eller backup scripts

---

### Steder Hvor Info Forventes At Lige

#### 1. Infrastructure-as-Code
- **Forventet:** Terraform, CloudFormation, eller lignende
- **Hvor:** `infrastructure/` directory, eller separate repo
- **Hvad:** WAF regler, CDN konfiguration, load balancer setup

#### 2. CI/CD Pipeline Konfiguration
- **Forventet:** GitHub Actions, GitLab CI, eller lignende
- **Hvor:** `.github/workflows/`, `.gitlab-ci.yml`, eller lignende
- **Hvad:** Security scanning, dependency checks, secret scanning

#### 3. Security Documentation
- **Forventet:** Security runbooks, incident response plans
- **Hvor:** `docs/security/` directory
- **Hvad:** Security procedures, incident response, threat modeling

#### 4. Compliance Documentation
- **Forventet:** GDPR compliance, security certifications
- **Hvor:** `docs/compliance/` directory
- **Hvad:** Data handling procedures, retention policies, privacy policies

---

## Konklusion

Systemet har **grundlæggende beskyttelse** mod brute-force angreb gennem rate limiting per konto og stærk password hashing. Men der er **signifikante gaps** i beskyttelse mod credential stuffing og distributerede angreb.

**Prioriterede forbedringer:**
1. **Høj prioritet:** Implementer IP-baseret rate limiting
2. **Høj prioritet:** Tilføj reCAPTCHA eller bot detection
3. **Mellem prioritet:** Implementer progressive lockout
4. **Mellem prioritet:** Fix registration enumeration
5. **Mellem prioritet:** Overvej HttpOnly cookies for tokens
6. **Lav prioritet:** Implementer token rotation
7. **Lav prioritet:** Tilføj password breach detection

**Samlet sikkerhedsniveau:** Mellem  
**Anbefaling:** Implementer høj-prioritet forbedringer før næste release.



