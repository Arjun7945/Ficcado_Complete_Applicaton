'use client';

// =============================================================================
// Live Search View — /src/components/search/SearchView.tsx
// Receives server-rendered initialProducts (0 client-side round trips on mount).
// =============================================================================

import { useMemo, useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, SlidersHorizontal, X, TrendingUp, Clock } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { ProductCard } from '@/components/ui/ProductCard';
import { TRENDING_TAGS } from '@/config/site';
import type { Product } from '@/types';

const emptySubscribe = () => () => {};

let recentListeners: Array<() => void> = [];
function subscribeRecent(listener: () => void) {
  recentListeners.push(listener);
  return () => {
    recentListeners = recentListeners.filter((l) => l !== listener);
  };
}

let cachedRecent: string[] = [];
let lastRawRecent: string | null = null;

function getRecentSnapshot(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('ficcado-recent-searches');
    if (raw !== lastRawRecent) {
      lastRawRecent = raw;
      cachedRecent = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cachedRecent)) cachedRecent = [];
    }
  } catch {
    cachedRecent = [];
  }
  return cachedRecent;
}

const SERVER_EMPTY: string[] = [];
function getServerSnapshot(): string[] {
  return SERVER_EMPTY;
}

function notifyRecent() {
  recentListeners.forEach((l) => l());
}

interface SearchViewProps {
  initialProducts?: Product[];
}

