'use client';

// =============================================================================
// Replacements & Damages Policy — /replacements-damages
// Zero-hassle immediate replacement guarantee for transit damage & manufacturing defects
// =============================================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Truck,
  Sparkles,
  Camera,
  Menu,
} from 'lucide-react';
import { useModal } from '@/context/ModalContext';

const POLICY_TABS = [
  { href: '/terms', label: 'Terms & Conditions', active: false },
  { href: '/privacy', label: 'Privacy Policy', active: false },
  { href: '/returns-refunds', label: 'Returns & Refunds', active: false },
  { href: '/replacements-damages', label: 'Replacements & Damages', active: true },
  { href: '/shipping-delivery', label: 'Shipping & Delivery', active: false },
];

export default function ReplacementsDamagesPage() {
  const router = useRouter();
  const { openModal } = useModal();

  return (
    <div id="replacements-page" className="min-h-full pb-16 animate-fade-in" style={{ background: 'var(--bg-app)' }}>
      {/* Mobile Top Header */}
      <header
        className="flex md:hidden items-center justify-between px-4 py-3 sticky top-0 z-30"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)' }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-icon" aria-label="Go back">
            <ArrowLeft size={20} style={{ color: 'var(--text-main)' }} />
          </button>
          <h1 className="text-base font-800 tracking-tight" style={{ color: 'var(--text-main)' }}>
            Replacements & Damages
          </h1>
        </div>
        <button
          onClick={() => openModal('mobileMenuDrawer')}
          className="btn-icon"
          aria-label="Open menu"
        >
          <Menu size={20} style={{ color: 'var(--text-main)' }} />
        </button>
      </header>

      {/* Header Banner */}
      <div className="bg-[var(--bg-surface)] border-b border-[var(--border-light)] py-8 md:py-12 px-4 md:px-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-800 uppercase tracking-wider border border-amber-200">
            <ShieldCheck size={14} />
            <span>Zero-Hassle Transit Protection • 100% Replacement Guarantee</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-900 text-[var(--text-main)]">
            Replacements & Damaged Goods Policy
          </h1>

          <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Every garment leaving our warehouse undergoes rigorous manual inspection. If your package arrives with transit damage, tears, or any defect, we replace it instantly at zero cost to you.
          </p>

          {/* Quick Policy Switcher Tabs */}
          <div className="flex gap-2 overflow-x-auto pt-4 no-scrollbar">
            {POLICY_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  tab.active
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] hover:bg-[var(--border-light)] border border-[var(--border-light)]'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            {/* Section 1: In-Transit Damage */}
            <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
              <h2 className="text-lg md:text-xl font-800 text-[var(--text-main)] flex items-center gap-2">
                <Truck size={20} className="text-[var(--primary)]" />
                <span>Damage Incurred During Transit</span>
              </h2>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
                If the courier outer polybag or protective box arrives visibly torn, crushed, or soaked, simply take a quick smartphone photo and notify us within <strong>48 hours</strong> of delivery.
              </p>
              <div className="p-4 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-2 text-xs">
                <div className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <Camera size={15} className="text-[var(--primary)]" />
                  <span>Fast Photographic Verification:</span>
                </div>
                <p className="text-[var(--text-muted)]">
                  Attach 1–2 photos of the damaged packaging and garment through our Reach Out Support Form or email. We immediately dispatch a fresh replacement unit via Priority Air courier without waiting for the damaged item to return.
                </p>
              </div>
            </section>

            {/* Section 2: Manufacturing & Stitch Integrity Defect */}
            <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
              <h2 className="text-lg md:text-xl font-800 text-[var(--text-main)] flex items-center gap-2">
                <Sparkles size={20} className="text-[var(--primary)]" />
                <span>Textile & Stitching Quality Defect</span>
              </h2>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
                We take immense pride in our high quality 240 GSM cotton fabrics and double-needle hems. In the improbable event of a seam slippage, fabric run, or dye inconsistency, we offer a <strong>30-day replacement warranty</strong> against structural defects.
              </p>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                  <span>Free doorstep reverse pickup arranged at our expense.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                  <span>Option for immediate identical replacement or 100% full refund to original payment source.</span>
                </li>
              </ul>
            </section>

            {/* Section 3: Incorrect Size or Item Delivered */}
            <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
              <h2 className="text-lg md:text-xl font-800 text-[var(--text-main)] flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-500" />
                <span>Incorrect Silhouette, Size or Color Sent</span>
              </h2>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
                If our fulfillment team dispatched the wrong size (e.g. L instead of M) or incorrect silhouette colorway, our team will personally apologize, immediately issue the correct piece with same-day dispatch, and provide a complimentary store voucher for the inconvenience.
              </p>
            </section>
          </div>

          {/* Quick Help Box */}
          <div className="lg:col-span-4 space-y-6">
            <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4 sticky top-24">
              <h3 className="text-base font-800 text-[var(--text-main)]">
                Report A Damaged Item
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Our founders and customer care team prioritize replacement tickets with same-day expedited dispatch.
              </p>
              <Link
                href="/support"
                className="btn-primary w-full py-3 text-xs font-bold rounded-xl text-center"
              >
                Submit Replacement Ticket
              </Link>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <strong>Important:</strong> Please retain the damaged carton/mailer until photo confirmation is completed.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
