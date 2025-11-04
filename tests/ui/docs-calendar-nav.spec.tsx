import assert from 'node:assert/strict';
import test from 'node:test';

import { getSectionNav } from '@/components/docs/nav';
import type { DocSection } from '@/components/docs/nav/types';

test('calendar docs nav includes required sections', () => {
  const section = getSectionNav('calendar') as DocSection;
  const groups = section.groups;
  assert.ok(groups.length >= 3);

  const labels = groups.map((group) => group.label);
  assert.ok(labels.includes('Start here'));
  assert.ok(labels.includes('Guides'));
  assert.ok(labels.includes('API'));

  const quickstartGroup = groups.find((group) => group.label === 'Start here');
  assert.ok(quickstartGroup, 'start here group should exist');

  const overview = quickstartGroup?.items.find((item) => item.href === '/docs/calendar');
  assert.ok(overview, 'overview link should be present');
  assert.equal(overview?.icon, 'overview');

  const apiGroup = groups.find((group) => group.label === 'API');
  assert.ok(apiGroup, 'api group should exist');
  const apiPaths = new Set(apiGroup.items.map((item) => item.href));
  for (const path of [
    '/docs/calendar/api',
    '/docs/calendar/api/availability',
    '/docs/calendar/api/events',
    '/docs/calendar/api/reminders',
    '/docs/calendar/api/providers',
    '/docs/calendar/api/ics-import',
    '/docs/calendar/api/webhooks',
    '/docs/calendar/api/swagger',
  ]) {
    assert.ok(apiPaths.has(path), `expected nav to contain ${path}`);
  }
});
