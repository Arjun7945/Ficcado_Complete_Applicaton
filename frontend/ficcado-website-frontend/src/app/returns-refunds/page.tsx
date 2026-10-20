'use client';

// =============================================================================
// Cancellation & Refund Policy — /returns-refunds
// Verified per official Ficcado Clothing policy document
// =============================================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Banknote,
  Menu,
  Mail,
  Phone,
  MapPin,
  Clock,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { BRAND } from '@/config/site';

const POLICY_TABS = [
  { href: '/terms', label: 'Terms & Conditions', active: false },
  { href: '/privacy', label: 'Privacy Policy', active: false },
  { href: '/returns-refunds', label: 'Cancellation & Refund', active: true },
  { href: '/replacements-damages', label: 'Replacements & Damages', active: false },
  { href: '/shipping-delivery', label: 'Shipping & Delivery', active: false },
];

const REFUND_STEPS = [
  {
    step: '1',
    title: 'Initiate a Return',
    desc: `Contact us at ${BRAND.supportEmail} within 48 hours of receiving the item.`,
  },
  {
    step: '2',
    title: 'Approval & Return',
    desc: 'If eligible, our team will provide step-by-step return instructions.',
  },
  {
    step: '3',
    title: 'Inspection & Refund',
    desc: 'Upon receiving the returned item, we inspect it and process your refund within 7-10 business days.',
  },
];

