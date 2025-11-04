import { Callout } from '@/components/docs/Callout';
import { Code } from '@/components/docs/Code';
import { DevToggle } from '@/components/docs/DevToggle';

export default function VendorSyncQuickstart() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">Ops quickstart</h1>
        <p className="text-muted-foreground">
          Follow these four steps to introduce a new vendor, validate the integration and keep an eye on day-to-day health.
          Each step mirrors what appears in the Vendor Sync console inside Clairity.
        </p>
      </section>

      <section className="space-y-6">
        <Callout tone="warning" title="Start from the Vendor Sync dashboard">
          From Clairity, open <strong>Operations → Vendor Sync</strong>. The dashboard shows last run health, open alerts and
          outstanding approvals before you dive into onboarding.
        </Callout>

        <ol className="list-decimal space-y-6 pl-5 text-sm text-foreground/85">
          <li>
            <strong className="font-semibold text-foreground">Collect vendor context.</strong> Gather sandbox credentials,
            support contact emails and preferred sync frequency. You can start with placeholders and update later.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Launch the onboarding wizard.</strong> Click <em>Add vendor</em>,
            enter the display name and paste connection credentials. Clairity validates the API key instantly and saves a
            draft until you complete a test run.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Run <em>Test connection</em>.</strong> The wizard executes a
            preview normalize run using sample payloads. Resolve any warnings inline or share the Developer details panel below
            with engineering.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Review health widgets daily.</strong> The dashboard shows
            trendlines for throughput, failure rate and pending approvals. Use <em>Test all adapters</em> before major promos or
            catalog freezes.
          </li>
        </ol>
      </section>

      <DevToggle>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Mint a developer token</h2>
          <p>
            Engineering teams can mirror the wizard by using a scoped service token. Mint one in Clairity under
            <strong className="mx-1">Settings → Developer tokens</strong> with the <code>catalog:sync:write</code> scope.
            Store the JWT securely (1 hour TTL by default).
          </p>
          <Code
            language="bash"
            value={`curl https://api.clairity.dev/vendor-sync/vendors \\
  -H "Authorization: Bearer $SERVICE_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{
    "slug": "moscot",
    "displayName": "Moscot",
    "connection": {
      "baseUrl": "https://api.moscot.com",
      "apiKey": "$MOSCOT_API_KEY",
      "scopes": ["catalog:read"]
    }
  }'`}
          />
          <p className="text-sm text-muted-foreground">
            The wizard uses the same endpoint. When the response returns a <code>draft</code> status, the UI prompts Ops to run
            a preview before activating the adapter.
          </p>
        </div>
      </DevToggle>
    </div>
  );
}
