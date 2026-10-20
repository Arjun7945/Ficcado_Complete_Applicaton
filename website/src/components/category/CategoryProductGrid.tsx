'use client';

// =============================================================================
// CategoryProductGrid — /src/components/category/CategoryProductGrid.tsx
// Fully data-driven, URL-synchronized category product listing and filter system.
// Features:
// - 100% data-driven colors dynamically extracted from item sheet data.
// - Price range starting strictly from 1 up to highest real item price.
// - Filter state synced to URL query parameters (shareable & reload-safe).
// - Multi-select colors and sizes with AND logic across dimensions.
// - Memoized filtering for instantaneous performance on large catalogs.
// - Accessible drawer and bottom sheet for mobile and desktop.
// =============================================================================

import React, { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X, RotateCcw, Check, ArrowUpDown } from 'lucide-react';
import { ProductCard } from '@/components/ui/ProductCard';
import { extractColorsFromProducts, getColorHex, getColorName } from '@/lib/colors';
import type { Product, SizeOption } from '@/types';

interface CategoryProductGridProps {
  initialProducts: Product[];
  categoryName: string;
}

export function CategoryProductGrid({ initialProducts, categoryName }: CategoryProductGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Data-driven dynamic filter options derived directly from actual category items
  const availableColors = useMemo(() => {
    return extractColorsFromProducts(initialProducts);
  }, [initialProducts]);

  const availableSizes = useMemo(() => {
    const sizeOrder: SizeOption[] = ['XS', 'S', 'M', 'L', 'XL', 'Free Size'];
    const foundSizes = new Set<string>();
    for (const p of initialProducts) {
      if (Array.isArray(p.sizes)) {
        for (const s of p.sizes) {
          if (s) foundSizes.add(s.trim());
        }
      }
    }
    return sizeOrder.filter((s) => foundSizes.has(s)).concat(
      Array.from(foundSizes).filter((s) => !sizeOrder.includes(s as SizeOption)) as SizeOption[]
    );
  }, [initialProducts]);

  const highestPrice = useMemo(() => {
    if (initialProducts.length === 0) return 1000;
    return Math.max(...initialProducts.map((p) => p.price));
  }, [initialProducts]);

  // 2. Parse URL query parameters
  const activeColors = useMemo(() => {
    const param = searchParams.get('color') || searchParams.get('colors');
    if (!param) return [];
    return param
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
  }, [searchParams]);

  const activeSizes = useMemo(() => {
    const param = searchParams.get('size') || searchParams.get('sizes');
    if (!param) return [];
    return param
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }, [searchParams]);

  const minPrice = useMemo(() => {
    const raw = searchParams.get('minPrice');
    if (!raw) return 1;
    const num = parseInt(raw, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }, [searchParams]);

  const maxPrice = useMemo(() => {
    const raw = searchParams.get('maxPrice');
    if (!raw) return highestPrice;
    const num = parseInt(raw, 10);
    return isNaN(num) || num < 1 ? highestPrice : num;
  }, [searchParams, highestPrice]);

  const sortBy = useMemo(() => {
    return searchParams.get('sort') || 'featured';
  }, [searchParams]);

  // Drawer open state
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Temporary drawer draft states (debounced/deferred until Apply)
  const [draftColors, setDraftColors] = useState<string[]>(activeColors);
  const [draftSizes, setDraftSizes] = useState<string[]>(activeSizes);
  const [draftMinPrice, setDraftMinPrice] = useState<number>(minPrice);
  const [draftMaxPrice, setDraftMaxPrice] = useState<number>(maxPrice);
  const [draftSort, setDraftSort] = useState<string>(sortBy);

  // Sync draft states whenever active URL params change or drawer opens
  useEffect(() => {
    if (isFilterDrawerOpen) {
      setDraftColors(activeColors);
      setDraftSizes(activeSizes);
      setDraftMinPrice(minPrice);
      setDraftMaxPrice(maxPrice);
      setDraftSort(sortBy);
    }
  }, [isFilterDrawerOpen, activeColors, activeSizes, minPrice, maxPrice, sortBy]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isFilterDrawerOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isFilterDrawerOpen]);

  // 3. Helper to update URL query parameters smoothly
  const updateUrlParams = useCallback(
    (newParams: {
      colors?: string[];
      sizes?: string[];
      minPrice?: number;
      maxPrice?: number;
      sort?: string;
    }) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      // Colors
      if (newParams.colors && newParams.colors.length > 0) {
        nextParams.set('colors', newParams.colors.join(','));
        nextParams.delete('color');
      } else if (newParams.colors !== undefined) {
        nextParams.delete('colors');
        nextParams.delete('color');
      }

      // Sizes
      if (newParams.sizes && newParams.sizes.length > 0) {
        nextParams.set('sizes', newParams.sizes.join(','));
        nextParams.delete('size');
      } else if (newParams.sizes !== undefined) {
        nextParams.delete('sizes');
        nextParams.delete('size');
      }

      // Min Price
      if (newParams.minPrice !== undefined) {
        if (newParams.minPrice > 1) {
          nextParams.set('minPrice', String(newParams.minPrice));
        } else {
          nextParams.delete('minPrice');
        }
      }

      // Max Price
      if (newParams.maxPrice !== undefined) {
        if (newParams.maxPrice < highestPrice) {
          nextParams.set('maxPrice', String(newParams.maxPrice));
        } else {
          nextParams.delete('maxPrice');
        }
      }

      // Sort
      if (newParams.sort && newParams.sort !== 'featured') {
        nextParams.set('sort', newParams.sort);
      } else if (newParams.sort !== undefined) {
        nextParams.delete('sort');
      }

      startTransition(() => {
        const query = nextParams.toString();
        const url = query ? `${pathname}?${query}` : pathname;
        router.replace(url, { scroll: false });
      });
    },
    [searchParams, pathname, router, highestPrice]
  );

  // Apply draft filters from modal
  const handleApplyFilters = () => {
    updateUrlParams({
      colors: draftColors,
      sizes: draftSizes,
      minPrice: draftMinPrice,
      maxPrice: draftMaxPrice,
      sort: draftSort,
    });
    setIsFilterDrawerOpen(false);
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setDraftColors([]);
    setDraftSizes([]);
    setDraftMinPrice(1);
    setDraftMaxPrice(highestPrice);
    setDraftSort('featured');
    updateUrlParams({
      colors: [],
      sizes: [],
      minPrice: 1,
      maxPrice: highestPrice,
      sort: 'featured',
    });
    setIsFilterDrawerOpen(false);
  };

  // Active filter count badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeColors.length > 0) count += activeColors.length;
    if (activeSizes.length > 0) count += activeSizes.length;
    if (minPrice > 1) count += 1;
    if (maxPrice < highestPrice) count += 1;
    return count;
  }, [activeColors, activeSizes, minPrice, maxPrice, highestPrice]);

  // 4. Memoized Product Filtering & Sorting (AND logic across groups)
  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((product) => {
        // Price Filter (Min starts strictly at 1)
        if (product.price < minPrice || product.price > maxPrice) {
          return false;
        }

        // Color Filter (Matches if any of the product's colors match selected filter colors)
        if (activeColors.length > 0) {
          const productColors = (product.colors || []).map((c) => {
            const hex = getColorHex(c).toLowerCase();
            const name = getColorName(c).toLowerCase();
            return { hex, name };
          });

          const hasMatchingColor = productColors.some(({ hex, name }) => {
            return activeColors.some((filterColor) => {
              const fc = filterColor.toLowerCase();
              return hex === fc || name === fc || hex.replace('#', '') === fc;
            });
          });

          if (!hasMatchingColor) return false;
        }

        // Size Filter
        if (activeSizes.length > 0) {
          const productSizes = (product.sizes || []).map((s) => s.trim().toUpperCase());
          const hasMatchingSize = activeSizes.some((s) => productSizes.includes(s));
          if (!hasMatchingSize) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return ((a.sort_order ?? 0) - (b.sort_order ?? 0)) || String(a.id).localeCompare(String(b.id));
      });
  }, [initialProducts, activeColors, activeSizes, minPrice, maxPrice, sortBy]);

  return (
    <div className="space-y-6">
      {/* Control Bar: Filter Button, Active Count, Sort & Results Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            id="category-filter-toggle-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-alt)] text-xs font-bold text-[var(--text-main)] shadow-2xs transition-all active:scale-95 cursor-pointer"
            aria-label="Open filter options"
          >
            <SlidersHorizontal size={14} className="text-[var(--primary)]" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center h-4.5 min-w-[18px] px-1 rounded-full bg-[var(--primary)] text-white text-[10px] font-mono font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-red-500 transition-colors inline-flex items-center gap-1 cursor-pointer"
              aria-label="Reset all applied filters"
            >
              <RotateCcw size={12} />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Sort & Result Counter */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)] font-medium">
            Showing <strong className="text-[var(--text-main)]">{filteredProducts.length}</strong> of{' '}
            {initialProducts.length} items
          </span>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => updateUrlParams({ sort: e.target.value })}
              className="appearance-none bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-main)] text-xs font-semibold rounded-xl px-3 py-2 pr-8 shadow-2xs focus:outline-hidden focus:border-[var(--primary)] cursor-pointer"
              aria-label="Sort products"
            >
              <option value="featured">Featured Drop</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
            <ArrowUpDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 animate-fade-in">
          {activeColors.map((colorKey) => {
            const label = getColorName(colorKey);
            const hex = getColorHex(colorKey);
            return (
              <span
                key={colorKey}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-main)] shadow-2xs"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/20"
                  style={{ background: hex }}
                />
                <span>{label}</span>
                <button
                  onClick={() =>
                    updateUrlParams({
                      colors: activeColors.filter((c) => c !== colorKey),
                    })
                  }
                  className="hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                  aria-label={`Remove ${label} color filter`}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}

          {activeSizes.map((size) => (
            <span
              key={size}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-main)] shadow-2xs"
            >
              <span>Size: {size}</span>
              <button
                onClick={() =>
                  updateUrlParams({
                    sizes: activeSizes.filter((s) => s !== size),
                  })
                }
                className="hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                aria-label={`Remove size ${size} filter`}
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {(minPrice > 1 || maxPrice < highestPrice) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-main)] shadow-2xs">
              <span>
                ₹{minPrice.toLocaleString('en-IN')} — ₹{maxPrice.toLocaleString('en-IN')}
              </span>
              <button
                onClick={() => updateUrlParams({ minPrice: 1, maxPrice: highestPrice })}
                className="hover:text-red-500 transition-colors ml-0.5 cursor-pointer"
                aria-label="Remove price filter"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {filteredProducts.map((product, idx) => (
          <ProductCard key={product.id} product={product} priority={idx < 8} />
        ))}
      </div>

      {/* Helpful Empty State when no items match the filters */}
      {filteredProducts.length === 0 && (
        <div className="card p-10 md:p-14 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-xs space-y-4 max-w-lg mx-auto animate-fade-in my-8">
          <div className="w-14 h-14 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mx-auto">
            <SlidersHorizontal size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--text-main)]">No matching items found</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              We couldn’t find any items matching your selected colors or price range in {categoryName}.
              Try clearing some filters to browse the full drop.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="btn-primary py-2.5 px-5 text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}

      {/* Slide-over Filter Modal / Drawer with React Portal & Safe Area Alignment */}
      {isFilterDrawerOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/75 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-filter-drawer-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFilterDrawerOpen(false);
          }}
        >
          <div
            className="w-full sm:max-w-lg bg-[var(--bg-surface)] rounded-t-[28px] sm:rounded-3xl border border-[var(--border-light)] shadow-2xl flex flex-col overflow-hidden animate-sheet-in sm:animate-modal-in text-[var(--text-main)] mb-0 sm:my-auto"
            style={{
              maxHeight: 'min(86dvh, calc(100dvh - 3rem - var(--ios-bottom-bar-clearance, 0px)))',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator */}
            <div className="flex sm:hidden justify-center pt-3 pb-1 shrink-0 bg-[var(--bg-surface-alt)]">
              <div className="w-10 h-1 rounded-full bg-[var(--border-medium,#d1d5db)]" />
            </div>

            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-3.5 sm:py-4 border-b border-[var(--border-light)] bg-[var(--bg-surface-alt)] shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={17} className="text-[var(--primary)]" />
                <h2 id="category-filter-drawer-title" className="text-base font-bold text-[var(--text-main)]">
                  Filter {categoryName}
                </h2>
              </div>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-light)] transition-colors cursor-pointer"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs overscroll-contain">
              {/* 1. Price Range Section (Starts from 1 strictly) */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-main)] uppercase tracking-wider text-[11px]">
                    Price Range
                  </span>
                  <span className="font-mono font-bold text-[var(--primary)]">
                    ₹{draftMinPrice.toLocaleString('en-IN')} — ₹{draftMaxPrice.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Range Slider for Max Price */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min={1}
                    max={highestPrice}
                    step={10}
                    value={draftMaxPrice}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDraftMaxPrice(val);
                      if (val < draftMinPrice) {
                        setDraftMinPrice(val);
                      }
                    }}
                    className="w-full accent-[var(--primary)] cursor-pointer"
                    aria-label="Filter maximum price"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                    <span>₹1 (Min)</span>
                    <span>₹{highestPrice.toLocaleString('en-IN')} (Max)</span>
                  </div>
                </div>

                {/* Min & Max Numeric Inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] text-[var(--text-muted)] mb-1">Min Price (₹)</label>
                    <input
                      type="number"
                      min={1}
                      max={draftMaxPrice}
                      value={draftMinPrice}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setDraftMinPrice(val);
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface-alt)] text-xs font-mono focus:outline-hidden focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--text-muted)] mb-1">Max Price (₹)</label>
                    <input
                      type="number"
                      min={draftMinPrice}
                      max={highestPrice}
                      value={draftMaxPrice}
                      onChange={(e) => {
                        const val = Math.min(
                          highestPrice,
                          Math.max(draftMinPrice, parseInt(e.target.value, 10) || highestPrice)
                        );
                        setDraftMaxPrice(val);
                      }}
                      className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface-alt)] text-xs font-mono focus:outline-hidden focus:border-[var(--primary)]"
                    />
                  </div>
                </div>
              </section>

              {/* 2. Colors Section (100% dynamically sourced from item sheet data) */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-main)] uppercase tracking-wider text-[11px]">
                    Available Colors ({availableColors.length})
                  </span>
                  {draftColors.length > 0 && (
                    <button
                      onClick={() => setDraftColors([])}
                      className="text-[11px] text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                    >
                      Clear colors
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {availableColors.map((col) => {
                    const isSelected = draftColors.some(
                      (c) =>
                        c.toLowerCase() === col.hex.toLowerCase() ||
                        c.toLowerCase() === col.name.toLowerCase()
                    );
                    return (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => {
                          setDraftColors((prev) =>
                            isSelected
                              ? prev.filter(
                                  (c) =>
                                    c.toLowerCase() !== col.hex.toLowerCase() &&
                                    c.toLowerCase() !== col.name.toLowerCase()
                                )
                              : [...prev, col.hex.toLowerCase()]
                          );
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'border-[var(--primary)] bg-[var(--primary-light)] font-bold text-[var(--primary)]'
                            : 'border-[var(--border-light)] bg-[var(--bg-surface-alt)] hover:border-gray-400 text-[var(--text-main)]'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shrink-0 shadow-2xs"
                            style={{ background: col.hex }}
                          />
                          <span className="truncate text-xs">{col.name}</span>
                        </div>
                        {isSelected && <Check size={14} className="text-[var(--primary)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 3. Sizes Section (From sheet items) */}
              {availableSizes.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--text-main)] uppercase tracking-wider text-[11px]">
                      Sizes
                    </span>
                    {draftSizes.length > 0 && (
                      <button
                        onClick={() => setDraftSizes([])}
                        className="text-[11px] text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                      >
                        Clear sizes
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((size) => {
                      const isSelected = draftSizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setDraftSizes((prev) =>
                              isSelected ? prev.filter((s) => s !== size) : [...prev, size]
                            );
                          }}
                          className={`h-9 min-w-[36px] px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-2xs'
                              : 'border-[var(--border-light)] bg-[var(--bg-surface-alt)] text-[var(--text-main)] hover:border-gray-400'
                          }`}
                          aria-pressed={isSelected}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 4. Sort By in Drawer */}
              <section className="space-y-3">
                <span className="font-bold text-[var(--text-main)] uppercase tracking-wider text-[11px]">
                  Sort By
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'featured', label: 'Featured Drop' },
                    { id: 'price-asc', label: 'Price: Low to High' },
                    { id: 'price-desc', label: 'Price: High to Low' },
                    { id: 'rating', label: 'Highest Rated' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setDraftSort(s.id)}
                      className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                        draftSort === s.id
                          ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)] font-bold'
                          : 'border-[var(--border-light)] bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Drawer Actions with Safe Area & iOS Bottom Bar Clearance */}
            <div
              className="p-4 sm:p-5 border-t border-[var(--border-light)] bg-[var(--bg-surface)] flex gap-3 shrink-0"
              style={{
                paddingBottom: 'calc(var(--ios-bottom-bar-clearance, 0px) + max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.85rem)))',
              }}
            >
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 py-3 px-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] text-xs font-semibold text-[var(--text-main)] transition-all active:scale-95 cursor-pointer"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="flex-[2] py-3 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default CategoryProductGrid;
