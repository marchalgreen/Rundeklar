# API Layer

## Overview

The API layer provides a clean interface for data access and business logic operations. It handles data transformation, validation, and error handling.

## Structure

```
api/
├── index.ts          # Main API client with domain-specific modules
├── supabase.ts       # Supabase client and low-level database operations
├── stats.ts          # Statistics-specific API functions
└── storage.ts        # Storage operations
```

## Architecture

### API Client (`index.ts`)

The main API client exports domain-specific modules:

- `api.players` - Player CRUD operations
- `api.session` - Training session management
- `api.checkIns` - Player check-in/out operations
- `api.matches` - Match and court assignment operations
- `api.database` - Database backup/restore utilities

### Error Handling

All API functions use the centralized error handling system:

- `AppError` - Base error class for all application errors
- `PlayerError` - Player-related errors
- `SessionError` - Session-related errors
- `ValidationError` - Input validation errors
- `DatabaseError` - Database operation errors

Errors are normalized and provide user-friendly messages with error codes for programmatic handling.

### Data Transformation

The API layer handles transformation between:
- Database format (snake_case, nullable fields)
- Domain format (camelCase, consistent null handling)

All data is normalized before being returned to ensure consistency.

## Usage Examples

### Players API

```typescript
import api from './api'

// List players with filters
const players = await api.players.list({
  q: 'John',           // Search query
  active: true         // Only active players
})

// Create a new player
const newPlayer = await api.players.create({
  name: 'John Doe',
  alias: 'JD',
  levelSingle: 5,
  gender: 'Herre',
  primaryCategory: 'Single',
  active: true
})

// Update a player
const updated = await api.players.update({
  id: 'player-id',
  patch: {
    levelSingle: 6,
    active: false
  }
})
```

### Session API

```typescript
// Get active session
const session = await api.session.getActive()

// Start or get active session
const activeSession = await api.session.startOrGetActive()

// End active session
await api.session.endActive()
```

### Check-ins API

```typescript
// Add check-in
await api.checkIns.add({
  playerId: 'player-id',
  maxRounds: 1  // Optional: limit to 1 round
})

// List active check-ins
const checkedIn = await api.checkIns.listActive()

// Remove check-in
await api.checkIns.remove({
  playerId: 'player-id'
})
```

### Matches API

```typescript
// List matches for a round
const matches = await api.matches.list(1)  // Round 1

// Auto-arrange matches
const result = await api.matches.autoArrange(1)

// Move player to court
await api.matches.move({
  playerId: 'player-id',
  toCourtIdx: 1,
  toSlot: 0,
  round: 1
})

// Reset matches for a round
await api.matches.resetForRound(1)
```

## Error Handling

All API functions throw typed errors that can be caught and handled:

```typescript
try {
  await api.players.create({ name: '' })
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation error
    console.error('Validation failed:', error.message)
  } else if (error instanceof DatabaseError) {
    // Handle database error
    console.error('Database error:', error.message)
  } else {
    // Handle other errors
    console.error('Unexpected error:', error)
  }
}
```

## Validation

Input validation is performed using Zod schemas:

- `playerCreateSchema` - Validates player creation input
- `playerUpdateSchema` - Validates player update input

Validation errors are automatically converted to `ValidationError` instances with user-friendly messages.

## Best Practices

1. **Always handle errors**: Use try-catch blocks when calling API functions
2. **Use typed errors**: Check error types for specific error handling
3. **Normalize data**: All data returned from API is normalized (nulls, not undefined)
4. **Validate input**: Use the provided Zod schemas for validation
5. **Handle loading states**: Show loading indicators during async operations

## Testing

API functions can be tested by mocking the Supabase client:

```typescript
import { vi } from 'vitest'
import api from './api'

// Mock Supabase client
vi.mock('./supabase', () => ({
  getPlayers: vi.fn().mockResolvedValue([...])
}))

// Test API function
const players = await api.players.list()
expect(players).toHaveLength(1)
```

## Migration Notes

When migrating from old API patterns:

1. Replace direct database calls with API functions
2. Update error handling to use typed errors
3. Remove console.log statements (errors are handled centrally)
4. Use normalized data (nulls, not undefined)

