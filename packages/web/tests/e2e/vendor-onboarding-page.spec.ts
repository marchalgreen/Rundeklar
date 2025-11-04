import { expect, test, type Page, type Request, type Route } from '@playwright/test';

async function devMintStoreSession(page: Page) {
  await page.goto('/api/auth/dev-mint');
  const cookies = await page.context().cookies();
  expect(cookies.some((cookie: any) => cookie.name === 'STORE_SESS')).toBeTruthy();
}

test.describe('Vendor onboarding page', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await devMintStoreSession(page);

    const baseVendors = [
      {
        id: 'vendor-moscot',
        slug: 'moscot',
        name: 'MOSCOT',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        integration: {
          id: 'integration-moscot',
          type: 'SCRAPER' as const,
          scraperPath: 'scripts/vendors/moscot.ts',
          apiBaseUrl: null,
          apiAuthType: null,
          apiKey: null,
          lastTestAt: null,
          lastTestOk: null,
          meta: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      },
    ];

    const createdVendor = {
      id: 'vendor-northwind',
      slug: 'northwind-traders',
      name: 'Northwind Traders',
      createdAt: '2024-03-10T00:00:00.000Z',
      updatedAt: '2024-03-10T00:00:00.000Z',
      integration: {
        id: 'integration-northwind',
        type: 'API' as const,
        scraperPath: null,
        apiBaseUrl: 'https://api.northwind.test/catalog',
        apiAuthType: 'API_KEY',
        apiKey: 'secret-key',
        lastTestAt: null,
        lastTestOk: null,
        meta: null,
        createdAt: '2024-03-10T00:00:00.000Z',
        updatedAt: '2024-03-10T00:00:00.000Z',
      },
    };

    let listRequests = 0;
    let createPayload: Record<string, unknown> | null = null;

    await page.route('**/api/catalog/vendor-sync/overview*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          metrics: {
            last24h: {
              total: 1,
              success: 1,
              failed: 0,
              avgDurationMs: 1200,
            },
            inProgress: [],
          },
        }),
      });
    });

    await page.route('**/api/catalog/vendor-sync/history*', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          vendors: [
            {
              vendor: 'moscot',
              runs: [
                {
                  runId: 'run-1',
                  status: 'success',
                  totalItems: 120,
                  durationMs: 1500,
                  finishedAt: '2024-03-09T10:00:00.000Z',
                },
              ],
            },
          ],
        }),
      });
    });

    await page.route('**/api/catalog/vendor-sync/vendors*', async (route: Route) => {
      if (route.request().method() === 'GET') {
        listRequests += 1;
        const vendors = listRequests >= 2 ? [...baseVendors, createdVendor] : baseVendors;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, vendors }),
        });
        return;
      }

      if (route.request().method() === 'POST') {
        createPayload = route.request().postDataJSON() as Record<string, unknown> | null;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, vendor: createdVendor }),
        });
        return;
      }

      await route.fallback();
    });

    (page as any).__onboardingPayload = () => createPayload;
  });

  test('completes onboarding flow and redirects to vendor list', async ({ page }: { page: Page }) => {
    await page.goto('/vendor-sync/vendors/new', { waitUntil: 'networkidle' });

    const steps = page.getByRole('tab');
    await expect(steps).toHaveCount(4);

    const nextButton = page.getByRole('button', { name: 'Næste trin' });
    await expect(nextButton).toBeDisabled();

    const nameInput = page.getByLabel('Navn');
    await nameInput.fill('Northwind Traders');
    const slugInput = page.getByLabel('Slug');
    await expect(slugInput).toHaveValue('northwind-traders');

    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    const apiOption = page.getByRole('button', { name: /API/ });
    await apiOption.click();
    await expect(apiOption).toContainText('Valgt');

    const nextAfterIntegration = page.getByRole('button', { name: 'Næste trin' });
    await nextAfterIntegration.click();

    const baseUrlInput = page.getByLabel('API base URL');
    const apiKeyInput = page.getByLabel('API nøgle');
    const credentialsNext = page.getByRole('button', { name: 'Næste trin' });
    await expect(credentialsNext).toBeDisabled();

    await baseUrlInput.fill('https://api.northwind.test/catalog');
    await apiKeyInput.fill('super-secret-key');
    await expect(credentialsNext).toBeEnabled();
    await credentialsNext.click();

    await expect(page.getByText('Gennemgå og bekræft')).toBeVisible();
    await expect(page.getByText('SDK kommandoer')).toBeVisible();

    const [postRequest] = await Promise.all([
      page.waitForRequest((req: Request) =>
        req.url().includes('/api/catalog/vendor-sync/vendors') && req.method() === 'POST',
      ),
      page.waitForURL('**/vendor-sync/vendors'),
      page.getByRole('button', { name: 'Opret leverandør' }).click(),
    ]);
    expect(postRequest.method()).toBe('POST');

    await expect(page.getByRole('heading', { name: 'Vendor sync' })).toBeVisible();
    await expect(page.getByText('Northwind Traders')).toBeVisible();

    const payload = (page as any).__onboardingPayload?.() as Record<string, unknown> | null;
    expect(payload).toMatchObject({
      slug: 'northwind-traders',
      name: 'Northwind Traders',
      integrationType: 'API',
    });
  });

  test('cancel returns to vendors list without submitting', async ({ page }: { page: Page }) => {
    await page.goto('/vendor-sync/vendors/new');
    await page.getByRole('button', { name: 'Annuller' }).click();
    await page.waitForURL('**/vendor-sync/vendors');
    await expect(page.getByRole('heading', { name: 'Vendor sync' })).toBeVisible();
  });
});
