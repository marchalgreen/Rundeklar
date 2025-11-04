import RegistryWindow from '@/components/vendor-sync/RegistryWindow';
import VendorSyncNav from '@/components/vendor-sync/VendorSyncNav';

export const metadata = {
  title: 'Vendor sync registry',
};

export default function VendorSyncRegistryPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Vendor sync</h1>
        <p className="text-sm text-muted-foreground">
          Konfigurer integrationer, test forbindelser og se seneste synkroniseringer for alle
          leverandører.
        </p>
      </div>

      <VendorSyncNav active="registry" className="w-full max-w-md" />

      <RegistryWindow />
    </main>
  );
}
