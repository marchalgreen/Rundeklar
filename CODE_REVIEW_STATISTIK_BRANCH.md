# Code Review: statistik-branch

**Review Date:** 2024-12-19  
**Branch:** `statistik-branch`  
**Commits Reviewed:** 5 commits (15d4a9e → 2aa9ca3)

## Executive Summary

**Overall Assessment:** ⚠️ **GOOD with REFACTORING NEEDED**

Koden er funktionel og følger mange best practices, men der er flere områder der kræver refaktorering for at opnå senior-level kvalitet. Koden er ikke klar til production uden nogle kritiske forbedringer.

**Key Strengths:**
- ✅ God brug af TypeScript types
- ✅ Konsistent error handling med `normalizeError`
- ✅ Følger design tokens (HSL format)
- ✅ Responsive design implementeret
- ✅ JSDoc dokumentation på de fleste funktioner

**Critical Issues:**
- 🔴 **useTrainingAttendance hook er for stor** (523 linjer) - kræver opdeling
- 🔴 **Statistics.tsx er for stor** (873 linjer) - kræver komponent-ekstraktion
- 🟡 **Manglende error state management** i nogle hooks
- 🟡 **Code duplication** i chart komponenter
- 🟡 **Hardcoded farver** i GroupTrendsChart

---

## 1. Architecture & Code Organization

### 🔴 CRITICAL: Hook Size Violation

**File:** `packages/webapp/src/hooks/statistics/useTrainingAttendance.ts` (523 linjer)

**Problem:** Hook'en er alt for stor og bryder Single Responsibility Principle. Den håndterer:
- 10+ forskellige data-typer
- 10+ loading states
- KPI beregninger
- Group loading
- Alle data-loading funktioner

**Impact:** 
- Svært at teste
- Svært at vedligeholde
- Høj kognitiv kompleksitet
- Risiko for race conditions

**Recommendation:**
```typescript
// Split into:
// 1. useTrainingGroupAttendance.ts - Basic attendance data
// 2. useTrainingTrends.ts - Monthly/group trends
// 3. useTrainingComparison.ts - Period comparison
// 4. useTrainingKPIs.ts - KPI calculations
// 5. useTrainingGroups.ts - Group management
```

**Refactoring Priority:** 🔴 HIGH

---

### 🔴 CRITICAL: Component Size Violation

**File:** `packages/webapp/src/routes/Statistics.tsx` (873 linjer)

**Problem:** Komponenten er alt for stor og bryder separation of concerns. Den indeholder:
- View mode management
- Player selection logic
- Search logic
- All chart rendering
- All conditional rendering logic

**Impact:**
- Svært at navigere
- Svært at teste
- Høj kognitiv kompleksitet
- Risiko for merge conflicts

**Recommendation:**
```typescript
// Extract into:
// 1. StatisticsTrainingView.tsx - Training view
// 2. StatisticsPlayerView.tsx - Player view
// 3. StatisticsChartSection.tsx - Chart rendering
// 4. useStatisticsView.ts - View mode management
```

**Refactoring Priority:** 🔴 HIGH

---

### 🟡 MODERATE: Code Duplication

**Files:** `GroupTrendsChart.tsx`, `EChartsBarChart.tsx`

**Problem:** Deduplication logik er duplikeret:
- `GroupTrendsChart.tsx` linje 33-50: Deduplication logic
- `attendance.ts` linje 722-748: Similar deduplication

**Recommendation:**
```typescript
// Extract to: src/lib/statistics/deduplication.ts
export function deduplicateGroupAttendance(
  data: GroupAttendanceOverTime[]
): GroupAttendanceOverTime[] {
  const map = new Map<string, GroupAttendanceOverTime>()
  data.forEach((item) => {
    const key = `${item.groupName}_${item.month}`
    if (!map.has(key)) {
      map.set(key, item)
    }
  })
  return Array.from(map.values())
}
```

**Refactoring Priority:** 🟡 MEDIUM

---

## 2. Best Practices Compliance

