import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextRequest } from 'next/server';

import { MoscotRawSample } from '../../mocks/catalogSamples';
import { makeRequest } from '../../mocks/request';
import { createServiceJwt } from '../../mocks/serviceJwt';

const routeModulePromise = import(
  '../../../packages/web/src/app/api/catalog/vendor-sync/[slug]/normalize/preview/route'
);

function makeContext(slug: string) {
  return { params: { slug } } as { params: { slug: string } };
}

test('POST /normalize/preview requires authentication', async () => {
  const mod = await routeModulePromise;
  const req = makeRequest('https://example.test/api/catalog/vendor-sync/moscot/normalize/preview', {
    body: { item: MoscotRawSample },
  });

  const res = await mod.POST(req as unknown as NextRequest, makeContext('moscot'));
  const payload = await res.json();

  assert.equal(res.status, 401);
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'missing_token');
});

test('POST /normalize/preview rejects insufficient scope', async () => {
  const mod = await routeModulePromise;
  const token = await createServiceJwt('catalog:sync:read');
  const req = makeRequest('https://example.test/api/catalog/vendor-sync/moscot/normalize/preview', {
    headers: { authorization: `Bearer ${token}` },
    body: { item: MoscotRawSample },
  });

  const res = await mod.POST(req as unknown as NextRequest, makeContext('moscot'));
  const payload = await res.json();

  assert.equal(res.status, 403);
  assert.equal(payload.ok, false);
  assert.equal(payload.error, 'insufficient_scope');
});

test('POST /normalize/preview returns normalized product', async () => {
  const mod = await routeModulePromise;
  const token = await createServiceJwt('catalog:sync:write');
  const req = makeRequest('https://example.test/api/catalog/vendor-sync/moscot/normalize/preview', {
    headers: { authorization: `Bearer ${token}` },
    body: { item: MoscotRawSample },
  });

  const res = await mod.POST(req as unknown as NextRequest, makeContext('moscot'));
  const payload = await res.json();

  assert.equal(res.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.vendor, 'moscot');
  assert.equal(payload.product.catalogId, MoscotRawSample.catalogId);
  assert.equal(payload.product.variants.length > 0, true);
});
