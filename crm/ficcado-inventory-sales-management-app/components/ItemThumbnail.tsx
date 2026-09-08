'use client';

/**
 * components/ItemThumbnail.tsx
 *
 * Displays an item's cover thumbnail (or an on-brand SVG placeholder graphic if missing)
 * alongside the item name across all CRM sections:
 *   - Items management list
 *   - Sales view/edit
 *   - Replacement view (old & new items)
 *   - Return/Refund view
 *   - Inventory & Warehouse allocation lists
 *   - Damaged Products view
 */

import React from 'react';
import Image from 'next/image';

interface ItemThumbnailProps {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function ItemThumbnail({
  src,
  alt,
  size = 36,
  className = '',
  style = {},
}: ItemThumbnailProps) {
  const [hasError, setHasError] = React.useState(false);

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 8,
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-surface-hover, rgba(255, 255, 255, 0.05))',
    border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.1))',
    flexShrink: 0,
    position: 'relative',
    ...style,
  };

  if (src && !hasError) {
    return (
      <div className={`item-thumbnail ${className}`} style={containerStyle}>
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          onError={() => setHasError(true)}
          unoptimized
        />
      </div>
    );
  }

  // On-brand SVG Placeholder Graphic (Ficcado brand palette)
  return (
    <div
      className={`item-thumbnail item-thumbnail-placeholder ${className}`}
      style={containerStyle}
      title={alt}
    >
      <svg
        width={Math.round(size * 0.55)}
        height={Math.round(size * 0.55)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21"
          stroke="var(--color-brand-primary, #a78bfa)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}
