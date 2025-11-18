import { defineConfig, devices } from '@playwright/test'

/**
 * Modern Playwright configuration for Rundeklar E2E tests
 * 
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Test timeout per test
  timeout: 30000, // 30 seconds
  
  // Expect timeout for assertions
  expect: {
    timeout: 10000, // 10 seconds
  },
  
  // Action timeout (click, fill, etc.)
  use: {
    actionTimeout: 15000, // 15 seconds
    
    // Base URL for tests
    baseURL: 'http://127.0.0.1:5173',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Trace on failure
    trace: 'on-first-retry',
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
  },
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail build if test.only is left in code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI
  retries: process.env.CI ? 2 : 0,
  
  // Workers on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { 
      open: process.env.CI ? 'never' : 'on-failure',
      outputFolder: 'playwright-report'
    }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  
  // Projects for different browsers/devices
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile Chrome
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    // Mobile Safari
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  
  // Web server configuration
  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes
    stdout: 'ignore',
    stderr: 'pipe',
  },
  
  // Global setup/teardown
  // globalSetup: './tests/e2e/global-setup.ts',
  // globalTeardown: './tests/e2e/global-teardown.ts',
})

