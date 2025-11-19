# Signup Flow Debugging - Komplet Dokumentation

## Problem Beskrivelse

Efter gennemført signup i marketing flowet (`MarketingSignupPage`), bliver brugeren sendt tilbage til "Vælg pakke" viewet i stedet for success-skærmen. Hvis brugeren opdaterer siden manuelt, vises success-skærmen korrekt.

**Symptomer:**
- Signup gennemføres succesfuldt
- `sessionStorage` sættes korrekt til 'success'
- `setCurrentStep('success')` kaldes
- Men success-skærmen vises ikke
- Ved manuel page refresh vises success-skærmen korrekt

## Root Cause Analyse

### Observationer fra Console Logs

1. **Komponenten remountes konstant:**
   - `[MarketingSignupPage] Component UNMOUNTING` og `Component MOUNTED` logs viser at komponenten remountes flere gange
   - Dette sker både ved initial mount og efter signup success

2. **State går tabt ved remount:**
   - Når komponenten remountes, starter den fra scratch med `useState` initializeren
   - `useState` initializeren læser fra `sessionStorage`, men på tidspunktet for remount er `sessionStorage` måske ikke sat endnu

3. **Race condition mellem state update og remount:**
   - `setCurrentStep('success')` kaldes
   - `sessionStorage` sættes til 'success'
   - Men `App.tsx` re-renderer (pga. event eller andet)
   - Komponenten remountes FØR `setCurrentStep('success')` state update er committet
   - Ved remount starter den fra scratch med `currentStep: 'plan'`

4. **HMR (Hot Module Reload) kan også remounte komponenten:**
   - Vite HMR kan remounte komponenter når filer ændres
   - Dette kan ske midt i signup flowet

## Alle Løsningsforsøg

### Forsøg 1: SessionStorage + Event Communication
**Implementering:**
- `MarketingSignupPage` sætter `sessionStorage` og dispatcher custom event
- `App.tsx` lytter til eventet og opdaterer state
- `App.tsx` bruger state til at bestemme om signup page skal vises

**Fejl:** Event dispatches, men `App.tsx` re-renderer og remountes komponenten før state update er committet.

### Forsøg 2: Polling i App.tsx
**Implementering:**
- `App.tsx` poller `sessionStorage` hver 50ms
- Opdaterer state når `sessionStorage` ændrer sig
- Bruger state til at bestemme om signup page skal vises

**Fejl:** Polling trigger konstant re-renders, hvilket remountes komponenten unødigt.

### Forsøg 3: Stabil Key + Event Communication
**Implementering:**
- Brug stabil key (`key="signup"`) i `App.tsx`
- Event dispatches efter state update
- `setTimeout` for at sikre state er committet før event dispatches

**Fejl:** Komponenten remountes stadig, og `useState` initializeren læser ikke korrekt fra `sessionStorage`.

### Forsøg 4: SessionStorage FIRST, State SECOND
**Implementering:**
- Sæt `sessionStorage` FØRST
- Derefter `setCurrentStep('success')`
- Event dispatches direkte efter `sessionStorage` er sat

**Fejl:** Komponenten remountes stadig, og selvom `sessionStorage` er sat, starter den fra scratch med `currentStep: 'plan'`.

### Forsøg 5: Polling i MarketingSignupPage
**Implementering:**
- Fjern alt state management fra `App.tsx` - bare check `sessionStorage` direkte
- Tilføj polling i `MarketingSignupPage` der checker `sessionStorage` hver 50ms
- Opdater `currentStep` automatisk hvis `sessionStorage` er 'success' men `currentStep` ikke er 'success'

**Fejl:** Virker stadig ikke - polling opdager måske ikke ændringen hurtigt nok, eller komponenten remountes før polling kan opdatere state.

## Nuværende Kode State

### App.tsx (Simplificeret)
```typescript
if (isMarketingTenant) {
  const hasPlanParam = typeof window !== 'undefined' && window.location.search.includes('plan=')
  const hasSignupInSession = typeof window !== 'undefined' && sessionStorage.getItem('signup_step') === 'success'
  const shouldShowSignup = hasPlanParam || hasSignupInSession
  
  return (
    <>
      <TenantTitleUpdater />
      {shouldShowSignup ? (
        <MarketingSignupPage key="signup" />
      ) : (
        <MarketingLandingPage key="landing" />
      )}
    </>
  )
}
```

