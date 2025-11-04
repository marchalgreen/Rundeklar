import Link from 'next/link';

import { Callout } from '@/components/docs/Callout';
import { Code } from '@/components/docs/Code';
import { DevToggle } from '@/components/docs/DevToggle';

export default function VendorSyncAPIIntro() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">API fundamentals</h1>
        <p className="text-muted-foreground">
          Vendor Sync exposes the same flows as the UI: fetch health summaries, manage vendors and promote previews to apply.
          All endpoints require a Clairity-issued service token.
        </p>
        <Callout tone="info">
          Use the <Link href="/api/docs/vendor-sync.json" className="font-semibold text-[hsl(var(--accent-blue))]">OpenAPI
            document</Link> or the optional Swagger UI embed to explore schema details interactively.
        </Callout>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Authentication</h2>
        <p className="text-sm text-foreground/80">
          Generate a service JWT from <strong>Settings → Developer tokens</strong>. Vendor Sync endpoints accept the token via
          <code>Authorization: Bearer &lt;token&gt;</code>. Tokens default to one hour TTL.
        </p>
        <ul className="list-disc space-y-3 pl-6 text-sm text-foreground/80">
          <li><code>catalog:sync:read</code> — fetch overview and history.</li>
          <li><code>catalog:sync:write</code> — create vendors, run tests, apply previews.</li>
          <li><code>catalog:sync:admin</code> — override approvals and manage registry metadata.</li>
        </ul>
        <Code
          language="bash"
          value={`curl https://api.clairity.dev/vendor-sync/overview \\
  -H "Authorization: Bearer $SERVICE_JWT" \\
  -H "Clairity-Org: $ORG_ID"`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Standard headers</h2>
        <p className="text-sm text-foreground/80">
          Vendor Sync respects Clairity&apos;s multi-org headers. Always include the organization ID so the request routes to the
          correct tenant.
        </p>
        <TableOfHeaders />
      </section>

      <DevToggle title="Developer details — axios pattern">
        <Code
          language="typescript"
          value={`const client = axios.create({
  baseURL: 'https://api.clairity.dev/vendor-sync',
  headers: {
    Authorization: ` + "`Bearer ${serviceToken}`" + `,
    'Clairity-Org': orgId,
  },
});

const overview = await client.get('/overview');
const history = await client.get('/history', { params: { limit: 50 } });`}
        />
      </DevToggle>
    </div>
  );
}

function TableOfHeaders() {
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-6 text-sm text-foreground/80">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Header</span>
        <span className="font-semibold">Purpose</span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <code>Authorization</code>
          <p className="text-right text-xs text-muted-foreground">Bearer token minted from Clairity.</p>
        </div>
        <div className="flex items-start justify-between gap-4">
          <code>Clairity-Org</code>
          <p className="text-right text-xs text-muted-foreground">Tenant routing ID. Required for all service calls.</p>
        </div>
        <div className="flex items-start justify-between gap-4">
          <code>Idempotency-Key</code>
          <p className="text-right text-xs text-muted-foreground">Optional — repeatable writes such as <code>POST /vendors</code>.</p>
        </div>
      </div>
    </div>
  );
}
