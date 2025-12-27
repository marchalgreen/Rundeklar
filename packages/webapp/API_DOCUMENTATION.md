# API Documentation

This document describes all API endpoints available in the Rundeklar application.

## Overview

The API is organized into modules:
- **Players** - Player CRUD operations
- **Session** - Training session management
- **CheckIns** - Player check-in/out operations
- **Matches** - Match program operations
- **MatchResults** - Match result management
- **Database** - Database utilities and backup/restore

All API calls are made through the main `api` client, which provides type-safe access to all modules.

## Base URL

- **Development**: `http://127.0.0.1:3000/api`
- **Production**: Configured via environment variables

## Authentication

All API endpoints require authentication. The authentication token is automatically included in requests via the `useFetchWithAuth` hook.

## Players API

### `api.players.list(filters?)`

Lists players with optional filters.

**Parameters:**
```typescript
filters?: {
  q?: string          // Search query (searches name and alias)
  active?: boolean    // Filter by active status
}
```

**Returns:** `Promise<Player[]>`

**Example:**
```typescript
// Get all active players
const players = await api.players.list({ active: true })

// Search for players
const results = await api.players.list({ q: 'John', active: true })
```

**Response:**
```typescript
[
  {
    id: "player-123",
    name: "John Doe",
    alias: "JD",
    levelSingle: 1500,
    levelDouble: 1600,
    levelMix: 1550,
    gender: "Herre",
    primaryCategory: "Double",
    trainingGroups: ["A-gruppe", "Elite"],
    active: true,
    preferredDoublesPartners: ["player-456"],
    preferredMixedPartners: null,
    badmintonplayerId: "bp-123",
    createdAt: "2024-01-15T10:00:00Z"
  }
]
```

---

### `api.players.create(input)`

Creates a new player.

**Parameters:**
```typescript
input: {
  name: string                                    // Required
  alias?: string                                  // Optional
  level?: number                                  // Deprecated, use levelSingle/levelDouble/levelMix
  levelSingle?: number                            // Optional
  levelDouble?: number                            // Optional
  levelMix?: number                               // Optional
  gender?: 'Herre' | 'Dame'                       // Optional
  primaryCategory?: 'Single' | 'Double' | 'Begge' // Optional
  trainingGroups?: string[]                       // Optional
  active?: boolean                                // Optional, defaults to true
  preferredDoublesPartners?: string[]            // Optional
  preferredMixedPartners?: string[]              // Optional
  badmintonplayerId?: string                      // Optional
}
```

**Returns:** `Promise<Player>`

**Example:**
```typescript
const newPlayer = await api.players.create({
  name: "Jane Smith",
  alias: "JS",
  levelSingle: 1400,
  levelDouble: 1500,
  gender: "Dame",
  primaryCategory: "Double",
  trainingGroups: ["B-gruppe"],
  active: true
})
```

**Errors:**
- `ValidationError` - If input validation fails (e.g., missing required fields)
- `DatabaseError` - If database operation fails

---

### `api.players.update(input)`

Updates an existing player.

**Parameters:**
```typescript
input: {
  id: string                                       // Required
  patch: {
    name?: string                                  // Optional
    alias?: string | null                           // Optional, can set to null
    level?: number | null                          // Deprecated
    levelSingle?: number | null                    // Optional
    levelDouble?: number | null                    // Optional
    levelMix?: number | null                       // Optional
    gender?: 'Herre' | 'Dame' | null               // Optional
    primaryCategory?: 'Single' | 'Double' | 'Begge' | null // Optional
    trainingGroups?: string[] | null               // Optional
    active?: boolean                               // Optional
    preferredDoublesPartners?: string[] | null    // Optional
    preferredMixedPartners?: string[] | null      // Optional
    badmintonplayerId?: string | null              // Optional
  }
}
```

**Returns:** `Promise<Player>`

**Example:**
```typescript
const updated = await api.players.update({
  id: "player-123",
  patch: {
    levelSingle: 1600,
    trainingGroups: ["A-gruppe", "Elite"]
  }
})
```

