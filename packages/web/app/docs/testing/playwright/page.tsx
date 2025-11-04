import type { Metadata } from 'next';

import { Callout } from '@/components/docs/Callout';
import DocPageHeader from '@/components/docs/DocPageHeader';

export const metadata: Metadata = {
  title: 'Testing with Playwright | Clairity Docs',
  description:
    'How to run Clairity end-to-end tests with Playwright, including auth minting, network stubs, selectors, and dev DB setup.',
};

export default function PlaywrightGuidePage() {
  return (
    <article className="space-y-12">
      <DocPageHeader
        eyebrow="Testing"
        title="Testing with Playwright"
        description="Ship reliable end-to-end coverage with Clairity’s Playwright harness, authentication helpers, and accessible selectors."
      />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Minting authentication for tests</h2>
        <p>
          Use the{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            /tests/utils/auth.ts
          </code>{' '}
          helpers to mint session cookies before navigating to the app. The helper calls the same{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            POST /api/auth/dev-mint
          </code>{' '}
          endpoint that store associates use, so your tests exercise the full auth stack without
          depending on UI flows.
        </p>
        <p>
          In Playwright, add the fixture to{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            packages/web/tests/fixtures.ts
          </code>{' '}
          and call{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            await authState.signIn()
          </code>{' '}
          during{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            beforeEach
          </code>
          . The helper writes the authenticated storage state to{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            packages/web/tests/.auth/clairity.json
          </code>
          , letting every test reuse the cookie jar.
        </p>
        <Callout title="Tip" variant="success">
          For multi-role scenarios, mint additional tokens with the{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            mintRole
          </code>{' '}
          helper and swap the storage state at runtime using{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            context.addCookies
          </code>
          .
        </Callout>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Stubbing network traffic</h2>
        <p>
          Clairity relies on background sync jobs, so deterministic tests should intercept
          third-party network calls. Register route handlers with{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            page.route()
          </code>{' '}
          inside the{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            beforeEach
          </code>{' '}
          hook and respond with fixtures from{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            packages/web/tests/fixtures/network
          </code>
          . Keep the stubs lean—only override calls that would otherwise hit flaky upstream
          services.
        </p>
        <p>
          When you do need to observe real traffic, call{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            page.unroute()
          </code>{' '}
          for a specific matcher. The rest of the test can continue to operate against stubbed
          endpoints, preserving determinism while still covering key integrations.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Selectors and accessibility</h2>
        <p>
          Target elements with the same accessibility primitives used in production. Prefer{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            getByRole()
          </code>
          ,{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            getByLabel()
          </code>
          , or{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            getByTestId()
          </code>{' '}
          (for complex widgets) over brittle CSS selectors. All primary controls ship with ARIA
          roles, so the selectors mirror what screen readers expose to customers.
        </p>
        <p>
          Enable Playwright’s built-in accessibility snapshot via{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            await page.accessibility.snapshot()
          </code>{' '}
          during debugging. We include an{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            axe
          </code>{' '}
          audit in{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            tests/a11y.spec.ts
          </code>
          —run it locally before merging large UI changes to catch regressions early.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">
          Development database configuration
        </h2>
        <p>
          The test runner boots the same Next.js server you use locally. Point it at the throwaway
          SQLite database by exporting{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            DATABASE_URL="file:./.tmp/dev.db"
          </code>{' '}
          before running{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            pnpm test:e2e
          </code>
          . Each test suite seeds data via{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            tests/utils/seeds.ts
          </code>
          , so you can reset the state with{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            pnpm db:seed --env test
          </code>{' '}
          whenever fixtures drift.
        </p>
        <p>
          CI uses the same schema but stores the database in the ephemeral workspace. Keep
          migrations deterministic and include a cleanup step (
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground/90">
            await resetDatabase()
          </code>
          ) at the end of destructive tests to leave the environment ready for the next worker.
        </p>
      </section>
    </article>
  );
}
