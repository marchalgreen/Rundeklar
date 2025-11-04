import VendorList from '@/components/vendor-sync/VendorList';
import VendorSyncNav from '@/components/vendor-sync/VendorSyncNav';

export const metadata = {
  title: 'Vendor sync onboarding',
};

export default function VendorSyncVendorsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Vendor sync</h1>
        <p className="text-sm text-muted-foreground">
          Onboard nye leverandører, vælg integrationstype og del SDK-kommandoer med udviklere.
        </p>
      </div>

      <VendorSyncNav active="preview-apply" className="w-full max-w-md" />

      <VendorList />
    </main>
  );
}
