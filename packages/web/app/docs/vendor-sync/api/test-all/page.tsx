import { Callout } from '@/components/docs/Callout';
import { Code } from '@/components/docs/Code';
import { Endpoint } from '@/components/docs/Endpoint';

export default function VendorSyncTestAllEndpoint() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">POST /vendor-sync/registry/test-all</h1>
        <Endpoint
          method="POST"
          path="/vendor-sync/registry/test-all"
          description="Queues preview runs for every registered vendor adapter."
        />
        <p className="text-sm text-foreground/80">
          Mirror the <em>Test all</em> button from the vendor list. Ops uses it before large promotions or when refreshing
          credentials.
        </p>
        <Callout tone="warning">
          The response status is <code>202 Accepted</code>. Use the returned <code>runId</code> to poll
          <code>/vendor-sync/history</code> for completion.
        </Callout>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Sample request</h2>
        <Code
          language="bash"
          value={`curl https://api.clairity.dev/vendor-sync/registry/test-all \\
  -X POST \\
  -H "Authorization: Bearer $SERVICE_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{
    "includeDrafts": false,
    "notificationEmail": "ops@clairity.dev"
  }'`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Sample response (202)</h2>
        <Code
          language="json"
          value={`{
  "status": "queued",
  "runId": "test-2024-09-12",
  "startedAt": "2024-09-12T07:00:00Z",
  "vendors": [
    { "slug": "moscot", "status": "queued" },
    { "slug": "raen", "status": "queued" }
  ]
}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Scopes</h2>
        <p className="text-sm text-foreground/80">
          Requires <code>catalog:sync:write</code>. Add <code>catalog:sync:admin</code> to bypass Ops approval for draft
          adapters.
        </p>
      </section>
    </div>
  );
}