**Errors:**
- `ValidationError` - If input validation fails
- `PlayerError` - If player not found
- `DatabaseError` - If database operation fails

---

### `api.players.delete(id)`

Deletes a player.

**Parameters:**
```typescript
id: string  // Player ID
```

**Returns:** `Promise<void>`

**Example:**
```typescript
await api.players.delete("player-123")
```

**Errors:**
- `DatabaseError` - If database operation fails

---

## Session API

### `api.session.startOrGetActive()`

Starts a new training session or returns the active session if one exists.

**Returns:** `Promise<TrainingSession>`

**Example:**
```typescript
const session = await api.session.startOrGetActive()
```

**Response:**
```typescript
{
  id: "session-123",
  tenantId: "tenant-456",
  status: "active",
  startedAt: "2024-01-15T10:00:00Z",
  endedAt: null,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z"
}
```

---

### `api.session.endActive()`

Ends the active training session.

**Returns:** `Promise<void>`

**Example:**
```typescript
await api.session.endActive()
```

**Errors:**
- `SessionError` - If no active session exists

---

### `api.session.getActive()`

Gets the active training session, if any.

**Returns:** `Promise<TrainingSession | null>`

**Example:**
```typescript
const session = await api.session.getActive()
if (session) {
  console.log(`Active session started at ${session.startedAt}`)
}
```

---

## CheckIns API

### `api.checkIns.add(input)`

Adds a player check-in to the active session.

**Parameters:**
```typescript
input: {
  playerId: string    // Required
  maxRounds?: number  // Optional, limits player to N rounds
}
```

**Returns:** `Promise<CheckIn>`

**Example:**
```typescript
// Regular check-in
const checkIn = await api.checkIns.add({ playerId: "player-123" })

// Check-in with round limit
const limitedCheckIn = await api.checkIns.add({ 
  playerId: "player-123",
  maxRounds: 1 
})
```

**Response:**
```typescript
{
  id: "checkin-123",
  sessionId: "session-456",
  playerId: "player-123",
  checkInAt: "2024-01-15T10:00:00Z",
  maxRounds: null,
  notes: null
}
```

**Errors:**
- `ValidationError` - If input validation fails
- `SessionError` - If no active session exists
- `DatabaseError` - If database operation fails

---

### `api.checkIns.remove(input)`

Removes a player check-in from the active session.

**Parameters:**
```typescript
input: {
  playerId: string  // Required
}
```

**Returns:** `Promise<void>`

**Example:**
```typescript
await api.checkIns.remove({ playerId: "player-123" })
```

**Errors:**
- `ValidationError` - If input validation fails
- `SessionError` - If no active session exists
- `CheckInError` - If check-in not found

---

### `api.checkIns.listActive()`

Lists all checked-in players for the active session.

**Returns:** `Promise<CheckedInPlayer[]>`

**Example:**
```typescript
const checkedIn = await api.checkIns.listActive()
```

**Response:**
```typescript
[
  {
    id: "player-123",
    name: "John Doe",
    // ... all Player fields ...
    checkInAt: "2024-01-15T10:00:00Z",
    maxRounds: null,
    notes: null
  }
]
```

**Errors:**
- `SessionError` - If no active session exists

---

## Matches API

### `api.matches.autoArrange(round?)`

Automatically arranges players into matches for a round.

**Parameters:**
```typescript
round?: number  // Optional, defaults to current round
```

**Returns:** `Promise<AutoArrangeResult>`

**Example:**
```typescript
const result = await api.matches.autoArrange(1)
```

**Response:**
```typescript
{
  courts: [
    {
      courtIdx: 0,
      slots: [
        { slot: 0, player: { id: "player-1", ... } },
        { slot: 1, player: { id: "player-2", ... } },
        { slot: 2, player: { id: "player-3", ... } },
        { slot: 3, player: { id: "player-4", ... } }
      ]
    }
  ],
  message: "Matches arranged successfully"
}
```

**Errors:**
- `SessionError` - If no active session exists
- `MatchError` - If arrangement fails

---

### `api.matches.list(round?)`

Lists matches for a specific round.

