// packages/web/tests/e2e/helpers/auth.ts
import { expect, Page } from '@playwright/test';
import { resolve } from 'node:path';
import { promises as fsp } from 'node:fs';

export async function devMintStoreSession(page: Page) {
  const res = await page.request.post('http://localhost:3000/api/auth/dev-mint');
  expect(res.ok()).toBeTruthy();
  await fsp.mkdir(resolve(__dirname, '..', '.auth'), { recursive: true });
}
