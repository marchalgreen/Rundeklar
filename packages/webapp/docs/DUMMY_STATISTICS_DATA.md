# Dummy Statistics Data Generation

This document describes how dummy historical statistics data is generated for demo/testing purposes.

## Overview

The `generateDummyHistoricalData()` function in `packages/webapp/src/api/stats.ts` creates realistic historical training sessions, matches, and check-ins spanning multiple seasons. This data is used to populate the statistics dashboard with meaningful historical data.

## Function Location

```typescript
// packages/webapp/src/api/stats.ts
const generateDummyHistoricalData = async (): Promise<void>
```

## Requirements

- **Minimum 8 active players** required in the database
- Function will throw an error if fewer than 8 active players exist

## Data Generation Logic

### 1. Time Period

- **Duration**: Past 18 months (1.5 seasons)
- **Sessions per month**: 8 sessions
- **Total sessions**: ~144 sessions (18 months × 8 sessions)

### 2. Session Dates

- Random day of month (1-28 to avoid month boundary issues)
- Random time: 18:00-20:00 (6-8 PM) with 15-minute intervals (0, 15, 30, 45)
- Sessions are sorted chronologically before processing

### 3. Season Calculation

- Uses `getSeasonFromDate()` function to determine season from session date
- Seasons are typically: "2023/2024", "2024/2025", etc.

### 4. Check-ins

- **Average check-ins per session**: ~26 players (range: 22-32)
- **Selection**: Random selection from active players
- **Check-in time**: Random time before session start (up to 60 minutes earlier)
- **Max rounds**: All set to `null` (no restrictions)

### 5. Matches

- **Rounds per session**: 1-3 rounds (average ~2)
- **Target**: ~1.7 matches per player per session
- **Court count**: 5-7 courts per round (or available courts, whichever is less)
- **Match types**: Mix of 1v1 and 2v2 matches
  - **2v2 matches**: Preferred when more matches needed (uses 4 players)
  - **1v1 matches**: Used for variety (uses 2 players)
  - **Slot assignment**:
    - 2v2: Slots 0, 1, 2, 3
    - 1v1: Slots 1, 2

### 6. Match Distribution

- Players are sorted by match count (fewest matches first) at the start of each round
- This ensures fair distribution - players with fewer matches get priority
- Re-sorted before each court assignment to maintain fairness

### 7. Match Timing

- **Round 1**: Starts at session time
- **Round 2**: Starts 45 minutes after round 1
- **Round 3**: Starts 45 minutes after round 2
- **Court stagger**: Each court within a round starts 5 minutes after the previous
- **Match duration**: 45 minutes per match

### 8. Statistics Snapshots

Each session creates a statistics snapshot containing:
- `sessionId`: Reference to the training session
- `sessionDate`: ISO date string
- `season`: Season identifier (e.g., "2024/2025")
- `matches`: Array of all matches for the session (JSONB)
- `matchPlayers`: Array of all match player assignments (JSONB)
- `checkIns`: Array of all check-ins for the session (JSONB)

## Database Tables Affected

1. **training_sessions**: Creates ended sessions
2. **check_ins**: Creates check-ins for each session
3. **matches**: Creates matches for each round (stored in snapshot JSONB)
4. **match_players**: Creates player assignments (stored in snapshot JSONB)
5. **statistics_snapshots**: Creates snapshot records with all session data

## Usage

### Generate Dummy Data

```typescript
import api from './api'

// Ensure you have at least 8 active players
await api.stats.generateDummyHistoricalData()
```

### Clear Statistics Data

Use the cleanup script to remove all statistics data:

```bash
pnpm tsx packages/webapp/scripts/clear-statistics.ts
```

## Important Notes

1. **No data clearing**: The function does NOT clear existing statistics - it adds to them
2. **Cascade deletion**: Deleting ended sessions will cascade delete related statistics snapshots (due to ON DELETE CASCADE)
3. **Active sessions**: Only ended sessions are created - active sessions are preserved
4. **Realistic distribution**: The algorithm ensures realistic player participation patterns

## Example Output

For a database with 30 active players:
- ~144 sessions over 18 months
- ~3,744 check-ins (26 per session average)
- ~2,448 matches (1.7 per player × 26 players × 144 sessions / 4 players per match)
- ~4,896 match player assignments

## Reusing the Logic

To regenerate dummy data after clearing:

1. **Clear existing data**:
   ```bash
   pnpm tsx packages/webapp/scripts/clear-statistics.ts
   ```

2. **Generate new data**:
   ```typescript
   await api.stats.generateDummyHistoricalData()
   ```

The function can be called multiple times - it will add additional data each time (not replace).

