'use client';

/**
 * app/page.tsx — Application Entry Router.
 *
 * Checks auth session via /api/auth/me:
 *  - Authenticated → /sales
 *  - Not authenticated → /login
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingGecko from '@/components/LoadingGecko';
import ErrorMessage from '@/components/ErrorMessage';

export default function RootPage() {
  const router = useRouter();
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            router.replace('/dashboard/sales');
            return;
          }
        }
        router.replace('/login');
      } catch (err) {
        if (!cancelled) {
          // If auth check fails, route smoothly to login page
          router.replace('/login');
        }
      }
    }

    checkAuth();
    return () => { cancelled = true; };
  }, [router]);

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg)',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 480, width: '100%' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.20em',
              color: 'var(--color-brand-primary)',
              textTransform: 'uppercase',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            WWW.FICCADO.STORE
          </div>
          <ErrorMessage
            message={error.message}
            hint={error.hint}
            variant="error"
          />
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <LoadingGecko size="full" label="Starting Ficcado…" />;
}
