'use client';

import { useEffect, useMemo, useState } from 'react';

type SwaggerEmbedProps = {
  /** Relative or absolute URL to the Swagger HTML explorer. */
  url: string;
  height?: number;
};

export default function SwaggerEmbed({ url, height = 720 }: SwaggerEmbedProps) {
  const sanitizedSrc = useMemo(() => {
    try {
      const targetUrl = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      return targetUrl.toString();
    } catch (error) {
      return url;
    }
  }, [url]);

  // Avoid server/client HTML mismatches by rendering the iframe only on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="rounded-xl border border-border/60 bg-background/70 shadow-sm">
      {mounted ? (
        <iframe
          title="Swagger UI"
          src={sanitizedSrc}
          className="w-full rounded-xl"
          style={{ height, border: 'none' }}
          allow="clipboard-read; clipboard-write"
        />
      ) : (
        <div style={{ height }} className="w-full rounded-xl" aria-hidden />
      )}
    </div>
  );
}
