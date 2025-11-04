import { Callout } from '@/components/docs/Callout';
import { Code } from '@/components/docs/Code';
import { Endpoint } from '@/components/docs/Endpoint';

export default function VendorSyncHistoryEndpoint() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">GET /vendor-sync/history</h1>
        <Endpoint
          method="GET"
          path="/vendor-sync/history?limit=25"
          description="Returns the most recent sync runs across all vendors."
        />
        <p className="text-sm text-foreground/80">
          Use this feed for observability dashboards or to populate the registry timeline. Each run includes mode, status and
          counts to align with Ops terminology.
        </p>
        <Callout tone="warning">
          <code>limit</code> defaults to 25 and maxes at 100. Paginate by storing the <code>runId</code> of the last item and
          filtering server-side.
        </Callout>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Sample request</h2>
        <Code
          language="bash"
          value={`curl "https://api.clairity.dev/vendor-sync/history?limit=10" \\
  -H "Authorization: Bearer $SERVICE_JWT" \\
  -H "Clairity-Org: $ORG_ID"`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Sample response</h2>
        <Code
          language="json"
          value={`{
  "runs": [
    {
      "runId": "run_01J9ZQKX9QFFABCD",
      "vendor": "moscot",
      "mode": "apply",
      "status": "success",
      "startedAt": "2024-09-12T07:30:11Z",
      "finishedAt": "2024-09-12T07:32:45Z",
      "totalItems": 215,
      "appliedItems": 209,
      "errorMessage": null
    },
    {
      "runId": "run_01J9ZQKX9QFFZZZZ",
      "vendor": "raen",
      "mode": "preview",
      "status": "error",
      "startedAt": "2024-09-12T04:10:00Z",
      "finishedAt": "2024-09-12T04:10:12Z",
      "totalItems": 25,
      "appliedItems": 0,
      "errorMessage": "Price missing for SKU RAEN-1001"
    }
  ]
}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Scopes</h2>
        <p className="text-sm text-foreground/80">
          Requires <code>catalog:sync:read</code>. Pair with <code>catalog:sync:write</code> when you also trigger apply or
          preview jobs.
        </p>
      </section>
    </div>
  );
}
