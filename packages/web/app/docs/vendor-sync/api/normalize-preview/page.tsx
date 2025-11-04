import { Callout } from '@/components/docs/Callout';
import { Code } from '@/components/docs/Code';
import { Endpoint } from '@/components/docs/Endpoint';

export default function VendorSyncNormalizePreviewEndpoint() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">{'POST /vendor-sync/{slug}/normalize/preview'}</h1>
        <Endpoint
          method="POST"
          path="/vendor-sync/{slug}/normalize/preview"
          description="Run normalize() for a single payload without persisting data."
        />
        <p className="text-sm text-foreground/80">
          Powers the wizard and registry preview panels. Use it when debugging payload issues or validating schema changes with
          a vendor.
        </p>
        <Callout tone="info">
          Provide a realistic <code>sample</code> payload. Clairity stores the request/response pair in the registry audit log
          so Ops can reference troubleshooting notes.
        </Callout>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Sample request</h2>
        <Code
          language="json"
          value={`{
  "sample": {
    "id": "LEMTOSH-49",
    "title": "Lemtosh 49",
    "color": "Tortoise",
    "price": 295,
    "inventory": [
      { "location": "flagship", "qty": 6 },
      { "location": "online", "qty": 7 }
    ]
  },
  "runId": "preview-2024-09-12T07:00:00Z"
}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Sample response (200)</h2>
        <Code
          language="json"
          value={`{
  "normalized": {
    "id": "LEMTOSH-49",
    "vendorProductId": "LEMTOSH-49",
    "name": "Lemtosh 49",
    "brand": "Moscot",
    "status": "active",
    "category": "frames",
    "attributes": {
      "color": "Tortoise",
      "shape": "Panto"
    },
    "pricing": {
      "currency": "USD",
      "list": 295,
      "wholesale": 145
    },
    "inventory": {
      "quantity": 13,
      "locations": [
        { "id": "flagship", "available": 6 },
        { "id": "online", "available": 7 }
      ]
    },
    "raw": { "id": "LEMTOSH-49", "price": 295 }
  },
  "validation": {
    "passed": true,
    "warnings": []
  }
}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Scopes</h2>
        <p className="text-sm text-foreground/80">
          Requires <code>catalog:sync:write</code>. Add <code>catalog:sync:admin</code> to allow preview runs for draft
          adapters without Ops approval.
        </p>
      </section>
    </div>
  );
}
