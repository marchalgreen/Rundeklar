import ObservabilityWindow from '@/components/vendor-sync/ObservabilityWindow';
import VendorSyncNav from '@/components/vendor-sync/VendorSyncNav';
import { DEFAULT_VENDOR_NAME, DEFAULT_VENDOR_SLUG } from '@/lib/catalog/vendorSlugs';

export const metadata = {
  title: 'Vendor sync observability',
};

export default function VendorSyncPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Vendor sync</h1>
        <p className="text-sm text-muted-foreground">
          Følg leverandørsynkroniseringer, status og tidsvindue for {DEFAULT_VENDOR_NAME} kataloget
        </p>
      </div>

      <VendorSyncNav active="observability" className="w-full max-w-md" />

      <ObservabilityWindow
        vendorId={DEFAULT_VENDOR_SLUG}
        vendorLabel={`${DEFAULT_VENDOR_NAME} katalog`}
      />
    </main>
  );
}
