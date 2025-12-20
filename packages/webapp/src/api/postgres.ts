import type {
  Player,
  PlayerUpdateInput,
  TrainingSession,
  CheckIn,
  Court,
  Match,
  MatchPlayer,
  MatchResult,
  BadmintonScoreData,
  StatisticsSnapshot
} from '@rundeklar/common'
// Browser-compatible Postgres client using Vercel API proxy
// Since postgres.js doesn't work in browsers, we proxy queries through Vercel serverless functions

import { getCurrentTenantConfig } from '../lib/postgres'
import { logger } from '../lib/utils/logger'

async function executeQuery(query: string, params: any[] = []): Promise<any[]> {
  // Get current tenant ID for security
  let tenantId: string
  try {
    const tenantConfig = getCurrentTenantConfig()
    tenantId = tenantConfig.id
  } catch (error) {
    logger.error('[executeQuery] Failed to get tenant config', error)
    throw new Error('Tenant context not initialized. Make sure TenantProvider is mounted and tenant is loaded.')
  }

  // In development, use local API route (Vercel CLI runs on port 3000)
  // In production, use Vercel API route
  const apiUrl = import.meta.env.DEV 
    ? 'http://127.0.0.1:3000/api/db'  // Local Vercel dev server
    : '/api/db'  // Vercel production API route

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, params, tenantId }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = 'Database query failed'
    let errorDetails: any = null
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.error || errorMessage
      errorDetails = errorJson
    } catch {
      errorMessage = errorText || errorMessage
    }
    logger.error('[executeQuery] API error', {
      status: response.status,
      statusText: response.statusText,
      error: errorMessage,
      errorDetails,
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      params: params.slice(0, 5) // Show first 5 params
    })
    throw new Error(errorMessage)
  }

  const result = await response.json()
  // Safety check: ensure result.data is always an array
  if (!Array.isArray(result.data)) {
    logger.error('[executeQuery] API returned non-array data', result)
    return []
  }
  return result.data
}

// Create a proxy object that handles template literal queries
// Template literals like sql`SELECT * FROM players` are actually function calls
function createSqlProxy() {
  // Create a function that can be called as a template literal
  const sqlFunction = (strings: TemplateStringsArray, ...values: any[]) => {
    // Convert template literal to parameterized query
    let query = ''
    const params: any[] = []
    
    for (let i = 0; i < strings.length; i++) {
      query += strings[i]
      if (i < values.length) {
        // Arrays and objects are passed as-is, Postgres will handle them
        params.push(values[i])
        query += `$${params.length}`
      }
    }
    
    return executeQuery(query, params)
  }
  
  // Add unsafe method to the function object
  // TODO: refine type - postgres client proxy requires dynamic method attachment
  ;(sqlFunction as any).unsafe = (query: string, params: any[] = []) => {
    return executeQuery(query, params)
  }
  
  // TODO: refine type - postgres client proxy returns function with unsafe method
  return sqlFunction as any
}

// Get Postgres client (returns proxy that handles template literals)
const getPostgres = () => createSqlProxy()

// Helper to get current tenant ID
const getTenantId = (): string => {
  try {
    return getCurrentTenantConfig().id
  } catch {
    throw new Error('Tenant context not initialized. Make sure TenantProvider is mounted.')
  }
}

/**
 * Gets isolation ID for current tenant (only demo tenant uses this).
 * @returns Isolation ID or null
 */
const getIsolationIdForCurrentTenant = async (): Promise<string | null> => {
  try {
    const tenantId = getTenantId()
    if (tenantId !== 'demo') {
      return null
    }
    
    const { getIsolationId } = await import('../lib/isolation')
    return getIsolationId(tenantId)
  } catch (error) {
    logger.error('[postgres] Failed to get isolation_id', error)
    return null
  }
}

/** In-memory database state structure (for backward compatibility). */
export type DatabaseState = {
  players: Player[]
  sessions: TrainingSession[]
  checkIns: CheckIn[]
  courts: Court[]
  matches: Match[]
  matchPlayers: MatchPlayer[]
  statistics?: StatisticsSnapshot[]
}

/** Cached database state (singleton pattern). */
let cachedState: DatabaseState | null = null

/** Individual table caches for better performance */
const tableCaches = {
  players: null as Player[] | null,
  sessions: null as TrainingSession[] | null,
  checkIns: null as CheckIn[] | null,
  courts: null as Court[] | null,
  matches: null as Match[] | null,
  matchPlayers: null as MatchPlayer[] | null,
  matchResults: null as MatchResult[] | null,
  statistics: null as StatisticsSnapshot[] | null
}

/**
 * Generates a unique ID (UUID).
 * @returns Unique ID string
 */
export const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

/**
 * Converts a Postgres row to a Player.
 */
const rowToPlayer = (row: any): Player => ({
  id: row.id,
  name: row.name,
  alias: row.alias,
  level: row.level_single, // Default to single level for backward compatibility
  levelSingle: row.level_single,
  levelDouble: row.level_double,
  levelMix: row.level_mix,
  gender: row.gender,
  primaryCategory: row.primary_category,
  trainingGroups: row.training_group || [],
  active: row.active,
  preferredDoublesPartners: row.preferred_doubles_partners || [],
  preferredMixedPartners: row.preferred_mixed_partners || [],
  createdAt: row.created_at
})

/**
 * Converts a Postgres row to a TrainingSession.
 */
const rowToSession = (row: any): TrainingSession => ({
  id: row.id,
  date: row.date,
  status: row.status,
  createdAt: row.created_at
})

/**
 * Converts a Postgres row to a CheckIn.
 */
const rowToCheckIn = (row: any): CheckIn => ({
  id: row.id,
  sessionId: row.session_id,
  playerId: row.player_id,
  maxRounds: row.max_rounds,
  createdAt: row.created_at,
  notes: row.notes ?? null
})

/**
 * Converts a Postgres row to a Court.
 */
const rowToCourt = (row: any): Court => ({
  id: row.id,
  idx: row.idx
})

/**
 * Converts a Postgres row to a Match.
 */
const rowToMatch = (row: any): Match => ({
  id: row.id,
  sessionId: row.session_id,
  courtId: row.court_id,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  round: row.round
})

/**
 * Converts a Postgres row to a MatchPlayer.
 */
const rowToMatchPlayer = (row: any): MatchPlayer => ({
  id: row.id,
  matchId: row.match_id,
  playerId: row.player_id,
  slot: row.slot
})

/**
 * Converts a Postgres row to a MatchResult.
 */
