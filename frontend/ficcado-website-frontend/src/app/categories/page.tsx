'use client';

// =============================================================================
// Category Directory — /categories
// Refactored per AGENT BRIEF 2 Section 5 & 6:
// - Completely removed gender department pills (Men / Women / Kids)
// - Displays exactly the 6 official categories from single source of truth
// - Clicking a live category navigates to /categories/[slug]
// - Clicking a coming-soon category navigates to designed Coming Soon state
// =============================================================================

import { useRouter } from 'next/navigation';
import { ArrowLeft, Menu } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { CategoryCard } from '@/components/ui/CategoryCard';
import { CATEGORIES_CONFIG, type CategoryConfig } from '@/config/categories';

export default function CategoriesPage() {
  const router = useRouter();
  const { openModal } = useModal();

  function handleCategorySelect(category: CategoryConfig) {
    router.push(`/categories/${category.slug}`);
  }

  return (
    <div id="categories-page" className="flex flex-col" style={{ minHeight: '100%', background: 'var(--bg-app)' }}>
      {/* Mobile Header (Hidden on Tablet & Desktop) */}
      <header
        className="flex md:hidden items-center gap-3 px-4 py-3"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}
      >
        <button onClick={() => router.push('/')} className="btn-icon" aria-label="Back to home">
          <ArrowLeft size={20} style={{ color: 'var(--text-main)' }} />
        </button>
        <h1 className="flex-1 text-base font-700" style={{ fontWeight: 700 }}>Categories & Drops</h1>
        <button
          onClick={() => openModal('mobileMenuDrawer')}
          className="btn-icon cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={20} style={{ color: 'var(--text-main)' }} />
        </button>
      </header>

      {/* Desktop Heading Banner */}
      <div className="hidden md:flex items-center justify-between mb-6 px-4 md:px-0 pt-4">
        <div>
          <span className="text-xs font-800 uppercase tracking-widest text-[var(--primary)] bg-[var(--primary-light)] px-3 py-1 rounded-full border border-[var(--primary)]/20 inline-block mb-2">
            Unisex Catalog Architecture
          </span>
          <h1 className="text-2xl lg:text-3xl font-900 tracking-tight" style={{ color: 'var(--text-main)', fontWeight: 900 }}>
            Shop By Silhouette & Capsule
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Browse our official unisex collections. Explore our active drops and preview upcoming silhouettes.
          </p>
        </div>
      </div>

      {/* Category Grid: 2-col mobile, 3-col tablet/desktop */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 md:px-0 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-6 pb-8">
          {CATEGORIES_CONFIG.map((cat) => (
            <CategoryCard
              key={cat.slug}
              category={cat}
              priority={true}
              onClick={handleCategorySelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
