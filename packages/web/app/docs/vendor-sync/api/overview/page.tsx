import * as React from 'react';
import { Callout } from '@/components/docs/Callout';
import { Code } from '@/components/docs/Code';
import { Endpoint } from '@/components/docs/Endpoint';

export default function VendorSyncOverviewEndpoint() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">GET /vendor-sync/overview</h1>
        <Endpoint method="GET" path="/vendor-sync/overview" description="Summarizes the current state of every vendor." />
        <p className="text-sm text-foreground/80">
          Use this endpoint for dashboard tiles or Slack alerts. It mirrors the vendor list hero metrics shown to Ops.
        </p>
        <Callout tone="info">
          Response objects are sorted alphabetically by vendor slug. Poll every 10 minutes to stay inside vendor rate limits.
        </Callout>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Sample request</h2>
        <Code
          language="bash"
          value={`curl https://api.clairity.dev/vendor-sync/overview \\
  -H "Authorization: Bearer $SERVICE_JWT" \\
  -H "Clairity-Org: $ORG_ID"`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Sample response</h2>
        <Code
          language="json"
          value={`{
  "vendors": [
    {
      "slug": "moscot",
      "displayName": "Moscot",
      "status": "ready",
      "lastSuccessfulSyncAt": "2024-09-12T10:00:00Z",
      "normalizedProducts": 1240,
      "pendingActions": 2
    }
  ],
  "nextRunAt": "2024-09-13T02:00:00Z"
}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Scopes</h2>
        <p className="text-sm text-foreground/80">
          Requires <code>catalog:sync:read</code>. Pair with a short-lived token to power internal dashboards.
        </p>
      </section>
    </div>
  );
}