### MarketingSignupPage.tsx (Med Polling)
```typescript
// useState initializer læser fra sessionStorage
const [currentStep, setCurrentStep] = useState<Step>(() => {
  if (typeof window === 'undefined') return 'plan'
  const savedStep = sessionStorage.getItem('signup_step')
  return savedStep === 'success' ? 'success' : 'plan'
})

// Polling der checker sessionStorage kontinuerligt
useEffect(() => {
  const checkSessionStorage = () => {
    if (typeof window !== 'undefined') {
      const savedStep = sessionStorage.getItem('signup_step')
      if (savedStep === 'success' && currentStep !== 'success') {
        setCurrentStep('success')
        // Restore tenant ID and email
      }
    }
  }
  checkSessionStorage()
  const interval = setInterval(checkSessionStorage, 50)
  return () => clearInterval(interval)
}, [currentStep])
```

## Logs Analyse

### Eksempel Log Sequence (Fra sidste test):
```
12:50:48.875Z: Signup successful, setting state
12:50:48.875Z: Setting sessionStorage FIRST...
12:50:48.875Z: sessionStorage set: {signup_step: 'success', ...}
12:50:48.875Z: Updating state: setCurrentStep("success")
12:50:48.876Z: App.tsx Event detected change: {oldValue: null, newValue: 'success'}
12:50:48.876Z: App.tsx Render decision: {signupStep: 'success', shouldShowSignup: true}
```

**Observation:** 
- `sessionStorage` sættes korrekt
- `setCurrentStep('success')` kaldes
- `App.tsx` opdaterer state korrekt
- Men success-skærmen vises stadig ikke

**Manglende logs:**
- `[MarketingSignupPage] currentStep changed: {currentStep: 'success'}` - denne log vises IKKE
- Dette betyder at `useEffect` der lytter til `currentStep` kører ikke
- Dette betyder at state update ikke er committet endnu

## Mulige Root Causes

1. **React Batch Updates:**
   - React batcher state updates
   - `setCurrentStep('success')` bliver måske ikke committet før komponenten remountes
   - Når komponenten remountes, starter den fra scratch med `useState` initializeren

2. **App.tsx Re-render Trigger:**
   - Når `App.tsx` re-renderer (pga. event eller andet), remountes `MarketingSignupPage`
   - Dette sker FØR `setCurrentStep('success')` state update er committet
   - Ved remount starter den fra scratch

3. **HMR Interference:**
   - Vite HMR kan remounte komponenter når filer ændres
   - Dette kan ske midt i signup flowet

4. **Key Stability:**
   - Selvom vi bruger `key="signup"`, kan React stadig unmounte komponenten hvis parent re-renderer
   - Dette afhænger af React's reconciliation algoritme

## Næste Skridt / Alternative Løsninger

### Option 1: URL-Based Routing
I stedet for at bruge `sessionStorage` og state, brug URL parametre:
- Efter signup success, redirect til `/?plan=professional&step=success`
- `MarketingSignupPage` læser `step` parameter fra URL
- Dette er mere robust mod remounts

### Option 2: Context-Based State Management
Brug React Context til at holde signup state:
- Opret `SignupContext` der holder `currentStep` state
- Dette state persistes selvom komponenten remountes
- `App.tsx` og `MarketingSignupPage` deler samme context

### Option 3: useRef for State Persistence
Brug `useRef` til at holde state der ikke trigger re-renders:
- `useRef` persistes gennem remounts
- Brug `useRef` til at tracke om signup er gennemført
- Opdater `currentStep` baseret på `useRef` værdi

### Option 4: Prevent Remounting
Undersøg hvorfor komponenten remountes:
- Tilføj mere logging for at se hvad der trigger remounts
- Måske er det `AppContent` der re-renderer?
- Måske er det `NavigationContext` eller `AuthContext` der trigger re-renders?

### Option 5: Separate Success Page Component
I stedet for at bruge samme komponent til alle steps, opret separate komponenter:
- `MarketingSignupFlow` - håndterer plan/club/password steps
- `MarketingSignupSuccess` - viser success-skærmen
- `App.tsx` bestemmer hvilken komponent der skal vises baseret på `sessionStorage`

## Debugging Tips

1. **Tilføj mere logging:**
   - Log når `AppContent` re-renderer
   - Log når `MarketingSignupPage` remountes og hvorfor
   - Log React's reconciliation decisions

2. **Test uden HMR:**
   - Stop dev server og start igen
   - Test signup flowet uden HMR interference

3. **Test med React DevTools:**
   - Brug React DevTools til at se komponent tree
   - Se når komponenter mountes/unmountes
   - Se state updates i real-time

4. **Test med Production Build:**
   - Build production version
   - Test signup flowet i production build
   - Se om problemet også eksisterer der

## Konklusion

Problemet er komplekst og involverer React's lifecycle, state management, og remounting behavior. Alle løsningsforsøg har fejlet fordi komponenten remountes før state updates er committet. 

Den mest lovende løsning er **Option 1 (URL-Based Routing)** eller **Option 2 (Context-Based State Management)**, da disse ikke afhænger af komponenten ikke at remountes.


