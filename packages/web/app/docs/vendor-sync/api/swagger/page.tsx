import type { Metadata } from 'next';

import DocPageHeader from '@/components/docs/DocPageHeader';
import SwaggerEmbed from '@/components/docs/SwaggerEmbed.client';

export const metadata: Metadata = {
  title: 'Vendor Sync API Swagger explorer | Clairity Docs',
  description:
    'Inspect and interact with the Vendor Sync OpenAPI specification inside the embedded Swagger UI explorer.',
};

export default function VendorSyncSwaggerPage() {
  return (
    <article className="space-y-8">
      <DocPageHeader
        eyebrow="API"
        title="Swagger explorer"
        description="Interact with every Vendor Sync endpoint using the hosted Swagger UI backed by our OpenAPI spec."
      />
      <SwaggerEmbed url="/api/docs/swagger?spec=/api/docs/vendor-sync.json" height={720} />
    </article>
  );
}
