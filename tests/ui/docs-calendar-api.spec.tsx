import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import CalendarApiOverviewPage from '@/app/docs/calendar/api/page';
import CalendarAvailabilityApiPage from '@/app/docs/calendar/api/availability/page';
import CalendarEventsApiPage from '@/app/docs/calendar/api/events/page';

function render(component: React.ReactElement) {
  return renderToStaticMarkup(component);
}

test('API overview describes versioned base path and rate limits', () => {
  const html = render(<CalendarApiOverviewPage />);
  assert.match(html, /Calendar API overview/);
  assert.match(html, /\/api\/calendar\/v1\/availability/);
  assert.match(html, /x-ratelimit-limit/);
});

test('Availability page documents templates', () => {
  const html = render(<CalendarAvailabilityApiPage />);
  assert.match(html, /Availability endpoints/);
  assert.match(html, /availability\\?locationId=/);
  assert.match(html, /availability\/templates/);
});

test('Events page highlights idempotency', () => {
  const html = render(<CalendarEventsApiPage />);
  assert.match(html, /Events endpoints/);
  assert.match(html, /Idempotency-Key/);
  assert.match(html, /booking\.cancelled/);
});
