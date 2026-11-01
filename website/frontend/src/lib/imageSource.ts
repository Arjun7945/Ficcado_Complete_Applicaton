/**
 * Validates and identifies renderable image source URLs for the Ficcado Storefront.
 *
 * Supports:
 * 1. Root-relative paths: `/images/...`
 * 2. Remote HTTP/HTTPS URLs: `http://...`, `https://...`
 * 3. Base64 raster data URLs: `data:image/(png|jpeg|jpg|webp|gif|avif);base64,...`
 *
 * Rejects:
 * - Empty/null values
 * - SVG data URLs (`data:image/svg+xml`) to prevent script injection
 * - Malformed schemes
 */

const DATA_IMAGE_REGEX = /^data:image\/(png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/;

export function isDataUrl(src: unknown): src is string {
  return typeof src === 'string' && src.startsWith('data:');
}

export function isRenderableImageSrc(src: unknown): src is string {
  if (typeof src !== 'string' || src.trim().length === 0) {
    return false;
  }

  const trimmed = src.trim();

  // Root-relative path
  if (trimmed.startsWith('/')) {
    return true;
  }

  // Absolute HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return true;
  }

  // Base64 raster data URL (rejecting SVGs for security)
  if (trimmed.startsWith('data:image/')) {
    if (trimmed.startsWith('data:image/svg+xml')) {
      return false;
    }
    // Check header and basic base64 structure
    return DATA_IMAGE_REGEX.test(trimmed);
  }

  return false;
}
