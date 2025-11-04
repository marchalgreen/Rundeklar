import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import RegistryDrawer from '../../packages/web/src/components/vendor-sync/RegistryDrawer';
import type { VendorRegistryRow } from '../../packages/web/src/components/vendor-sync/RegistryWindow';

const registryRow: VendorRegistryRow = {
  vendor: {
    id: 'vendor-1',
    slug: 'moscot',
    name: 'MOSCOT',
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2024-04-01T00:00:00Z').toISOString(),
    integration: {
      id: 'int-1',
      type: 'API',
      scraperPath: null,
      apiBaseUrl: 'https://api.vendor.test',
      apiAuthType: 'API_KEY',
      apiKey: 'secret',
      lastTestAt: new Date('2024-04-01T09:00:00Z').toISOString(),
      lastTestOk: true,
      meta: { totalItems: 42 },
      createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
      updatedAt: new Date('2024-04-01T09:00:00Z').toISOString(),
    } as any,
  },
  state: {
    vendor: 'moscot',
    totalItems: 42,
    lastRunAt: new Date('2024-04-01T09:30:00Z').toISOString(),
    lastDurationMs: 120000,
    lastSource: '/tmp/catalog.json',
    lastHash: 'abc123',
    lastRunBy: 'system',
    lastError: null,
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2024-04-01T09:30:00Z').toISOString(),
  } as any,
};

test('registry drawer renders tahoe-styled inputs and actions when open', () => {
  const markup = renderToStaticMarkup(
    <RegistryDrawer
      open
      row={registryRow}
      testing={false}
      saving={false}
      onOpenChange={() => {}}
      onTest={() => {}}
      onSaveCredentials={() => {}}
    />,
  );

  assert.ok(markup.includes('tahoe-input'), 'expected tahoe-input classes on fields');
  assert.ok(markup.includes('Gem legitimationsoplysninger'));
  assert.ok(markup.includes('Kør test'));
  const snippet = markup.slice(markup.indexOf('Gem legitimationsoplysninger') - 200, markup.indexOf('Gem legitimationsoplysninger'));
  assert.ok(snippet.includes('<svg'), 'expected save button to include icon');
});

test('registry drawer hides content when closed', () => {
  const markup = renderToStaticMarkup(
    <RegistryDrawer
      open={false}
      row={registryRow}
      testing={false}
      saving={false}
      onOpenChange={() => {}}
      onTest={() => {}}
      onSaveCredentials={() => {}}
    />,
  );

  assert.equal(markup, '');
});
