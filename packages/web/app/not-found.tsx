// App Router 404 page
// https://nextjs.org/docs/app/api-reference/file-conventions/not-found

export default function NotFound() {
  return (
    <main style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Page not found</h1>
      <p style={{ color: '#666' }}>
        The page you are looking for does not exist.
      </p>
    </main>
  );
}
