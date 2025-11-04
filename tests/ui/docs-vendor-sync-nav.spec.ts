import assert from 'node:assert/strict';
import test from 'node:test';

import { getSectionNav } from '@/components/docs/nav';
import type { DocSection } from '@/components/docs/nav/types';

const flattenNav = (section: DocSection) =>
  section.groups.flatMap((group) => group.items.map((item) => item.href));

test('vendor sync docs nav lists all core destinations', () => {
  const section = getSectionNav('vendor-sync') as DocSection;
  const hrefs = flattenNav(section);

  const expected = [
    '/docs/vendor-sync',
    '/docs/vendor-sync/quickstart',
    '/docs/vendor-sync/ui-guide',
    '/docs/vendor-sync/sdk',
    '/docs/vendor-sync/normalization',
    '/docs/vendor-sync/api',
    '/docs/vendor-sync/api/overview',
    '/docs/vendor-sync/api/history',
    '/docs/vendor-sync/api/test-all',
    '/docs/vendor-sync/api/vendors',
    '/docs/vendor-sync/api/normalize-preview',
    '/docs/vendor-sync/api/apply',
    '/docs/vendor-sync/api/swagger',
  ];

  expected.forEach((href) => {
    assert.ok(
      hrefs.includes(href),
      `expected docs nav to include ${href}, got ${hrefs.join(', ')}`,
    );
  });
});
