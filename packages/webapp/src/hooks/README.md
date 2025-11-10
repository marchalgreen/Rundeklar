# Custom Hooks

## Overview

Custom hooks encapsulate business logic and data fetching patterns, making components cleaner and more maintainable. All hooks follow React best practices and provide consistent error handling.

## Available Hooks

### `usePlayers`

Manages player data and CRUD operations.

```typescript
import { usePlayers } from '../hooks'

const { players, loading, error, createPlayer, updatePlayer } = usePlayers({
  q: 'John',      // Optional search query
  active: true    // Optional active filter
})
```

**Returns:**
- `players` - Array of players (filtered if filters provided)
- `loading` - Loading state
- `error` - Error message or null
- `refetch` - Function to reload players
- `createPlayer` - Function to create a new player
- `updatePlayer` - Function to update an existing player
- `clearError` - Function to clear error state

**Example:**
```typescript
const MyComponent = () => {
  const { players, loading, createPlayer } = usePlayers({ active: true })
  
  const handleCreate = async () => {
    const newPlayer = await createPlayer({
      name: 'John Doe',
      levelSingle: 5
    })
    if (newPlayer) {
      // Success - player created
    }
  }
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      {players.map(player => (
        <div key={player.id}>{player.name}</div>
      ))}
    </div>
  )
}
```

### `useSession`

Manages training session data and operations.

```typescript
import { useSession } from '../hooks'

const { session, loading, startSession, endSession } = useSession()
```

**Returns:**
- `session` - Current active session or null
- `loading` - Loading state
- `error` - Error message or null
- `refetch` - Function to reload session
- `startSession` - Function to start or get active session
- `endSession` - Function to end active session
- `clearError` - Function to clear error state

**Example:**
```typescript
const MyComponent = () => {
  const { session, startSession, endSession } = useSession()
  
  if (!session) {
    return (
      <button onClick={() => startSession()}>
        Start træning
      </button>
    )
  }
  
  return (
    <div>
      <p>Aktiv træning: {new Date(session.date).toLocaleDateString()}</p>
      <button onClick={() => endSession()}>
        Afslut træning
      </button>
    </div>
  )
}
```

### `useCheckIns`

Manages player check-ins for training sessions.

```typescript
import { useCheckIns } from '../hooks'

const { checkedIn, loading, checkIn, checkOut } = useCheckIns(session?.id)
```

**Returns:**
- `checkedIn` - Array of checked-in players
- `loading` - Loading state
- `error` - Error message or null
- `refetch` - Function to reload check-ins
- `checkIn` - Function to check in a player
- `checkOut` - Function to check out a player
- `clearError` - Function to clear error state

**Example:**
```typescript
const MyComponent = () => {
  const { session } = useSession()
  const { checkedIn, checkIn, checkOut } = useCheckIns(session?.id)
  
  const handleCheckIn = async (playerId: string) => {
    const success = await checkIn(playerId, 1) // Max 1 round
    if (success) {
      // Player checked in successfully
    }
  }
  
  return (
    <div>
      {checkedIn.map(player => (
        <div key={player.id}>
          {player.name}
          <button onClick={() => checkOut(player.id)}>
            Tjek ud
          </button>
        </div>
      ))}
    </div>
  )
}
```

## Best Practices

### 1. Use Hooks for Data Fetching

✅ **Good:**
```typescript
const { players, loading } = usePlayers()
```

❌ **Bad:**
```typescript
const [players, setPlayers] = useState([])
const [loading, setLoading] = useState(true)
useEffect(() => {
  // Complex data fetching logic
}, [])
```

### 2. Handle Loading and Error States

```typescript
const { players, loading, error } = usePlayers()

if (loading) return <LoadingSpinner />
if (error) return <ErrorMessage message={error} />
return <PlayerList players={players} />
```

### 3. Use Hooks for Business Logic

Extract complex logic into hooks rather than keeping it in components:

```typescript
// In hook
const usePlayerForm = () => {
  const [formData, setFormData] = useState({})
  const { createPlayer } = usePlayers()
  
  const handleSubmit = async () => {
    // Validation logic
    // Submission logic
    await createPlayer(formData)
  }
  
  return { formData, setFormData, handleSubmit }
}

// In component
const PlayerForm = () => {
  const { formData, setFormData, handleSubmit } = usePlayerForm()
  // Clean component code
}
```

### 4. Combine Hooks

Hooks can be combined for complex scenarios:

```typescript
const MyComponent = () => {
  const { session } = useSession()
  const { checkedIn, checkIn } = useCheckIns(session?.id)
  const { players } = usePlayers({ active: true })
  
  // Use all three hooks together
}
```

## Error Handling

All hooks use the centralized error handling system:

- Errors are automatically normalized
- User-friendly error messages are provided
- Toast notifications are shown for errors
- Error state is available for UI handling

## Testing

Hooks can be tested using `@testing-library/react-hooks`:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { usePlayers } from './usePlayers'

test('loads players', async () => {
  const { result } = renderHook(() => usePlayers())
  
  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })
  
  expect(result.current.players).toHaveLength(10)
})
```

## Creating New Hooks

When creating new hooks:

1. **Follow naming convention**: `use` prefix (e.g., `useMatches`)
2. **Return consistent interface**: `{ data, loading, error, operations }`
3. **Handle errors**: Use `normalizeError` and show toast notifications
4. **Document with JSDoc**: Include examples and parameter descriptions
5. **Export from index**: Add to `src/hooks/index.ts`

Example template:

```typescript
/**
 * Custom hook for [purpose].
 * 
 * @param param - Parameter description
 * @returns Hook return value description
 * 
 * @example
 * ```typescript
 * const { data, loading } = useMyHook(param)
 * ```
 */
export const useMyHook = (param: string) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { notify } = useToast()

  const loadData = useCallback(async () => {
    // Data fetching logic
  }, [param])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    data,
    loading,
    error,
    refetch: loadData
  }
}
```

