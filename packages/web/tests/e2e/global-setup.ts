// packages/web/tests/e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { promises as fsp } from 'node:fs';

export default async function globalSetup(config: FullConfig) {
  const { webServer, projects } = config;
  // Use the same baseURL Playwright uses for tests
  const baseURL =
    (projects?.[0]?.use as any)?.baseURL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    `http://127.0.0.1:${process.env.PORT || 3000}`;

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Hit dev-mint so the httpOnly cookie is set for this origin
  await page.goto(`${baseURL}/api/auth/dev-mint`);

  // Persist cookies/localStorage to a file used by all tests
  const storagePath = resolve(__dirname, '..', '.auth', 'state.json');
  await fsp.mkdir(resolve(__dirname, '..', '.auth'), { recursive: true });
  await context.storageState({ path: storagePath });
  await browser.close();
}