const rowToMatchResult = (row: any): MatchResult => {
  // Parse score_data if it's a string (JSONB from Postgres)
  let scoreData = row.score_data
  if (typeof scoreData === 'string') {
    try {
      scoreData = JSON.parse(scoreData)
    } catch (e) {
      logger.error('Failed to parse score_data', e)
      scoreData = {}
    }
  }
  
  const result = {
    id: row.id,
    matchId: row.match_id,
    sport: row.sport,
    scoreData: scoreData || {},
    winnerTeam: row.winner_team,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
  
  return result
}

/**
 * Converts a Postgres row to a StatisticsSnapshot.
 */
const rowToStatisticsSnapshot = (row: any): StatisticsSnapshot => {
  // Helper to ensure array format (handles JSONB strings, null, undefined, etc.)
  // CRITICAL: postgres.js returns JSONB values as JavaScript objects/arrays when possible
  // But when stored as JSONB strings (legacy data), they come as strings and need parsing
  const ensureArray = (value: any, fieldName: string = 'field'): any[] => {
    // Already an array - return as-is
    if (Array.isArray(value)) return value
    
    // Null or undefined - return empty array
    if (value == null) return []
    
    // String - try to parse as JSON (handles JSONB strings from database)
    if (typeof value === 'string') {
      // Handle double-encoded strings (can happen through API serialization)
      let stringToParse = value
      // If string looks like it's already JSON-encoded, try parsing twice
      if (stringToParse.startsWith('"') && stringToParse.endsWith('"')) {
        try {
          stringToParse = JSON.parse(stringToParse)
          // If result is still a string, parse again
          if (typeof stringToParse === 'string') {
            const parsed = JSON.parse(stringToParse)
            return Array.isArray(parsed) ? parsed : []
          }
        } catch {
          // If first parse fails, continue with original string
        }
      }
      
      try {
        const parsed = JSON.parse(stringToParse)
        return Array.isArray(parsed) ? parsed : []
      } catch (e) {
        // Log parsing errors for debugging (only in development)
        if (import.meta.env.DEV) {
          logger.warn(`[rowToStatisticsSnapshot] Failed to parse ${fieldName} as JSON`, {
            fieldName,
            valueType: typeof value,
            valuePreview: value.substring(0, 100),
            error: e instanceof Error ? e.message : String(e)
          })
        }
        return []
      }
    }
    
    // Object but not array - log warning in development
    if (typeof value === 'object' && value !== null) {
      if (import.meta.env.DEV) {
        logger.warn(`[rowToStatisticsSnapshot] ${fieldName} is object but not array`, {
          fieldName,
          valueType: typeof value,
          valueKeys: Object.keys(value).slice(0, 5)
        })
      }
    }
    
    return []
  }

  return {
  id: row.id,
  sessionId: row.session_id,
  sessionDate: row.session_date,
  season: row.season,
    matches: ensureArray(row.matches, 'matches'),
    matchPlayers: ensureArray(row.match_players, 'matchPlayers'),
    checkIns: ensureArray(row.check_ins, 'checkIns'),
  createdAt: row.created_at
  }
}

/**
 * Loads database state from Postgres.
 * @returns Database state
 */
export const loadState = async (): Promise<DatabaseState> => {
  if (cachedState) return cachedState

  const sql = getPostgres()

  try {
    // Get tenant ID and isolation ID for filtering
    const tenantId = getTenantId()
    const isolationId = await getIsolationIdForCurrentTenant()

    // Load all data in parallel (filtered by tenant_id and isolation_id)
    const results = await Promise.all([
      // Players don't need isolation filtering (they're shared across isolation sessions)
      sql`SELECT * FROM players WHERE tenant_id = ${tenantId} ORDER BY name`.catch(err => {
        logger.error('[loadState] Error loading players', err)
        return []
      }),
      // Sessions: filter by isolation_id (include NULL for demo tenants to match seeded data)
      isolationId
        ? sql`SELECT * FROM training_sessions WHERE tenant_id = ${tenantId} AND (isolation_id = ${isolationId} OR isolation_id IS NULL) ORDER BY created_at DESC`.catch(err => {
            logger.error('[loadState] Error loading sessions', err)
            return []
          })
        : sql`SELECT * FROM training_sessions WHERE tenant_id = ${tenantId} AND (isolation_id IS NULL OR isolation_id = '') ORDER BY created_at DESC`.catch(err => {
            logger.error('[loadState] Error loading sessions', err)
            return []
          }),
      // Check-ins: filter by isolation_id from training_sessions
      isolationId
        ? sql`
            SELECT ci.* FROM check_ins ci
            INNER JOIN training_sessions ts ON ci.session_id = ts.id
            WHERE ci.tenant_id = ${tenantId} AND ts.isolation_id = ${isolationId}
            ORDER BY ci.created_at
          `.catch(err => {
            logger.error('[loadState] Error loading checkIns', err)
            return []
          })
        : sql`
            SELECT ci.* FROM check_ins ci
            INNER JOIN training_sessions ts ON ci.session_id = ts.id
            WHERE ci.tenant_id = ${tenantId} AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
            ORDER BY ci.created_at
          `.catch(err => {
            logger.error('[loadState] Error loading checkIns', err)
            return []
          }),
      // Courts don't need isolation filtering (they're shared across isolation sessions)
      sql`SELECT * FROM courts WHERE tenant_id = ${tenantId} ORDER BY idx`.catch(err => {
        logger.error('[loadState] Error loading courts', err)
        return []
      }),
      // Matches: filter by isolation_id from training_sessions
      isolationId
        ? sql`
            SELECT m.* FROM matches m
            INNER JOIN training_sessions ts ON m.session_id = ts.id
            WHERE m.tenant_id = ${tenantId} AND ts.isolation_id = ${isolationId}
            ORDER BY m.started_at
          `.catch(err => {
            logger.error('[loadState] Error loading matches', err)
            return []
          })
        : sql`
            SELECT m.* FROM matches m
            INNER JOIN training_sessions ts ON m.session_id = ts.id
            WHERE m.tenant_id = ${tenantId} AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
            ORDER BY m.started_at
          `.catch(err => {
            logger.error('[loadState] Error loading matches', err)
            return []
          }),
      // Match players: filter by isolation_id from training_sessions via matches
      isolationId
        ? sql`
            SELECT mp.* FROM match_players mp
            INNER JOIN matches m ON mp.match_id = m.id
            INNER JOIN training_sessions ts ON m.session_id = ts.id
            WHERE mp.tenant_id = ${tenantId} AND ts.isolation_id = ${isolationId}
          `.catch(err => {
            logger.error('[loadState] Error loading matchPlayers', err)
            return []
          })
        : sql`
            SELECT mp.* FROM match_players mp
            INNER JOIN matches m ON mp.match_id = m.id
            INNER JOIN training_sessions ts ON m.session_id = ts.id
            WHERE mp.tenant_id = ${tenantId} AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
          `.catch(err => {
            logger.error('[loadState] Error loading matchPlayers', err)
            return []
          }),
      // Statistics snapshots: filter by isolation_id from training_sessions
      isolationId
        ? sql`
            SELECT ss.* FROM statistics_snapshots ss
            INNER JOIN training_sessions ts ON ss.session_id = ts.id
            WHERE ss.tenant_id = ${tenantId} AND ts.isolation_id = ${isolationId}
            ORDER BY ss.session_date DESC
          `.catch(err => {
            logger.error('[loadState] Error loading statistics', err)
            return []
          })
        : sql`
            SELECT ss.* FROM statistics_snapshots ss
            INNER JOIN training_sessions ts ON ss.session_id = ts.id
            WHERE ss.tenant_id = ${tenantId} AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
            ORDER BY ss.session_date DESC
          `.catch(err => {
            logger.error('[loadState] Error loading statistics', err)
            return []
          })
    ])
    
    const [players, sessions, checkIns, courts, matches, matchPlayers, statistics] = results

    // Safety check: ensure all results are arrays before mapping
    const safePlayers = Array.isArray(players) ? players : []
    const safeSessions = Array.isArray(sessions) ? sessions : []
    const safeCheckIns = Array.isArray(checkIns) ? checkIns : []
    const safeCourts = Array.isArray(courts) ? courts : []
    const safeMatches = Array.isArray(matches) ? matches : []
    const safeMatchPlayers = Array.isArray(matchPlayers) ? matchPlayers : []
    const safeStatistics = Array.isArray(statistics) ? statistics : []

    // Convert rows to types and update individual caches
    const convertedPlayers = safePlayers.map(rowToPlayer)
    const convertedSessions = safeSessions.map(rowToSession)
    const convertedCheckIns = safeCheckIns.map(rowToCheckIn)
    const convertedCourts = safeCourts.map(rowToCourt)
    const convertedMatches = safeMatches.map(rowToMatch)
    const convertedMatchPlayers = safeMatchPlayers.map(rowToMatchPlayer)
    const convertedStatistics = safeStatistics.map(rowToStatisticsSnapshot)

    // Update individual table caches
    tableCaches.players = convertedPlayers
    tableCaches.sessions = convertedSessions
    tableCaches.checkIns = convertedCheckIns
    tableCaches.courts = convertedCourts
    tableCaches.matches = convertedMatches
    tableCaches.matchPlayers = convertedMatchPlayers
    tableCaches.statistics = convertedStatistics

    // Convert rows to types
    cachedState = {
      players: convertedPlayers,
      sessions: convertedSessions,
      checkIns: convertedCheckIns,
      courts: convertedCourts,
      matches: convertedMatches,
      matchPlayers: convertedMatchPlayers,
      statistics: convertedStatistics
    }

    return cachedState
  } catch {
    // Return empty state on error - error is logged by caller
    cachedState = {
      players: [],
      sessions: [],
      checkIns: [],
      courts: [],
      matches: [],
      matchPlayers: [],
      statistics: []
    }
    return cachedState
  }
}

/**
 * Persists current database state to Postgres (no-op, data is already persisted).
 * @remarks Kept for backward compatibility.
 */
export const persistState = async (): Promise<void> => {
  // No-op, data is persisted directly via CRUD operations
}

/**
 * Gets a copy of the current database state.
 * @returns Deep copy of the database state
 */
export const getStateCopy = async (): Promise<DatabaseState> => {
  const state = await loadState()
  // Safety checks: ensure all arrays exist before mapping
  const safePlayers = Array.isArray(state.players) ? state.players : []
  const safeSessions = Array.isArray(state.sessions) ? state.sessions : []
  const safeCheckIns = Array.isArray(state.checkIns) ? state.checkIns : []
  const safeCourts = Array.isArray(state.courts) ? state.courts : []
  const safeMatches = Array.isArray(state.matches) ? state.matches : []
  const safeMatchPlayers = Array.isArray(state.matchPlayers) ? state.matchPlayers : []
  const safeStatistics = Array.isArray(state.statistics) ? state.statistics : []
  
  return {
    players: safePlayers.map((player) => ({ ...player })),
    sessions: safeSessions.map((session) => ({ ...session })),
    checkIns: safeCheckIns.map((checkIn) => ({ ...checkIn })),
    courts: safeCourts.map((court) => ({ ...court })),
    matches: safeMatches.map((match) => ({ ...match })),
    matchPlayers: safeMatchPlayers.map((matchPlayer) => ({ ...matchPlayer })),
    statistics: safeStatistics.map((stat) => ({
      ...stat,
      matches: Array.isArray(stat.matches) ? stat.matches.map((m) => ({ ...m })) : [],
      matchPlayers: Array.isArray(stat.matchPlayers) ? stat.matchPlayers.map((mp) => ({ ...mp })) : [],
      checkIns: Array.isArray(stat.checkIns) ? stat.checkIns.map((c) => ({ ...c })) : []
    }))
  }
}

/**
 * Invalidates the cached state, forcing a reload on next access.
 * @param table - Optional table name to invalidate only that table's cache
 */
export const invalidateCache = (table?: 'players' | 'sessions' | 'checkIns' | 'courts' | 'matches' | 'matchPlayers' | 'statistics') => {
  if (table) {
    // Selective invalidation - only clear the specified table cache
    tableCaches[table] = null
    // Also clear the full cache so it reloads
    cachedState = null
  } else {
    // Full invalidation - clear everything
    cachedState = null
    tableCaches.players = null
    tableCaches.sessions = null
    tableCaches.checkIns = null
    tableCaches.courts = null
    tableCaches.matches = null
    tableCaches.matchPlayers = null
    tableCaches.matchResults = null
    tableCaches.statistics = null
  }
}

// Direct CRUD operations for better performance

/**
 * Gets all players from Postgres (uses cache if available).
 */
export const getPlayers = async (): Promise<Player[]> => {
  // Check cache first
  if (tableCaches.players) {
    return tableCaches.players
  }

  const sql = getPostgres()
  const tenantId = getTenantId()
  const players = await sql`SELECT * FROM players WHERE tenant_id = ${tenantId} ORDER BY name`
  const converted = players.map(rowToPlayer)
  
  // Update cache
  tableCaches.players = converted
  if (cachedState) {
    cachedState.players = converted
  }
  
  return converted
}

/**
 * Creates a player in Postgres.
 */
export const createPlayer = async (player: Omit<Player, 'id' | 'createdAt'>): Promise<Player> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  const playerAny = player as any
  
  // Validate training group limits if new groups are being added
  if (playerAny.trainingGroups && Array.isArray(playerAny.trainingGroups) && playerAny.trainingGroups.length > 0) {
    // Get all unique training groups from all players in this tenant
    const allPlayers = await sql`
      SELECT training_group
      FROM players
      WHERE tenant_id = ${tenantId}
    `
    
    // Collect all unique training groups
    const existingGroups = new Set<string>()
    allPlayers.forEach((p: any) => {
      if (p.training_group && Array.isArray(p.training_group)) {
        p.training_group.forEach((group: string) => {
          if (group) existingGroups.add(group)
        })
      }
    })
    
    // Check if new groups are being added
    const newGroups = playerAny.trainingGroups as string[]
    const groupsToAdd = newGroups.filter(group => group && !existingGroups.has(group))
    
    if (groupsToAdd.length > 0) {
      // Import validation function dynamically to avoid circular dependencies
      const { validateTrainingGroupLimit } = await import('../lib/admin/plan-limits.js')
      const { getCurrentTenantConfig } = await import('../lib/postgres.js')
      const currentGroupCount = existingGroups.size
      const tenantConfig = getCurrentTenantConfig()
      const validation = validateTrainingGroupLimit(tenantConfig?.planId, currentGroupCount)
      
      if (!validation.isValid) {
        throw new Error(validation.error || 'Training group limit reached for this plan')
      }
    }
  }
  
  const [created] = await sql`
    INSERT INTO players (
      name, alias, level_single, level_double, level_mix, gender, 
      primary_category, training_group, active, 
      preferred_doubles_partners, preferred_mixed_partners, tenant_id
    )
    VALUES (
      ${player.name},
      ${player.alias ?? null},
      ${playerAny.levelSingle ?? null},
      ${playerAny.levelDouble ?? null},
      ${playerAny.levelMix ?? null},
      ${player.gender ?? null},
      ${player.primaryCategory ?? null},
      ${playerAny.trainingGroups ?? []},
      ${player.active ?? true},
      ${playerAny.preferredDoublesPartners ?? []},
      ${playerAny.preferredMixedPartners ?? []},
      ${tenantId}
    )
    RETURNING *
  `
  const converted = rowToPlayer(created)
  
  // Optimistic cache update - no need to invalidate, just update cache
  if (tableCaches.players) {
    tableCaches.players = [...tableCaches.players, converted]
  }
  if (cachedState) {
    cachedState.players = [...cachedState.players, converted]
  }
  
  return converted
}

