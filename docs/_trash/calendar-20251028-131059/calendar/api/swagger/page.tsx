import type { Metadata } from 'next';

import DocPageHeader from '@/components/docs/DocPageHeader';
import SwaggerEmbed from '@/components/docs/SwaggerEmbed.client';

export const metadata: Metadata = {
  title: 'Calendar API Swagger explorer | Clairity Docs',
  description:
    'Explore the Clairity calendar REST API via the hosted Swagger UI backed by the OpenAPI specification.',
};

export default function CalendarSwagger() {
  return (
    <article className="space-y-8">
      <DocPageHeader
        eyebrow="API"
        title="Swagger explorer"
        description="Try the calendar API directly from your browser using the generated OpenAPI spec."
      />
      <SwaggerEmbed url="/api/docs/swagger?spec=/api/docs/calendar.json" height={720} />
    </article>
  );
}
