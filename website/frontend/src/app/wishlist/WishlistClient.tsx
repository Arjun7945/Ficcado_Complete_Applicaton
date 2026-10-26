'use client';

// =============================================================================
// WishlistClient — Saved Items Page Interactive Component
// Implements Phase P2-5 (A-1, C-1):
// - Hydrates items via public batch endpoint /api/public/products/by-ids
// - Inactive and deleted items are filtered out on the server
// - Provides empty states, guest notice, and seamless interaction with ProductModal
// =============================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  ArrowLeft,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useModal } from '@/context/ModalContext';
import { ProductCard } from '@/components/ui/ProductCard';
import { getBatchProducts } from '@/lib/api/wishlist';
import type { Product } from '@/types';

export function WishlistClient() {
  const { wishlistIds, isLoading: isWishlistSyncing, refreshWishlist } = useWishlist();
  const { isAuthenticated, isLoading: isAuthLoading } = useCustomerAuth();
  const { openModal } = useModal();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // Fetch full product details for items in wishlist
  useEffect(() => {
    let isCancelled = false;

    async function loadProducts() {
      if (!isAuthenticated) {
        setProducts([]);
        setLoadingProducts(false);
        return;
      }

      const ids = Array.from(wishlistIds);
      if (ids.length === 0) {
        setProducts([]);
        setLoadingProducts(false);
        return;
      }

      setLoadingProducts(true);
      try {
        const batchData = await getBatchProducts(ids);
        if (!isCancelled) {
          // Keep only products still in the wishlist
          const filtered = batchData.filter((p) => wishlistIds.has(Number(p.id)));
          setProducts(filtered);
        }
      } catch (err) {
        console.error('Error hydrating wishlist products:', err);
      } finally {
        if (!isCancelled) {
          setLoadingProducts(false);
        }
      }
    }

    loadProducts();

    return () => {
      isCancelled = true;
    };
  }, [wishlistIds, isAuthenticated]);

  return (
    <div
      id="wishlist-page"
      className="min-h-full py-6 md:py-10 px-4 md:px-8 max-w-7xl mx-auto animate-fade-in space-y-8"
    >
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-light)] pb-5">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary)] hover:underline mb-1"
          >
            <ArrowLeft size={16} />
            <span>Back to Drops</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-900 text-[var(--text-main)] tracking-tight">
              Saved Wishlist
            </h1>
            {isAuthenticated && products.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--primary-light)] text-[var(--primary)]">
                {products.length} {products.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Your personal curation of heavyweight unisex streetwear essentials.
          </p>
        </div>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => refreshWishlist()}
            disabled={isWishlistSyncing}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[var(--text-main)] bg-[var(--bg-surface-alt)] border border-[var(--border-light)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Wishlist"
          >
            <RefreshCw size={14} className={isWishlistSyncing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        )}
      </div>

      {/* Guest Mode Banner */}
      {!isAuthenticated && !isAuthLoading && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 shrink-0 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center">
              <Heart size={28} className="fill-[var(--primary)]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-main)]">
                Save your favorites across devices
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl">
                Sign in to your Ficcado customer account to save drops, receive restock notifications, and access your personal wishlist from any smartphone, tablet, or desktop.
              </p>
            </div>
          </div>
          <button
            id="wishlist-guest-signin-btn"
            type="button"
            onClick={() => openModal('authModal')}
            className="w-full md:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-all cursor-pointer shadow-btn shrink-0"
          >
            Sign In or Register
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isAuthLoading || (isAuthenticated && loadingProducts) ? (
        /* Loading Skeleton Grid */
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] overflow-hidden space-y-3 p-3 animate-pulse"
            >
              <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-xl" style={{ aspectRatio: '3/4' }} />
              <div className="h-4 bg-gray-200 dark:bg-neutral-800 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-neutral-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : isAuthenticated && products.length === 0 ? (
        /* Empty Wishlist State */
        <div className="card p-8 sm:p-14 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-sm space-y-5 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-surface-alt)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
            <Heart size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
              Your Wishlist is Empty
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Explore our unisex heavyweight drops and tap the heart icon on any piece to save it for later.
            </p>
          </div>
          <div>
            <Link
              id="wishlist-explore-btn"
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-all cursor-pointer shadow-btn"
            >
              <Sparkles size={16} />
              <span>Explore Latest Drops</span>
            </Link>
          </div>
        </div>
      ) : isAuthenticated && products.length > 0 ? (
        /* Populated Wishlist Grid */
        <div
          id="wishlist-products-grid"
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
        >
          {products.map((product, idx) => (
            <ProductCard key={product.id} product={product} priority={idx < 4} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