/**
 * Updates a player in Postgres.
 */
export const updatePlayer = async (id: string, updates: PlayerUpdateInput['patch']): Promise<Player> => {
  const sql = getPostgres()
  // TODO: refine type - need camelCase to snake_case mapping for database fields
  const updatesAny = updates as any
  
  // Build update object dynamically
  // TODO: refine type - dynamic object construction for database update
  const updateData: any = {}
  
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.alias !== undefined) updateData.alias = updates.alias
  if (updatesAny.levelSingle !== undefined) updateData.level_single = updatesAny.levelSingle
  if (updatesAny.levelDouble !== undefined) updateData.level_double = updatesAny.levelDouble
  if (updatesAny.levelMix !== undefined) updateData.level_mix = updatesAny.levelMix
  if (updates.level !== undefined) updateData.level_single = updates.level // Backward compatibility
  if (updates.gender !== undefined) updateData.gender = updates.gender
  if (updates.primaryCategory !== undefined) updateData.primary_category = updates.primaryCategory
  if (updatesAny.trainingGroups !== undefined) updateData.training_group = updatesAny.trainingGroups ?? []
  if (updates.active !== undefined) updateData.active = updates.active
  if (updatesAny.preferredDoublesPartners !== undefined) updateData.preferred_doubles_partners = updatesAny.preferredDoublesPartners ?? []
  if (updatesAny.preferredMixedPartners !== undefined) updateData.preferred_mixed_partners = updatesAny.preferredMixedPartners ?? []

  const tenantId = getTenantId()

  // Validate training group limits if training groups are being updated
  if (updatesAny.trainingGroups !== undefined) {
    // Get all unique training groups from all players in this tenant
    const allPlayers = await sql`
      SELECT training_group
      FROM players
      WHERE tenant_id = ${tenantId}
    `
    
    // Collect all unique training groups
    const existingGroups = new Set<string>()
    allPlayers.forEach((player: any) => {
      if (player.training_group && Array.isArray(player.training_group)) {
        player.training_group.forEach((group: string) => {
          if (group) existingGroups.add(group)
        })
      }
    })
    
    // Check if new groups are being added
    const newGroups = updatesAny.trainingGroups as string[] | null
    if (newGroups && Array.isArray(newGroups)) {
      const groupsToAdd = newGroups.filter(group => group && !existingGroups.has(group))
      
      if (groupsToAdd.length > 0) {
        // Import validation function dynamically to avoid circular dependencies
        const { validateTrainingGroupLimit } = await import('../lib/admin/plan-limits.js')
        const { getCurrentTenantConfig } = await import('../lib/postgres.js')
        const currentGroupCount = existingGroups.size
        const tenantConfig = getCurrentTenantConfig()
        const validation = validateTrainingGroupLimit(tenantConfig?.planId, currentGroupCount)
        
        if (!validation.isValid) {
          throw new Error(validation.error || 'Training group limit reached for this plan')
        }
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    // No updates, just fetch the player
    const [player] = await sql`SELECT * FROM players WHERE id = ${id} AND tenant_id = ${tenantId}`
    return rowToPlayer(player)
  }

  // Build SET clause dynamically - using sql.unsafe for dynamic field names
  // This is safe because we control the input and validate field names
  const setClauses: string[] = []
  const values: any[] = []
  let paramIndex = 1
  
  for (const [key, value] of Object.entries(updateData)) {
    if (key === 'training_group' || key === 'preferred_doubles_partners' || key === 'preferred_mixed_partners') {
      // For arrays, use proper array handling
      setClauses.push(`${key} = $${paramIndex}`)
      values.push(value)
    } else {
      setClauses.push(`${key} = $${paramIndex}`)
      values.push(value)
    }
    paramIndex++
  }
  
  values.push(tenantId, id) // Add tenant_id and id as last parameters
  
  const [updated] = await sql.unsafe(
    `UPDATE players SET ${setClauses.join(', ')} WHERE tenant_id = $${paramIndex} AND id = $${paramIndex + 1} RETURNING *`,
    values
  )

  const converted = rowToPlayer(updated)
  
  // Optimistic cache update
  if (tableCaches.players) {
    tableCaches.players = tableCaches.players.map(p => p.id === id ? converted : p)
  }
  if (cachedState) {
    cachedState.players = cachedState.players.map(p => p.id === id ? converted : p)
  }

  return converted
}

/**
 * Deletes a player from Postgres.
 */
export const deletePlayer = async (id: string): Promise<void> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  await sql`DELETE FROM players WHERE id = ${id} AND tenant_id = ${tenantId}`
  
  // Optimistic cache update
  if (tableCaches.players) {
    tableCaches.players = tableCaches.players.filter(p => p.id !== id)
  }
  if (cachedState) {
    cachedState.players = cachedState.players.filter(p => p.id !== id)
  }
}

/**
 * Gets all training sessions from Postgres (uses cache if available).
 */
