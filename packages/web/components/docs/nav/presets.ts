import { DocGroup, DocLink } from './types';

const makeLink = (link: DocLink) => link;

export function makeQuickstart(base: string): DocGroup {
  return DocGroup.parse({
    label: 'Start here',
    items: [
      makeLink({
        title: 'Overview',
        href: base,
        icon: 'overview',
      }),
      makeLink({
        title: 'Quickstart',
        href: `${base}/quickstart`,
        icon: 'quickstart',
      }),
    ],
  });
}

export function makeGuides(base: string, options: { ui?: boolean; sdk?: boolean } = {}): DocGroup {
  const items: DocLink[] = [];

  if (options.ui) {
    items.push(
      makeLink({
        title: 'UI guide',
        href: `${base}/ui-guide`,
        icon: 'ui',
      }),
    );
  }

  if (options.sdk) {
    items.push(
      makeLink({
        title: 'SDK reference',
        href: `${base}/sdk`,
        icon: 'sdk',
      }),
    );
  }

  return DocGroup.parse({
    label: 'Guides',
    items,
  });
}

export function makeApiSet(base: string): DocGroup {
  return DocGroup.parse({
    label: 'API',
    items: [
      makeLink({
        title: 'API overview',
        href: `/docs/${base}/api`,
      }),
      makeLink({
        title: 'Availability',
        href: `/docs/${base}/api/availability`,
      }),
      makeLink({
        title: 'Events',
        href: `/docs/${base}/api/events`,
      }),
      makeLink({
        title: 'Reminders',
        href: `/docs/${base}/api/reminders`,
      }),
      makeLink({
        title: 'Swagger explorer',
        href: `/docs/${base}/api/swagger`,
      }),
    ],
  });
}

export function makeVendorSyncApiSet(base: string): DocGroup {
  return DocGroup.parse({
    label: 'API',
    items: [
      makeLink({
        title: 'API reference',
        href: base,
        icon: 'api',
      }),
      makeLink({
        title: 'Overview summary',
        href: `${base}/overview`,
      }),
      makeLink({
        title: 'History feed',
        href: `${base}/history`,
      }),
      makeLink({
        title: 'Registry test-all',
        href: `${base}/test-all`,
      }),
      makeLink({
        title: 'Create vendor',
        href: `${base}/vendors`,
      }),
      makeLink({
        title: 'Normalize preview',
        href: `${base}/normalize-preview`,
      }),
      makeLink({
        title: 'Apply changes',
        href: `${base}/apply`,
      }),
      makeLink({
        title: 'Swagger UI',
        href: `${base}/swagger`,
        icon: 'swagger',
      }),
    ],
  });
}

export const testingWorkflow = DocGroup.parse({
  label: 'Testing',
  items: [
    makeLink({
      title: 'Playwright workflow',
      href: '/docs/testing/playwright',
      icon: 'playwright',
    }),
  ],
});
