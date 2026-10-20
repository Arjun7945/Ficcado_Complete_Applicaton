'use client';

// =============================================================================
// CategoryCard — Visual category tile with overlay label and status badges
// Refactored per AGENT BRIEF 2 Section 6:
// - Displays status indicator ("Live Drop" vs "Coming Soon")
// =============================================================================

import Image from 'next/image';
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/lib/images';
import type { CategoryConfig } from '@/config/categories';

interface CategoryCardProps {
  category: CategoryConfig;
  priority?: boolean;
  onClick: (category: CategoryConfig) => void;
}

export function CategoryCard({ category, priority = false, onClick }: CategoryCardProps) {
  const isLive = category.status === 'live';

  return (
    <button
      id={`category-card-${category.slug}`}
      className="group relative w-full cursor-pointer overflow-hidden text-left skeleton"
      style={{
        borderRadius: 'var(--radius-md)',
        aspectRatio: '1 / 1.15',
        background: 'var(--bg-surface-alt)',
        boxShadow: 'var(--shadow-card)',
        border: 'none',
        transition: 'transform var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out)',
      }}
      onClick={() => onClick(category)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)';
      }}
      aria-label={`Browse ${category.name}${!isLive ? ' (Coming Soon)' : ''}`}
    >
      {/* Category image */}
      <Image
        src={category.image || PLACEHOLDER_PRODUCT_IMAGE}
        alt={category.name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover transition-transform duration-500 group-hover:scale-108"
        priority={priority}
        unoptimized
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(17,24,39,0.85) 0%, rgba(17,24,39,0.2) 50%, rgba(17,24,39,0.1) 100%)',
        }}
      />

      {/* Status Pill Badge (Top-right) */}
      <div className="absolute top-2.5 right-2.5">
        {isLive ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-800 uppercase tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 backdrop-blur-md shadow-xs">
            Live Drop
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-800 uppercase tracking-wider text-amber-300 bg-amber-950/80 border border-amber-500/30 backdrop-blur-md shadow-xs">
            Coming Soon
          </span>
        )}
      </div>

      {/* Category label and description */}
      <div className="absolute bottom-3 left-0 right-0 px-3.5 space-y-0.5">
        <h3
          className="text-base font-900 text-white tracking-tight leading-tight"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
        >
          {category.name}
        </h3>
        <p className="text-[11px] text-white/80 line-clamp-1 font-medium">
          {category.description}
        </p>
      </div>
    </button>
  );
}

export default CategoryCard;
