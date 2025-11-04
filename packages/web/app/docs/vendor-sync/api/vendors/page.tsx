import { Callout } from '@/components/docs/Callout';
import { Code } from '@/components/docs/Code';
import { Endpoint } from '@/components/docs/Endpoint';

export default function VendorSyncVendorsEndpoint() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">POST /vendor-sync/vendors</h1>
        <Endpoint method="POST" path="/vendor-sync/vendors" description="Create or update a vendor adapter." />
        <p className="text-sm text-foreground/80">
          This mirrors the onboarding wizard. Supply connection credentials, sync window and optional contacts. The API returns
          the saved vendor state including draft vs ready status.
        </p>
        <Callout tone="warning">
          Use an <code>Idempotency-Key</code> header if you retry requests from automation. Duplicate payloads will return the
          original vendor document when the key matches.
        </Callout>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Sample request</h2>
        <Code
          language="json"
          value={`{
  "slug": "new-vendor",
  "displayName": "New Vendor",
  "connection": {
    "baseUrl": "https://partners.new-vendor.com",
    "apiKey": "********",
    "scopes": ["catalog:read"]
  },
  "syncWindow": {
    "cron": "0 2 * * *",
    "timezone": "America/New_York"
  },
  "contacts": [
    { "name": "Jules", "email": "jules@new-vendor.com", "role": "Support" }
  ]
}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Sample response (201)</h2>
        <Code
          language="json"
          value={`{
  "slug": "new-vendor",
  "displayName": "New Vendor",
  "status": "draft",
  "lastSuccessfulSyncAt": null,
  "normalizedProducts": 0,
  "pendingActions": 1
}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Scopes</h2>
        <p className="text-sm text-foreground/80">
          Requires <code>catalog:sync:write</code>. Grant <code>catalog:sync:admin</code> to allow automation to enable vendors
          without Ops approval.
        </p>
      </section>
    </div>
  );
}
