// =============================================================================
// Product Catalog API — /src/lib/api/products.ts
// Client layer for fetching product data from Ficcado-Data microservice via Gateway.
// Replaces previous Google Sheets integration.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { apiClient } from './client';
import { API_CONFIG } from './config';
import type { Product, CustomerReview } from '@/types';
import { isCategoryLive, CATEGORIES_CONFIG, type CategoryConfig } from '@/config/categories';

const SNAPSHOT_FILE = path.join(process.cwd(), 'src', 'generated', 'products-snapshot.json');

export interface GetItemsOptions {
  includeOutOfStock?: boolean;
  category?: string;
  search?: string;
}

function loadFallbackProducts(options?: GetItemsOptions): Product[] {
  const includeOutOfStock = options?.includeOutOfStock ?? false;
  const category = options?.category?.toLowerCase();
  const search = options?.search?.toLowerCase().trim();

  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const content = fs.readFileSync(SNAPSHOT_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as Product[]).filter((p) => {
          const stockMatch = includeOutOfStock || (p.inStock && isCategoryLive(p.category));
          const categoryMatch = !category || category === 'all' || p.category.toLowerCase() === category;
          const searchMatch =
            !search ||
            p.name.toLowerCase().includes(search) ||
            (p.desc && p.desc.toLowerCase().includes(search));
          return stockMatch && categoryMatch && searchMatch;
        });
      }
    }
  } catch (err) {
    console.warn('[Catalog API] Unable to load fallback products:', (err as Error).message);
  }
  return [];
}

/**
 * Fetches all active products from Ficcado-Data via Gateway.
 * Gracefully uses local fallback during development / offline build if gateway is not reachable.
 */
export async function getItems(options?: GetItemsOptions): Promise<Product[]> {
  const includeOutOfStock = options?.includeOutOfStock ?? false;
  const category = options?.category;
  const search = options?.search;

  try {
    // In Phase 4, the gateway routes /api/public/products to Ficcado-Data:8081
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

    if (res && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch {
    // Gateway not running yet / offline build mode — fallback to catalog snapshot
  }

  return loadFallbackProducts(options);
}

/**
 * Fetches single product by ID.
 */
export async function getItemById(id: number | string): Promise<Product | undefined> {
  try {
    const res = await apiClient<{ success: boolean; data: Product }>(
      `${API_CONFIG.routes.products}/${id}`,
      { timeoutMs: 3000 }
    );
    if (res?.data) return res.data;
  } catch {
    // Fallback search
  }

  const all = await getItems({ includeOutOfStock: true });
  return all.find((p) => String(p.id) === String(id));
}

/**
 * Fetches single product by URL slug.
 */
export async function getItemBySlug(slug: string): Promise<Product | undefined> {
  try {
    const res = await apiClient<{ success: boolean; data: Product }>(
      `${API_CONFIG.routes.products}/by-slug/${slug}`,
      { timeoutMs: 3000 }
    );
    if (res?.data) return res.data;
  } catch {
    // Fallback search
  }

  const all = await getItems({ includeOutOfStock: true });
  return all.find((p) => p.slug === slug);
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