### ✅ GOOD: Error Handling

**Compliance:** ✅ Følger guardrails

Alle hooks bruger `normalizeError` korrekt:
- ✅ `useTrainingAttendance.ts` - Linje 235, 258, 280, etc.
- ✅ `useStatisticsFilters.ts` - Ingen errors (kun state management)
- ✅ Ingen `console.log/error` i production code

**Note:** Der er en kommentar om console.error på linje 220 i `useTrainingAttendance.ts` - dette er korrekt implementeret.

---

### 🟡 MODERATE: Error State Management

**Problem:** `useTrainingAttendance` mangler centraliseret error state.

**Current:** Hver load-funktion viser toast, men der er ingen samlet error state.

**Comparison med andre hooks:**
- `usePlayers` har `error: string | null` og `clearError()`
- `useSession` har `error: string | null` og `clearError()`
- `useTrainingAttendance` har ingen error state

**Recommendation:**
```typescript
export interface UseTrainingAttendanceReturn {
  // ... existing fields
  error: string | null
  clearError: () => void
}
```

**Refactoring Priority:** 🟡 MEDIUM

---

### ✅ GOOD: TypeScript Usage

**Compliance:** ✅ Følger best practices

- ✅ Ingen `any` types (bortset fra ECharts callback params som er nødvendigt)
- ✅ Korrekt brug af generics
- ✅ Type-safe interfaces
- ✅ Proper null checks

**Note:** EChartsBarChart.tsx linje 42 bruger `any` for gradient return type, men dette er nødvendigt pga. ECharts API.

---

### 🟡 MODERATE: useMemo/useCallback Optimization

**Problem:** Nogle useMemo/useCallback dependencies er ikke optimale.

**Example:** `GroupTrendsChart.tsx` linje 88:
```typescript
}, [data, comparisonData, hasComparison])
```

`hasComparison` er afledt af `comparisonData`, så dependency er redundant.

**Recommendation:**
```typescript
const hasComparison = comparisonData && comparisonData.length > 0
// Remove hasComparison from dependencies - it's derived
}, [data, comparisonData])
```

**Refactoring Priority:** 🟢 LOW

---

## 3. Design Tokens & Styling

### ✅ GOOD: Design Token Compliance

**Compliance:** ✅ Følger design-tokens.md

- ✅ Alle farver bruger `hsl(var(--token))` format
- ✅ Ingen hardcoded hex values
- ✅ Korrekt brug af rings i stedet for borders
- ✅ Responsive design implementeret

---

### 🟡 MODERATE: Hardcoded Colors in Charts

**File:** `GroupTrendsChart.tsx` linje 101-107

**Problem:** Hardcoded HSL farver i stedet for design tokens.

```typescript
const colorPalette = [
  'hsl(206, 88%, 52%)', // primary blue
  'hsl(158, 58%, 42%)', // success green
  // ...
]
```

**Recommendation:**
```typescript
const colorPalette = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))'
]
```

**Note:** Dette kræver at CSS variables er tilgængelige i runtime, hvilket de er via `getCSSVariableColor` i EChartsBarChart.

**Refactoring Priority:** 🟡 MEDIUM

---

### ✅ GOOD: Responsive Design

**Compliance:** ✅ Følger responsive design guidelines

- ✅ Mobile-first approach (`sm:`, `md:`, `lg:` breakpoints)
- ✅ Responsive spacing (`p-3 sm:p-4 md:p-5`)
- ✅ Responsive typography (`text-sm sm:text-base`)
- ✅ Touch targets er korrekte (minimum 44px)

---

## 4. Documentation

### ✅ GOOD: JSDoc Coverage

**Compliance:** ✅ Følger guardrails

- ✅ Alle eksporterede funktioner har JSDoc
- ✅ Interfaces har dokumentation
- ✅ Eksempler er inkluderet hvor relevant

