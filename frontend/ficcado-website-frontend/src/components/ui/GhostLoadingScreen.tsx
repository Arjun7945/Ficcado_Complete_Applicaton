'use client';

// =============================================================================
// GhostLoadingScreen — /src/components/ui/GhostLoadingScreen.tsx
// High-Traffic Resilient Ghost Loading & Skeleton Content System
// Provides captivating, brand-tailored skeleton shimmering across all pages:
// - full (Home Storefront with Hero, Categories, Spotlight, Product Grid)
// - catalog (Collection Listing with Filters, Sort & 8-12 Card Grid)
// - categories (Category Directory with 6 Luxury Showcase Cards)
// - detail (Product Detail with Split Image Stage, Swatches, Sizing, CTA)
// - search (Search Bar, Trending Search Tags, Results Grid)
// - checkout (Stepper, Multi-Step Shipping & Courier Form, Order Summary)
// - orders (Order History, Timeline Steps, Item Previews, Actions)
// - support (Help Center Hero, Topic Tiles, Ticket Form, FAQ Accordions)
// - settings (Profile Badge, App Preferences, Storage Controls)
// - info (Editorial Article with Breadcrumb, Paragraph Blocks, Callouts)
// =============================================================================

import React from 'react';

export type GhostLoadingType =
  | 'full'
  | 'catalog'
  | 'categories'
  | 'detail'
  | 'search'
  | 'checkout'
  | 'orders'
  | 'support'
  | 'settings'
  | 'info';

interface GhostLoadingProps {
  type?: GhostLoadingType;
}

