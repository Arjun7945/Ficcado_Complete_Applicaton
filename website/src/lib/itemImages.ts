import itemImagesManifest from '@/generated/item-images.json';
import { slugify } from '@/lib/slugify';

export const PLACEHOLDER_IMAGE = '/images/placeholder.webp';

/**
 * Resolves an ordered list of public URLs for an item's images per Section R2.4.
 * If no folder exists or the folder has no images, returns [PLACEHOLDER_IMAGE].
 */
export function getItemImages(itemNameOrSlug?: string): string[] {
  if (!itemNameOrSlug) return [PLACEHOLDER_IMAGE];

  const slug = slugify(itemNameOrSlug);
  const manifest = itemImagesManifest as Record<string, string[]>;
  const files = manifest[slug];

  if (!files || files.length === 0) {
    // Resilient fallback: search manifest keys by significant token prefix or containment
    const firstToken = slug.split('-')[0];
    const matchedKey = Object.keys(manifest).find(
      (k) => (firstToken && firstToken.length > 3 && k.startsWith(firstToken)) || slug.includes(k) || k.includes(slug)
    );
    if (matchedKey && manifest[matchedKey]?.length > 0) {
      return manifest[matchedKey].map((file) => `/images/items/${matchedKey}/${file}`);
    }
    return [PLACEHOLDER_IMAGE];
  }

  return files.map((file) => `/images/items/${slug}/${file}`);
}

/**
 * Returns the primary display image (image-1) for an item.
 */
export function getPrimaryItemImage(itemNameOrSlug?: string): string {
  const images = getItemImages(itemNameOrSlug);
  return images[0] || PLACEHOLDER_IMAGE;
}

/**
 * Returns the secondary/flat image (image-2) for bag thumbnails and invoice rows.
 * Falls back to primary image if only 1 image exists.
 */
export function getSecondaryItemImage(itemNameOrSlug?: string): string {
  const images = getItemImages(itemNameOrSlug);
  return images.length > 1 ? images[1] : images[0] || PLACEHOLDER_IMAGE;
}