**Examples:**
- `useStatisticsFilters.ts` - Linje 38-54: God JSDoc med eksempel
- `useTrainingAttendance.ts` - Linje 63-75: God JSDoc med eksempel
- `GroupTrendsChart.tsx` - Linje 12-18: God JSDoc

---

### 🟡 MODERATE: Inline Comments

**Problem:** Nogle komplekse logik-sektioner mangler forklarende kommentarer.

**Example:** `useTrainingAttendance.ts` linje 128-200 - KPI calculation logic er kompleks men mangler kommentarer om race condition handling.

**Recommendation:** Tilføj kommentarer om:
- Hvorfor cancelled flag bruges
- Hvorfor loading state tjekkes før reset
- Hvordan race conditions undgås

---

## 5. Performance

### ✅ GOOD: useMemo/useCallback Usage

**Compliance:** ✅ Følger React best practices

- ✅ Expensive calculations er memoized
- ✅ Callbacks er wrapped i useCallback
- ✅ Dependencies er korrekte (med få undtagelser)

---

### 🟡 MODERATE: Unnecessary Re-renders

**Problem:** `Statistics.tsx` re-renderer når filters ændres, selvom nogle child components ikke behøver update.

**Recommendation:** Overvej `React.memo` på chart components:
```typescript
export const GroupTrendsChart = React.memo<GroupTrendsChartProps>(({ ... }) => {
  // ...
})
```

**Refactoring Priority:** 🟢 LOW

---

## 6. Code Quality Issues

### 🟡 MODERATE: Magic Numbers

**Files:** Multiple

**Examples:**
- `GroupTrendsChart.tsx` linje 125: `color.replace('52%)', '42%)')` - Magic number
- `useStatisticsFilters.ts` linje 136: `diffDays > 365` - Burde være konstant
- `EChartsBarChart.tsx` linje 62: `Math.min(lightness + 20, 95)` - Magic numbers

**Recommendation:**
```typescript
// src/lib/statistics/constants.ts
export const COMPARISON_COLOR_LIGHTNESS_OFFSET = 10 // 52% -> 42%
export const MAX_COMPARISON_PERIOD_DAYS = 365
export const GRADIENT_LIGHTNESS_OFFSET = 20
export const MAX_GRADIENT_LIGHTNESS = 95
```

**Refactoring Priority:** 🟡 MEDIUM

---

### 🟡 MODERATE: String Concatenation for Keys

**File:** `GroupTrendsChart.tsx`, `attendance.ts`

**Problem:** String concatenation bruges til keys:
```typescript
const key = `${item.groupName}_${item.month}`
```

**Recommendation:** Brug en dedikeret key-generator:
```typescript
function createGroupMonthKey(groupName: string, month: string): string {
  return `${groupName}_${month}`
}
```

**Refactoring Priority:** 🟢 LOW

---

### ✅ GOOD: Null Safety

**Compliance:** ✅ Følger TypeScript best practices

- ✅ Proper null checks (`if (!data) return`)
- ✅ Optional chaining hvor relevant
- ✅ Nullish coalescing hvor relevant

---

## 7. Testing Considerations

### 🔴 CRITICAL: Testability Issues

**Problem:** Store hooks og komponenter er svære at teste.

**Impact:**
- `useTrainingAttendance` (523 linjer) - For kompleks til unit tests
- `Statistics.tsx` (873 linjer) - For kompleks til component tests

**Recommendation:** 
1. Split hooks/komponenter (se refactoring recommendations)
2. Extract pure functions til separate utilities
3. Brug dependency injection for API calls

**Refactoring Priority:** 🔴 HIGH

---

## 8. Specific Code Issues

### 🟡 MODERATE: Inconsistent Loading State Checks

**File:** `Statistics.tsx`

**Problem:** Nogle steder tjekkes `loading`, andre steder tjekkes `data.length === 0`.

**Example:**
- Linje 203: `trainingAttendance.attendanceLoading`
- Linje 207: `trainingAttendance.trainingGroupAttendance.length > 0`

**Recommendation:** Konsistent pattern:
```typescript
if (loading) return <LoadingState />
if (!data || data.length === 0) return <EmptyState />
return <Content data={data} />
```