export function GhostLoadingScreen({ type = 'full' }: GhostLoadingProps) {
  return (
    <div
      role="status"
      aria-label="Loading Ficcado Clothing content..."
      aria-live="polite"
      className="w-full min-h-[70vh] p-3 sm:p-4 md:p-6 lg:p-8 animate-fade-in space-y-6 select-none"
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. FULL / HOME STOREFRONT SKELETON                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {type === 'full' && (
        <div className="space-y-6 max-w-7xl mx-auto w-full">
          {/* Top Live Drop Bar */}
          <div className="w-full h-8 rounded-full skeleton flex items-center justify-between px-4 opacity-75" />

          {/* Cinematic Hero Banner Skeleton */}
          <div className="relative w-full h-44 sm:h-56 md:h-80 lg:h-[390px] rounded-3xl skeleton overflow-hidden flex flex-col justify-end p-5 md:p-8 space-y-3">
            <div className="w-24 h-5 rounded-full bg-white/30 backdrop-blur-md" />
            <div className="w-2/3 max-w-md h-8 md:h-12 rounded-xl bg-white/40 backdrop-blur-md" />
            <div className="w-1/2 max-w-sm h-4 md:h-5 rounded-lg bg-white/20 backdrop-blur-md" />
            <div className="w-36 h-10 rounded-full bg-white/50 backdrop-blur-md mt-2" />
          </div>

          {/* Category Quick-Nav Carousel Skeleton */}
          <div className="flex items-center gap-3 overflow-x-hidden py-1">
            {[80, 110, 96, 128, 90, 100].map((width, idx) => (
              <div
                key={idx}
                className="h-10 rounded-full skeleton shrink-0"
                style={{ width: `${width}px` }}
              />
            ))}
          </div>

          {/* Curated Drop Section Header */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-1.5">
              <div className="w-40 sm:w-56 h-6 rounded-lg skeleton" />
              <div className="w-28 sm:w-36 h-3 rounded skeleton" />
            </div>
            <div className="w-20 h-7 rounded-full skeleton" />
          </div>

          {/* 8-Card Responsive Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="card p-2.5 sm:p-3 space-y-2.5 flex flex-col rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)]"
              >
                {/* Product Image Stage */}
                <div className="w-full aspect-[3/4] rounded-xl skeleton relative overflow-hidden">
                  <div className="absolute top-2 left-2 w-14 h-4 rounded-full bg-white/30" />
                  <div className="absolute bottom-2 left-2 w-16 h-5 rounded-full bg-black/25" />
                </div>
                {/* Brand & Rating Line */}
                <div className="flex items-center justify-between pt-1">
                  <div className="w-20 h-3 rounded skeleton" />
                  <div className="w-10 h-3 rounded skeleton" />
                </div>
                {/* Product Title */}
                <div className="w-4/5 h-4 rounded skeleton" />
                {/* Price & Action Row */}
                <div className="flex items-center justify-between pt-1 mt-auto">
                  <div className="w-16 h-5 rounded skeleton" />
                  <div className="w-7 h-7 rounded-full skeleton shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. CATALOG / COLLECTION VIEW SKELETON                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {type === 'catalog' && (
        <div className="space-y-6 max-w-7xl mx-auto w-full">
          {/* Breadcrumb line */}
          <div className="flex items-center gap-2">
            <div className="w-16 h-3 rounded skeleton" />
            <span className="text-xs text-[var(--text-muted)]">/</span>
            <div className="w-24 h-3 rounded skeleton" />
          </div>

          {/* Collection Header Banner */}
          <div className="card p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
            <div className="w-28 h-5 rounded-full skeleton" />
            <div className="w-64 sm:w-96 h-8 rounded-xl skeleton" />
            <div className="w-full max-w-xl h-4 rounded skeleton" />
          </div>

          {/* Filter & Sort Bar */}
          <div className="flex items-center justify-between gap-3 overflow-x-hidden py-1">
            <div className="flex items-center gap-2">
              <div className="w-24 h-9 rounded-full skeleton" />
              <div className="w-20 h-9 rounded-full skeleton" />
              <div className="w-28 h-9 rounded-full skeleton" />
            </div>
            <div className="w-32 h-9 rounded-full skeleton shrink-0" />
          </div>

          {/* Catalog Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="card p-2.5 sm:p-3 space-y-2.5 flex flex-col rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)]"
              >
                <div className="w-full aspect-[3/4] rounded-xl skeleton" />
                <div className="flex items-center justify-between pt-1">
                  <div className="w-16 h-3 rounded skeleton" />
                  <div className="w-12 h-3 rounded skeleton" />
                </div>
                <div className="w-3/4 h-4 rounded skeleton" />
                <div className="flex items-center justify-between pt-1 mt-auto">
                  <div className="w-14 h-5 rounded skeleton" />
                  <div className="w-7 h-7 rounded-full skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. CATEGORIES DIRECTORY SKELETON                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {type === 'categories' && (
        <div className="space-y-6 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="space-y-2 text-center max-w-lg mx-auto py-2">
            <div className="w-24 h-4 rounded-full skeleton mx-auto" />
            <div className="w-56 h-8 rounded-xl skeleton mx-auto" />
            <div className="w-72 h-4 rounded skeleton mx-auto" />
          </div>

          {/* 6 Category Showcase Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="relative h-60 sm:h-72 rounded-3xl skeleton overflow-hidden p-5 flex flex-col justify-end space-y-2"
              >
                <div className="w-20 h-4 rounded-full bg-white/30 backdrop-blur-md" />
                <div className="w-36 h-6 rounded-lg bg-white/50 backdrop-blur-md" />
                <div className="w-24 h-3 rounded bg-white/20 backdrop-blur-md" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. PRODUCT DETAIL / MODAL SKELETON                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {type === 'detail' && (
        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 p-2">
          {/* Left Column: Image Showcase */}
          <div className="space-y-3">
            <div className="w-full aspect-[4/3] md:aspect-[3/4] rounded-3xl skeleton" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-14 h-16 rounded-xl skeleton shrink-0" />
              ))}
            </div>
          </div>

          {/* Right Column: Product Meta & Purchase Panel */}
          <div className="space-y-5 flex flex-col">
            <div className="space-y-2">
              <div className="w-20 h-5 rounded-full skeleton" />
              <div className="w-3/4 h-8 rounded-xl skeleton" />
              <div className="w-32 h-4 rounded skeleton" />
            </div>

            <div className="w-24 h-7 rounded-lg skeleton" />

            {/* Color Swatches */}
            <div className="space-y-2 pt-2">
              <div className="w-24 h-3 rounded skeleton" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full skeleton" />
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div className="space-y-2">
              <div className="w-20 h-3 rounded skeleton" />
              <div className="flex gap-2">
                {['S', 'M', 'L', 'XL'].map((s) => (
                  <div key={s} className="w-12 h-10 rounded-xl skeleton" />
                ))}
              </div>
            </div>

            {/* Add to Cart CTA */}
            <div className="pt-4 space-y-3 mt-auto">
              <div className="w-full h-12 rounded-2xl skeleton" />
              <div className="w-full h-11 rounded-2xl skeleton opacity-60" />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. SEARCH VIEW SKELETON                                             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {type === 'search' && (
        <div className="space-y-6 max-w-7xl mx-auto w-full">
          {/* Search Input Bar Skeleton */}
          <div className="w-full h-12 rounded-2xl skeleton" />

          {/* Trending Searches Pills */}
          <div className="space-y-2">
            <div className="w-28 h-3 rounded skeleton" />
            <div className="flex items-center gap-2 overflow-x-hidden">
              <div className="w-28 h-8 rounded-full skeleton shrink-0" />
              <div className="w-24 h-8 rounded-full skeleton shrink-0" />
              <div className="w-32 h-8 rounded-full skeleton shrink-0" />
              <div className="w-20 h-8 rounded-full skeleton shrink-0" />
            </div>
          </div>

          {/* Search Results Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="card p-2.5 sm:p-3 space-y-2.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)]"
              >
                <div className="w-full aspect-[3/4] rounded-xl skeleton" />
                <div className="w-3/4 h-4 rounded skeleton" />
                <div className="flex items-center justify-between pt-1">
                  <div className="w-14 h-4 rounded skeleton" />
                  <div className="w-6 h-6 rounded-full skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. CHECKOUT SKELETON                                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {type === 'checkout' && (
        <div className="max-w-6xl mx-auto w-full space-y-6">
          {/* Stepper Bar Skeleton */}
          <div className="w-full max-w-md mx-auto h-8 rounded-full skeleton" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Shipping & Delivery Forms */}
            <div className="lg:col-span-2 space-y-5">
              {/* Customer Info Card */}
              <div className="card p-5 md:p-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
                <div className="w-36 h-5 rounded skeleton" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="w-full h-11 rounded-xl skeleton" />
                  <div className="w-full h-11 rounded-xl skeleton" />
                </div>
                <div className="w-full h-11 rounded-xl skeleton" />
              </div>

              {/* Delivery Address Card */}
              <div className="card p-5 md:p-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
                <div className="w-40 h-5 rounded skeleton" />
                <div className="w-full h-11 rounded-xl skeleton" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="w-full h-11 rounded-xl skeleton" />
                  <div className="w-full h-11 rounded-xl skeleton" />
                </div>
              </div>

              {/* Courier Partner Card */}
              <div className="card p-5 md:p-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
                <div className="w-36 h-5 rounded skeleton" />
                <div className="w-full h-14 rounded-2xl skeleton" />
                <div className="w-full h-14 rounded-2xl skeleton" />
              </div>
            </div>

            {/* Right Column: Order Summary Card */}
            <div className="card p-5 md:p-7 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4 h-fit">
              <div className="w-32 h-5 rounded skeleton" />
              <div className="space-y-3 pt-2">
                <div className="flex gap-3 items-center">
                  <div className="w-14 h-16 rounded-xl skeleton shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="w-3/4 h-3.5 rounded skeleton" />
                    <div className="w-1/2 h-3 rounded skeleton" />
                  </div>
                </div>
              </div>
              <div className="border-t border-[var(--border-light)] pt-3 space-y-2">
                <div className="flex justify-between">
                  <div className="w-16 h-3 rounded skeleton" />
                  <div className="w-12 h-3 rounded skeleton" />
                </div>
                <div className="flex justify-between">
                  <div className="w-20 h-3 rounded skeleton" />
                  <div className="w-14 h-3 rounded skeleton" />
                </div>
              </div>
              <div className="w-full h-12 rounded-2xl skeleton pt-2" />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 7. ORDERS SKELETON                                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {type === 'orders' && (
        <div className="space-y-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between pb-2">
            <div className="w-36 h-6 rounded skeleton" />
            <div className="w-28 h-8 rounded-full skeleton" />
          </div>

          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-light)]">
                <div className="space-y-1">
                  <div className="w-32 h-4 rounded skeleton" />
                  <div className="w-20 h-3 rounded skeleton" />
                </div>
                <div className="w-24 h-6 rounded-full skeleton" />
              </div>
              <div className="flex gap-3">
                <div className="w-16 h-20 rounded-xl skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 rounded skeleton" />
                  <div className="w-1/3 h-3 rounded skeleton" />
                  <div className="w-20 h-4 rounded skeleton" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 8. SUPPORT & FAQ SKELETON                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {type === 'support' && (
        <div className="space-y-6 max-w-4xl mx-auto w-full">
          <div className="card p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-center space-y-3">
            <div className="w-36 h-4 rounded-full skeleton mx-auto" />
            <div className="w-64 sm:w-80 h-8 rounded-xl skeleton mx-auto" />
            <div className="w-full max-w-md h-11 rounded-2xl skeleton mx-auto" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] text-center space-y-2">
                <div className="w-8 h-8 rounded-full skeleton mx-auto" />
                <div className="w-16 h-3 rounded skeleton mx-auto" />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex justify-between items-center">
                <div className="w-2/3 h-4 rounded skeleton" />
                <div className="w-5 h-5 rounded-full skeleton" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 9. SETTINGS SKELETON                                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {type === 'settings' && (
        <div className="space-y-5 max-w-2xl mx-auto w-full">
          {/* User Profile Card */}
          <div className="card p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-center gap-4">
            <div className="w-14 h-14 rounded-full skeleton shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-36 h-4 rounded skeleton" />
              <div className="w-48 h-3 rounded skeleton" />
            </div>
          </div>

          {/* Settings Group 1 */}
          <div className="card p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
            <div className="w-28 h-4 rounded skeleton" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-[var(--border-light)] last:border-0">
                <div className="space-y-1">
                  <div className="w-32 h-3.5 rounded skeleton" />
                  <div className="w-44 h-2.5 rounded skeleton" />
                </div>
                <div className="w-11 h-6 rounded-full skeleton" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 10. EDITORIAL & LEGAL INFO SKELETON                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {type === 'info' && (
        <div className="space-y-6 max-w-3xl mx-auto w-full py-4">
          {/* Breadcrumb & Title */}
          <div className="space-y-3">
            <div className="w-24 h-3 rounded skeleton" />
            <div className="w-3/4 sm:w-1/2 h-8 rounded-xl skeleton" />
            <div className="w-32 h-3 rounded skeleton" />
          </div>

          {/* Lead Card */}
          <div className="card p-5 md:p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
            <div className="w-full h-4 rounded skeleton" />
            <div className="w-5/6 h-4 rounded skeleton" />
            <div className="w-4/6 h-4 rounded skeleton" />
          </div>

          {/* Paragraph Blocks */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2.5 pt-2">
              <div className="w-1/3 h-5 rounded skeleton mb-3" />
              <div className="w-full h-3.5 rounded skeleton" />
              <div className="w-[95%] h-3.5 rounded skeleton" />
              <div className="w-[88%] h-3.5 rounded skeleton" />
              <div className="w-[60%] h-3.5 rounded skeleton" />
            </div>
          ))}
        </div>
      )}

      {/* Discreet Brand Identity Watermark */}
      <div className="flex justify-center items-center gap-1.5 pt-4 opacity-40">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
        <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-muted)]">
          Ficcado Clothing
        </span>
      </div>
    </div>
  );
}

export default GhostLoadingScreen;
