import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // NOTE: On Node 22 + tinypool, the default threads pool can hit
    // a worker teardown recursion bug in this repo. vmThreads avoids it.
    pool: 'vmThreads',
    // Exclude E2E tests (Playwright) and integration tests that require setup
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.e2e.spec.ts',
      '**/*.e2e.test.ts',
      '**/autoArrange.*.spec.ts', // Integration tests requiring tenant context
      '**/landing/LandingPage.test.tsx' // Requires React Testing Library setup
    ],
    globals: true,
    // Use jsdom for React hooks tests, node for others
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})

