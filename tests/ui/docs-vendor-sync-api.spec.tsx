import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import VendorSyncOverviewEndpoint from '../../packages/web/src/app/docs/vendor-sync/api/overview/page';
import { GET as getVendorSyncSpec } from '../../packages/web/src/app/api/docs/vendor-sync.json/route';

const renderOverviewMarkup = () => renderToStaticMarkup(<VendorSyncOverviewEndpoint />);

test('vendor sync overview page renders copy buttons for code samples', () => {
  const markup = renderOverviewMarkup();
  assert.ok(markup.includes('Copy'), 'expected Code component to render a Copy button');
  assert.ok(markup.includes('curl https://api.clairity.dev/vendor-sync/overview'));
});

test('openapi route returns vendor sync paths', async () => {
  const response = await getVendorSyncSpec();
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.ok(body.paths, 'expected OpenAPI document to include paths');
  assert.ok(body.paths['/vendor-sync/vendors'], 'expected vendors path to be documented');
  assert.ok(body.paths['/vendor-sync/registry/test-all'], 'expected test-all path to be documented');
});
