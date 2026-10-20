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
import { isCategoryLive } from '@/config/categories';

const SNAPSHOT_FILE = path.join(process.cwd(), 'src', 'generated', 'products-snapshot.json');

function loadFallbackProducts(includeOutOfStock = false): Product[] {
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const content = fs.readFileSync(SNAPSHOT_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as Product[]).filter(
          (p) => includeOutOfStock || (p.inStock && isCategoryLive(p.category))
        );
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
export async function getItems(options?: { includeOutOfStock?: boolean }): Promise<Product[]> {
  const includeOutOfStock = options?.includeOutOfStock ?? false;

  try {
    // In Phase 4, the gateway routes /api/public/products to Ficcado-Data:8081
    const res = await apiClient<{ success: boolean; data: Product[] }>(
      API_CONFIG.routes.products,
      {
        params: { includeOutOfStock },
        timeoutMs: 3000,
      }
    );

    if (res && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch {
    // Gateway not running yet (Phase 1–3 development mode) — fallback to catalog snapshot
  }

  return loadFallbackProducts(includeOutOfStock);
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
 * Fetches approved public reviews for an item.
 */
export async function getItemReviews(itemId: number | string): Promise<CustomerReview[]> {
  try {
    const res = await apiClient<{ success: boolean; data: CustomerReview[] }>(
      `${API_CONFIG.routes.products}/${itemId}/reviews`,
      { timeoutMs: 3000 }
    );
    if (res?.data) return res.data;
  } catch {
    // Empty review list fallback
  }
  return [];
}
