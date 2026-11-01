'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 }}>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '420px', width: '100%' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              Application Critical Error
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              A critical issue prevented the application from rendering.
            </p>
            {error?.digest && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '1.5rem' }}>
                Error Digest: {error.digest}
              </p>
            )}
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--text-inverse)',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
