// =============================================================================
// Categories Configuration — /src/config/categories.ts
// SINGLE SOURCE OF TRUTH for all category definitions across the entire app.
// Changing a category from 'coming-soon' to 'live' requires changing ONLY this config
// (and adding products in the Google Sheet).
// =============================================================================

export type CategoryStatus = 'live' | 'coming-soon';

export interface CategoryConfig {
  name: string;
  slug: string;
  status: CategoryStatus;
  description: string;
  sortOrder: number;
  image: string;
}

export const CATEGORIES_CONFIG: CategoryConfig[] = [
  {
    name: 'T-Shirts',
    slug: 't-shirts',
    status: 'live',
    description: 'High quality 240gsm combed cotton tees with signature relaxed unisex silhouettes.',
    sortOrder: 1,
    image: '/images/categories/t-shirts.jpg',
  },
  {
    name: 'Combos',
    slug: 'combos',
    status: 'coming-soon',
    description: 'Curated duo-layer apparel packs and coordinated sets engineered for everyday comfort. Coming soon in upcoming drops.',
    sortOrder: 2,
    image: '/images/categories/combos.jpg',
  },
  {
    name: 'Shirts',
    slug: 'shirts',
    status: 'coming-soon',
    description: 'Heritage structured cotton overshirts and relaxed button-downs.',
    sortOrder: 3,
    image: '/images/categories/shirts.jpg',
  },
  {
    name: 'Hoodies',
    slug: 'hoodies',
    status: 'coming-soon',
    description: 'Dense loopback fleece boxy hoodies engineered for structure and longevity.',
    sortOrder: 4,
    image: '/images/categories/hoodies.jpg',
  },
  {
    name: 'Pants',
    slug: 'pants',
    status: 'coming-soon',
    description: 'Articulated pleat cargos and everyday relaxed casual bottoms.',
    sortOrder: 5,
    image: '/images/categories/pants.jpg',
  },
  {
    name: 'Sneakers',
    slug: 'sneakers',
    status: 'coming-soon',
    description: 'Minimalist low-profile leather-suede footwear designed for day-long wear.',
    sortOrder: 6,
    image: '/images/categories/sneakers.jpg',
  },
];

/**
 * Helper to get only currently live categories
 */
export function getLiveCategories(): CategoryConfig[] {
  return CATEGORIES_CONFIG.filter((c) => c.status === 'live');
}

/**
 * Helper to get coming soon categories
 */
export function getComingSoonCategories(): CategoryConfig[] {
  return CATEGORIES_CONFIG.filter((c) => c.status === 'coming-soon');
}

/**
 * Find category by slug
 */
export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return CATEGORIES_CONFIG.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
}

/**
 * Check if category is live
 */
export function isCategoryLive(slug: string): boolean {
  const cat = getCategoryBySlug(slug);
  return cat?.status === 'live';
}
