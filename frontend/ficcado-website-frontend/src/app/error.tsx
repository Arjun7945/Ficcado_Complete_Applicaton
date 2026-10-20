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
    <main className="min-h-screen bg-[#0d0d0d] text-zinc-100 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-950/40 border border-red-800/40 text-red-400 mb-2">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Something went wrong
          </h1>
          <p className="text-sm text-zinc-400">
            An unexpected error occurred while loading this page. Our team has been notified.
          </p>
          {error?.digest && (
            <p className="text-xs text-zinc-600 font-mono">
              Reference code: {error.digest}
            </p>
          )}
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-800 text-zinc-200 font-medium text-sm hover:bg-zinc-700 transition-colors border border-zinc-700/60"
          >
            <Home className="w-4 h-4" />
            Back to Storefront
          </Link>
        </div>
      </div>
    </main>
  );
}
