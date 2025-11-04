import Link from 'next/link';
import { getSectionNav } from '@/components/docs/nav';
import UnifiedDocLayout from '@/components/docs/UnifiedDocLayout';
import FeatureCard from '@/components/docs/FeatureCard';

export default function DocsIndexPage() {
  const section = getSectionNav('home');

  return (
    <UnifiedDocLayout section={section}>
      <article className="space-y-12">
        {/* Hero header */}
        <header className="space-y-2">
          <p className="text-xs tracking-wide text-[hsl(var(--muted))] uppercase">Documentation</p>
          <h1 className="text-3xl font-semibold text-foreground">Unified docs hub</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted))]">
            Jump into Clairity product areas, explore the OpenAPI specs, and read through testing
            workflows without switching tabs.
          </p>
        </header>

        {/* Featured modules */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Featured modules</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              iconName="calendar"
              title="Calendar"
              description="Availability, booking, reminders and webhooks."
              href="/docs/calendar"
              cta="Explore overview →"
            />
            <FeatureCard
              iconName="plugs"
              title="Vendor Sync"
              description="Registry, test flows, preview/apply and observability."
              href="/docs/vendor-sync"
              cta="View quickstart →"
            />
          </div>
        </section>

        {/* API explorers */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">API explorers</h2>
          <p className="text-sm leading-relaxed text-[hsl(var(--muted))]">
            Need to inspect a contract? Launch the Swagger explorer to browse every endpoint
            straight from the docs.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              iconName="calendar"
              title="Calendar API"
              description="Try live endpoints using the generated OpenAPI spec."
              href="/docs/calendar/api/swagger"
              cta="Open Swagger →"
            />
            <FeatureCard
              iconName="plugs"
              title="Vendor Sync API"
              description="Browse registry, runs, and state endpoints from the docs."
              href="/docs/vendor-sync/api/swagger"
              cta="Open Swagger →"
            />
          </div>
        </section>

        {/* Testing workflows */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Testing workflows</h2>
          <p className="text-sm leading-relaxed text-[hsl(var(--muted))]">
            Follow the Playwright guide for authenticated journeys, reliable fixtures, and
            accessibility coverage.
          </p>
          <Link
            href="/docs/testing/playwright"
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent-blue))/40] bg-[hsl(var(--accent-blue))/0.08] px-4 py-2 text-sm font-semibold text-[hsl(var(--accent-blue))] transition hover:bg-[hsl(var(--accent-blue))/0.12]"
          >
            Read the Playwright guide
          </Link>
        </section>
      </article>
    </UnifiedDocLayout>
  );
}
