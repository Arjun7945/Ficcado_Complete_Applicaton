// =============================================================================
// Product & Catalog Data Layer — /src/lib/products.ts
// Single source of truth for products is now Ficcado-Data via the API client layer.
// Google Sheets integration completely removed.
// =============================================================================

import { getItems, getItemsResult, getItemById, getItemBySlug, type CatalogResult, type GetItemsOptions } from '@/lib/api/products';
import type { Product } from '@/types';

export type { CatalogResult, GetItemsOptions };

/**
 * Fetches catalog products from the API client layer.
 * Compatible drop-in replacement for existing page components.
 */
export async function getProducts(options?: { includeOutOfStock?: boolean }): Promise<Product[]> {
  return getItems(options);
}

/**
 * Fetches catalog products with explicit result envelope containing products and error status.
 * Allows pages to differentiate between an empty catalog and a backend failure.
 */
export async function getProductsResult(options?: GetItemsOptions): Promise<CatalogResult> {
  return getItemsResult(options);
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
