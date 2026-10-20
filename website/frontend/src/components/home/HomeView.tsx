'use client';

// =============================================================================
// Home Storefront View — /src/components/home/HomeView.tsx
// Renders live catalog items fetched server-side from Google Sheets.
// Full 2-way synchronization with URL search parameters for FilterModal
// (category, price min/max, sizes, colors, sort).
// =============================================================================

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, Settings, Menu, X } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { ProductCard } from '@/components/ui/ProductCard';
import { getLiveCategories } from '@/config/categories';
import { getColorName } from '@/lib/colors';
import type { Product } from '@/types';

interface HomeViewProps {
  initialProducts: Product[];
}

function matchesColors(productColors: string[], selectedColors: string[]): boolean {
  if (selectedColors.length === 0) return true;
  return productColors.some((pColor) => {
    const pClean = pColor.trim().toLowerCase();
    const pName = getColorName(pClean).toLowerCase();
    return selectedColors.some((sColor) => {
      const decoded = decodeURIComponent(sColor).trim().toLowerCase();
      const sName = getColorName(decoded).toLowerCase();
      return pClean === decoded || pName === decoded || pName === sName;
    });
  });
}

export function HomeView({ initialProducts }: HomeViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openModal, openProductModal } = useModal();

  const liveCategories = getLiveCategories();
  const categoryPills = [
    { label: 'All', slug: 'all' },
    ...liveCategories.map((c) => ({ label: c.name, slug: c.slug })),
  ];

  // Parse active filter parameters from URL
  const categoryParam = searchParams.get('category') || searchParams.get('categories') || 'all';
  const sizesParam = useMemo(() => {
    const val = searchParams.get('sizes');
    return val ? val.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : [];
  }, [searchParams]);

  const colorsParam = useMemo(() => {
    const val = searchParams.get('colors');
    return val ? val.split(',').map((c) => c.trim()).filter(Boolean) : [];
  }, [searchParams]);

  const minPrice = useMemo(() => {
    const val = searchParams.get('min') || searchParams.get('minPrice');
    return val ? Math.max(1, Number(val)) : 1;
  }, [searchParams]);

  const maxPrice = useMemo(() => {
    const val = searchParams.get('max') || searchParams.get('maxPrice');
    return val ? Math.max(1, Number(val)) : 5000;
  }, [searchParams]);

  const sortParam = searchParams.get('sort') || '';

  // Active filter count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryParam !== 'all') count += 1;
    if (sizesParam.length > 0) count += sizesParam.length;
    if (colorsParam.length > 0) count += colorsParam.length;
    if (minPrice > 1 || maxPrice < 5000) count += 1;
    if (sortParam) count += 1;
    return count;
  }, [categoryParam, sizesParam, colorsParam, minPrice, maxPrice, sortParam]);

  const products = (initialProducts || []).filter((p) => p.inStock);

  // Apply filters strictly
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      // 1. Category check
      if (categoryParam !== 'all' && p.category !== categoryParam) {
        return false;
      }
      // 2. Price bounds check
      if (p.price < minPrice || p.price > maxPrice) {
        return false;
      }
      // 3. Sizes check
      if (sizesParam.length > 0) {
        const hasSize = p.sizes.some((s) => sizesParam.includes(s.toUpperCase()));
        if (!hasSize) return false;
      }
      // 4. Colors check
      if (colorsParam.length > 0) {
        if (!matchesColors(p.colors, colorsParam)) return false;
      }
      return true;
    });

    // 5. Sorting
    if (sortParam === 'price-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortParam === 'price-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sortParam === 'rating') {
      list = [...list].sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [products, categoryParam, minPrice, maxPrice, sizesParam, colorsParam, sortParam]);

  function handleCategorySelect(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug === 'all') {
      params.delete('category');
      params.delete('categories');
    } else {
      params.set('category', slug);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function handleClearFilters() {
    router.push(pathname, { scroll: false });
  }

  const heroFeaturedProduct = products.length > 0 ? products[0] : null;

  return (
    <div className="animate-fade-in flex flex-col min-h-full" style={{ background: 'var(--bg-app)' }}>
      {/* Mobile Top Header */}
      <header
        className="flex md:hidden items-center justify-between px-4 py-2.5 shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}
      >
        <div className="flex items-center gap-2.5">
          <button
            id="mobile-menu-trigger-btn"
            onClick={() => openModal('mobileMenuDrawer')}
            className="flex items-center justify-center h-9 w-9 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-[var(--text-main)] active:scale-95 transition-transform cursor-pointer"
            aria-label="Open navigation menu and features"
          >
            <Menu size={18} />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div
              className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-[var(--border-light)] overflow-hidden p-0.5 shadow-2xs"
            >
              <Image
                src="/images/brand_logo/Ficcado Brand Logo.jpeg"
                alt="Ficcado Logo"
                fill
                sizes="32px"
                className="object-contain p-0.5"
                priority
                loading="eager"
              />
            </div>
            <span className="text-sm font-900 tracking-tight text-[var(--text-main)]">FICCADO</span>
          </Link>
        </div>

        {/* T-Shirt Collection Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-800 uppercase tracking-widest text-[var(--primary)] bg-[var(--primary-light)] px-2.5 py-1 rounded-full border border-[var(--primary)]/20">
            T-Shirts Live
          </span>
          <Link
            href="/settings"
            id="home-settings-btn"
            className="btn-icon"
            aria-label="Settings"
          >
            <Settings size={18} style={{ color: 'var(--text-muted)' }} />
          </Link>
        </div>
      </header>

      {/* Mobile Search bar */}
      <div className="flex md:hidden items-center gap-2 px-4 py-3" style={{ background: 'var(--bg-surface)' }}>
        <Link
          href="/search"
          id="home-search-bar"
          className="flex flex-1 items-center gap-2 rounded-2xl px-3.5 py-2.5"
          style={{ background: 'var(--bg-surface-alt)', border: '1.5px solid var(--border-light)' }}
          aria-label="Search products"
        >
          <Search size={16} style={{ color: 'var(--text-light)' }} />
          <span className="text-sm" style={{ color: 'var(--text-light)' }}>Search tees, drops...</span>
        </Link>
        <button
          id="home-filter-btn"
          onClick={() => openModal('filterModal')}
          className="relative btn-icon h-10 w-10 cursor-pointer"
          style={{ background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)' }}
          aria-label="Open filters"
        >
          <SlidersHorizontal size={17} style={{ color: 'var(--primary)' }} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-bold text-white shadow-xs">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        {/* Hero Banner Drop with Ghost Shimmer Backdrop */}
        <div
          className="relative mx-4 md:mx-0 mt-4 md:mt-2 md:mb-6 overflow-hidden rounded-3xl h-[220px] md:h-[360px]"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <Image
            src="/images/hero/ficcado-banner.jpg"
            alt="Ficcado Clothing — High Quality Stylish Daily Wear"
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover object-top"
            priority
            unoptimized
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, rgba(17,24,39,0.85) 0%, rgba(17,24,39,0.4) 50%, transparent 100%)',
            }}
          />
          {/* Hero copy */}
          <div className="absolute bottom-5 left-5 md:bottom-12 md:left-12 max-w-md">
            <span
              className="inline-block px-2.5 py-1 rounded-full bg-[var(--primary)] text-white text-[10px] md:text-xs font-800 uppercase tracking-widest mb-2"
              style={{ fontWeight: 800 }}
            >
              Selling T-Shirts Now 🔥
            </span>
            <h1
              className="text-2xl md:text-4xl lg:text-5xl font-900 leading-tight text-white tracking-tight"
              style={{ fontWeight: 900 }}
            >
              High Quality Unisex Wears
            </h1>
            <p className="text-xs md:text-sm text-white/90 mt-1.5 mb-4 leading-relaxed">
              Ficcado crafts signature high quality unisex streetwear with premium 240 GSM cotton and lasting comfort.
            </p>
            <div className="flex items-center gap-3">
              {heroFeaturedProduct && (
                <button
                  id="hero-explore-btn"
                  onClick={() => openProductModal(heroFeaturedProduct)}
                  className="rounded-full px-5 py-2.5 text-xs md:text-sm font-700 text-white transition-transform active:scale-95 hover:opacity-95 shadow-lg cursor-pointer"
                  style={{ background: 'var(--primary)', fontWeight: 700 }}
                >
                  Shop T-Shirts &rarr;
                </button>
              )}
              <Link
                href="/categories"
                className="inline-flex rounded-full px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-700 text-white bg-white/20 hover:bg-white/30 backdrop-blur-md transition-all active:scale-95"
              >
                View Roadmapped Wears
              </Link>
            </div>
          </div>
        </div>

        {/* Category filter pills & Desktop Filter Trigger */}
        <div className="flex items-center justify-between px-4 md:px-0 pt-4 pb-2">
          <div className="scroll-row gap-2 md:gap-3">
            {categoryPills.map((cat) => {
              const isActive = categoryParam === cat.slug;
              return (
                <button
                  key={cat.slug}
                  id={`pill-${cat.slug}`}
                  onClick={() => handleCategorySelect(cat.slug)}
                  className="rounded-full px-4 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer"
                  style={{
                    background: isActive ? 'var(--primary)' : 'var(--bg-surface)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    border: `1.5px solid ${isActive ? 'var(--primary)' : 'var(--border-light)'}`,
                    flexShrink: 0,
                  }}
                  aria-pressed={isActive}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Desktop Filter Drawer Trigger */}
          <button
            id="desktop-home-filter-btn"
            onClick={() => openModal('filterModal')}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-alt)] text-xs font-bold text-[var(--text-main)] transition-colors shrink-0 cursor-pointer"
          >
            <SlidersHorizontal size={14} className="text-[var(--primary)]" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between px-4 md:px-0 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-base md:text-xl font-800" style={{ fontWeight: 800, color: 'var(--text-main)' }}>
              Available Wear Drops
            </h2>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer"
              >
                <X size={12} />
                <span>Clear filters</span>
              </button>
            )}
          </div>
          <span className="text-xs md:text-sm font-semibold text-[var(--text-muted)]">
            {filteredProducts.length} Item{filteredProducts.length !== 1 ? 's' : ''} in Catalog
          </span>
        </div>

        {/* Product grid: 2-col mobile, 3-col tablet, 4-col desktop */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 px-4 md:px-0 pb-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} priority={true} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 gap-3 text-center px-4">
            <span className="text-3xl">🛍️</span>
            <p className="text-sm font-bold text-[var(--text-main)]">
              {products.length === 0
                ? 'Catalog temporarily unavailable'
                : 'No items match your filter selection'}
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm">
              {products.length === 0
                ? 'Please check back shortly or connect with our team on WhatsApp.'
                : 'Try expanding your price range, clearing color/size filters, or selecting All categories.'}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="rounded-full px-4 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:opacity-90 active:scale-95 transition-all mt-2 cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
            {products.length === 0 && (
              <a
                href="https://wa.me/916282000729"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary mt-2 text-xs py-2 px-4"
              >
                Chat on WhatsApp &rarr;
              </a>
            )}
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