export const getSessions = async (): Promise<TrainingSession[]> => {
  // Check cache first
  if (tableCaches.sessions) {
    return tableCaches.sessions
  }

  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  let sessions
  if (isolationId) {
    // Demo tenant: filter by isolation_id
    sessions = await sql`
      SELECT * FROM training_sessions 
      WHERE tenant_id = ${tenantId} AND isolation_id = ${isolationId}
      ORDER BY created_at DESC
    `
  } else {
    // Production tenants: filter by NULL isolation_id
    sessions = await sql`
      SELECT * FROM training_sessions 
      WHERE tenant_id = ${tenantId} AND (isolation_id IS NULL OR isolation_id = '')
      ORDER BY created_at DESC
    `
  }
  
  const converted = sessions.map(rowToSession)
  
  // Update cache
  tableCaches.sessions = converted
  if (cachedState) {
    cachedState.sessions = converted
  }
  
  return converted
}

/**
 * Creates a training session in Postgres.
 */
export const createSession = async (session: Omit<TrainingSession, 'id' | 'createdAt'>): Promise<TrainingSession> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  const [created] = await sql`
    INSERT INTO training_sessions (date, status, tenant_id, isolation_id)
    VALUES (${session.date}, ${session.status}, ${tenantId}, ${isolationId})
    RETURNING *
  `
  const converted = rowToSession(created)
  
  // Optimistic cache update
  if (tableCaches.sessions) {
    tableCaches.sessions = [converted, ...tableCaches.sessions]
  }
  if (cachedState) {
    cachedState.sessions = [converted, ...cachedState.sessions]
  }
  
  return converted
}

/**
 * Updates a training session in Postgres.
 */
export const updateSession = async (id: string, updates: Partial<Omit<TrainingSession, 'id' | 'createdAt'>>): Promise<TrainingSession> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  const updateData: any = {}
  if (updates.date !== undefined) updateData.date = updates.date
  if (updates.status !== undefined) updateData.status = updates.status

  if (Object.keys(updateData).length === 0) {
    // Fetch session with isolation check
    if (isolationId) {
      const [session] = await sql`SELECT * FROM training_sessions WHERE id = ${id} AND tenant_id = ${tenantId} AND isolation_id = ${isolationId}`
      if (!session) {
        throw new Error('Session not found or isolation mismatch')
      }
      return rowToSession(session)
    } else {
      const [session] = await sql`SELECT * FROM training_sessions WHERE id = ${id} AND tenant_id = ${tenantId} AND (isolation_id IS NULL OR isolation_id = '')`
      if (!session) {
        throw new Error('Session not found')
      }
      return rowToSession(session)
    }
  }

  const setClauses: string[] = []
  const values: any[] = []
  let paramIndex = 1
  
  for (const [key, value] of Object.entries(updateData)) {
    setClauses.push(`${key} = $${paramIndex}`)
    values.push(value)
    paramIndex++
  }
  
  // Add isolation filter to WHERE clause
  if (isolationId) {
    values.push(tenantId, isolationId, id)
    const [updated] = await sql.unsafe(
      `UPDATE training_sessions SET ${setClauses.join(', ')} WHERE tenant_id = $${paramIndex} AND isolation_id = $${paramIndex + 1} AND id = $${paramIndex + 2} RETURNING *`,
      values
    )
    if (!updated) {
      throw new Error('Session not found or isolation mismatch')
    }
    const converted = rowToSession(updated)
    
    // Optimistic cache update
    if (tableCaches.sessions) {
      tableCaches.sessions = tableCaches.sessions.map(s => s.id === id ? converted : s)
    }
    if (cachedState) {
      cachedState.sessions = cachedState.sessions.map(s => s.id === id ? converted : s)
    }
    
    return converted
  } else {
    values.push(tenantId, id)
    const [updated] = await sql.unsafe(
      `UPDATE training_sessions SET ${setClauses.join(', ')} WHERE tenant_id = $${paramIndex} AND (isolation_id IS NULL OR isolation_id = '') AND id = $${paramIndex + 1} RETURNING *`,
      values
    )
    if (!updated) {
      throw new Error('Session not found')
    }
    const converted = rowToSession(updated)
    
    // Optimistic cache update
    if (tableCaches.sessions) {
      tableCaches.sessions = tableCaches.sessions.map(s => s.id === id ? converted : s)
    }
    if (cachedState) {
      cachedState.sessions = cachedState.sessions.map(s => s.id === id ? converted : s)
    }
    
    return converted
  }
}

/**
 * Deletes a training session from Postgres.
 */
export const deleteSession = async (id: string): Promise<void> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  if (isolationId) {
    // Demo tenant: verify isolation_id matches before deletion
    const result = await sql`DELETE FROM training_sessions WHERE id = ${id} AND tenant_id = ${tenantId} AND isolation_id = ${isolationId} RETURNING id`
    if (result.length === 0) {
      throw new Error('Session not found or isolation mismatch')
    }
  } else {
    // Production tenants: only delete sessions with NULL isolation_id
    await sql`DELETE FROM training_sessions WHERE id = ${id} AND tenant_id = ${tenantId} AND (isolation_id IS NULL OR isolation_id = '')`
  }
  
  // Optimistic cache update
  if (tableCaches.sessions) {
    tableCaches.sessions = tableCaches.sessions.filter(s => s.id !== id)
  }
  if (cachedState) {
    cachedState.sessions = cachedState.sessions.filter(s => s.id !== id)
  }
}

/**
 * Gets all check-ins from Postgres (uses cache if available).
 */
export const getCheckIns = async (): Promise<CheckIn[]> => {
  // Check cache first
  if (tableCaches.checkIns) {
    return tableCaches.checkIns
  }

  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  let checkIns
  if (isolationId) {
    // Demo tenant: filter by isolation_id from training_sessions
    checkIns = await sql`
      SELECT ci.* FROM check_ins ci
      INNER JOIN training_sessions ts ON ci.session_id = ts.id
      WHERE ci.tenant_id = ${tenantId} 
        AND ts.isolation_id = ${isolationId}
      ORDER BY ci.created_at
    `
  } else {
    // Production tenants: filter by NULL isolation_id
    checkIns = await sql`
      SELECT ci.* FROM check_ins ci
      INNER JOIN training_sessions ts ON ci.session_id = ts.id
      WHERE ci.tenant_id = ${tenantId} 
        AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
      ORDER BY ci.created_at
    `
  }
  
  const converted = checkIns.map(rowToCheckIn)
  
  // Update cache
  tableCaches.checkIns = converted
  if (cachedState) {
    cachedState.checkIns = converted
  }
  
  return converted
}

/**
 * Creates a check-in in Postgres.
 * Uses INSERT ... ON CONFLICT DO NOTHING to handle race conditions gracefully.
 */
export const createCheckIn = async (checkIn: Omit<CheckIn, 'id' | 'createdAt'>): Promise<CheckIn> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  // Get session to verify isolation_id matches (for demo tenant)
  if (isolationId) {
    const [session] = await sql`
      SELECT isolation_id FROM training_sessions 
      WHERE id = ${checkIn.sessionId} AND tenant_id = ${tenantId}
    `
    
    if (!session) {
      throw new Error('Session not found')
    }
    
    // Verify isolation_id matches (for demo tenant)
    if (session.isolation_id !== isolationId) {
      throw new Error('Session isolation mismatch')
    }
  }
  
  // Try to insert, but if it already exists (duplicate key), return the existing one
  // Uses the unique constraint on (session_id, player_id, tenant_id)
  const result = await sql`
    INSERT INTO check_ins (session_id, player_id, max_rounds, notes, tenant_id, isolation_id)
    VALUES (${checkIn.sessionId}, ${checkIn.playerId}, ${checkIn.maxRounds ?? null}, ${checkIn.notes ?? null}, ${tenantId}, ${isolationId})
    ON CONFLICT ON CONSTRAINT check_ins_session_id_player_id_tenant_id_key DO NOTHING
    RETURNING *
  `
  
  // If no row was inserted (conflict), fetch the existing one
  if (result.length === 0) {
    const existing = await sql`
      SELECT * FROM check_ins 
      WHERE session_id = ${checkIn.sessionId} 
        AND player_id = ${checkIn.playerId} 
        AND tenant_id = ${tenantId}
      LIMIT 1
    `
    if (existing.length === 0) {
      throw new Error('Failed to create or find check-in')
    }
    const converted = rowToCheckIn(existing[0])
    
    // Update cache with existing check-in
    if (tableCaches.checkIns) {
      const existsInCache = tableCaches.checkIns.some(c => c.id === converted.id)
      if (!existsInCache) {
        tableCaches.checkIns = [...tableCaches.checkIns, converted]
      }
    }
    if (cachedState) {
      const existsInCache = cachedState.checkIns.some(c => c.id === converted.id)
      if (!existsInCache) {
        cachedState.checkIns = [...cachedState.checkIns, converted]
      }
    }
    
    return converted
  }
  
  const converted = rowToCheckIn(result[0])
  
  // Optimistic cache update
  if (tableCaches.checkIns) {
    const existsInCache = tableCaches.checkIns.some(c => c.id === converted.id)
    if (!existsInCache) {
      tableCaches.checkIns = [...tableCaches.checkIns, converted]
    }
  }
  if (cachedState) {
    const existsInCache = cachedState.checkIns.some(c => c.id === converted.id)
    if (!existsInCache) {
      cachedState.checkIns = [...cachedState.checkIns, converted]
    }
  }
  
  return converted
}

