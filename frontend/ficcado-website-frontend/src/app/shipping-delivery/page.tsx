'use client';

// =============================================================================
// Shipping & Delivery Policy — /shipping-delivery
// Verified per official Ficcado Clothing policy document
// =============================================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Truck,
  MapPin,
  Clock,
  ShieldCheck,
  Menu,
  Mail,
  Phone,
  AlertCircle,
  PackageCheck,
  CheckCircle2,
} from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { BRAND } from '@/config/site';

const POLICY_TABS = [
  { href: '/terms', label: 'Terms & Conditions', active: false },
  { href: '/privacy', label: 'Privacy Policy', active: false },
  { href: '/returns-refunds', label: 'Cancellation & Refund', active: false },
  { href: '/replacements-damages', label: 'Replacements & Damages', active: false },
  { href: '/shipping-delivery', label: 'Shipping & Delivery', active: true },
];

export default function ShippingDeliveryPage() {
  const router = useRouter();
  const { openModal } = useModal();

  return (
    <div id="shipping-page" className="min-h-full pb-16 animate-fade-in" style={{ background: 'var(--bg-app)' }}>
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
            Shipping & Delivery
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-800 uppercase tracking-wider">
            <Truck size={14} />
            <span>Pan-India Delivery • Verified Policies</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-900 text-[var(--text-main)]">
            Shipping & Delivery Policy
          </h1>

          <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            At FICCADO, we strive to deliver your orders as quickly and efficiently as possible. We currently offer shipping across India.
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
        {/* Processing & Shipping Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-[var(--primary)]" />
              <h3 className="text-base font-800 text-[var(--text-main)]">Processing Time</h3>
            </div>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Orders are processed within <strong>1–3 business days</strong> after confirmation.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Custom bulk orders may take <strong>5–7 business days</strong> for processing.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Orders placed on weekends or public holidays will be processed on the next working day.</span>
              </li>
            </ul>
          </div>

          <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Truck size={20} className="text-[var(--primary)]" />
              <h3 className="text-base font-800 text-[var(--text-main)]">Shipping Time</h3>
            </div>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span><strong>Standard Delivery:</strong> 4–7 business days (depending on location).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span><strong>Express Delivery:</strong> 2–4 business days (available at an additional cost).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Remote areas may require extra delivery time.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Shipping Charges & Order Tracking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-[var(--primary)]" />
              <h3 className="text-base font-800 text-[var(--text-main)]">Shipping Charges</h3>
            </div>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span><strong>Standard Shipping:</strong> Free on orders above ₹999. A charge of ₹50–₹100 applies for orders below ₹999.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span><strong>Express Shipping:</strong> Charges vary based on location and package weight.</span>
              </li>
            </ul>
          </div>

          <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <PackageCheck size={20} className="text-[var(--primary)]" />
              <h3 className="text-base font-800 text-[var(--text-main)]">Order Tracking</h3>
            </div>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Once your order is shipped, a tracking number will be sent via email or SMS.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>You can track your order using the provided carrier link.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Delivery Policy Details */}
        <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-4">
          <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
            <MapPin size={20} className="text-[var(--primary)]" />
            <span>Delivery Policy</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[var(--text-secondary)]">
            <div className="p-4 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-1.5">
              <span className="font-bold text-[var(--text-main)] block">Delivery Partners</span>
              <p>We collaborate with trusted courier services to ensure safe and timely deliveries across India.</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-1.5">
              <span className="font-bold text-[var(--text-main)] block">Delivery Address</span>
              <p>Ensure that the shipping address provided is accurate to avoid delays. We do not deliver to P.O. boxes or restricted areas.</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-1.5">
              <span className="font-bold text-[var(--text-main)] block">Delivery Attempts</span>
              <p>If the courier is unable to deliver, a second attempt will be made. If delivery fails after multiple attempts, the package will be returned to us.</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-1.5">
              <span className="font-bold text-[var(--text-main)] block">International Shipping</span>
              <p>Currently, we do not offer international shipping. Stay tuned for future updates!</p>
            </div>
          </div>
        </section>

        {/* Order Issues */}
        <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-4">
          <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
            <AlertCircle size={20} className="text-[var(--primary)]" />
            <span>Order Issues</span>
          </h2>
          <div className="space-y-3 text-xs md:text-sm text-[var(--text-secondary)]">
            <div>
              <strong className="text-[var(--text-main)] block">Delayed or Lost Orders:</strong>
              <p>
                If your order is delayed beyond the expected timeframe, please contact our support team at{' '}
                <a href={`mailto:${BRAND.supportEmail}`} className="text-[var(--primary)] font-bold hover:underline">
                  {BRAND.supportEmail}
                </a>{' '}
                with your order details.
              </p>
            </div>
            <div>
              <strong className="text-[var(--text-main)] block">Damaged or Wrong Items:</strong>
              <p>
                If you receive a damaged or incorrect item, report it within <strong>48 hours</strong> of delivery. Send an email with images of the product and order details for resolution.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Us */}
        <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl space-y-4">
          <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
            <Mail size={20} className="text-[var(--primary)]" />
            <span>Contact Us</span>
          </h2>
          <p className="text-xs md:text-sm text-[var(--text-secondary)]">
            For any shipping or delivery inquiries, feel free to reach out:
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
            We appreciate your trust in FICCADO and ensure a seamless shopping experience!
          </p>
        </section>
      </div>
    </div>
  );
}
