'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Structured console error without leaking customer PII
    console.error('[Application Error Boundary]', {
      name: error?.name,
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <main className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-surface)] border border-[var(--accent-red)] text-[var(--accent-red)] mb-2 shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-3xl">
            Something went wrong
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            An unexpected error occurred while loading this page. Our team has been notified.
          </p>
          {error?.digest && (
            <p className="text-xs text-[var(--text-muted)] font-mono">
              Reference code: {error.digest}
            </p>
          )}
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="btn-secondary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Back to Storefront
          </Link>
        </div>
      </div>
    </main>
  );
}
