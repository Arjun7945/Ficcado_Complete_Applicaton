'use client';

// =============================================================================
// ProductModal — Product detail modal (#productModal)
// Image gallery, size/color selectors, Add to Cart CTA
// Refactored per REQUIREMENT_AND_REFACTOR_PART_2.md
// =============================================================================

import { useState } from 'react';
import Image from 'next/image';
import { X, Maximize2 } from 'lucide-react';
import { useModal, getProductModalPayload } from '@/context/ModalContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { RatingStars } from '@/components/ui/RatingStars';
import { getItemImages, PLACEHOLDER_IMAGE } from '@/lib/itemImages';
import { isCategoryLive } from '@/config/categories';
import { getSiteUrl } from '@/lib/siteUrl';
import { ImageZoomModal } from '@/components/modals/ImageZoomModal';
import { ImageGestureHint } from '@/components/ui/ImageGestureHint';
import { getColorName, getColorKeyword } from '@/lib/colors';
import type { Product, SizeOption } from '@/types';

const DEFAULT_SIZES: SizeOption[] = ['S', 'M', 'L', 'XL'];

export function ProductModal() {
  const { activeModal, modalPayload } = useModal();
  const isOpen = activeModal === 'productModal';
  const payload = getProductModalPayload(modalPayload);
  const product: Product | null = payload?.product ?? null;

  if (!isOpen || !product) return null;

  return <ProductModalDialog key={product.id} product={product} />;
}

