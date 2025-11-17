import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
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
    environment: 'node',
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})

