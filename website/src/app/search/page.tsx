// =============================================================================
// Live Search & Discovery — /search
// Server Component pre-rendering catalog with ISR (revalidate = 60)
// Passes initial products directly to SearchView (eliminating client waterfall)
// =============================================================================

import type { Metadata } from 'next';
import { getProducts } from '@/lib/products';
import { SearchView } from '@/components/search/SearchView';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Search Catalog | Ficcado',
  description: 'Search our heavyweight oversized drops, street packs, and curated fits.',
  robots: { index: true, follow: true },
};

export default async function SearchPage() {
  const products = await getProducts();
  return <SearchView initialProducts={products} />;
}
