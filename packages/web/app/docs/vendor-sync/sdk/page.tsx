import { Callout } from '@/components/docs/Callout';
import { Code } from '@/components/docs/Code';
import { DevToggle } from '@/components/docs/DevToggle';
import { Table } from '@/components/docs/Table';

export default function VendorSyncSDK() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">Adapter SDK</h1>
        <p className="text-muted-foreground">
          Build new vendor adapters with the Clairity SDK. The toolkit standardizes normalize pipelines, validation rules and
          test placement so Ops and engineering stay in lockstep.
        </p>
        <Callout tone="info">
          The SDK lives inside the main monorepo. Run the commands below from your local checkout. Each adapter is a
          self-contained package with tests, fixtures and a normalization contract.
        </Callout>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Scaffold a new adapter</h2>
        <p className="text-sm text-foreground/80">
          Use the generator to create a ready-to-wire adapter. It seeds a Zod schema, normalize function stub and fixture
          folder.
        </p>
        <Code
          language="bash"
          value={`pnpm tsx scripts/create-adapter.ts moskot \
  --display "Moscot" \
  --type catalog`}
        />
        <p className="text-xs text-muted-foreground">
          Update <code>connection.json</code> with partner credentials. Check the generated <code>README</code> for expected
          payload fields.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Adapter anatomy</h2>
        <Table
          columns={['File', 'Purpose']}
          rows={[
            [
              <code key="schema">schema.ts</code>,
              <span key="purpose">Zod schema describing the vendor payload. Keep it lenient enough to cover historical data.</span>,
            ],
            [
              <code key="normalize">normalize.ts</code>,
              <span key="purpose">Transforms raw payload into <code>NormalizedProduct</code>. This is where attribute mapping lives.</span>,
            ],
            [
              <code key="tests">__tests__/normalize.spec.ts</code>,
              <span key="purpose">Unit tests comparing fixtures to normalized results. Include at least one error case.</span>,
            ],
            [
              <code key="fixtures">fixtures/*.json</code>,
              <span key="purpose">Realistic payload captures for regression tests and preview sandbox.</span>,
            ],
          ]}
        />
        <DevToggle title="Developer details — normalize signature" defaultOpen>
          <Code
            language="typescript"
            value={`export const normalize = async (
  input: VendorPayload,
  context: NormalizeContext,
): Promise<NormalizedProduct> => {
  const parsed = vendorPayloadSchema.parse(input);
  return {
    id: parsed.id,
    vendorProductId: parsed.id,
    name: parsed.name,
    brand: parsed.brand ?? 'Unknown',
    status: parsed.active ? 'active' : 'inactive',
    category: mapCategory(parsed.category),
    pricing: {
      currency: parsed.currency ?? 'USD',
      list: parsed.price,
      wholesale: parsed.wholesalePrice ?? null,
    },
    inventory: {
      quantity: parsed.inventory ?? null,
      locations: buildLocations(parsed.locations),
    },
    attributes: buildAttributes(parsed),
    raw: parsed,
  };
};`}
          />
        </DevToggle>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Validate before shipping</h2>
        <p className="text-sm text-foreground/80">
          Run lint, typecheck and the adapter test suite before handing off to Ops. These mirror the CI gates in Clairity.
        </p>
        <Code
          language="bash"
          value={`pnpm lint
pnpm typecheck
pnpm tsx --test src/vendor-sync/adapters/moscot/__tests__/normalize.spec.ts`}
        />
        <Callout tone="danger">
          Never skip tests when adjusting normalization. Ops relies on preview diffs to review vendor changes. Missing tests
          can hide regressions until apply time.
        </Callout>
      </section>
    </div>
  );
}
