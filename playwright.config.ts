// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import { join, resolve } from 'node:path';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const ROOT_DIR = __dirname;
const WEB_TESTS_DIR = resolve(ROOT_DIR, 'packages/web/tests');
const WEB_E2E_DIR = join(WEB_TESTS_DIR, 'e2e');
const WEB_AUTH_STATE = join(WEB_TESTS_DIR, '.auth', 'state.json');
const WEB_GLOBAL_SETUP = join(WEB_E2E_DIR, 'global-setup.ts');

export default defineConfig({
  testIgnore: ['packages/web/**/*.test.ts', 'packages/web/**/*.test.tsx'],
  retries: process.env.CI ? 2 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  globalSetup: WEB_GLOBAL_SETUP,
  use: {
    baseURL: HOST,
    storageState: WEB_AUTH_STATE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'web',
      testDir: WEB_E2E_DIR,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `pnpm --filter @clairity/web exec -- next dev --hostname 0.0.0.0 --port ${PORT}`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 120_000,
        // 👇 Add this block so Prisma doesn't fail schema validation in CI
        env: {
          ...process.env,
          DATABASE_URL:
            process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5432/ci',
        },
      },
});
