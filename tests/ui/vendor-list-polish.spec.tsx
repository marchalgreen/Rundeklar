import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import VendorList from '../../packages/web/src/components/vendor-sync/VendorList';
import type { SerializedVendor } from '../../packages/web/src/lib/catalog/vendorRegistry';

const healthyVendor: SerializedVendor = {
  id: 'vendor-1',
  slug: 'moscot',
  name: 'MOSCOT',
  createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  updatedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  integration: {
    id: 'int-1',
    type: 'SCRAPER',
    scraperPath: 'scripts/vendors/moscot.ts',
    apiBaseUrl: null,
    apiAuthType: null,
    apiKey: null,
    lastTestAt: new Date('2024-04-01T10:00:00Z').toISOString(),
    lastTestOk: true,
    error: null,
    meta: null,
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2024-04-01T10:00:00Z').toISOString(),
  } as any,
  state: {
    vendor: 'moscot',
    totalItems: 120,
    lastRunAt: new Date('2024-04-01T10:00:00Z').toISOString(),
    lastDurationMs: 60000,
    lastSource: '/tmp',
    lastHash: null,
    lastRunBy: 'system',
    lastError: null,
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2024-04-01T10:00:00Z').toISOString(),
  } as any,
};

const failingVendor: SerializedVendor = {
  id: 'vendor-2',
  slug: 'northwind',
  name: 'Northwind Traders',
  createdAt: new Date('2024-02-01T00:00:00Z').toISOString(),
  updatedAt: new Date('2024-04-01T12:00:00Z').toISOString(),
  integration: {
    id: 'int-2',
    type: 'API',
    scraperPath: null,
    apiBaseUrl: 'https://api.northwind.test',
    apiAuthType: 'API_KEY',
    apiKey: 'secret',
    lastTestAt: new Date('2024-04-01T08:00:00Z').toISOString(),
    lastTestOk: false,
    error: '401',
    meta: null,
    createdAt: new Date('2024-02-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2024-04-01T12:00:00Z').toISOString(),
  } as any,
  state: {
    vendor: 'northwind',
    totalItems: null,
    lastRunAt: null,
    lastDurationMs: null,
    lastSource: null,
    lastHash: null,
    lastRunBy: null,
    lastError: 'Kunne ikke forbinde til API',
    createdAt: new Date('2024-02-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2024-04-01T12:00:00Z').toISOString(),
  } as any,
};

function expectIconBeforeText(markup: string, text: string) {
  const index = markup.indexOf(text);
  assert.ok(index > -1, `${text} not found in markup`);
  const snippet = markup.slice(Math.max(0, index - 160), index);
  assert.ok(snippet.includes('<svg'), `expected an icon before ${text}`);
}

test('toolbar displays CTA buttons with icons and link to onboarding page', () => {
  const markup = renderToStaticMarkup(
    <VendorList initialVendors={[healthyVendor]} initialHistories={[]} />,
  );

  expectIconBeforeText(markup, 'Opdater liste');
  expectIconBeforeText(markup, 'Test alle forbindelser');
  expectIconBeforeText(markup, 'Eksportér CSV');
  expectIconBeforeText(markup, 'Tilføj leverandør');
  assert.ok(markup.includes('href="/vendor-sync/vendors/new"'), 'Tilføj leverandør link missing');
});

test('vendor cards surface adapter and health badges', () => {
  const markup = renderToStaticMarkup(
    <VendorList initialVendors={[healthyVendor, failingVendor]} initialHistories={[]} />,
  );

  assert.ok(markup.includes('Adapter')); // adapter badge present
  assert.ok(markup.includes('Adapter mangler'));
  assert.ok(markup.includes('Sund'));
  assert.ok(markup.includes('Fejl'));
});