export default function ReturnsRefundsPage() {
  const router = useRouter();
  const { openModal } = useModal();

  return (
    <div id="returns-page" className="min-h-full pb-16 animate-fade-in" style={{ background: 'var(--bg-app)' }}>
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
            Cancellation & Refund
          </h1>
        </div>
        <button
          onClick={() => openModal('mobileMenuDrawer')}
          className="flex items-center justify-center h-8 w-8 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-[var(--text-main)] active:scale-95 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={16} />
        </button>
      </header>

      {/* Header Banner */}
      <div className="bg-[var(--bg-surface)] border-b border-[var(--border-light)] py-8 md:py-12 px-4 md:px-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-800 uppercase tracking-wider">
            <RotateCcw size={14} />
            <span>Official Policy • Hassle-Free Experience</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-900 text-[var(--text-main)]">
            Cancellation & Refund Policy
          </h1>

          <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            At FICCADO, we understand that plans change. We aim to provide the best shopping experience. Please review our official cancellation and refund policy below.
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
        {/* Section 1: Cancellation Policy */}
        <section className="space-y-4">
          <h2 className="text-xl font-900 text-[var(--text-main)] flex items-center gap-2">
            <XCircle size={22} className="text-[var(--primary)]" />
            <span>Cancellation Policy</span>
          </h2>
          <p className="text-xs md:text-sm text-[var(--text-secondary)]">
            At FICCADO, we understand that plans change. You can cancel your order within a specified timeframe as per the details below:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-3">
              <h3 className="text-sm font-800 text-[var(--text-main)] flex items-center gap-2">
                <Clock size={16} className="text-[var(--primary)]" />
                <span>Order Cancellation</span>
              </h3>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                  <span>Orders can be cancelled within <strong>24 hours</strong> of placement, provided they have not been processed or shipped.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                  <span>To cancel an order, please email us at <a href={`mailto:${BRAND.supportEmail}`} className="text-[var(--primary)] font-bold">{BRAND.supportEmail}</a> with your order details.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <span>If the order has already been dispatched, cancellation will not be possible.</span>
                </li>
              </ul>
            </div>

            <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-3">
              <h3 className="text-sm font-800 text-[var(--text-main)] flex items-center gap-2">
                <ShieldCheck size={16} className="text-[var(--primary)]" />
                <span>Bulk & Customized Orders</span>
              </h3>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                  <span>Bulk and customized orders are non-cancellable once processing begins.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                  <span>Any modifications must be requested within <strong>12 hours</strong> of placing the order.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Refund Policy */}
        <section className="space-y-4">
          <h2 className="text-xl font-900 text-[var(--text-main)] flex items-center gap-2">
            <RotateCcw size={22} className="text-[var(--primary)]" />
            <span>Refund Policy</span>
          </h2>
          <p className="text-xs md:text-sm text-[var(--text-secondary)]">
            We aim to provide the best shopping experience. If you are not satisfied with your purchase, please review our refund policy below:
          </p>

          <div className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-4">
            <h3 className="text-base font-800 text-[var(--text-main)] flex items-center gap-2">
              <ShieldCheck size={18} className="text-[var(--primary)]" />
              <span>Eligibility for Refund</span>
            </h3>
            <ul className="space-y-2.5 text-xs md:text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Refunds are only applicable for orders that meet the return eligibility criteria.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Items must be unused, in original packaging, and returned within <strong>7 days</strong> of delivery.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Customized or bulk orders are not eligible for refunds unless defective or incorrect.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 3 Steps Refund Process */}
        <section className="space-y-4">
          <h2 className="text-xl font-900 text-[var(--text-main)]">
            Refund Process
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REFUND_STEPS.map((s) => (
              <div
                key={s.step}
                className="card p-5 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-2"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white font-black text-sm flex items-center justify-center">
                  {s.step}
                </div>
                <h3 className="text-sm font-800 text-[var(--text-main)]">
                  {s.title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Refund Method & Exchanges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-3">
            <h3 className="text-base font-800 text-[var(--text-main)] flex items-center gap-2">
              <Banknote size={18} className="text-[var(--primary)]" />
              <span>Refund Method</span>
            </h3>
            <ul className="space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Refunds will be credited to the original payment method.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>If paid via COD, refunds will be processed through bank transfer after confirmation.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Shipping and handling charges are non-refundable.</span>
              </li>
            </ul>
          </section>

          <section className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-3">
            <h3 className="text-base font-800 text-[var(--text-main)] flex items-center gap-2">
              <RefreshCw size={18} className="text-[var(--primary)]" />
              <span>Exchanges</span>
            </h3>
            <ul className="space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>We allow exchanges only for defective or incorrect items.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>To request an exchange, contact us within <strong>48 hours</strong> of delivery.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Replacement will be shipped after the returned product is received and inspected.</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Contact Us Section */}
        <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-4">
          <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
            <Mail size={20} className="text-[var(--primary)]" />
            <span>Contact Us</span>
          </h2>
          <p className="text-xs md:text-sm text-[var(--text-secondary)]">
            For any cancellation or refund queries, reach out to us:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm text-[var(--text-secondary)]">
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-1.5">
              <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <Mail size={14} className="text-[var(--primary)]" />
                Support Email
              </span>
              <a href={`mailto:${BRAND.supportEmail}`} className="text-[var(--primary)] font-bold hover:underline block font-mono">
                {BRAND.supportEmail}
              </a>
              <span className="text-[11px] text-[var(--text-muted)] block">
                Support Hours: {BRAND.supportHours}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block">
                Live Chat: {BRAND.liveChat.channel} ({BRAND.liveChat.timingShort})
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-1.5">
              <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <Phone size={14} className="text-[var(--primary)]" />
                Phone & Grievance Desk
              </span>
              <a href={`tel:${BRAND.phone}`} className="text-[var(--primary)] font-bold hover:underline block font-mono">
                {BRAND.phone} (+91 6282000729)
              </a>
              <span className="text-[11px] text-[var(--text-main)] font-semibold block">
                POG Contact: {BRAND.pog.name}
              </span>
              <a href={`mailto:${BRAND.pog.email}`} className="text-[var(--primary)] hover:underline block text-[11px] font-mono">
                {BRAND.pog.email}
              </a>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-secondary)] space-y-1">
            <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
              <MapPin size={14} className="text-[var(--primary)]" />
              Business Identity & Registered Address
            </span>
            <p className="font-semibold text-[var(--text-main)]">{BRAND.legalName}</p>
            <p>GSTIN: <span className="font-mono font-bold text-[var(--text-main)]">{BRAND.gst}</span></p>
            <p>{BRAND.address.line1}, {BRAND.address.line2}, {BRAND.address.city}, Pin: {BRAND.address.pin}</p>
            <p className="text-[var(--text-muted)]">{BRAND.address.landmark}</p>
            <p className="text-[11px] text-[var(--text-muted)]">Delivery & Sales: {BRAND.deliverySalesRegion}</p>
          </div>

          <p className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-light)]">
            We appreciate your trust in FICCADO and are committed to ensuring a hassle-free experience!
          </p>
        </section>
      </div>
    </div>
  );
}