**Parameters:**
```typescript
round?: number  // Optional, defaults to current round
```

**Returns:** `Promise<CourtWithPlayers[]>`

**Example:**
```typescript
const matches = await api.matches.list(1)
```

**Response:**
```typescript
[
  {
    courtIdx: 0,
    slots: [
      { slot: 0, player: { id: "player-1", ... } },
      { slot: 1, player: { id: "player-2", ... } }
    ]
  }
]
```

---

### `api.matches.reset()`

Resets all matches for the active session.

**Returns:** `Promise<void>`

**Example:**
```typescript
await api.matches.reset()
```

**Errors:**
- `SessionError` - If no active session exists

---

### `api.matches.move(payload, round?)`

Moves a player to a different court/slot.

**Parameters:**
```typescript
payload: {
  playerId: string
  courtIdx?: number
  slot?: number
}
round?: number  // Optional, defaults to current round
```

**Returns:** `Promise<void>`

**Example:**
```typescript
// Move player to bench (remove from court)
await api.matches.move({ playerId: "player-123" })

// Move player to specific court/slot
await api.matches.move({ 
  playerId: "player-123",
  courtIdx: 0,
  slot: 2
}, 1)
```

**Errors:**
- `ValidationError` - If input validation fails
- `SessionError` - If no active session exists
- `MatchError` - If move operation fails

---

## MatchResults API

### `api.matchResults.create(input)`

Creates a match result.

**Parameters:**
```typescript
input: {
  matchId: string
  scoreData: BadmintonScoreData | TennisScoreData | PadelScoreData
  winnerTeam: 'team1' | 'team2'
}
```

**Returns:** `Promise<MatchResult>`

**Example:**
```typescript
const result = await api.matchResults.create({
  matchId: "match-123",
  scoreData: {
    sets: [
      { team1Score: 21, team2Score: 15 },
      { team1Score: 21, team2Score: 19 }
    ]
  },
  winnerTeam: "team1"
})
```

---

### `api.matchResults.update(input)`

Updates an existing match result.

**Parameters:**
```typescript
input: {
  matchId: string
  scoreData: BadmintonScoreData | TennisScoreData | PadelScoreData
  winnerTeam: 'team1' | 'team2'
}
```

**Returns:** `Promise<MatchResult>`

---

### `api.matchResults.delete(matchId)`

Deletes a match result.

**Parameters:**
```typescript
matchId: string
```

**Returns:** `Promise<void>`

---

## Database API

### `api.database.backup()`

Creates a backup of all tenant data.

**Returns:** `Promise<BackupData>`

**Example:**
```typescript
const backup = await api.database.backup()
```

**Response:**
```typescript
{
  players: [...],
  sessions: [...],
  checkIns: [...],
  courts: [...],
  matches: [...],
  matchPlayers: [...],
  matchResults: [...],
  statisticsSnapshots: [...]
}
```

---

### `api.database.restore(backupData)`

Restores tenant data from a backup.

**Parameters:**
```typescript
backupData: BackupData
```

**Returns:** `Promise<void>`

**Example:**
```typescript
await api.database.restore(backupData)
```

**Errors:**
- `ValidationError` - If backup data is invalid
- `DatabaseError` - If restore operation fails

---

## Error Handling

All API methods may throw errors. The application uses a centralized error handling system with the following error types:

- `ValidationError` - Input validation failed
- `DatabaseError` - Database operation failed
- `SessionError` - Session-related error (e.g., no active session)
- `CheckInError` - Check-in operation failed
- `MatchError` - Match operation failed
- `PlayerError` - Player operation failed

All errors are normalized using `normalizeError` from `src/lib/errors.ts` and displayed to users via toast notifications.

---

## Type Definitions

All types are defined in `@rundeklar/common` package. Key types include:

- `Player` - Player entity
- `TrainingSession` - Training session entity
- `CheckIn` - Check-in entity
- `CourtWithPlayers` - Court with assigned players
- `MatchResult` - Match result entity
- `CheckedInPlayer` - Player with check-in metadata

For complete type definitions, see `packages/common/src/index.ts`.

