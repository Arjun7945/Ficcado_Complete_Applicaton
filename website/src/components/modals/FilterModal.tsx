'use client';

// =============================================================================
// FilterModal — Price range slider, category chips, size & color filter sheet
// =============================================================================

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { X, SlidersHorizontal } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { DEFAULT_FILTER_STATE } from '@/config/site';
import { REAL_CATALOG_COLORS } from '@/lib/colors';
import type { ClothingCategory, FilterState, SizeOption } from '@/types';

const CATEGORY_CHIPS: { label: string; slug: ClothingCategory | 'all' }[] = [
  { label: 'All', slug: 'all' },
  { label: 'T-Shirts', slug: 't-shirts' },
  { label: 'Combos', slug: 'combos' },
  { label: 'Shirts', slug: 'shirts' },
  { label: 'Hoodies', slug: 'hoodies' },
  { label: 'Pants', slug: 'pants' },
  { label: 'Sneakers', slug: 'sneakers' },
];
const SIZE_OPTIONS: SizeOption[] = ['S', 'M', 'L', 'XL'];
const COLOR_OPTIONS = REAL_CATALOG_COLORS;

export function FilterModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeModal, closeModal } = useModal();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const isOpen = activeModal === 'filterModal';

  // Sync state with URL params when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const minParam = searchParams.get('min');
    const maxParam = searchParams.get('max');
    const sizesParam = searchParams.get('sizes');
    const colorsParam = searchParams.get('colors');
    const categoryParam = searchParams.get('category');

    const min = minParam ? Math.max(1, Number(minParam)) : 1;
    const max = maxParam ? Math.max(min, Number(maxParam)) : 5000;
    const sizes = sizesParam ? (sizesParam.split(',').filter(Boolean) as SizeOption[]) : [];
    const colors = colorsParam ? colorsParam.split(',').filter(Boolean) : [];
    const categories = categoryParam ? (categoryParam.split(',').filter(Boolean) as ClothingCategory[]) : [];

    setFilters((prev) => ({
      ...prev,
      priceRange: [min, max],
      sizes,
      colors,
      categories,
    }));
  }, [isOpen, searchParams]);

  function toggleCategory(catSlug: ClothingCategory | 'all') {
    if (catSlug === 'all') {
      setFilters((f) => ({ ...f, categories: [] }));
      return;
    }
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(catSlug)
        ? f.categories.filter((c) => c !== catSlug)
        : [...f.categories, catSlug],
    }));
  }

  function toggleSize(size: SizeOption) {
    setFilters((f) => ({
      ...f,
      sizes: f.sizes.includes(size)
        ? f.sizes.filter((s) => s !== size)
        : [...f.sizes, size],
    }));
  }

  function toggleColor(hex: string) {
    setFilters((f) => ({
      ...f,
      colors: f.colors.includes(hex)
        ? f.colors.filter((c) => c !== hex)
        : [...f.colors, hex],
    }));
  }

  function handleReset() {
    setFilters(DEFAULT_FILTER_STATE);
  }

  function handleApply() {
    const params = new URLSearchParams(searchParams.toString());

    if (filters.priceRange[0] > 1) {
      params.set('min', String(filters.priceRange[0]));
    } else {
      params.delete('min');
    }

    if (filters.priceRange[1] < 5000) {
      params.set('max', String(filters.priceRange[1]));
    } else {
      params.delete('max');
    }

    if (filters.sizes.length > 0) {
      params.set('sizes', filters.sizes.join(','));
    } else {
      params.delete('sizes');
    }

    if (filters.colors.length > 0) {
      params.set('colors', filters.colors.join(','));
    } else {
      params.delete('colors');
    }

    if (filters.categories.length > 0) {
      params.set('category', filters.categories.join(','));
    } else {
      params.delete('category');
    }

    const targetUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(targetUrl, { scroll: false });
    closeModal();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 h-[100dvh] max-h-[100dvh] z-50 flex items-end md:items-center justify-center p-3 sm:p-4 md:p-6 pointer-events-none"
      style={{
        paddingBottom: 'calc(var(--ios-bottom-bar-clearance, 0px) + max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem)))',
      }}
    >
      <div className="overlay animate-backdrop-in pointer-events-auto" onClick={closeModal} aria-hidden="true" />

      <div
        id="filterModal"
        role="dialog"
        aria-modal="true"
        aria-label="Filter products"
        className="animate-sheet-in md:animate-modal-in relative w-full max-w-[440px] md:max-w-lg lg:max-w-xl flex flex-col pointer-events-auto overflow-hidden rounded-[28px] sm:rounded-3xl md:rounded-3xl shadow-2xl border border-[var(--border-light)] max-h-[86dvh] md:max-h-[78dvh] mb-0 md:my-auto"
        style={{
          background: 'var(--bg-surface)',
          zIndex: 'var(--z-modal)',
          maxHeight: 'min(86dvh, calc(100dvh - 3.5rem - var(--ios-bottom-bar-clearance, 0px)))',
        }}
      >
        {/* Drag handle (Mobile only) */}
        <div className="flex md:hidden justify-center pt-3 pb-1 shrink-0">
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border-medium)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-2 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} style={{ color: 'var(--primary)' }} />
            <h2 className="text-lg font-800" style={{ fontWeight: 800 }}>Filters</h2>
          </div>
          <button onClick={closeModal} className="btn-icon" aria-label="Close filters">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable filter content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 space-y-6 pb-2 overscroll-contain">

          {/* Price Range */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-700" style={{ fontWeight: 700, color: 'var(--text-main)' }}>Price Range</p>
              <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                ₹{filters.priceRange[0].toLocaleString('en-IN')} — ₹{filters.priceRange[1].toLocaleString('en-IN')}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={5000}
              step={50}
              value={filters.priceRange[1]}
              onChange={(e) =>
                setFilters((f) => ({ ...f, priceRange: [Math.max(1, f.priceRange[0]), Math.max(1, Number(e.target.value))] }))
              }
              className="w-full"
              style={{ accentColor: 'var(--primary)' }}
              aria-label="Maximum price filter"
            />
            <div className="flex justify-between text-xs mt-1 font-medium" style={{ color: 'var(--text-light)' }}>
              <span>₹1</span>
              <span>₹5,000</span>
            </div>
          </section>

          {/* Category chips */}
          <section>
            <p className="text-sm font-700 mb-3" style={{ fontWeight: 700 }}>Category</p>
            <div className="scroll-row flex-wrap gap-2">
              {CATEGORY_CHIPS.map((cat) => {
                const isActive = cat.slug === 'all' ? filters.categories.length === 0 : filters.categories.includes(cat.slug);
                return (
                  <button
                    key={cat.slug}
                    id={`filter-cat-${cat.slug}`}
                    onClick={() => toggleCategory(cat.slug)}
                    className="rounded-full px-4 py-1.5 text-sm font-semibold transition-all active:scale-95 cursor-pointer"
                    style={{
                      background: isActive ? 'var(--primary)' : 'var(--bg-surface-alt)',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                      border: `1.5px solid ${isActive ? 'var(--primary)' : 'var(--border-light)'}`,
                    }}
                    aria-pressed={isActive}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Size */}
          <section>
            <p className="text-sm font-700 mb-3" style={{ fontWeight: 700 }}>Size</p>
            <div className="flex gap-2.5 flex-wrap">
              {SIZE_OPTIONS.map((size) => {
                const isActive = filters.sizes.includes(size);
                return (
                  <button
                    key={size}
                    id={`filter-size-${size}`}
                    onClick={() => toggleSize(size)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-700 transition-all active:scale-90"
                    style={{
                      fontWeight: 700,
                      background: isActive ? 'var(--primary)' : 'var(--bg-surface-alt)',
                      color: isActive ? '#fff' : 'var(--text-main)',
                      border: `1.5px solid ${isActive ? 'var(--primary)' : 'var(--border-light)'}`,
                    }}
                    aria-pressed={isActive}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Color swatches */}
          <section>
            <p className="text-sm font-700 mb-3" style={{ fontWeight: 700 }}>Color</p>
            <div className="flex gap-3 flex-wrap">
              {COLOR_OPTIONS.map(({ hex, name }: { hex: string; name: string }) => {
                const isActive = filters.colors.includes(hex);
                return (
                  <button
                    key={hex}
                    id={`filter-color-${hex.replace('#', '')}`}
                    onClick={() => toggleColor(hex)}
                    className="h-8 w-8 rounded-full transition-all active:scale-90"
                    style={{
                      background: hex,
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
                      outline: isActive ? `3px solid var(--primary)` : 'none',
                      outlineOffset: isActive ? '2px' : '0',
                    }}
                    aria-pressed={isActive}
                    aria-label={name}
                  />
                );
              })}
            </div>
          </section>
        </div>

        {/* Actions */}
        <div
          className="shrink-0 flex gap-3 px-5 py-3.5 bg-[var(--bg-surface)] border-t border-[var(--border-light)]"
        >
          <button
            id="filter-reset-btn"
            onClick={handleReset}
            className="btn-ghost flex-1"
          >
            Reset
          </button>
          <button
            id="filter-apply-btn"
            onClick={handleApply}
            className="btn-primary flex-[2]"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
}
