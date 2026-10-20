// =============================================================================
// Home Storefront — /
// Server Component: fetches live catalog from Google Sheets 'Item Management' in real-time
// Wrapped in Suspense boundary for useSearchParams reactivity
// =============================================================================

import { Suspense } from 'react';
import { getProducts } from '@/lib/products';
import { HomeView } from '@/components/home/HomeView';

export const revalidate = 60;

export default async function HomePage() {
  const products = await getProducts();
  return (
    <Suspense fallback={<div className="min-h-full bg-[var(--bg-app)] animate-pulse" />}>
      <HomeView initialProducts={products} />
    </Suspense>
  );
}
