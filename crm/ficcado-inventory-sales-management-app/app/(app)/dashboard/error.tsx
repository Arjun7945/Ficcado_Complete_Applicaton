'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard runtime error:', error);
  }, [error]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-4">
        <h2 className="text-xl font-bold text-red-700">Something went wrong</h2>
        <p className="text-sm text-red-600">
          {error.message || 'An unexpected error occurred while rendering the dashboard.'}
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
