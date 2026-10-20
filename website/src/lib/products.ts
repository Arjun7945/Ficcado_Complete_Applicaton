// =============================================================================
// Product & Catalog Data Layer — /src/lib/products.ts
// Single source of truth for products is now Ficcado-Data via the API client layer.
// Google Sheets integration completely removed.
// =============================================================================

import { getItems, getItemById, getItemBySlug } from '@/lib/api/products';
import type { Product } from '@/types';

/**
 * Fetches catalog products from the API client layer.
 * Compatible drop-in replacement for existing page components.
 */
export async function getProducts(options?: { includeOutOfStock?: boolean }): Promise<Product[]> {
  return getItems(options);
}

/**
 * Returns single product by ID.
 */
export async function getProductById(id: number | string): Promise<Product | undefined> {
  return getItemById(id);
}

/**
 * Returns single product by slug.
 */
export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return getItemBySlug(slug);
}
