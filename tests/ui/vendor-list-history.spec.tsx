import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import VendorList, {
  buildVendorCsv,
} from '../../packages/web/src/components/vendor-sync/VendorList';
import type {
  SerializedVendor,
  SerializedVendorState,
  SerializedVendorIntegration,
} from '../../packages/web/src/lib/catalog/vendorRegistry';
import type { VendorHistoryEntry } from '../../packages/web/src/hooks/useVendorSyncHistory';

const baseIntegration: SerializedVendorIntegration = {
  id: 'int-1',
  type: 'SCRAPER' as any,
  scraperPath: '/tmp/scraper.ts',
  apiBaseUrl: null,
  apiAuthType: null,
  apiKey: null,
  lastTestAt: new Date('2024-04-01T09:00:00Z').toISOString(),
  lastTestOk: true,
  error: null,
  meta: null,
  createdAt: new Date('2024-03-01T00:00:00Z').toISOString(),
  updatedAt: new Date('2024-04-01T09:00:00Z').toISOString(),
};

const baseState: SerializedVendorState = {
  vendor: 'moscot',
  lastRunAt: new Date('2024-04-01T10:00:00Z').toISOString(),
  totalItems: 120,
  lastError: null,
  lastDurationMs: 180000,
  lastHash: null,
  lastSource: '/tmp',
  lastRunBy: 'system',
  createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  updatedAt: new Date('2024-04-01T10:00:00Z').toISOString(),
};

const vendors: SerializedVendor[] = [
  {
    id: 'vendor-1',
    slug: 'moscot',
    name: 'MOSCOT',
    createdAt: new Date('2023-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2024-04-01T10:00:00Z').toISOString(),
    integration: baseIntegration,
    state: baseState,
  },
];

const histories: VendorHistoryEntry[] = [
  {
    vendor: 'moscot',
    runs: [
      { runId: 'run-1', status: 'success', totalItems: 120, durationMs: 180000, finishedAt: '2024-04-01T10:00:00Z' },
      { runId: 'run-2', status: 'error', totalItems: 80, durationMs: 60000, finishedAt: '2024-03-28T09:02:00Z' },
      { runId: 'run-3', status: 'running', totalItems: null, durationMs: null, finishedAt: null },
    ],
  },
];

test('VendorList renders last runs and quick actions when initial data provided', () => {
  const markup = renderToStaticMarkup(
    <VendorList initialVendors={vendors} initialHistories={histories} />,
  );
  assert.ok(markup.includes('Seneste 5 kørsler'));
  assert.ok(markup.includes('Re-test'));
  assert.ok(markup.includes('Re-sync (preview)'));
  assert.ok(markup.includes('Åbn run detalje'));
});

test('buildVendorCsv creates a CSV payload', () => {
  const csv = buildVendorCsv(vendors, new Map(histories.map((entry) => [entry.vendor, entry.runs])));
  assert.ok(csv.startsWith('Vendor,Slug'));
  assert.notEqual(csv.trim().split('\n').length, 1);
});
