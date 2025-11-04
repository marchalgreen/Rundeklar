import { DocSection } from './types';
import type { DocSection as DocSectionType } from './types';
import {
  makeQuickstart,
  makeGuides,
  makeApiSet,
  makeVendorSyncApiSet,
  testingWorkflow,
} from './presets';

/**
 * Central registry for docs navigation trees.
 * Add new sections here to get a sidebar automatically.
 */
export function getSectionNav(
  section: 'home' | 'calendar' | 'vendor-sync' | 'testing' | (string & {}),
): DocSectionType {
  if (section === 'home') {
    const home: DocSectionType = {
      id: 'home',
      title: 'Clairity docs',
      groups: [
        {
          label: 'Calendar',
          items: [
            { title: 'Overview', href: '/docs/calendar' },
            { title: 'API', href: '/docs/calendar/api' },
          ],
        },
        {
          label: 'Vendor Sync',
          items: [
            { title: 'Overview', href: '/docs/vendor-sync' },
            { title: 'API', href: '/docs/vendor-sync/api/overview' },
          ],
        },
        {
          label: 'Testing',
          items: [{ title: 'Playwright guide', href: '/docs/testing/playwright' }],
        },
      ],
    };
    return DocSection.parse(home);
  }

  if (section === 'calendar') {
    const calendar: DocSectionType = {
      id: 'calendar',
      title: 'Calendar',
      groups: [
        makeQuickstart('calendar'),
        makeGuides('calendar', { ui: true, sdk: true }),
        makeApiSet('calendar'),
        testingWorkflow,
      ],
    };
    return DocSection.parse(calendar);
  }

  if (section === 'vendor-sync') {
    const vs: DocSectionType = {
      id: 'vendor-sync',
      title: 'Vendor Sync',
      groups: [
        makeQuickstart('vendor-sync'),
        {
          label: 'SDK / Normalization',
          items: [
            { title: 'SDK adapters', href: '/docs/vendor-sync/sdk' },
            { title: 'Normalization model', href: '/docs/vendor-sync/normalization' },
          ],
        },
        makeVendorSyncApiSet('vendor-sync'),
        testingWorkflow,
      ],
    };
    return DocSection.parse(vs);
  }

  if (section === 'testing') {
    const testing: DocSectionType = {
      id: 'testing',
      title: 'Testing docs',
      groups: [
        {
          label: 'Testing',
          items: [{ title: 'Playwright guide', href: '/docs/testing/playwright' }],
        },
      ],
    };
    return DocSection.parse(testing);
  }

  // Fallback for future sections: only Quickstart until explicitly expanded.
  const generic: DocSectionType = {
    id: section,
    title: section.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
    groups: [makeQuickstart(section)],
  };
  return DocSection.parse(generic);
}
