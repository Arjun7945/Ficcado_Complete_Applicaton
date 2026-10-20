import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Sparkles, Clock } from 'lucide-react';
import { CATEGORIES_CONFIG, getCategoryBySlug, isCategoryLive } from '@/config/categories';
import { ProductCard } from '@/components/ui/ProductCard';
import { CategoryProductGrid } from '@/components/category/CategoryProductGrid';
import { getProducts } from '@/lib/products';
import { getSiteUrl } from '@/lib/siteUrl';

export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CATEGORIES_CONFIG.map((cat) => ({
    slug: cat.slug,
  }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    return { title: 'Category Not Found' };
  }

  return {
    title: category.name,
    description: category.description,
    robots: { index: true, follow: true },
  };
}

export default async function CategoryDetailPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const isLive = isCategoryLive(slug);
  const allProducts = await getProducts();
  const products = allProducts.filter((p) => p.category === slug && p.inStock);

  if (!isLive) {
    // Designed Coming Soon Experience (Section 6.4)
    return (
      <div className="min-h-full py-12 px-4 md:px-8 max-w-4xl mx-auto animate-fade-in space-y-8">
        <Link
          href="/categories"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          <ArrowLeft size={16} />
          <span>Back to All Categories</span>
        </Link>

        <div className="card p-8 md:p-14 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-md space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <Clock size={32} />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-800 uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-200">
              Silhouette Roadmap
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-900 text-[var(--text-main)] tracking-tight">
              Our {category.name} Collection Is Coming Soon
            </h1>
            <p className="text-sm md:text-base text-[var(--text-muted)] leading-relaxed pt-2">
              Our {category.name} collection is coming soon. Please wait for it! We are precision-engineering our fabrics and tailored unisex patterns in small batches.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] max-w-md mx-auto text-xs text-[var(--text-secondary)] space-y-1">
            <p className="font-bold text-[var(--text-main)]">Roadmap Sneak Peek</p>
            <p>{category.description}</p>
          </div>

          {/* Action CTAs leading back to Live categories */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/categories/t-shirts"
              className="btn-primary py-3 px-6 text-xs md:text-sm font-bold rounded-xl shadow-xs"
            >
              Explore T-Shirts (Live Drop) 🔥
            </Link>
            <Link
              href="/categories"
              className="btn-ghost py-3 px-6 text-xs md:text-sm font-bold rounded-xl border border-[var(--border-light)]"
            >
              View All Categories
            </Link>
            <Link
              href="/"
              className="py-3 px-4 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Live Category Page
  const siteUrl = getSiteUrl();

  const categoryJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        '@id': `${siteUrl}/categories/${category.slug}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Categories',
            item: `${siteUrl}/categories`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: category.name,
            item: `${siteUrl}/categories/${category.slug}`,
          },
        ],
      },
      {
        '@type': 'CollectionPage',
        '@id': `${siteUrl}/categories/${category.slug}#collection`,
        url: `${siteUrl}/categories/${category.slug}`,
        name: `${category.name} | Ficcado`,
        description: category.description,
        isPartOf: {
          '@id': `${siteUrl}/#website`,
        },
        mainEntity: {
          '@id': `${siteUrl}/categories/${category.slug}#itemlist`,
        },
      },
      {
        '@type': 'ItemList',
        '@id': `${siteUrl}/categories/${category.slug}#itemlist`,
        numberOfItems: products.length,
        itemListElement: products.map((product, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: product.name,
          url: `${siteUrl}/categories/${category.slug}#product-${product.id}`,
        })),
      },
    ],
  };

  return (
    <div className="min-h-full pb-16 px-4 md:px-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoryJsonLd) }}
      />
      <div className="pt-4">
        <Link
          href="/categories"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          <ArrowLeft size={16} />
          <span>All Categories</span>
        </Link>
      </div>

      <div className="space-y-1 border-b border-[var(--border-light)] pb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-800 uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
          <Sparkles size={12} />
          <span>Live Collection</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-900 text-[var(--text-main)] tracking-tight">
          {category.name}
        </h1>
        <p className="text-sm text-[var(--text-muted)] max-w-2xl leading-relaxed">
          {category.description}
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 pt-2">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} priority={true} />
            ))}
          </div>
        }
      >
        <CategoryProductGrid initialProducts={products} categoryName={category.name} />
      </Suspense>
    </div>
  );
}
