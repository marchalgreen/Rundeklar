import DocPageHeader from '@/components/docs/DocPageHeader';
import SwaggerEmbed from '@/components/docs/SwaggerEmbed.client';

export default function CalendarSwaggerPage() {
  return (
    <article className="space-y-6">
      <DocPageHeader
        eyebrow="Calendar"
        title="Swagger explorer"
        description="Browse the Calendar REST API via Swagger UI backed by the generated OpenAPI spec."
      />
      <SwaggerEmbed url="/api/docs/swagger?spec=/api/docs/calendar.json" height={720} />
    </article>
  );
}