function ProductModalDialog({ product }: { product: Product }) {
  const { closeModal, openModal } = useModal();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [userSize, setUserSize] = useState<SizeOption | null>(null);
  const [userColor, setUserColor] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [hasShownHint, setHasShownHint] = useState(false);

  const isLive = isCategoryLive(product.category);
  const selectedColor = userColor || (product.colors && product.colors[0]) || 'Standard';

  const resolvedFromSlug = getItemImages(product.slug || product.name);
  const rawImages =
    product.images && product.images.length > 0 && product.images.every((img) => img.startsWith('/') || img.startsWith('http'))
      ? product.images
      : resolvedFromSlug.length > 0 && resolvedFromSlug[0] !== PLACEHOLDER_IMAGE
      ? resolvedFromSlug
      : product.img && (product.img.startsWith('/') || product.img.startsWith('http'))
      ? [product.img]
      : resolvedFromSlug;

  const colorKeyword = getColorKeyword(selectedColor);
  const colorFiltered = colorKeyword
    ? rawImages.filter((img) => img.toLowerCase().includes(colorKeyword))
    : [];
  const images = colorFiltered.length > 0 ? colorFiltered : rawImages;
  const activeImage = images[activeImageIdx] || images[0] || PLACEHOLDER_IMAGE;
  const availableSizes = product.sizes && product.sizes.length > 0 ? product.sizes : DEFAULT_SIZES;
  const selectedSize = userSize || availableSizes[0] || 'M';

  function handleAddToCart() {
    if (!product) return;
    if (!isLive) {
      showToast('This collection is coming soon. Please wait for the drop! ✨', 'info');
      return;
    }
    const finalSize = selectedSize;
    const finalColor = selectedColor;
    addToCart(product, finalSize, finalColor, 1, activeImage);
    closeModal();
    showToast(`Added to Bag! 🛍️`);
    openModal('cartDrawer');
  }

  const siteUrl = getSiteUrl();

  const productJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${siteUrl}/#product-${product.id}`,
    name: product.name,
    image: images.map((img) =>
      img.startsWith('http') ? img : `${siteUrl}${img.startsWith('/') ? '' : '/'}${img}`
    ),
    description:
      product.desc ||
      product.description ||
      `Signature unisex ${product.name} crafted by Ficcado.`,
    sku: String(product.id),
    brand: {
      '@type': 'Brand',
      name: 'Ficcado',
    },
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/categories/${product.category}`,
      priceCurrency: 'INR',
      price: String(product.price),
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Ficcado',
      },
    },
  };

  if (
    typeof product.rating === 'number' &&
    product.rating > 0 &&
    typeof product.reviews === 'number' &&
    product.reviews > 0
  ) {
    productJsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(product.rating),
      reviewCount: String(product.reviews),
      bestRating: '5',
      worstRating: '1',
    };
  }

  return (
    <>
      <div
        className={`fixed inset-0 h-[100dvh] max-h-[100dvh] z-50 flex items-end md:items-center justify-center p-3 sm:p-4 md:p-6 pointer-events-none transition-opacity duration-200 ${
          isZoomOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          paddingBottom: 'calc(var(--ios-bottom-bar-clearance, 0px) + max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem)))',
          visibility: isZoomOpen ? 'hidden' : 'visible',
        }}
      >
      <template
        id="product-jsonld"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {/* Backdrop */}
      <div
        className="overlay animate-backdrop-in pointer-events-auto"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Sheet on mobile, Wide Two-Column Dialog on Tablet & Desktop */}
      <div
        id="productModal"
        role="dialog"
        aria-modal="true"
        aria-label={`Product details: ${product.name}`}
        className="animate-sheet-in md:animate-modal-in relative w-full max-w-[440px] md:max-w-3xl lg:max-w-4xl flex flex-col pointer-events-auto overflow-hidden rounded-[28px] sm:rounded-3xl md:rounded-3xl shadow-2xl border border-[var(--border-light)]"
        style={{
          maxHeight: 'min(82dvh, calc(100dvh - 3.5rem - var(--ios-bottom-bar-clearance, 0px)))',
          background: 'var(--bg-surface)',
          zIndex: 'var(--z-modal)',
        }}
      >
        {/* Drag handle (Mobile only) */}
        <div className="flex md:hidden justify-center pt-3 pb-1 shrink-0">
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border-medium)' }} />
        </div>

        {/* Single Unified Close Button */}
        <button
          onClick={closeModal}
          id="close-product-modal-btn"
          className="absolute right-3.5 top-3.5 z-30 flex items-center justify-center h-9 w-9 rounded-full bg-transparent hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-main)] transition-all active:scale-90 cursor-pointer"
          aria-label="Close product details"
        >
          <X size={20} style={{ color: 'var(--text-main)' }} />
        </button>

        {/* Content Container */}
        <div className="overflow-y-auto flex-1 min-h-0 md:grid md:grid-cols-2 overscroll-contain">
          {/* Left Column: Product Image Gallery */}
          <div className="flex flex-col bg-[var(--bg-surface-alt)] border-b md:border-b-0 md:border-r border-[var(--border-light)]">
            <div
              onClick={() => setIsZoomOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsZoomOpen(true);
                }
              }}
              aria-label={`Inspect ${product.name} image in high resolution`}
              className="relative aspect-[4/3] md:aspect-auto md:flex-1 md:min-h-[300px] overflow-hidden cursor-zoom-in group select-none"
            >
              <Image
                src={activeImage}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority
                loading="eager"
              />
              {/* Tap to Zoom pill badge */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-bold shadow-lg transition-all group-hover:scale-105">
                <Maximize2 size={13} />
                <span>Tap to Zoom & Inspect</span>
              </div>
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white uppercase tracking-wider">
                {product.category}
              </div>

              {/* Gesture hint for zoom/close look: strictly once on the 1st image per item view */}
              {!hasShownHint && activeImageIdx === 0 && (
                <ImageGestureHint onDismiss={() => setHasShownHint(true)} />
              )}
            </div>

            {/* Gallery Thumbnail Selector if multiple images exist */}
            {images.length > 1 && (
              <div className="p-3 flex items-center justify-center gap-2 bg-[var(--bg-surface)] border-t border-[var(--border-light)]">
                {images.map((img, idx) => (
                  <button
                    key={img}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative w-12 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      activeImageIdx === idx
                        ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 scale-105'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      fill
                      sizes="48px"
                      className="object-cover"
                      loading="eager"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details & Actions */}
          <div className="p-5 md:p-8 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Name + Price */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  {product.featured && (
                    <div className="mb-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-800 uppercase tracking-wider text-amber-300 bg-neutral-950/85 border border-amber-400/40 backdrop-blur-md shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        New Launch Drop
                      </span>
                    </div>
                  )}
                  <h2 className="text-xl md:text-2xl font-900 leading-tight" style={{ fontWeight: 900, color: 'var(--text-main)' }}>
                    {product.name}
                  </h2>
                </div>
                <span className="text-2xl md:text-3xl font-900 shrink-0" style={{ fontWeight: 900, color: 'var(--primary)' }}>
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Rating row: only shown when real verified ratings exist */}
              {product.rating > 0 && product.reviews > 0 && (
                <div className="inline-flex items-center gap-2">
                  <RatingStars rating={product.rating} size={15} />
                  <span className="text-xs md:text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {product.rating} ({product.reviews} reviews)
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="divider" />

              {/* Size selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs md:text-sm font-700" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    Select Size
                  </p>
                  <span className="text-[11px] text-[var(--text-muted)] font-medium">Standard Fit</span>
                </div>
                <div className="flex gap-2.5">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      id={`size-${size}`}
                      onClick={() => setUserSize(size)}
                      className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-xl text-sm font-700 transition-all active:scale-95 cursor-pointer"
                      style={{
                        fontWeight: 700,
                        background: selectedSize === size ? 'var(--primary)' : 'var(--bg-surface-alt)',
                        color: selectedSize === size ? '#fff' : 'var(--text-main)',
                        border: selectedSize === size ? 'none' : '1.5px solid var(--border-light)',
                        boxShadow: selectedSize === size ? 'var(--shadow-btn)' : 'none',
                      }}
                      aria-pressed={selectedSize === size}
                      aria-label={`Size ${size}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color selector */}
              {product.colors && product.colors.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs md:text-sm font-700" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      Available Colorways
                    </p>
                    <span className="text-[11px] font-semibold text-[var(--primary)]">
                      {getColorName(selectedColor)}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        id={`color-${color.replace('#', '')}`}
                        onClick={() => {
                          setUserColor(color);
                          setActiveImageIdx(0);
                        }}
                        className="h-8 w-8 md:h-9 md:w-9 rounded-full transition-all active:scale-90 cursor-pointer"
                        style={{
                          background: color,
                          border: selectedColor === color ? `3px solid var(--primary)` : '2px solid transparent',
                          outline: selectedColor === color ? `2px solid var(--primary)` : 'none',
                          outlineOffset: selectedColor === color ? '2px' : '0',
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
                        }}
                        aria-pressed={selectedColor === color}
                        aria-label={`Select color ${getColorName(color)}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {product.desc && (
                <div>
                  <p
                    className={`text-xs md:text-sm leading-relaxed transition-all ${expanded ? '' : 'line-clamp-3 md:line-clamp-4'}`}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {product.desc}
                  </p>
                  {product.desc.length > 120 && (
                    <button
                      onClick={() => setExpanded((e) => !e)}
                      className="mt-1 text-xs font-semibold transition-opacity hover:opacity-70"
                      style={{ color: 'var(--primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      {expanded ? 'Show less' : 'Read full specs'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* CTA in Right Column (Tablet & Desktop Only) */}
            <div className="hidden md:block pt-4 mt-4 border-t border-[var(--border-light)]">
              <button
                id="add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={!isLive}
                className={`btn-primary w-full py-3.5 text-sm font-bold shadow-md rounded-2xl cursor-pointer ${
                  !isLive ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLive ? `Add To Bag — ₹${product.price.toLocaleString('en-IN')}` : 'Collection Coming Soon'}
              </button>
            </div>
          </div>
        </div>

        {/* Pinned Mobile Sticky Action Bar — Guaranteed visibility, one-tap add to bag */}
        <div
          className="shrink-0 md:hidden px-5 py-3.5 bg-[var(--bg-surface)] border-t border-[var(--border-light)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3"
        >
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-surface-alt)] text-[var(--text-main)] border border-[var(--border-light)]">
                Size {selectedSize}
              </span>
            </div>
            <span className="text-xl font-900 text-[var(--primary)] leading-tight mt-0.5">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          </div>

          <button
            id="mobile-add-to-cart-btn"
            onClick={handleAddToCart}
            disabled={!isLive}
            className={`btn-primary flex-1 py-3 px-4 text-sm font-bold shadow-md rounded-2xl cursor-pointer ${
              !isLive ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLive ? 'Add To Bag →' : 'Coming Soon'}
          </button>
        </div>
        </div>
      </div>

      {/* High-Resolution Interactive Image Zoom Lightbox mounted outside hidden modal */}
      <ImageZoomModal
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        images={images}
        initialIndex={activeImageIdx}
        productName={product.name}
      />
    </>
  );
}

