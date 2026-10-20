'use client';

// =============================================================================
// Privacy Policy — /privacy
// Verified per official Ficcado Clothing policy document
// =============================================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  Lock,
  EyeOff,
  CheckCircle2,
  Menu,
  Mail,
  Phone,
  MapPin,
  FileText,
  Cookie,
  ExternalLink,
} from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { BRAND } from '@/config/site';

const POLICY_TABS = [
  { href: '/terms', label: 'Terms & Conditions', active: false },
  { href: '/privacy', label: 'Privacy Policy', active: true },
  { href: '/cookies', label: 'Cookie Policy', active: false },
  { href: '/returns-refunds', label: 'Cancellation & Refund', active: false },
  { href: '/shipping-delivery', label: 'Shipping & Delivery', active: false },
];

export default function PrivacyPage() {
  const router = useRouter();
  const { openModal } = useModal();

  return (
    <div id="privacy-page" className="min-h-full pb-16 animate-fade-in" style={{ background: 'var(--bg-app)' }}>
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
            Privacy Policy
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
            <Lock size={14} />
            <span>Encrypted & Private • Official Policy</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-900 text-[var(--text-main)]">
            Privacy Policy
          </h1>

          <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            At FICCADO, we respect your privacy and are committed to protecting your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data when you use our website.
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
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="space-y-6 max-w-4xl">
          {/* Introduction */}
          <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
            <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
              <FileText size={20} className="text-[var(--primary)]" />
              <span>Introduction</span>
            </h2>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
              At FICCADO, we respect your privacy and are committed to protecting your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data when you use our website.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
            <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
              <EyeOff size={20} className="text-[var(--primary)]" />
              <span>Information We Collect</span>
            </h2>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
              We may collect the following types of information:
            </p>
            <ul className="space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span><strong>Personal Information:</strong> Name, email address, phone number, billing and shipping addresses.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span><strong>Payment Information:</strong> Processed securely through third-party payment gateways; we do not store credit/debit card details.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span><strong>Order Details:</strong> Purchase history, preferences, and transaction records.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span><strong>Technical Data:</strong> IP address, browser type, device information, and cookies.</span>
              </li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
            <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
              <Shield size={20} className="text-[var(--primary)]" />
              <span>How We Use Your Information</span>
            </h2>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
              We use your data for:
            </p>
            <ul className="space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Processing and fulfilling your orders.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Providing customer support and responding to inquiries.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Sending order updates, promotions, and newsletters (with your consent).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Enhancing website performance and user experience.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Preventing fraudulent activities and ensuring security.</span>
              </li>
            </ul>
          </section>

          {/* Data Protection & Security */}
          <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
            <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
              <Lock size={20} className="text-[var(--primary)]" />
              <span>Data Protection & Security</span>
            </h2>
            <ul className="space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>We implement industry-standard security measures to protect your personal data.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Payment transactions are encrypted using SSL technology.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>We do not sell, trade, or share your data with third parties, except for service providers assisting in order fulfillment.</span>
              </li>
            </ul>
          </section>

          {/* Cookies & Tracking Technologies */}
          <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
            <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
              <Cookie size={20} className="text-[var(--primary)]" />
              <span>Cookies & Tracking Technologies</span>
            </h2>
            <ul className="space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>We use cookies to enhance website functionality and analyze visitor behavior.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>You can manage or disable cookies through your browser settings or our <Link href="/cookies" className="text-[var(--primary)] font-bold hover:underline">Cookie Policy</Link>.</span>
              </li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
            <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
              <ExternalLink size={20} className="text-[var(--primary)]" />
              <span>Third-Party Services</span>
            </h2>
            <ul className="space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>We may use third-party services for analytics, payment processing, and marketing.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>These third parties have their own privacy policies governing data usage.</span>
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
            <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
              <CheckCircle2 size={20} className="text-[var(--primary)]" />
              <span>Your Rights</span>
            </h2>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
              You have the right to:
            </p>
            <ul className="space-y-2 text-xs md:text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Access, modify, or delete your personal data.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Opt-out of marketing communications.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                <span>Request details about how your data is used.</span>
              </li>
            </ul>
          </section>

          {/* User Age & Eligibility */}
          <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
            <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
              <CheckCircle2 size={20} className="text-[var(--primary)]" />
              <span>User Age & Protection (Age &ge; 18)</span>
            </h2>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
              Our website and services are intended exclusively for individuals who are at least 18 years of age (age &ge; 18). We do not knowingly collect personal data from minors under 18 without parental or guardian consent. If you are under 18, you may use our platform only under the direct supervision of a parent or legal guardian.
            </p>
          </section>

          {/* Delivery & Sales Coverage */}
          <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
            <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
              <CheckCircle2 size={20} className="text-[var(--primary)]" />
              <span>Sales & Delivery Region: All India</span>
            </h2>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
              Ficcado Clothing operates all retail sales and deliveries exclusively across <strong>All India</strong>. Personal data provided during checkout is utilized strictly for pan-India fulfillment, domestic tax compliance (GSTIN: 32CVNPR0498H1Z5), and verified domestic courier delivery.
            </p>
          </section>

          {/* Policy Updates */}
          <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-3">
            <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
              <FileText size={20} className="text-[var(--primary)]" />
              <span>Policy Updates</span>
            </h2>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
              We may update this Privacy Policy periodically. Any changes will be posted on this page with the revised date.
            </p>
          </section>

          {/* Contact Us & Point of Grievance */}
          <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
            <h2 className="text-lg font-800 text-[var(--text-main)] flex items-center gap-2">
              <Mail size={20} className="text-[var(--primary)]" />
              <span>Contact Us & Point of Grievance (POG)</span>
            </h2>
            <p className="text-xs md:text-sm text-[var(--text-secondary)]">
              For any privacy-related concerns or data inquiries, reach out to us:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm text-[var(--text-secondary)]">
              <div className="p-4 rounded-2xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-1.5">
                <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <Mail size={14} className="text-[var(--primary)]" />
                  Support Email
                </span>
                <a href={`mailto:${BRAND.privacyEmail}`} className="text-[var(--primary)] font-bold hover:underline block font-mono">
                  {BRAND.privacyEmail}
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
                  Phone & Grievance Contact
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
              By using our website, you agree to this Privacy Policy and consent to data collection and usage as outlined.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
