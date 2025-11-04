import { Callout } from '@/components/docs/Callout';
import { Code } from '@/components/docs/Code';
import { Endpoint } from '@/components/docs/Endpoint';

export default function VendorSyncApplyEndpoint() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">{'POST /vendor-sync/{slug}/apply'}</h1>
        <Endpoint method="POST" path="/vendor-sync/{slug}/apply" description="Promote the latest approved preview to apply." />
        <p className="text-sm text-foreground/80">
          Ops triggers this from the registry after reviewing normalize diffs. Automation can call it to schedule apply runs or
          sync with downstream planning tools.
        </p>
        <Callout tone="danger">
          Apply runs mutate production inventory. Always confirm the preview has Ops approval before calling this endpoint.
          Use <code>dryRun: true</code> to validate payloads without persisting.
        </Callout>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Sample request</h2>
        <Code
          language="json"
          value={`{
  "runId": "preview-2024-09-12T07:00:00Z",
  "dryRun": false,
  "notes": "Ops approved after reviewing wholesale pricing."
}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Sample response (202)</h2>
        <Code
          language="json"
          value={`{
  "status": "queued",
  "vendor": "moscot",
  "runId": "apply-2024-09-12",
  "approvalsRequired": 0,
  "warnings": []
}`}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Scopes</h2>
        <p className="text-sm text-foreground/80">
          Requires <code>catalog:sync:write</code> plus <code>catalog:sync:admin</code> when bypassing Ops approval for emergency
          fixes.
        </p>
      </section>
    </div>
  );
}
