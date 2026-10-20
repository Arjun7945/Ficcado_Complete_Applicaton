'use client';

// =============================================================================
// AboutModal — Brand overview & core principles (#aboutModal)
// Factual, neutral brand copy per REQUIREMENT_AND_REFACTOR_PART_2.md
// =============================================================================

import { X, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useModal } from '@/context/ModalContext';
import { BRAND } from '@/config/site';

const PILLARS = [
  { emoji: '🎯', title: 'Curated Drops', desc: 'Limited capsule collections released in batches.' },
  { emoji: '🧵', title: 'Quality Craftsmanship', desc: 'Contemporary unisex silhouettes engineered for durability.' },
  { emoji: '⚡', title: 'Reliable Delivery', desc: 'Dispatched with trusted courier partners with tracking across India.' },
  { emoji: '🤝', title: 'Direct WhatsApp Care', desc: 'Direct communication for sizing assistance, order status, and customer support.' },
];

export function AboutModal() {
  const { activeModal, closeModal } = useModal();
  const isOpen = activeModal === 'aboutModal';

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 h-[100dvh] max-h-[100dvh] flex items-end sm:items-center justify-center p-3 sm:p-4 pointer-events-none"
      style={{
        zIndex: 'var(--z-modal)',
        paddingBottom: 'calc(var(--ios-bottom-bar-clearance, 0px) + max(0.75rem, calc(env(safe-area-inset-bottom, 0px) + 0.5rem)))',
      }}
    >
      <div
        className="overlay animate-backdrop-in pointer-events-auto"
        onClick={closeModal}
        aria-hidden="true"
      />
      <div
        id="aboutModal"
        role="dialog"
        aria-modal="true"
        aria-label="About Ficcado Clothing"
        className="animate-sheet-in sm:animate-modal-in relative w-full sm:max-w-[480px] md:max-w-[540px] flex flex-col pointer-events-auto rounded-[28px] sm:rounded-3xl shadow-2xl border border-[var(--border-light)] overflow-hidden"
        style={{
          maxHeight: 'min(82dvh, calc(100dvh - 3.5rem - var(--ios-bottom-bar-clearance, 0px)))',
          background: 'var(--bg-surface)',
          zIndex: 10,
        }}
      >
        {/* Header */}
        <div
          className="shrink-0 px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div
                className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-[var(--border-light)] overflow-hidden p-1.5 mb-3"
                style={{ boxShadow: '0 4px 16px rgba(43, 98, 198, 0.15)' }}
              >
                <Image
                  src="/images/brand_logo/Ficcado Brand Logo.jpeg"
                  alt="Ficcado Logo"
                  fill
                  sizes="48px"
                  className="object-contain p-1"
                  priority
                  loading="eager"
                />
              </div>
              <h2 className="text-xl font-900 leading-tight" style={{ fontWeight: 900, color: 'var(--text-main)' }}>
                {BRAND.name}
              </h2>
              <span className="text-xs font-bold text-[var(--primary)] block mt-0.5 tracking-wide">
                High Quality Unisex Wears
              </span>
            </div>
            <button onClick={closeModal} className="btn-icon" aria-label="Close about dialog">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
          {/* Brand Introduction */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)]">
              <Sparkles size={14} />
              <span>About Ficcado</span>
            </div>
            <p className="text-xs md:text-sm leading-relaxed text-[var(--text-secondary)]">
              Ficcado crafts signature high quality unisex streetwear with premium 240 GSM combed cotton. We combine thoughtful design with personal WhatsApp-assisted ordering.
            </p>
          </div>

          {/* Core Pillars */}
          <div className="space-y-2.5">
            <p className="text-sm font-700 text-[var(--text-main)]">Our Focus</p>
            {PILLARS.map(({ emoji, title, desc }) => (
              <div
                key={title}
                className="flex gap-3 rounded-2xl p-3"
                style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-light)' }}
              >
                <span className="text-xl shrink-0 leading-none mt-0.5">{emoji}</span>
                <div>
                  <p className="text-xs font-700 text-[var(--text-main)]">{title}</p>
                  <p className="text-[11px] mt-0.5 text-[var(--text-muted)]">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Dedicated Page Link */}
          <Link
            href="/about"
            onClick={closeModal}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all shadow-btn text-xs font-bold"
          >
            <span>Learn More About Ficcado</span>
            <ArrowRight size={16} />
          </Link>

          {/* Support */}
          <div
            className="rounded-2xl p-3.5 text-center"
            style={{ background: 'var(--primary-light)', border: '1px solid var(--accent-ice)' }}
          >
            <p className="text-xs font-semibold text-[var(--primary)]">Direct Customer Support</p>
            <a
              href={`mailto:${BRAND.support}`}
              className="text-xs font-700 mt-0.5 block text-[var(--primary-dark)]"
            >
              {BRAND.support}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
