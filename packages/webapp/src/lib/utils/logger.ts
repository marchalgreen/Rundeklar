/**
 * Simple logger utility for server-side code
 * In production, these should be sent to a proper logging service
 */

const isTest =
  typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test')

const isDevelopment =
  !isTest &&
  // Vite (browser + tests)
  (typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV)) ||
  // Node (scripts / server)
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')

export const logger = {
  error: (message: string, error?: unknown) => {
    // Always log errors, but format differently in production
    if (error instanceof Error) {
      console.error(`[ERROR] ${message}`, {
        message: error.message,
        stack: error.stack
      })
      return
    }

    console.error(`[ERROR] ${message}`, error)
  },
  
  warn: (message: string, ...args: unknown[]) => {
    // Always log warnings (important for scripts)
    console.warn(`[WARN] ${message}`, ...args)
  },
  
  info: (message: string, ...args: unknown[]) => {
    // Always log info (important for scripts to show progress)
    console.log(`[INFO] ${message}`, ...args)
  },
  
  debug: (message: string, ...args: unknown[]) => {
    // Only log debug in development
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  }
}

