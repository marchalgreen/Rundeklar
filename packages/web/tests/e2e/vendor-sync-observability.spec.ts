// packages/web/tests/e2e/vendor-sync-observability.spec.ts
import { expect, test, type Page } from '@playwright/test';

import {
  createVendorRegistryResponse,
  createVendorRegistryTestResponse,
  createVendorSyncObservabilityResponse,
  createVendorSyncRunsResponse,
  createVendorSyncStateResponse,
} from '../fixtures/vendorSync';

/** Ensure a dev STORE_SESS cookie is set for the same origin as the page */
async function devMintStoreSession(page: Page) {
  // Use same-origin GET to set httpOnly cookie in the page context
  await page.goto('/api/auth/dev-mint');
  const cookies = await page.context().cookies();
  expect(cookies.some((c: any) => c.name === 'STORE_SESS')).toBeTruthy();
}

/** Navigate directly to the observability route */
async function gotoVendorSync(page: Page) {
  await page.goto('/vendor-sync', { waitUntil: 'networkidle' });
}

async function gotoVendorSyncRegistry(page: Page) {
  await page.goto('/vendor-sync/registry', { waitUntil: 'networkidle' });
}

test.describe('Vendor sync observability', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    // 1) Authenticate first (bypass store login + PIN in dev)
    await devMintStoreSession(page);

    // 2) Stub observability aggregate endpoint
    await page.route('**/api/catalog/vendor-sync/observability**', async (route: any) => {
      const url = new URL(route.request().url());
      const start = url.searchParams.get('start');
      const end = url.searchParams.get('end');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          createVendorSyncObservabilityResponse({
            range: { start: start ?? undefined, end: end ?? undefined },
          }),
        ),
      });
    });

    // 3) Stub runs list (legacy or fallback path)
    await page.route('**/api/catalog/vendor-sync/runs**', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createVendorSyncRunsResponse()),
      });
    });

    // 4) Stub snapshot
    await page.route('**/api/catalog/vendor-sync/state**', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createVendorSyncStateResponse()),
      });
    });
  });

  test('renders default observability window with fixture data', async ({ page }: { page: Page }) => {
    await gotoVendorSync(page);

    // Top heading + “shows 3 runs” banner
    await expect(page.getByRole('heading', { name: 'Vendor sync' })).toBeVisible();
    await expect(page.getByText('Viser 3 kørsler')).toBeVisible();

    // --- Stats section ---
    const statsGrid = page
      .locator('div.grid')
      .filter({ has: page.getByText('Kørsler i vinduet') })
      .first();

    const runCountCard = statsGrid
      .locator('div.rounded-2xl')
      .filter({ has: page.getByText('Kørsler i vinduet') })
      .first();
    await expect(runCountCard).toContainText('3');

    const successCard = statsGrid
      .locator('div.rounded-2xl')
      .filter({ has: page.getByText('Succes') })
      .first();
    await expect(successCard).toContainText('2');

    const errorCard = statsGrid
      .locator('div.rounded-2xl')
      .filter({ has: page.getByText('Fejl') })
      .first();
    await expect(errorCard).toContainText('1');

    // --- Table section ---
    const table = page.locator('table tbody');
    const firstRow = table.locator('tr').first();

    // Narrow down to the <td> elements for clear, predictable matching
    const cells = firstRow.locator('td');
    await expect(cells.nth(0)).toContainText(/7\. jun\. 2024|2024-06-07/); // started date
    await expect(cells.nth(2)).toContainText(/Fuldført|Fejlet/); // status
    await expect(cells.nth(3)).toContainText(/Nej|Ja/); // dry-run
    await expect(cells.nth(4)).toContainText(/system|batch-user|qa-user/); // actor
    await expect(cells.nth(5)).toContainText('catalog-2024-06-07.json'); // file name
  });

  test('shows validation errors when start date is after end date', async ({ page }: { page: Page }) => {
    await gotoVendorSync(page);

    // Ensure initial data has loaded before interacting with filters
    await expect(page.getByText('Viser 3 kørsler')).toBeVisible();

    // Open "Fra" date selector and input an invalid future start date
    const fromTrigger = page.getByRole('button', { name: /^Fra / });
    await fromTrigger.click();

    const manualInput = page.getByPlaceholder('dd-mm-yyyy');
    await manualInput.fill('31-12-2099');
    await manualInput.press('Enter');

    const validationAlert = page.getByRole('alert').filter({ hasText: 'Ugyldigt datointerval' });
    await expect(validationAlert).toBeVisible();
    await expect(validationAlert).toContainText('Startdato skal være før slutdato.');
  });
});

test.describe('Vendor sync registry', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await devMintStoreSession(page);

    await page.route('**/api/catalog/vendor-sync/registry', async (route: any) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createVendorRegistryResponse()),
        });
        return;
      }
      await route.fallback();
    });

    await page.route('**/api/catalog/vendor-sync/state**', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createVendorSyncStateResponse()),
      });
    });

    await page.route('**/api/catalog/vendor-sync/registry/moscot/test', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createVendorRegistryTestResponse()),
      });
    });

    await page.route('**/api/catalog/vendor-sync/registry/moscot/credentials', async (route: any) => {
      const payload = route.request().postDataJSON() as Record<string, unknown> | null;
      expect(payload).toMatchObject({ credentials: { scraperPath: expect.any(String) } });

      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: 'invalid_payload',
          detail: 'Ugyldige legitimationsoplysninger',
        }),
      });
    });
  });

  test('renders registry view, runs test and surfaces validation errors', async ({ page }: { page: Page }) => {
    await gotoVendorSyncRegistry(page);

    await expect(page.getByRole('heading', { name: 'Vendor sync' })).toBeVisible();
    const registryTab = page.getByRole('tab', { name: 'Registrering' });
    await expect(registryTab).toHaveAttribute('aria-selected', 'true');

    const vendorRow = page.getByRole('row', { name: /MOSCOT/ });
    await expect(vendorRow).toBeVisible();
    await expect(vendorRow).toContainText('Seneste test godkendt');

    const testButton = vendorRow.getByRole('button', { name: 'Test forbindelse' });
    const [request] = await Promise.all([
      page.waitForRequest('**/api/catalog/vendor-sync/registry/moscot/test'),
      testButton.click(),
    ]);
    expect(request.method()).toBe('POST');

    await expect(page.getByText('Forbindelsestest gennemført')).toBeVisible();

    await vendorRow.getByRole('button', { name: 'Detaljer' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('Forbindelsestest');

    const scraperInput = page.getByLabel('Standard kilde');
    await scraperInput.fill('s3://vendor-sync/moscot/new-catalog.json');

    await page.getByRole('button', { name: /^Gem$/ }).click();
    await expect(page.getByText('Opdatering mislykkedes')).toBeVisible();
    await expect(page.getByText('Ugyldige legitimationsoplysninger')).toBeVisible();
  });
});