/**
 * Updates a check-in in Postgres.
 */
export const updateCheckIn = async (id: string, updates: Partial<Pick<CheckIn, 'maxRounds' | 'notes'>>): Promise<CheckIn> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  const updateData: any = {}
  if (updates.maxRounds !== undefined) updateData.max_rounds = updates.maxRounds
  if (updates.notes !== undefined) updateData.notes = updates.notes

  if (Object.keys(updateData).length === 0) {
    // No updates, just fetch and return
    const [checkIn] = await sql`
      SELECT * FROM check_ins 
      WHERE id = ${id} AND tenant_id = ${tenantId}
      LIMIT 1
    `
    if (!checkIn) {
      throw new Error('Check-in not found')
    }
    return rowToCheckIn(checkIn)
  }

  // Build UPDATE query with isolation check
  const setClauses: string[] = []
  const values: any[] = []
  let paramIndex = 1
  
  for (const [key, value] of Object.entries(updateData)) {
    setClauses.push(`${key} = $${paramIndex}`)
    values.push(value)
    paramIndex++
  }
  
  if (isolationId) {
    // Demo tenant: verify isolation_id matches
    values.push(tenantId, isolationId, id)
    const [updated] = await sql.unsafe(
      `UPDATE check_ins SET ${setClauses.join(', ')} WHERE tenant_id = $${paramIndex} AND isolation_id = $${paramIndex + 1} AND id = $${paramIndex + 2} RETURNING *`,
      values
    )
    if (!updated) {
      throw new Error('Check-in not found or isolation mismatch')
    }
    const converted = rowToCheckIn(updated)
    
    // Update cache
    if (tableCaches.checkIns) {
      tableCaches.checkIns = tableCaches.checkIns.map(c => c.id === id ? converted : c)
    }
    if (cachedState) {
      cachedState.checkIns = cachedState.checkIns.map(c => c.id === id ? converted : c)
    }
    
    return converted
  } else {
    // Production tenants: only update check-ins with NULL isolation_id
    values.push(tenantId, id)
    const [updated] = await sql.unsafe(
      `UPDATE check_ins SET ${setClauses.join(', ')} WHERE tenant_id = $${paramIndex} AND (isolation_id IS NULL OR isolation_id = '') AND id = $${paramIndex + 1} RETURNING *`,
      values
    )
    if (!updated) {
      throw new Error('Check-in not found')
    }
    const converted = rowToCheckIn(updated)
    
    // Update cache
    if (tableCaches.checkIns) {
      tableCaches.checkIns = tableCaches.checkIns.map(c => c.id === id ? converted : c)
    }
    if (cachedState) {
      cachedState.checkIns = cachedState.checkIns.map(c => c.id === id ? converted : c)
    }
    
    return converted
  }
}

/**
 * Deletes a check-in from Postgres.
 */
export const deleteCheckIn = async (id: string): Promise<void> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  if (isolationId) {
    // Demo tenant: verify isolation_id matches before deletion
    const result = await sql`DELETE FROM check_ins WHERE id = ${id} AND tenant_id = ${tenantId} AND isolation_id = ${isolationId} RETURNING id`
    if (result.length === 0) {
      throw new Error('Check-in not found or isolation mismatch')
    }
  } else {
    // Production tenants: only delete check-ins with NULL isolation_id
    await sql`DELETE FROM check_ins WHERE id = ${id} AND tenant_id = ${tenantId} AND (isolation_id IS NULL OR isolation_id = '')`
  }
  
  // Invalidate cache to ensure fresh data on next check
  // This prevents race conditions when checking in immediately after checkout
  invalidateCache('checkIns')
}

/**
 * Gets all courts from Postgres (uses cache if available).
 */
export const getCourts = async (): Promise<Court[]> => {
  // Check cache first
  if (tableCaches.courts) {
    return tableCaches.courts
  }

  const sql = getPostgres()
  const tenantId = getTenantId()
  const courts = await sql`SELECT * FROM courts WHERE tenant_id = ${tenantId} ORDER BY idx`
  const converted = courts.map(rowToCourt)
  
  // Update cache
  tableCaches.courts = converted
  if (cachedState) {
    cachedState.courts = converted
  }
  
  return converted
}

/**
 * Creates a court in Postgres.
 */
export const createCourt = async (court: Omit<Court, 'id'>): Promise<Court> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  const [created] = await sql`
    INSERT INTO courts (idx, tenant_id)
    VALUES (${court.idx}, ${tenantId})
    RETURNING *
  `
  const converted = rowToCourt(created)
  
  // Optimistic cache update
  if (tableCaches.courts) {
    tableCaches.courts = [...tableCaches.courts, converted]
  }
  if (cachedState) {
    cachedState.courts = [...cachedState.courts, converted]
  }
  
  return converted
}

/**
 * Deletes a court from Postgres.
 */
export const deleteCourt = async (id: string): Promise<void> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  await sql`DELETE FROM courts WHERE id = ${id} AND tenant_id = ${tenantId}`
  
  // Optimistic cache update
  if (tableCaches.courts) {
    tableCaches.courts = tableCaches.courts.filter(c => c.id !== id)
  }
  if (cachedState) {
    cachedState.courts = cachedState.courts.filter(c => c.id !== id)
  }
}

/**
 * Gets all matches from Postgres (uses cache if available).
 */
export const getMatches = async (): Promise<Match[]> => {
  // Check cache first - but don't use empty arrays as they might be stale
  // Only use cache if it has actual data (length > 0)
  if (tableCaches.matches && tableCaches.matches.length > 0) {
    return tableCaches.matches
  }
  
  // If cache exists but is empty, clear it and query fresh
  if (tableCaches.matches && tableCaches.matches.length === 0) {
    tableCaches.matches = null
  }

  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  let matches
  try {
    if (isolationId) {
      // Demo tenant: include both current isolation_id AND NULL isolation_id (seeded data)
      matches = await sql`
        SELECT m.* FROM matches m
        INNER JOIN training_sessions ts ON m.session_id = ts.id
        WHERE m.tenant_id = ${tenantId} 
          AND (ts.isolation_id = ${isolationId} OR ts.isolation_id IS NULL)
        ORDER BY m.started_at
      `
    } else {
      // Production tenants: filter by NULL isolation_id
      matches = await sql`
        SELECT m.* FROM matches m
        INNER JOIN training_sessions ts ON m.session_id = ts.id
        WHERE m.tenant_id = ${tenantId} 
          AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
        ORDER BY m.started_at
      `
    }
  } catch (error) {
    logger.error('[getMatches] Query failed', {
      error,
      tenantId,
      isolationId
    })
    throw error
  }
  
  const converted = matches.map(rowToMatch)
  
  logger.debug('[getMatches] Query completed', {
    tenantId,
    isolationId,
    rawCount: matches.length,
    convertedCount: converted.length
  })
  
  // Only cache if we got results - don't cache empty arrays as they might be stale
  if (converted.length > 0) {
    tableCaches.matches = converted
    if (cachedState) {
      cachedState.matches = converted
    }
  } else {
    // Don't cache empty arrays - leave cache as null so next call will retry
    tableCaches.matches = null
  }
  
  return converted
}

/**
 * Creates a match in Postgres.
 */
export const createMatch = async (match: Omit<Match, 'id'>): Promise<Match> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  
  // Get session to get isolation_id
  const [session] = await sql`
    SELECT isolation_id FROM training_sessions 
    WHERE id = ${match.sessionId} AND tenant_id = ${tenantId}
  `
  
  if (!session) {
    throw new Error('Session not found')
  }
  
  // Use session's isolation_id (null for production)
  const matchIsolationId = session.isolation_id
  
  const [created] = await sql`
    INSERT INTO matches (session_id, court_id, started_at, ended_at, round, tenant_id, isolation_id)
    VALUES (
      ${match.sessionId},
      ${match.courtId},
      ${match.startedAt},
      ${match.endedAt ?? null},
      ${match.round ?? null},
      ${tenantId},
      ${matchIsolationId}
    )
    RETURNING *
  `
  const converted = rowToMatch(created)
  
  // Optimistic cache update
  if (tableCaches.matches) {
    tableCaches.matches = [...tableCaches.matches, converted]
  }
  if (cachedState) {
    cachedState.matches = [...cachedState.matches, converted]
  }
  
  return converted
}

/**
 * Updates a match in Postgres.
 */
