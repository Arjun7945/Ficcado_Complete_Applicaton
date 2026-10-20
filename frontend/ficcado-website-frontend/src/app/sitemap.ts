import type { MetadataRoute } from 'next';
import { CATEGORIES_CONFIG } from '@/config/categories';
import { getProducts } from '@/lib/products';
import { getSiteUrl } from '@/lib/siteUrl';

// =============================================================================
// Dynamic Sitemap Generator — /sitemap.xml
// Indexing home, all category drops, products, policy pages, FAQ, and journal.
// Excludes private internal routes.
// =============================================================================

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  // 1. Root & Core Directory
  const coreRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // 2. All Category Sections per Owner Instruction
  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES_CONFIG.map((cat) => ({
    url: `${siteUrl}/categories/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: cat.status === 'live' ? 0.9 : 0.6,
  }));

  // 3. Products directly mapped from Google Sheet catalog
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await getProducts();
    productRoutes = products
      .filter((p) => p.inStock)
      .map((product) => ({
        url: `${siteUrl}/categories/${product.category}#product-${product.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.85,
      }));
  } catch {
    productRoutes = [];
  }

  // 4. Static Institutional & Knowledge Pages
  const staticPages = [
    '/about',
    '/faq',
    '/support',
    '/journal',
    '/search',
    '/shipping-delivery',
    '/returns-refunds',
    '/replacements-damages',
    '/privacy',
    '/terms',
  ];

  const institutionalRoutes: MetadataRoute.Sitemap = staticPages.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: path === '/faq' || path === '/about' ? 0.7 : 0.5,
  }));

  return [...coreRoutes, ...categoryRoutes, ...productRoutes, ...institutionalRoutes];
}
