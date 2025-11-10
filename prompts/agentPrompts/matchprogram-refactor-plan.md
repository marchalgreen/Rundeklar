# MatchProgram Component Refactoring Plan

## Current State Analysis

**File:** `packages/webapp/src/routes/MatchProgram.tsx`
**Size:** 2373 lines
**Issues:**
- Monolithic component with too many responsibilities
- Mixed concerns (UI, business logic, data fetching, state management)
- Difficult to test and maintain
- Hard to reuse logic

## Responsibilities Identified

### 1. State Management (15+ useState hooks)
- Matches/courts state
- Drag and drop state
- Round management
- Locked courts
- Extended capacity
- UI state (fullscreen, collapsed, etc.)
- Persistence state

### 2. Data Fetching
- Uses `useSession` and `useCheckIns` hooks
- `loadMatches` function
- `loadCheckIns` function
- Persistence logic with localStorage

### 3. Business Logic
- Auto-match functionality
- Drag and drop logic
- Court locking
- Extended capacity management
- Duplicate detection
- Round management
- Player filtering (bench, inactive)

### 4. UI Rendering
- Court cards
- Bench section
- Inactive section
- Previous rounds popup
- Full-screen mode
- Drag and drop UI

## Refactoring Strategy

### Phase 1: Extract State Management to Custom Hook

**Create:** `packages/webapp/src/hooks/useMatchProgram.ts`

**Responsibilities:**
- Manage all match program state (matches, rounds, locked courts, extended capacity, etc.)
- Handle persistence (load/save to localStorage)
- Provide state update functions
- Handle state restoration on mount

**Extract:**
- All `useState` hooks related to match program
- All `useRef` hooks for state refs
- All `useEffect` hooks for persistence
- State restoration logic
- State update functions (`updateInMemoryMatches`, `saveCurrentState`)

### Phase 2: Extract Business Logic to Services

**Create:** `packages/webapp/src/services/matchProgramService.ts`

**Responsibilities:**
- Player filtering logic (bench, inactive, assigned)
- Court management utilities
- Match validation
- Duplicate detection

**Create:** `packages/webapp/src/services/dragDropService.ts`

**Responsibilities:**
- Drag and drop logic
- Player movement between courts/bench/inactive
- Swap detection
- Drag state management

**Create:** `packages/webapp/src/lib/matchProgramUtils.ts`

**Responsibilities:**
- Pure utility functions
- Court capacity calculations
- Player slot calculations
- Category/letter helpers

### Phase 3: Extract UI Components

**Create:** `packages/webapp/src/components/matchprogram/CourtCard.tsx`

**Responsibilities:**
- Render a single court card
- Handle court-specific drag and drop
- Display court header (lock, capacity, etc.)
- Render player slots

**Create:** `packages/webapp/src/components/matchprogram/PlayerSlot.tsx`

**Responsibilities:**
- Render a single player slot
- Handle drag and drop for slot
- Display player information
- Handle swap detection

**Create:** `packages/webapp/src/components/matchprogram/BenchSection.tsx`

**Responsibilities:**
- Render bench section
- Handle bench drag and drop
- Display bench players
- Handle collapse/expand

**Create:** `packages/webapp/src/components/matchprogram/InactiveSection.tsx`

**Responsibilities:**
- Render inactive section
- Handle inactive drag and drop
- Display inactive players

**Create:** `packages/webapp/src/components/matchprogram/PreviousRoundsPopup.tsx`

**Responsibilities:**
- Render previous rounds popup
- Handle popup positioning
- Display previous round matches

**Create:** `packages/webapp/src/components/matchprogram/MatchProgramHeader.tsx`

**Responsibilities:**
- Render header with round selector
- Display session info
- Action buttons (start/end training, auto-match, etc.)

**Create:** `packages/webapp/src/components/matchprogram/FullScreenView.tsx`

**Responsibilities:**
- Render full-screen mode
- Handle full-screen layout
- Display courts in full-screen

### Phase 4: Refactor Main Component

**Update:** `packages/webapp/src/routes/MatchProgram.tsx`

**New Structure:**
- Use `useMatchProgram` hook for all state management
- Use services for business logic
- Use extracted components for UI
- Focus only on composition and coordination
- Should be ~200-300 lines (down from 2373)

## File Structure

```
packages/webapp/src/
├── hooks/
│   └── useMatchProgram.ts          # State management hook
├── services/
│   ├── matchProgramService.ts     # Business logic service
│   └── dragDropService.ts         # Drag and drop service
├── lib/
│   └── matchProgramUtils.ts       # Pure utility functions
├── components/
│   └── matchprogram/
│       ├── CourtCard.tsx           # Court card component
│       ├── PlayerSlot.tsx          # Player slot component
│       ├── BenchSection.tsx        # Bench section component
│       ├── InactiveSection.tsx     # Inactive section component
│       ├── PreviousRoundsPopup.tsx # Previous rounds popup
│       ├── MatchProgramHeader.tsx  # Header component
│       ├── FullScreenView.tsx      # Full-screen view component
│       └── index.ts                # Component exports
└── routes/
    └── MatchProgram.tsx            # Main component (refactored)
```

## Implementation Order

1. **Extract utilities first** (easiest, no dependencies)
   - `matchProgramUtils.ts` - pure functions
   
2. **Extract services** (business logic, depends on utilities)
   - `matchProgramService.ts` - player filtering, court management
   - `dragDropService.ts` - drag and drop logic

3. **Extract UI components** (depends on services and utilities)
   - `PlayerSlot.tsx` - smallest, most isolated
   - `CourtCard.tsx` - uses PlayerSlot
   - `BenchSection.tsx` - independent
   - `InactiveSection.tsx` - independent
   - `PreviousRoundsPopup.tsx` - independent
   - `MatchProgramHeader.tsx` - independent
   - `FullScreenView.tsx` - uses CourtCard

4. **Extract state management hook** (depends on services)
   - `useMatchProgram.ts` - consolidates all state

5. **Refactor main component** (depends on everything)
   - `MatchProgram.tsx` - composition only

## Best Practices to Follow

1. **Separation of Concerns**
   - UI components only handle rendering
   - Business logic in services
   - State management in hooks
   - Pure functions in utilities

2. **Error Handling**
   - Use `normalizeError` from `src/lib/errors.ts`
   - Use `useToast` for user notifications
   - No `console.log` or `console.error`

3. **Type Safety**
   - Proper TypeScript types for all functions
   - No `any` types
   - Use types from `@herlev-hjorten/common`

4. **Code Organization**
   - Single responsibility per file
   - Reusable logic extracted
   - Clear file structure
   - Proper exports

5. **Testing Considerations**
   - Pure functions easily testable
   - Services testable in isolation
   - Components testable with mocked hooks
   - Hook testable with React Testing Library

## Migration Strategy

1. **Incremental Refactoring**
   - Extract one piece at a time
   - Test after each extraction
   - Keep main component working throughout

2. **Backward Compatibility**
   - Maintain same API/behavior
   - No breaking changes to user experience
   - Same functionality, better structure

3. **Validation**
   - Test each extracted piece
   - Test integration
   - Manual testing of full flow

## Success Criteria

- [ ] Main component under 300 lines
- [ ] All business logic in services
- [ ] All state management in hook
- [ ] All UI in focused components
- [ ] No mixed concerns
- [ ] Proper error handling
- [ ] Type-safe throughout
- [ ] All functionality preserved
- [ ] Better testability
- [ ] Better maintainability

