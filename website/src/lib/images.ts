// =============================================================================
// Image Helper — /src/lib/images.ts
// Bridges product slug to primary and gallery image URLs with safe WebP fallbacks.
// Uses the item image architecture defined in R2.
// =============================================================================

import {
  getItemImages,
  getPrimaryItemImage,
  getSecondaryItemImage,
  PLACEHOLDER_IMAGE,
} from '@/lib/itemImages';

export const PLACEHOLDER_PRODUCT_IMAGE = PLACEHOLDER_IMAGE;
export const PLACEHOLDER_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4IDgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=';

const CATEGORY_IMAGE_MAP: Record<string, string> = {
  't-shirts': '/images/categories/t-shirts.jpg',
  'combos': '/images/categories/combos.jpg',
  'shirts': '/images/categories/shirts.jpg',
  'hoodies': '/images/categories/hoodies.jpg',
  'pants': '/images/categories/pants.jpg',
  'sneakers': '/images/categories/sneakers.jpg',
};

/**
 * Resolves main image URL for a given product slug or image path
 */
export function getProductMainImage(slug?: string, imageMain?: string): string {
  if (imageMain && (imageMain.startsWith('/') || imageMain.startsWith('http'))) {
    return imageMain;
  }
  if (slug) {
    return getPrimaryItemImage(slug);
  }
  return PLACEHOLDER_PRODUCT_IMAGE;
}

/**
 * Resolves flat lay image URL for cart & bag thumbnails
 */
export function getProductFlatImage(slug?: string, flatImg?: string): string {
  if (flatImg && (flatImg.startsWith('/') || flatImg.startsWith('http'))) {
    return flatImg;
  }
  if (slug) {
    return getSecondaryItemImage(slug);
  }
  return getProductMainImage(slug);
}

/**
 * Resolves all images for a product
 */
export function getProductGalleryImages(slug?: string): string[] {
  if (!slug) return [PLACEHOLDER_PRODUCT_IMAGE];
  return getItemImages(slug);
}

/**
 * Resolves category image thumbnail
 */
export function getCategoryImage(categorySlug: string): string {
  return CATEGORY_IMAGE_MAP[categorySlug.toLowerCase()] || PLACEHOLDER_PRODUCT_IMAGE;
}

