// =============================================================================
// Product Catalog API — /src/lib/api/products.ts
// Client layer for fetching product data from Ficcado-Data microservice via Gateway.
// Replaces previous Google Sheets integration.
// =============================================================================

import { apiClient } from './client';
import { API_CONFIG } from './config';
import type { Product, CustomerReview } from '@/types';
import { CATEGORIES_CONFIG, type CategoryConfig } from '@/config/categories';

export interface GetItemsOptions {
  includeOutOfStock?: boolean;
  category?: string;
  search?: string;
}

export interface CatalogResult {
  products: Product[];
  error?: string | null;
}

/**
 * Fetches products from Ficcado-Data via Gateway with explicit success/error state.
 * Never loads dummy or snapshot data on empty catalog or backend failure.
 */
export async function getItemsResult(options?: GetItemsOptions): Promise<CatalogResult> {
  const includeOutOfStock = options?.includeOutOfStock ?? false;
  const category = options?.category;
  const search = options?.search;

  try {
    const res = await apiClient<{ success: boolean; data: Product[] }>(
      API_CONFIG.routes.products,
      {
        params: {
          includeOutOfStock,
          ...(category && category !== 'all' ? { category } : {}),
          ...(search ? { search } : {}),
        },
        timeoutMs: 3000,
      }
    );

    if (res && Array.isArray(res.data)) {
      return { products: res.data, error: null };
    }
    return { products: [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to reach product service';
    console.warn('[Catalog API] Failed to fetch products from backend:', message);
    return { products: [], error: message };
  }
}

/**
 * Fetches all active products from Ficcado-Data via Gateway.
 * Returns empty array if catalog is empty or backend is unreachable.
 */
export async function getItems(options?: GetItemsOptions): Promise<Product[]> {
  const result = await getItemsResult(options);
  return result.products;
}

/**
 * Fetches single product by ID.
 * Returns undefined if item is not found or backend fails.
 */
export async function getItemById(id: number | string): Promise<Product | undefined> {
  try {
    const res = await apiClient<{ success: boolean; data: Product }>(
      `${API_CONFIG.routes.products}/${id}`,
      { timeoutMs: 3000 }
    );
    if (res?.data) return res.data;
  } catch {
    // Return undefined if not found or backend fails
  }

  return undefined;
}

/**
 * Fetches single product by URL slug.
 * Returns undefined if item is not found or backend fails.
 */
export async function getItemBySlug(slug: string): Promise<Product | undefined> {
  try {
    const res = await apiClient<{ success: boolean; data: Product }>(
      `${API_CONFIG.routes.products}/by-slug/${slug}`,
      { timeoutMs: 3000 }
    );
    if (res?.data) return res.data;
  } catch {
    // Return undefined if not found or backend fails
  }

  return undefined;
}

/**
 * Fetches storefront categories with live item counts from Ficcado-Data via Gateway.
 */
export async function getCategories(): Promise<CategoryConfig[]> {
  try {
    const res = await apiClient<{ success: boolean; data: CategoryConfig[] }>(
      API_CONFIG.routes.categories,
      { timeoutMs: 3000 }
    );
    if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch {
    // Fallback to static category config
  }
  return CATEGORIES_CONFIG;
}

/**
 * Fetches approved public reviews for an item.
 */
export async function getItemReviews(itemId: number | string): Promise<CustomerReview[]> {
  try {
    const res = await apiClient<{ success: boolean; data: CustomerReview[] }>(
      `${API_CONFIG.routes.products}/${itemId}/reviews`,
      { timeoutMs: 3000 }
    );
    if (res?.data && Array.isArray(res.data)) return res.data;
  } catch {
    // Empty review list fallback
  }
  return [];
}
