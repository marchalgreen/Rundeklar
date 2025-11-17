# Debug Production PIN Login Issues

## Status Check

✅ **Git Status**: `origin/main` har PIN login support (merge commit `7b303f8`)
✅ **Code**: Koden ser korrekt ud med `import { verifyPIN }` i login.ts

## Hvis PIN login ikke virker i production:

### 1. Tjek Vercel Deployment Status

1. Gå til Vercel Dashboard → Dit projekt
2. Tjek "Deployments" tab
3. Se om der er en deployment efter merge commit `7b303f8`
4. Tjek om deployment er successful eller fejlet

### 2. Tjek om API endpoint har den nye kode

Test direkte i browser eller curl:

```bash
# Tjek om login endpoint understøtter PIN login
curl -X POST https://herlev-hjorten.rundeklar.dk/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "herlev-hjorten",
    "username": "testcoach",
    "pin": "123456"
  }'
```

**Forventet**: Hvis PIN login virker, får du enten:
- Success response med accessToken
- Error response med "Invalid username or PIN" (ikke "Validation error" om username/pin)

**Hvis du får "Validation error"**: API'en har ikke den nye kode endnu.

### 3. Tjek Vercel Build Logs

1. Gå til Vercel Dashboard → Dit projekt → Deployments
2. Klik på den seneste deployment
3. Se "Build Logs"
4. Tjek om der er fejl med:
   - `verifyPIN` import
   - `@node-rs/argon2` dependency
   - TypeScript compilation errors

### 4. Tjek Runtime Logs

1. Gå til Vercel Dashboard → Dit projekt → Functions
2. Klik på `/api/auth/login` function
3. Se "Logs" tab
4. Prøv at logge ind og se fejlbeskeder

### 5. Mulige Problemer og Løsninger

#### Problem: "verifyPIN is not a function" eller "Cannot find module"
**Årsag**: Import fejler i production
**Løsning**: 
- Tjek om `packages/webapp/src/lib/auth/pin.ts` er inkluderet i build
- Tjek om `@node-rs/argon2` er installeret i production

#### Problem: "Validation error" når man prøver PIN login
**Årsag**: API'en har ikke den nye loginSchema endnu
**Løsning**: 
- Tjek om deployment faktisk er sket
- Tjek om Vercel cache skal cleares
- Prøv at redeploy manuelt

#### Problem: CORS errors
**Årsag**: CORS headers ikke sat korrekt
**Løsning**: 
- Tjek om `setCorsHeaders` bliver kaldt
- Tjek om origin detection virker i production

### 6. Quick Fix: Force Redeploy

Hvis deployment ikke er sket automatisk:

1. Gå til Vercel Dashboard → Dit projekt → Deployments
2. Klik "Redeploy" på den seneste deployment
3. Eller push en tom commit:
   ```bash
   git commit --allow-empty -m "chore: trigger redeploy"
   git push origin main
   ```

### 7. Tjek om koden faktisk er deployet

Test om API'en har PIN login support:

```bash
# Test med kun username (skal fejle med "PIN must be 6 digits" ikke "username is required")
curl -X POST https://herlev-hjorten.rundeklar.dk/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "herlev-hjorten",
    "username": "testcoach"
  }'
```

**Forventet**: Error om manglende PIN, ikke "username is required"

### 8. Debug Info

Hvis du stadig har problemer, tjek:

1. **Browser Console**: Se fejlbeskeder fra frontend
2. **Network Tab**: Se hvad API'en faktisk returnerer
3. **Vercel Function Logs**: Se server-side fejl
4. **Vercel Build Logs**: Se om build fejlede

### 9. Emergency Rollback

Hvis PIN login ikke virker og du skal have det til at virke nu:

1. Tjek om email/password login stadig virker (for admins)
2. Coaches kan bruge admin reset PIN funktionalitet
3. Eller revert til forrige commit:
   ```bash
   git revert 7b303f8
   git push origin main
   ```

## Checklist

- [ ] Vercel deployment er successful efter merge
- [ ] API endpoint understøtter PIN login (test med curl)
- [ ] Ingen build errors i Vercel logs
- [ ] Ingen runtime errors i Vercel function logs
- [ ] CORS headers er sat korrekt
- [ ] `verifyPIN` import virker i production

