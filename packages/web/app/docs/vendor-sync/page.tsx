'use client';

import Link from 'next/link';
import { Callout } from '@/components/docs/Callout';
import { Code } from '@/components/docs/Code';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';
import DocPageHeader from '@/components/docs/DocPageHeader';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  Database as DatabaseIcon,
  ShieldCheck,
  UserSwitch,
} from '@phosphor-icons/react';

export default function VendorSyncLanding() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <DocPageHeader
        eyebrow="Clairity Vendor Sync"
        title="Integrated vendor catalog sync for busy optical Ops teams"
        description="Bring every vendor feed into a single, Ops-friendly workspace. Vendor Sync pairs a guided onboarding and observability console with developer guardrails so adapters stay trustworthy as the vendor ecosystem grows."
      />

      {/* Heads up */}
      <section className="rounded-2xl ring-1 ring-[hsl(var(--line)/.12)] bg-white/70 p-6 shadow-sm backdrop-blur space-y-6">
        <Callout tone="info" title="Heads up">
          This documentation keeps Operations front-and-center. Every section includes an optional{' '}
          <strong className="ml-1 font-semibold">Developer details</strong> panel with API payloads
          and adapter notes so you can collaborate without switching tabs.
        </Callout>
      </section>

      {/* Feature tiles */}
      <section className="grid gap-6 lg:grid-cols-3">
        {[
          {
            title: 'Ops-first flows',
            copy: 'Onboard vendors, monitor health and trigger test runs without leaving the console. The copy is written for dispatchers and inventory specialists.',
            Icon: UserSwitch,
            iconClassName: 'text-[hsl(var(--accent-blue))]',
          },
          {
            title: 'Developer guardrails',
            copy: 'Adapters are validated with Zod schemas, preview sandboxes and scoped service tokens. Inline code samples show exactly what powers the UI.',
            Icon: ShieldCheck,
            iconClassName: 'text-[hsl(var(--svc-check))]',
          },
          {
            title: 'Shared source of truth',
            copy: 'NormalizedProduct stays consistent across UI, SDK and API. Apply approvals, queue replays and export CSVs without data drift.',
            Icon: DatabaseIcon,
            iconClassName: 'text-[hsl(var(--accent-blue))]',
          },
        ].map(({ Icon, iconClassName, ...item }) => (
          <div
            key={item.title}
            className="group rounded-2xl ring-1 ring-[hsl(var(--line)/.12)] bg-gradient-to-br from-white/85 to-[hsl(var(--surface-2))/0.9] p-6 shadow-[0_8px_18px_hsl(var(--accent-blue)/0.05)] transition-all duration-300 ease-out hover:translate-y-[-2px] hover:brightness-105 hover:shadow-[0_16px_36px_hsl(var(--accent-blue)/0.15)] backdrop-blur"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-white/80 to-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <Icon
                  aria-hidden
                  className={cn(
                    'size-4 transition-transform duration-300 ease-out',
                    'group-hover:-translate-y-px motion-safe:group-hover:animate-pulse',
                    iconClassName,
                  )}
                  weight="duotone"
                />
              </span>
              <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
            </div>
            <p className="mt-3 text-sm text-foreground/80">{item.copy}</p>
          </div>
        ))}
      </section>

      {/* Docs map */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">What lives where</h2>
        <p className="text-muted-foreground">
          Use the left navigation to jump between Ops playbooks and developer references. You can
          skim Ops sections for process updates while engineers expand the inline panels to wire new
          adapters or automation.
        </p>
        <Table
          caption="Docs map"
          columns={['Section', 'Primary audience', 'Highlights']}
          rows={[
            [
              <span key="section">Quickstart</span>,
              <span key="audience">Operations</span>,
              <span key="notes">Launch checklist for onboarding, testing and health reviews.</span>,
            ],
            [
              <span key="section">UI guide</span>,
              <span key="audience">Operations</span>,
              <span key="notes">
                Step-by-step walkthrough with embedded API payloads for automation.
              </span>,
            ],
            [
              <span key="section">SDK / Normalization</span>,
              <span key="audience">Developers</span>,
              <span key="notes">
                Adapter scaffolds, validation helpers and NormalizedProduct contract.
              </span>,
            ],
            [
              <>
                <span key="section">API reference</span>{' '}
                <Link className="underline" href="/docs/vendor-sync/api/swagger">
                  (Open Swagger)
                </Link>
              </>,
              <span key="audience">Developers</span>,
              <span key="notes">Scope requirements, curl examples and the OpenAPI spec.</span>,
            ],
          ]}
        />
      </section>

      {/* Example workflow */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Example workflow</h2>
        <ol className="list-decimal space-y-3 pl-5 text-sm text-foreground/85 marker:text-[hsl(var(--accent-blue))]">
          {[
            'Ops opens the Vendor Sync home to review health widgets and confirm the overnight run completed.',
            'From the vendor list, they launch the onboarding wizard to add a new partner with sandbox credentials.',
            'The test-all action verifies adapters in bulk; Ops reviews warnings and clears a normalize preview for launch.',
            'Developers monitor apply logs via the API and confirm NormalizedProduct payloads match expectations.',
          ].map((step) => (
            <li key={step} className="pl-1">
              <div className="mt-1 flex items-start gap-2 text-foreground/85">
                <CheckCircle
                  aria-hidden
                  className="mt-0.5 size-4 text-[hsl(var(--svc-check))]"
                  weight="fill"
                />
                <span>{step}</span>
              </div>
            </li>
          ))}
        </ol>
        <DevToggle title="See the service-to-service handshake">
          <p>
            Adapter automation uses a scoped JWT minted from Clairity. Include it on every request
            to the vendor-sync API. The pattern mirrors what the UI executes when you click{' '}
            <em>Test connection</em>.
          </p>
          <Code
            language="bash"
            value={`curl https://api.clairity.dev/vendor-sync/overview \\
  -H "Authorization: Bearer $SERVICE_JWT" \\
  -H "Clairity-Org: $ORG_ID"`}
          />
        </DevToggle>
      </section>
    </div>
  );
}