**Refactoring Priority:** 🟢 LOW

---

### 🟡 MODERATE: Color String Manipulation

**File:** `GroupTrendsChart.tsx` linje 125

**Problem:** String manipulation for farve-ændring:
```typescript
color: color.replace('52%)', '42%)')
```

**Issues:**
- Fragile (hvis format ændres, bryder det)
- Ikke semantisk (hvad betyder 52% og 42%?)
- Magic numbers

**Recommendation:**
```typescript
function darkenHSLColor(hslColor: string, lightnessOffset: number): string {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (!match) return hslColor
  const [, h, s, l] = match
  const newLightness = Math.max(0, Math.min(100, parseInt(l) - lightnessOffset))
  return `hsl(${h}, ${s}%, ${newLightness}%)`
}
```

**Refactoring Priority:** 🟡 MEDIUM

---

## 9. Refactoring Recommendations

### Priority 1: HIGH (Must Fix Before Production)

1. **Split useTrainingAttendance hook**
   - Opdel i 5 mindre hooks
   - Reducer kompleksitet
   - Forbedre testability

2. **Split Statistics.tsx component**
   - Extract view components
   - Extract chart sections
   - Reducer kompleksitet

### Priority 2: MEDIUM (Should Fix Soon)

3. **Extract deduplication logic**
   - Create shared utility
   - Reduce duplication

4. **Add error state to useTrainingAttendance**
   - Match pattern fra andre hooks
   - Improve error handling UX

5. **Replace hardcoded colors**
   - Use design tokens
   - Improve consistency

6. **Extract magic numbers**
   - Create constants file
   - Improve maintainability

### Priority 3: LOW (Nice to Have)

7. **Optimize useMemo dependencies**
   - Remove redundant dependencies
   - Improve performance

8. **Add React.memo to chart components**
   - Reduce re-renders
   - Improve performance

9. **Standardize loading/empty state patterns**
   - Consistent UX
   - Easier maintenance

---

## 10. Senior Developer Assessment

### Would a Senior Developer Approve?

**Answer:** ⚠️ **CONDITIONAL APPROVAL**

**Strengths:**
- ✅ Koden fungerer
- ✅ Følger mange best practices
- ✅ God TypeScript usage
- ✅ Konsistent error handling
- ✅ God dokumentation

**Concerns:**
- 🔴 Hook/component størrelse er uacceptabel
- 🟡 Code duplication
- 🟡 Manglende error state management
- 🟡 Magic numbers og hardcoded values

**Verdict:**
En senior developer ville **ikke** acceptere denne branch som den er, men ville give **conditional approval** med krav om refaktorering af:
1. Hook opdeling (HIGH priority)
2. Component opdeling (HIGH priority)
3. Error state management (MEDIUM priority)

**Estimated Refactoring Time:** 4-6 timer

---

## 11. Action Items

### Before Merge:

- [ ] Split `useTrainingAttendance` hook (HIGH)
- [ ] Split `Statistics.tsx` component (HIGH)
- [ ] Add error state to `useTrainingAttendance` (MEDIUM)
- [ ] Extract deduplication logic (MEDIUM)
- [ ] Replace hardcoded colors (MEDIUM)
- [ ] Extract magic numbers to constants (MEDIUM)

### Post-Merge (Technical Debt):

- [ ] Optimize useMemo dependencies (LOW)
- [ ] Add React.memo to chart components (LOW)
- [ ] Standardize loading/empty state patterns (LOW)
- [ ] Add unit tests for extracted utilities (MEDIUM)
- [ ] Add integration tests for hooks (MEDIUM)

---

## Conclusion

Koden er **funktionel og følger mange best practices**, men kræver **refaktorering** før production. De kritiske issues (hook/component størrelse) skal fixes før merge, mens de moderate issues kan fixes som technical debt.

**Recommendation:** ✅ **APPROVE WITH CONDITIONS** - Refactor hook/component før merge.