export const updateMatch = async (id: string, updates: Partial<Omit<Match, 'id'>>): Promise<Match> => {
  const sql = getPostgres()
  
  const updateData: any = {}
  if (updates.sessionId !== undefined) updateData.session_id = updates.sessionId
  if (updates.courtId !== undefined) updateData.court_id = updates.courtId
  if (updates.startedAt !== undefined) updateData.started_at = updates.startedAt
  if (updates.endedAt !== undefined) updateData.ended_at = updates.endedAt
  if (updates.round !== undefined) updateData.round = updates.round

  const tenantId = getTenantId()

  if (Object.keys(updateData).length === 0) {
    const [match] = await sql`SELECT * FROM matches WHERE id = ${id} AND tenant_id = ${tenantId}`
    return rowToMatch(match)
  }

  const setClauses: string[] = []
  const values: any[] = []
  let paramIndex = 1
  
  for (const [key, value] of Object.entries(updateData)) {
    setClauses.push(`${key} = $${paramIndex}`)
    values.push(value)
    paramIndex++
  }
  
  values.push(tenantId, id)
  
  const [updated] = await sql.unsafe(
    `UPDATE matches SET ${setClauses.join(', ')} WHERE tenant_id = $${paramIndex} AND id = $${paramIndex + 1} RETURNING *`,
    values
  )

  const converted = rowToMatch(updated)
  
  // Optimistic cache update
  if (tableCaches.matches) {
    tableCaches.matches = tableCaches.matches.map(m => m.id === id ? converted : m)
  }
  if (cachedState) {
    cachedState.matches = cachedState.matches.map(m => m.id === id ? converted : m)
  }

  return converted
}

/**
 * Deletes a match from Postgres.
 */
export const deleteMatch = async (id: string): Promise<void> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  await sql`DELETE FROM matches WHERE id = ${id} AND tenant_id = ${tenantId}`
  
  // Optimistic cache update
  if (tableCaches.matches) {
    tableCaches.matches = tableCaches.matches.filter(m => m.id !== id)
  }
  if (cachedState) {
    cachedState.matches = cachedState.matches.filter(m => m.id !== id)
  }
}

/**
 * Gets all match players from Postgres (uses cache if available).
 */
export const getMatchPlayers = async (): Promise<MatchPlayer[]> => {
  // Check cache first - but don't use empty arrays as they might be stale
  // Only use cache if it has actual data (length > 0)
  if (tableCaches.matchPlayers && tableCaches.matchPlayers.length > 0) {
    return tableCaches.matchPlayers
  }
  
  // If cache exists but is empty, clear it and query fresh
  if (tableCaches.matchPlayers && tableCaches.matchPlayers.length === 0) {
    tableCaches.matchPlayers = null
  }

  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  let matchPlayers
  try {
    if (isolationId) {
      // Demo tenant: include both current isolation_id AND NULL isolation_id (seeded data)
      matchPlayers = await sql`
        SELECT mp.* FROM match_players mp
        INNER JOIN matches m ON mp.match_id = m.id
        INNER JOIN training_sessions ts ON m.session_id = ts.id
        WHERE mp.tenant_id = ${tenantId} 
          AND (ts.isolation_id = ${isolationId} OR ts.isolation_id IS NULL)
      `
    } else {
      // Production tenants: filter by NULL isolation_id
      matchPlayers = await sql`
        SELECT mp.* FROM match_players mp
        INNER JOIN matches m ON mp.match_id = m.id
        INNER JOIN training_sessions ts ON m.session_id = ts.id
        WHERE mp.tenant_id = ${tenantId} 
          AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
      `
    }
  } catch (error) {
    logger.error('[getMatchPlayers] Query failed', {
      error,
      tenantId,
      isolationId
    })
    throw error
  }
  
  const converted = matchPlayers.map(rowToMatchPlayer)
  
  logger.debug('[getMatchPlayers] Query completed', {
    tenantId,
    isolationId,
    rawCount: matchPlayers.length,
    convertedCount: converted.length
  })
  
  // Only cache if we got results - don't cache empty arrays as they might be stale
  if (converted.length > 0) {
    tableCaches.matchPlayers = converted
    if (cachedState) {
      cachedState.matchPlayers = converted
    }
  } else {
    // Don't cache empty arrays - leave cache as null so next call will retry
    tableCaches.matchPlayers = null
  }
  
  return converted
}

/**
 * Creates a match player in Postgres.
 */
export const createMatchPlayer = async (matchPlayer: Omit<MatchPlayer, 'id'>): Promise<MatchPlayer> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  
  // Get match to get isolation_id from session
  const [match] = await sql`
    SELECT m.isolation_id, ts.isolation_id as session_isolation_id
    FROM matches m
    INNER JOIN training_sessions ts ON m.session_id = ts.id
    WHERE m.id = ${matchPlayer.matchId} AND m.tenant_id = ${tenantId}
  `
  
  if (!match) {
    throw new Error('Match not found')
  }
  
  // Use session's isolation_id (null for production)
  const isolationId = match.session_isolation_id
  
  const [created] = await sql`
    INSERT INTO match_players (match_id, player_id, slot, tenant_id, isolation_id)
    VALUES (
      ${matchPlayer.matchId},
      ${matchPlayer.playerId},
      ${matchPlayer.slot},
      ${tenantId},
      ${isolationId}
    )
    RETURNING *
  `
  const converted = rowToMatchPlayer(created)
  
  // Optimistic cache update
  if (tableCaches.matchPlayers) {
    tableCaches.matchPlayers = [...tableCaches.matchPlayers, converted]
  }
  if (cachedState) {
    cachedState.matchPlayers = [...cachedState.matchPlayers, converted]
  }
  
  return converted
}

/**
 * Updates a match player in Postgres.
 */
export const updateMatchPlayer = async (id: string, updates: Partial<Omit<MatchPlayer, 'id'>>): Promise<MatchPlayer> => {
  const sql = getPostgres()
  
  const updateData: any = {}
  if (updates.matchId !== undefined) updateData.match_id = updates.matchId
  if (updates.playerId !== undefined) updateData.player_id = updates.playerId
  if (updates.slot !== undefined) updateData.slot = updates.slot

  const tenantId = getTenantId()

  if (Object.keys(updateData).length === 0) {
    const [matchPlayer] = await sql`SELECT * FROM match_players WHERE id = ${id} AND tenant_id = ${tenantId}`
    return rowToMatchPlayer(matchPlayer)
  }

  const setClauses: string[] = []
  const values: any[] = []
  let paramIndex = 1
  
  for (const [key, value] of Object.entries(updateData)) {
    setClauses.push(`${key} = $${paramIndex}`)
    values.push(value)
    paramIndex++
  }
  
  values.push(tenantId, id)
  
  const [updated] = await sql.unsafe(
    `UPDATE match_players SET ${setClauses.join(', ')} WHERE tenant_id = $${paramIndex} AND id = $${paramIndex + 1} RETURNING *`,
    values
  )

  const converted = rowToMatchPlayer(updated)
  
  // Optimistic cache update
  if (tableCaches.matchPlayers) {
    tableCaches.matchPlayers = tableCaches.matchPlayers.map(mp => mp.id === id ? converted : mp)
  }
  if (cachedState) {
    cachedState.matchPlayers = cachedState.matchPlayers.map(mp => mp.id === id ? converted : mp)
  }

  return converted
}

/**
 * Deletes a match player from Postgres.
 */
export const deleteMatchPlayer = async (id: string): Promise<void> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  await sql`DELETE FROM match_players WHERE id = ${id} AND tenant_id = ${tenantId}`
  
  // Optimistic cache update
  if (tableCaches.matchPlayers) {
    tableCaches.matchPlayers = tableCaches.matchPlayers.filter(mp => mp.id !== id)
  }
  if (cachedState) {
    cachedState.matchPlayers = cachedState.matchPlayers.filter(mp => mp.id !== id)
  }
}

/**
 * Gets all statistics snapshots from Postgres (uses cache if available).
 */
export const getStatisticsSnapshots = async (): Promise<StatisticsSnapshot[]> => {
  // Check cache first - but don't use empty arrays as they might be stale
  // Only use cache if it has actual data (length > 0)
  if (tableCaches.statistics && tableCaches.statistics.length > 0) {
    return tableCaches.statistics
  }
  
  // If cache exists but is empty, clear it and query fresh
  if (tableCaches.statistics && tableCaches.statistics.length === 0) {
    tableCaches.statistics = null
  }

  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  // Filter by isolation_id to match loadState behavior
  // For demo tenant: also include sessions with NULL isolation_id (seeded data)
  // This allows seeded data to be visible alongside user-created data
  let snapshots
  try {
  if (isolationId) {
    // Demo tenant: include both current isolation_id AND NULL isolation_id (seeded data)
    snapshots = await sql`
      SELECT ss.* FROM statistics_snapshots ss
      INNER JOIN training_sessions ts ON ss.session_id = ts.id
      WHERE ss.tenant_id = ${tenantId} 
        AND (ts.isolation_id = ${isolationId} OR ts.isolation_id IS NULL)
      ORDER BY ss.session_date DESC
    `
  } else {
    // Production tenants: only NULL isolation_id
    snapshots = await sql`
      SELECT ss.* FROM statistics_snapshots ss
      INNER JOIN training_sessions ts ON ss.session_id = ts.id
      WHERE ss.tenant_id = ${tenantId} AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
      ORDER BY ss.session_date DESC
    `
    }
  } catch (error) {
    logger.error('[getStatisticsSnapshots] Query failed', {
      error,
      tenantId,
      isolationId
    })
    throw error
  }
  
  const converted = snapshots.map(rowToStatisticsSnapshot)
  
  // Only cache if we got results - don't cache empty arrays as they might be stale
  // This prevents race conditions where an empty cache from a failed query
  // prevents subsequent successful queries
  if (converted.length > 0) {
  tableCaches.statistics = converted
  if (cachedState) {
    cachedState.statistics = converted
    }
  } else {
    // Don't cache empty arrays - leave cache as null so next call will retry
    tableCaches.statistics = null
  }
  
  return converted
}

