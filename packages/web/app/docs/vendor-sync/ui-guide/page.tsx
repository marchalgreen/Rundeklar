import { Callout } from '@/components/docs/Callout';
import { Code } from '@/components/docs/Code';
import { DevToggle } from '@/components/docs/DevToggle';
import { Endpoint } from '@/components/docs/Endpoint';

export default function VendorSyncUIGuide() {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">UI guide</h1>
        <p className="text-muted-foreground">
          Every surface in Vendor Sync is built for Ops but backed by automation-friendly APIs. Use this guide to understand
          what each screen does, which metrics to watch and how to loop in engineering when something needs tuning.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Onboarding wizard</h2>
        <p className="text-sm text-foreground/80">
          Reach the wizard from <strong>Add vendor</strong>. It walks Ops through connection details, sync preferences and an
          initial normalize preview.
        </p>
        <Callout tone="warning">
          Complete the wizard even if you are missing production credentials. Save as draft and return once the vendor shares
          the live key. Drafts still show up in the vendor list with a “needs preview” badge.
        </Callout>
        <ul className="list-disc space-y-3 pl-6 text-sm text-foreground/80">
          <li>Stage connection credentials in the first step. Clairity redacts API keys after you move forward.</li>
          <li>Pick a sync cadence (daily, weekly or cron). Ops can adjust later from the vendor detail panel.</li>
          <li>The final step runs a preview normalize to catch mapping issues before Ops activates the adapter.</li>
        </ul>
        <DevToggle>
          <div className="space-y-4">
            <Endpoint method="POST" path="/vendor-sync/vendors" description="Create a vendor draft from the wizard." />
            <Code
              language="json"
              value={`{
  "slug": "raen",
  "displayName": "RAEN",
  "connection": {
    "baseUrl": "https://api.raen.com",
    "apiKey": "********",
    "scopes": ["catalog:read", "inventory:read"]
  },
  "syncWindow": {
    "cron": "0 3 * * *",
    "timezone": "America/Los_Angeles"
  }
}`}
            />
            <p className="text-xs text-muted-foreground">
              The response returns <code>status: "draft"</code> plus a generated vendor ID. The UI stores it to link future test
              runs.
            </p>
          </div>
        </DevToggle>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Vendor list</h2>
        <p className="text-sm text-foreground/80">
          The vendor list is the Ops hub. Filter by status, scope (preview/apply) or failure reason. Bulk export to CSV before
          planning promotions.
        </p>
        <ul className="list-disc space-y-3 pl-6 text-sm text-foreground/80">
          <li>
            Use quick filters (Ready, Draft, Attention) to triage. Each tile shows last successful sync, pending approvals and
            average duration.
          </li>
          <li>
            Select multiple vendors and choose <em>Test all</em> to queue previews. Clairity notifies you in-app when runs
            finish.
          </li>
          <li>
            Export CSV to share with merchandising or to reconcile inventory deltas offline.
          </li>
        </ul>
        <DevToggle title="Developer details — test-all queue">
          <div className="space-y-4">
            <Endpoint method="POST" path="/vendor-sync/registry/test-all" description="Trigger the bulk preview run." />
            <Code
              language="bash"
              value={`curl https://api.clairity.dev/vendor-sync/registry/test-all \\
  -H "Authorization: Bearer $SERVICE_JWT" \\
  -H "Content-Type: application/json" \\
  -d '{
    "includeDrafts": true,
    "notificationEmail": "ops@clairity.dev"
  }'`}
            />
          </div>
        </DevToggle>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Observability</h2>
        <p className="text-sm text-foreground/80">
          The health summary shows the last 24 hours of runs with success/failure counts and average runtime. Trend blocks give
          you a glanceable sparkline per vendor.
        </p>
        <Callout tone="info">
          Hover a trend block to see the last five runs. A dot indicates a preview, a check mark indicates a successful apply.
        </Callout>
        <ul className="list-disc space-y-3 pl-6 text-sm text-foreground/80">
          <li>Queue view shows in-flight runs. Ops can pause the queue during peak traffic windows.</li>
          <li>Health summary surfaces open alerts; click into a vendor to review detailed logs and raw payloads.</li>
          <li>Use the timeline to spot regression after a vendor pushes schema changes.</li>
        </ul>
        <DevToggle title="Developer details — fetch history">
          <div className="space-y-4">
            <Endpoint method="GET" path="/vendor-sync/history?limit=25" description="History feed powering the timeline." />
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
    }
  ]
}`}
            />
          </div>
        </DevToggle>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Registry editing</h2>
        <p className="text-sm text-foreground/80">
          Registry is where Ops approves normalize previews, edits enriched attributes and schedules apply runs.
        </p>
        <ul className="list-disc space-y-3 pl-6 text-sm text-foreground/80">
          <li>Approve or reject items inline. Approvals trigger apply eligibility for the selected run.</li>
          <li>Edit product attributes (color, material, merchandising tags) before sending to downstream systems.</li>
          <li>Add audit notes to document vendor conversations or manual overrides.</li>
        </ul>
        <DevToggle title="Developer details — apply preview">
          <div className="space-y-4">
            <Endpoint method="POST" path="/vendor-sync/{slug}/apply" description="Apply the approved preview." />
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
            <p className="text-xs text-muted-foreground">
              Ops sees this response as the toast confirmation. Engineering can poll <code>/vendor-sync/history</code> for the
              matching <code>runId</code> to track progress.
            </p>
          </div>
        </DevToggle>
      </section>
    </div>
  );
}
