// =============================================================================
// Wishlist API Client Layer — Section P2-5
// Interacts with /api/wishlist on Ficcado-Website-Data through the NGINX Gateway.
// Protected by gateway auth_request session validation.
// Hydrates full product data via Ficcado-Data /api/public/products/by-ids.
// =============================================================================

import { API_CONFIG } from '@/lib/api/config';
import type { WishlistItem, Product } from '@/types';

const API_BASE_URL = API_CONFIG.gatewayUrl;

/**
 * Fetches all wishlist items for the authenticated customer.
 */
export async function getWishlistItems(): Promise<WishlistItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/wishlist`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    credentials: 'include',
    cache: 'no-store',
  });

  if (res.status === 401) {
    return [];
  }

  if (!res.ok) {
    throw new Error(`Failed to load wishlist items (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map((item: { itemId: number; createdAt: string }) => ({
      itemId: Number(item.itemId),
      createdAt: item.createdAt,
    }));
  }

  return [];
}

/**
 * Idempotently adds an item to customer's wishlist.
 */
export async function addToWishlistApi(itemId: number): Promise<WishlistItem> {
  const res = await fetch(`${API_BASE_URL}/api/wishlist/${itemId}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
    },
    credentials: 'include',
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to add item to wishlist (HTTP ${res.status})`);
  }

  const item = await res.json();
  return {
    itemId: Number(item.itemId),
    createdAt: item.createdAt,
  };
}

/**
 * Idempotently removes an item from customer's wishlist.
 */
export async function removeFromWishlistApi(itemId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/wishlist/${itemId}`, {
    method: 'DELETE',
    credentials: 'include',
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok && res.status !== 404 && res.status !== 204) {
    throw new Error(`Failed to remove item from wishlist (HTTP ${res.status})`);
  }
}

interface RawPublicProduct {
  id: number | string;
  name: string;
  slug: string;
  type?: string;
  price: number | string;
  rating?: number;
  reviews?: number;
  category?: string;
  sizes?: string[];
  colors?: Array<{ name: string; hex: string; inStock?: boolean }>;
  desc?: string;
  description?: string;
  img?: string;
  image_main?: string;
  images?: string[];
  featured?: boolean;
  inStock?: boolean;
  sizeStock?: Record<string, number>;
  tags?: string[];
}

/**
 * Batch lookup of active products from public catalog in Ficcado-Data.
 * Inactive and deleted items are filtered out on the server.
 */
export async function getBatchProducts(ids: number[]): Promise<Product[]> {
  if (!ids || ids.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(ids));
  const url = `${API_BASE_URL}/api/public/products/by-ids?ids=${uniqueIds.join(',')}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    return [];
  }

  const json = await res.json();
  if (json && json.success && Array.isArray(json.data)) {
    return json.data.map((p: RawPublicProduct) => ({
      id: Number(p.id),
      name: p.name,
      slug: p.slug,
      type: p.type || 'Apparel',
      price: Number(p.price),
      rating: Number(p.rating || 0),
      reviews: Number(p.reviews || 0),
      category: p.category,
      sizes: p.sizes || [],
      colors: p.colors || [],
      desc: p.desc || p.description,
      description: p.description || p.desc,
      img: p.img || (p.images && p.images[0]) || p.image_main,
      image_main: p.image_main || p.img,
      images: p.images || [],
      featured: Boolean(p.featured),
      inStock: Boolean(p.inStock),
      sizeStock: p.sizeStock,
      tags: p.tags || [],
    }));
  }

  return [];
}