/**
 * Creates a statistics snapshot in Postgres.
 */
export const createStatisticsSnapshot = async (snapshot: Omit<StatisticsSnapshot, 'id' | 'createdAt'>): Promise<StatisticsSnapshot> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  // Use raw SQL with ::jsonb cast to ensure arrays are stored as JSONB, not text
  const [created] = await sql.unsafe(
    `INSERT INTO statistics_snapshots (session_id, session_date, season, matches, match_players, check_ins, tenant_id)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)
     RETURNING *`,
    [
      snapshot.sessionId,
      snapshot.sessionDate,
      snapshot.season,
      JSON.stringify(snapshot.matches),
      JSON.stringify(snapshot.matchPlayers),
      JSON.stringify(snapshot.checkIns),
      tenantId
    ]
  )
  const converted = rowToStatisticsSnapshot(created)
  
  // Optimistic cache update
  if (tableCaches.statistics) {
    tableCaches.statistics = [converted, ...tableCaches.statistics]
  }
  if (cachedState) {
    cachedState.statistics = [converted, ...(cachedState.statistics || [])]
  }
  
  return converted
}

/**
 * Deletes a statistics snapshot from Postgres.
 */
export const deleteStatisticsSnapshot = async (id: string): Promise<void> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  await sql`DELETE FROM statistics_snapshots WHERE id = ${id} AND tenant_id = ${tenantId}`
  
  // Optimistic cache update
  if (tableCaches.statistics) {
    tableCaches.statistics = tableCaches.statistics.filter(s => s.id !== id)
  }
  if (cachedState && cachedState.statistics) {
    cachedState.statistics = cachedState.statistics.filter(s => s.id !== id)
  }
}

/**
 * Gets all match results from Postgres (uses cache if available).
 */
export const getMatchResults = async (): Promise<MatchResult[]> => {
  // Check cache first - but don't use empty arrays as they might be stale
  // Only use cache if it has actual data (length > 0)
  if (tableCaches.matchResults && tableCaches.matchResults.length > 0) {
    return tableCaches.matchResults
  }
  
  // If cache exists but is empty, clear it and query fresh
  if (tableCaches.matchResults && tableCaches.matchResults.length === 0) {
    tableCaches.matchResults = null
  }

  const sql = getPostgres()
  const tenantId = getTenantId()
  const isolationId = await getIsolationIdForCurrentTenant()
  
  let matchResults
  try {
    if (isolationId) {
      // Demo tenant: include both current isolation_id AND NULL isolation_id (seeded data)
      matchResults = await sql`
        SELECT mr.* FROM match_results mr
        INNER JOIN matches m ON mr.match_id = m.id
        INNER JOIN training_sessions ts ON m.session_id = ts.id
        WHERE mr.tenant_id = ${tenantId} 
          AND (ts.isolation_id = ${isolationId} OR ts.isolation_id IS NULL)
      `
    } else {
      // Production tenants: filter by NULL isolation_id
      matchResults = await sql`
        SELECT mr.* FROM match_results mr
        INNER JOIN matches m ON mr.match_id = m.id
        INNER JOIN training_sessions ts ON m.session_id = ts.id
        WHERE mr.tenant_id = ${tenantId} 
          AND (ts.isolation_id IS NULL OR ts.isolation_id = '')
      `
    }
  } catch (error) {
    logger.error('[getMatchResults] Query failed', {
      error,
      tenantId,
      isolationId
    })
    throw error
  }
  
  const converted = matchResults.map(rowToMatchResult)
  
  logger.debug('[getMatchResults] Query completed', {
    tenantId,
    isolationId,
    rawCount: matchResults.length,
    convertedCount: converted.length,
    sampleMatchIds: converted.slice(0, 5).map(mr => mr.matchId)
  })
  
  // Only cache if we got results - don't cache empty arrays as they might be stale
  // This prevents race conditions where an empty cache from a failed query
  // prevents subsequent successful queries
  if (converted.length > 0) {
    tableCaches.matchResults = converted
  } else {
    // Don't cache empty arrays - leave cache as null so next call will retry
    tableCaches.matchResults = null
  }
  
  return converted
}

/**
 * Gets a match result by match ID from Postgres.
 */
export const getMatchResult = async (matchId: string): Promise<MatchResult | null> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  
  const [result] = await sql`
    SELECT mr.* FROM match_results mr
    INNER JOIN matches m ON mr.match_id = m.id
    WHERE mr.match_id = ${matchId} AND mr.tenant_id = ${tenantId}
    LIMIT 1
  `
  
  if (!result) {
    return null
  }
  
  return rowToMatchResult(result)
}

/**
 * Gets match results by session ID from Postgres.
 */
export const getMatchResultsBySession = async (sessionId: string): Promise<MatchResult[]> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  
  const results = await sql`
    SELECT mr.* FROM match_results mr
    INNER JOIN matches m ON mr.match_id = m.id
    WHERE m.session_id = ${sessionId} AND mr.tenant_id = ${tenantId}
  `
  
  return results.map(rowToMatchResult)
}

/**
 * Creates a match result in Postgres.
 * 
 * If a match result already exists for the match, it will be updated.
 * 
 * @param matchId - Match ID to create result for
 * @param scoreData - Sport-specific score data
 * @param sport - Sport type ('badminton', 'tennis', 'padel')
 * @param winnerTeam - Winning team ('team1' or 'team2')
 * @returns Created or updated match result
 * @throws Error if match not found or database operation fails
 */
export const createMatchResult = async (
  matchId: string,
  scoreData: BadmintonScoreData | Record<string, unknown>,
  sport: 'badminton' | 'tennis' | 'padel',
  winnerTeam: 'team1' | 'team2'
): Promise<MatchResult> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  
  // Get match to verify it exists and get isolation_id
  const [match] = await sql`
    SELECT m.*, ts.isolation_id FROM matches m
    INNER JOIN training_sessions ts ON m.session_id = ts.id
    WHERE m.id = ${matchId} AND m.tenant_id = ${tenantId}
  `
  
  if (!match) {
    throw new Error('Match not found')
  }
  
  const [created] = await sql`
    INSERT INTO match_results (match_id, sport, score_data, winner_team, tenant_id)
    VALUES (
      ${matchId},
      ${sport},
      ${JSON.stringify(scoreData)},
      ${winnerTeam},
      ${tenantId}
    )
    ON CONFLICT (match_id, tenant_id) DO UPDATE SET
      sport = EXCLUDED.sport,
      score_data = EXCLUDED.score_data,
      winner_team = EXCLUDED.winner_team,
      updated_at = NOW()
    RETURNING *
  `
  
  const converted = rowToMatchResult(created)
  
  // Optimistic cache update
  if (tableCaches.matchResults) {
    const existingIndex = tableCaches.matchResults.findIndex(mr => mr.id === converted.id)
    if (existingIndex >= 0) {
      tableCaches.matchResults[existingIndex] = converted
    } else {
      tableCaches.matchResults = [...tableCaches.matchResults, converted]
    }
  }
  
  return converted
}

/**
 * Updates a match result in Postgres.
 * 
 * @param id - Match result ID to update
 * @param updates - Partial match result data to update (scoreData and/or winnerTeam)
 * @returns Updated match result
 * @throws Error if match result not found or database operation fails
 */
export const updateMatchResult = async (
  id: string,
  updates: Partial<Pick<MatchResult, 'scoreData' | 'winnerTeam'>>
): Promise<MatchResult> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  
  const updateData: any = {}
  if (updates.scoreData !== undefined) updateData.score_data = JSON.stringify(updates.scoreData)
  if (updates.winnerTeam !== undefined) updateData.winner_team = updates.winnerTeam
  
  if (Object.keys(updateData).length === 0) {
    const [result] = await sql`SELECT * FROM match_results WHERE id = ${id} AND tenant_id = ${tenantId}`
    if (!result) {
      throw new Error('Match result not found')
    }
    return rowToMatchResult(result)
  }
  
  const setClauses: string[] = []
  const values: any[] = []
  let paramIndex = 1
  
  for (const [key, value] of Object.entries(updateData)) {
    setClauses.push(`${key} = $${paramIndex}`)
    values.push(value)
    paramIndex++
  }
  
  // Always update updated_at
  setClauses.push(`updated_at = NOW()`)
  
  values.push(tenantId, id)
  
  const [updated] = await sql.unsafe(
    `UPDATE match_results SET ${setClauses.join(', ')} WHERE tenant_id = $${paramIndex} AND id = $${paramIndex + 1} RETURNING *`,
    values
  )
  
  if (!updated) {
    throw new Error('Match result not found')
  }
  
  const converted = rowToMatchResult(updated)
  
  // Optimistic cache update
  if (tableCaches.matchResults) {
    tableCaches.matchResults = tableCaches.matchResults.map(mr => mr.id === id ? converted : mr)
  }
  
  return converted
}

