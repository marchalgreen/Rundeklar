/**
 * Vitest setup file
 * Runs before all tests to configure test environment
 */

// Set JWT secret for tests that need it
process.env.AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || 'test-secret-key-for-jwt-token-generation'

