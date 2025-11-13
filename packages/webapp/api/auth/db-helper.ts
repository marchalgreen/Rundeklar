import postgres from 'postgres'

// Cache of Postgres clients by connection string  
const clientCache = new Map<string, ReturnType<typeof postgres>>()

/**
 * Get Postgres client for API routes
 * @param connectionString - Database connection string
 * @returns Postgres client
 */
export function getPostgresClient(connectionString: string) {
  if (!clientCache.has(connectionString)) {
    clientCache.set(
      connectionString,
      postgres(connectionString, {
        ssl: 'require',
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10
      })
    )
  }
  return clientCache.get(connectionString)!
}

/**
 * Get database connection string from environment
 * @returns Connection string
 */
export function getDatabaseUrl(): string {
  const url = 
    process.env.DATABASE_URL || 
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.VITE_DATABASE_URL ||
    process.env.VITE_DATABASE_URL_UNPOOLED
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return url
}