/**
 * Deletes a match result from Postgres.
 * 
 * @param id - Match result ID to delete
 * @throws Error if database operation fails
 */
export const deleteMatchResult = async (id: string): Promise<void> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  await sql`DELETE FROM match_results WHERE id = ${id} AND tenant_id = ${tenantId}`
  
  // Optimistic cache update
  if (tableCaches.matchResults) {
    tableCaches.matchResults = tableCaches.matchResults.filter(mr => mr.id !== id)
  }
}

/**
 * Creates a backup of the current database state to localStorage.
 * @remarks Saves current state to localStorage for rollback purposes.
 */
export const createBackup = async (): Promise<void> => {
  const state = await loadState()
  const storage = typeof window !== 'undefined' ? window.localStorage : null
  if (storage) {
    try {
      storage.setItem('herlev-hjorten-db-backup', JSON.stringify(state))
      logger.info('✅ Database backup created successfully.')
    } catch (error) {
      logger.error('❌ Failed to create database backup', error)
    }
  }
}

/**
 * Restores database state from a localStorage backup.
 * @returns Restored database state or null if no backup
 */
export const restoreFromBackup = async (): Promise<DatabaseState | null> => {
  const storage = typeof window !== 'undefined' ? window.localStorage : null
  if (storage) {
    try {
      const backup = storage.getItem('herlev-hjorten-db-backup')
      if (backup) {
        const state: DatabaseState = JSON.parse(backup)
        logger.info('✅ Database state restored from backup.')
        // Clear current data and insert backup data
        await clearAllData()
        await insertBackupData(state)
        invalidateCache()
        return state
      }
    } catch (error) {
      logger.error('❌ Failed to restore database backup', error)
    }
  }
  return null
}

/**
 * Checks if a database backup exists in localStorage.
 * @returns True if backup exists, false otherwise
 */
export const hasBackup = (): boolean => {
  const storage = typeof window !== 'undefined' ? window.localStorage : null
  if (storage) {
    return storage.getItem('herlev-hjorten-db-backup') !== null
  }
  return false
}

/**
 * Clears all data from the database for the current tenant.
 */
export const clearAllData = async (): Promise<void> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  logger.info(`Clearing all data for tenant: ${tenantId}`)
  await sql`DELETE FROM statistics_snapshots WHERE tenant_id = ${tenantId}`
  await sql`DELETE FROM match_players WHERE tenant_id = ${tenantId}`
  await sql`DELETE FROM matches WHERE tenant_id = ${tenantId}`
  await sql`DELETE FROM check_ins WHERE tenant_id = ${tenantId}`
  await sql`DELETE FROM training_sessions WHERE tenant_id = ${tenantId}`
  await sql`DELETE FROM players WHERE tenant_id = ${tenantId}`
  await sql`DELETE FROM courts WHERE tenant_id = ${tenantId}` // Courts are tenant-specific now
  invalidateCache()
  logger.info(`✅ All data cleared for tenant: ${tenantId}`)
}

/**
 * Inserts backup data into the database for the current tenant.
 * @param state - Database state to insert
 */
export const insertBackupData = async (state: DatabaseState): Promise<void> => {
  const sql = getPostgres()
  const tenantId = getTenantId()
  logger.info(`Inserting backup data for tenant: ${tenantId}`)

  // Insert courts first (they are referenced by matches)
  for (const court of state.courts) {
    await sql`
      INSERT INTO courts (id, idx, tenant_id)
      VALUES (${court.id}, ${court.idx}, ${tenantId})
      ON CONFLICT (id) DO UPDATE SET idx = EXCLUDED.idx, tenant_id = EXCLUDED.tenant_id
    `
  }

  // Insert players
  for (const player of state.players) {
    await sql`
      INSERT INTO players (
        id, name, alias, level_single, level_double, level_mix, gender, 
        primary_category, training_group, active, 
        preferred_doubles_partners, preferred_mixed_partners, created_at, tenant_id
      )
      VALUES (
        ${player.id}, ${player.name}, ${player.alias ?? null}, 
        ${player.levelSingle ?? player.level ?? null}, ${player.levelDouble ?? null}, ${player.levelMix ?? null}, 
        ${player.gender ?? null}, ${player.primaryCategory ?? null}, ${player.active ?? true}, 
        ${player.preferredDoublesPartners ?? []}, ${player.preferredMixedPartners ?? []}, 
        ${player.createdAt}, ${tenantId}
      )
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name, alias = EXCLUDED.alias, 
        level_single = EXCLUDED.level_single, level_double = EXCLUDED.level_double, level_mix = EXCLUDED.level_mix,
        gender = EXCLUDED.gender, primary_category = EXCLUDED.primary_category, 
        training_group = EXCLUDED.training_group, active = EXCLUDED.active,
        preferred_doubles_partners = EXCLUDED.preferred_doubles_partners, 
        preferred_mixed_partners = EXCLUDED.preferred_mixed_partners,
        tenant_id = EXCLUDED.tenant_id
    `
  }

  // Insert sessions
  for (const session of state.sessions) {
    await sql`
      INSERT INTO training_sessions (id, date, status, created_at, tenant_id)
      VALUES (${session.id}, ${session.date}, ${session.status}, ${session.createdAt}, ${tenantId})
      ON CONFLICT (id) DO UPDATE SET 
        date = EXCLUDED.date, status = EXCLUDED.status, tenant_id = EXCLUDED.tenant_id
    `
  }

  // Insert check-ins
  for (const checkIn of state.checkIns) {
    await sql`
      INSERT INTO check_ins (id, session_id, player_id, max_rounds, created_at, tenant_id)
      VALUES (${checkIn.id}, ${checkIn.sessionId}, ${checkIn.playerId}, ${checkIn.maxRounds ?? null}, ${checkIn.createdAt}, ${tenantId})
      ON CONFLICT (id) DO UPDATE SET 
        session_id = EXCLUDED.session_id, player_id = EXCLUDED.player_id, 
        max_rounds = EXCLUDED.max_rounds, tenant_id = EXCLUDED.tenant_id
    `
  }

  // Insert matches
  for (const match of state.matches) {
    await sql`
      INSERT INTO matches (id, session_id, court_id, started_at, ended_at, round, tenant_id)
      VALUES (
        ${match.id}, ${match.sessionId}, ${match.courtId}, 
        ${match.startedAt}, ${match.endedAt ?? null}, ${match.round ?? null}, ${tenantId}
      )
      ON CONFLICT (id) DO UPDATE SET 
        session_id = EXCLUDED.session_id, court_id = EXCLUDED.court_id, 
        started_at = EXCLUDED.started_at, ended_at = EXCLUDED.ended_at, 
        round = EXCLUDED.round, tenant_id = EXCLUDED.tenant_id
    `
  }

  // Insert match players
  for (const matchPlayer of state.matchPlayers) {
    await sql`
      INSERT INTO match_players (id, match_id, player_id, slot, tenant_id)
      VALUES (${matchPlayer.id}, ${matchPlayer.matchId}, ${matchPlayer.playerId}, ${matchPlayer.slot}, ${tenantId})
      ON CONFLICT (id) DO UPDATE SET 
        match_id = EXCLUDED.match_id, player_id = EXCLUDED.player_id, 
        slot = EXCLUDED.slot, tenant_id = EXCLUDED.tenant_id
    `
  }

  // Insert statistics snapshots
  for (const snapshot of state.statistics || []) {
    await sql`
      INSERT INTO statistics_snapshots (id, session_id, session_date, season, matches, match_players, check_ins, created_at, tenant_id)
      VALUES (
        ${snapshot.id}, ${snapshot.sessionId}, ${snapshot.sessionDate}, ${snapshot.season}, 
        ${JSON.stringify(snapshot.matches)}, ${JSON.stringify(snapshot.matchPlayers)}, 
        ${JSON.stringify(snapshot.checkIns)}, ${snapshot.createdAt}, ${tenantId}
      )
      ON CONFLICT (id) DO UPDATE SET 
        session_id = EXCLUDED.session_id, session_date = EXCLUDED.session_date, 
        season = EXCLUDED.season, matches = EXCLUDED.matches, 
        match_players = EXCLUDED.match_players, check_ins = EXCLUDED.check_ins,
        tenant_id = EXCLUDED.tenant_id
    `
  }
  logger.info(`✅ Backup data inserted for tenant: ${tenantId}`)
}
