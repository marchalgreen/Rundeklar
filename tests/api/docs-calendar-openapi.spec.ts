import assert from 'node:assert/strict';
import test from 'node:test';

import { calendarOpenAPISpec } from '@/lib/docs/calendarOpenAPI';

test('calendar OpenAPI spec metadata is set', () => {
  assert.equal(calendarOpenAPISpec.openapi, '3.1.0');
  assert.equal(calendarOpenAPISpec.info.title, 'Clairity Calendar API');
  assert.ok(Array.isArray(calendarOpenAPISpec.servers));
  assert.ok(calendarOpenAPISpec.servers.length >= 1);
});

test('calendar OpenAPI spec only exposes /api/calendar paths', () => {
  const invalidPaths = Object.keys(calendarOpenAPISpec.paths).filter((path) => !path.startsWith('/api/calendar/'));
  assert.deepEqual(invalidPaths, []);
});

test('calendar OpenAPI spec includes key endpoint groups', () => {
  const paths = new Set(Object.keys(calendarOpenAPISpec.paths));
  for (const path of [
    '/api/calendar/v1/availability',
    '/api/calendar/v1/events',
    '/api/calendar/v1/providers',
    '/api/calendar/v1/reminders',
    '/api/calendar/v1/webhooks',
  ]) {
    assert.ok(paths.has(path), `expected OpenAPI spec to include ${path}`);
  }
});
