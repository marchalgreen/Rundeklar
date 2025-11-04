'use client';

// Global error boundary for the App Router.
// This file must be a Client Component and may return <html>/<body>.
// https://nextjs.org/docs/app/building-your-application/routing/error-handling#global-error

export default function GlobalError({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#666', marginBottom: 12 }}>
            Please try again or go back to the previous page.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
