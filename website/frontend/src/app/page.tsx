// =============================================================================
// Home Storefront — /
// Server Component: fetches live catalog from product service API in real-time
// Wrapped in Suspense boundary for useSearchParams reactivity
// =============================================================================

import { Suspense } from 'react';
import { getProductsResult } from '@/lib/products';
import { HomeView } from '@/components/home/HomeView';

export const revalidate = 60;

export default async function HomePage() {
  const result = await getProductsResult();
  return (
    <Suspense fallback={<div className="min-h-full bg-[var(--bg-app)] animate-pulse" />}>
      <HomeView initialProducts={result.products} catalogError={result.error} />
    </Suspense>
  );
}