export function SearchView({ initialProducts = [] }: SearchViewProps) {
  const router = useRouter();
  const { openModal } = useModal();
  const [query, setQuery] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>(() =>
    initialProducts.filter((p) => p.inStock)
  );
  const [isLoading, setIsLoading] = useState<boolean>(initialProducts.length === 0);

  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const recentSearches = useSyncExternalStore(subscribeRecent, getRecentSnapshot, getServerSnapshot);

  // Sync initial query from URL search parameters asynchronously after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const params = new URLSearchParams(window.location.search);
        const q = (params.get('q') || params.get('search') || '').trim();
        if (q) setQuery(q);
      } catch {
        // Ignore
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // If initialProducts was empty (e.g. cold start), fallback fetch from /api/products
  useEffect(() => {
    if (initialProducts.length > 0) return;
    let isMounted = true;
    async function loadProducts() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/products');
        if (res.ok) {
          const json = await res.json();
          const data: Product[] = Array.isArray(json) ? json : json?.data || [];
          if (isMounted && Array.isArray(data)) {
            setAllProducts(data.filter((p) => p.inStock));
          }
        }
      } catch (err) {
        console.warn('[Search] Failed to fetch products:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [initialProducts]);

  function saveRecentSearch(term: string) {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    const current = getRecentSnapshot();
    const updated = [clean, ...current.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
    try {
      const consentRaw = localStorage.getItem('ficcado-consent');
      if (!consentRaw) return; // Zero storage before consent decision
      const parsed = JSON.parse(consentRaw);
      if (parsed.preferences !== true) return;
      localStorage.setItem('ficcado-recent-searches', JSON.stringify(updated));
      notifyRecent();
    } catch {
      // Ignore quota
    }
  }

  const filteredProducts = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.desc || p.description || '').toLowerCase().includes(q)
    );
  }, [query, allProducts]);

  function applyTag(tag: string) {
    setQuery(tag);
    saveRecentSearch(tag);
  }

  function clearQuery() {
    setQuery('');
  }

  function removeRecent(tag: string) {
    const current = getRecentSnapshot();
    const updated = current.filter((t) => t !== tag);
    try {
      localStorage.setItem('ficcado-recent-searches', JSON.stringify(updated));
      notifyRecent();
    } catch {
      // Ignore quota
    }
  }

  function clearAllRecent() {
    try {
      localStorage.removeItem('ficcado-recent-searches');
      notifyRecent();
    } catch {
      // Ignore quota
    }
  }

  const showEmpty = query.trim() !== '' && filteredProducts.length === 0;

  return (
    <div id="search-page" className="flex flex-col" style={{ minHeight: '100%', background: 'var(--bg-app)' }}>
      {/* Mobile Header (Hidden on Tablet & Desktop) */}
      <header
        className="flex md:hidden items-center gap-3 px-4 py-3"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}
      >
        <button onClick={() => router.push('/')} className="btn-icon" aria-label="Back to home">
          <ArrowLeft size={20} style={{ color: 'var(--text-main)' }} />
        </button>
        <div
          className="flex flex-1 items-center gap-2 rounded-2xl px-3 py-2"
          style={{ background: 'var(--bg-surface-alt)', border: '1.5px solid var(--border-medium)' }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            id="mobile-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRecentSearch(query);
            }}
            placeholder="Search drops, high quality tees..."
            className="flex-1 bg-transparent text-xs sm:text-sm outline-none"
            style={{ color: 'var(--text-main)' }}
            autoFocus
          />
          {query && (
            <button onClick={clearQuery} className="cursor-pointer" aria-label="Clear search">
              <X size={15} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
        <button
          onClick={() => openModal('filterModal')}
          className="btn-icon"
          style={{ background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)' }}
          aria-label="Open filters"
        >
          <SlidersHorizontal size={17} style={{ color: 'var(--primary)' }} />
        </button>
      </header>

      {/* Desktop Heading & Search Bar */}
      <div className="hidden md:block px-4 md:px-0 pt-6 pb-2 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => router.push('/')} className="btn-icon" aria-label="Back to home">
            <ArrowLeft size={20} style={{ color: 'var(--text-main)' }} />
          </button>
          <h1 className="text-2xl font-900 tracking-tight text-[var(--text-main)]">
            Search Catalog
          </h1>
        </div>

        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 max-w-2xl"
          style={{ background: 'var(--bg-surface-alt)', border: '1.5px solid var(--border-light)' }}
        >
          <Search size={20} style={{ color: 'var(--text-muted)' }} />
          <input
            id="desktop-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRecentSearch(query);
            }}
            placeholder="Search by product name, category, or fit..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-main)' }}
          />
          {query && (
            <button onClick={clearQuery} className="cursor-pointer" aria-label="Clear search">
              <X size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 md:px-0 max-w-7xl mx-auto w-full py-4 space-y-6">
        {isLoading && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
              <span className="font-semibold tracking-wide">Syncing product catalog...</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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

        {/* Recent Searches */}
        {!query && isClient && recentSearches.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-700 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Recent Searches
              </p>
              <button
                onClick={clearAllRecent}
                className="text-[11px] font-semibold text-[var(--primary)] hover:underline cursor-pointer"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term) => (
                <div
                  key={term}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                  style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
                >
                  <Clock size={11} style={{ color: 'var(--text-light)' }} />
                  <button
                    onClick={() => applyTag(term)}
                    className="hover:underline cursor-pointer"
                  >
                    {term}
                  </button>
                  <button
                    onClick={() => removeRecent(term)}
                    className="ml-1 cursor-pointer"
                    aria-label={`Remove ${term}`}
                  >
                    <X size={11} style={{ color: 'var(--text-light)' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Tags */}
        {!query && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={13} style={{ color: 'var(--primary)' }} />
              <p className="text-xs font-700 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Trending Searches
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map((tag) => (
                <button
                  key={tag}
                  id={`trending-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => applyTag(tag)}
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1.5px solid var(--border-light)',
                    color: 'var(--text-main)',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {query.trim() !== '' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-700" style={{ color: 'var(--text-muted)' }}>
                {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
              </p>
              {filteredProducts.length > 0 && (
                <button
                  onClick={clearQuery}
                  className="text-xs font-semibold"
                  style={{ color: 'var(--primary)', cursor: 'pointer' }}
                >
                  Clear search
                </button>
              )}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 pb-6">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} priority={true} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {showEmpty && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <span className="text-4xl">🔍</span>
            <p className="text-base font-800" style={{ color: 'var(--text-main)' }}>
              No matches found
            </p>
            <p className="text-xs max-w-[260px]" style={{ color: 'var(--text-muted)' }}>
              We couldn&apos;t find anything matching &ldquo;{query}&rdquo;. Try another term or explore our unisex drops.
            </p>
            <button
              onClick={clearQuery}
              className="btn-primary text-xs py-2 px-4 mt-2"
            >
              Browse All Drops
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
