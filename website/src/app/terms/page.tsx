'use client';

// =============================================================================
// Terms & Conditions — /terms
// Transparent, human-first commercial terms for Ficcado Clothing (Est. 2024)
// =============================================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, CheckCircle2, Menu } from 'lucide-react';
import { useModal } from '@/context/ModalContext';

const POLICY_TABS = [
  { href: '/terms', label: 'Terms & Conditions', active: true },
  { href: '/privacy', label: 'Privacy Policy', active: false },
  { href: '/returns-refunds', label: 'Returns & Refunds', active: false },
  { href: '/replacements-damages', label: 'Replacements & Damages', active: false },
  { href: '/shipping-delivery', label: 'Shipping & Delivery', active: false },
];

export default function TermsPage() {
  const router = useRouter();
  const { openModal } = useModal();

  return (
    <div id="terms-page" className="min-h-full pb-16 animate-fade-in" style={{ background: 'var(--bg-app)' }}>
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
            Terms & Conditions
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
            <ShieldCheck size={14} />
            <span>Peoples’ Own Company Guarantee • 2026 Transparent Policy</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-900 text-[var(--text-main)]">
            Terms & Commercial Transparency
          </h1>

          <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            At Ficcado Clothing, we believe legal documents shouldn’t be written in obscure legalese designed to trap customers. Below is our plain-language commitment to how we operate, how your orders are fulfilled, and your rights as our community member.
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

      {/* Terms Body */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Legal Content (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Section 1 */}
            <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
              <h2 className="text-lg md:text-xl font-800 text-[var(--text-main)] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">1</span>
                <span>Our Contract With You & User Eligibility</span>
              </h2>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
                When you place an order on Ficcado (via our official store or direct WhatsApp ordering), you are entering into a purchase agreement directly with Ficcado Clothing. We acknowledge receipt of your order directly via WhatsApp with your unique Reference ID (format FIC-A0001) followed by your confirmed Order ID.
              </p>
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-secondary)] space-y-1.5">
                <div className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[var(--accent-green)]" />
                  <span>User Age Requirement (Age &ge; 18)</span>
                </div>
                <p>
                  You must be at least 18 years of age (age &ge; 18) to register, make purchases, or enter into binding contracts on this platform. If you are under 18 years of age, you may browse and purchase only under the active supervision of a parent or legal guardian.
                </p>
              </div>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
                We guarantee that every product displayed on our store is manufactured to our exact specifications (such as our high quality 240 GSM cotton blends) and matches the high-resolution imagery and dimensions published on the product pages.
              </p>
            </section>

            {/* Section 2 */}
            <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
              <h2 className="text-lg md:text-xl font-800 text-[var(--text-main)] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">2</span>
                <span>Pricing, GST & Delivery Coverage</span>
              </h2>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
                All prices listed are in Indian Rupees (INR, ₹) and inclusive of all applicable standard GST and manufacturing taxes. Ficcado Clothing is an Indian registered entity with <strong>GSTIN: 32CVNPR0498H1Z5</strong>. All transactions and sales originate within India with zero international conversion surcharges.
              </p>
              <div className="p-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-muted)] space-y-1">
                <div className="font-bold text-[var(--text-main)]">Delivery & Sales Coverage: All India</div>
                <p>Delivery and sales are operational across All India. Standard delivery is Free on all orders over ₹999. A charge of ₹50–₹100 applies for orders below ₹999. Express delivery charges vary based on destination location and package weight.</p>
              </div>
            </section>

            {/* Section 3 */}
            <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
              <h2 className="text-lg md:text-xl font-800 text-[var(--text-main)] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">3</span>
                <span>Customer Rights & 7-Day Guarantee</span>
              </h2>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
                You hold the absolute right to inspect the fabric weight, fit, stitching, and finish of your garments upon delivery. If for any reason the size or drape is not as expected, you are entitled to initiate a return or exchange within 7 calendar days of confirmed doorstep delivery (notify within 48 hours of receipt).
              </p>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
                For detailed procedures regarding pickups and refunds, please refer to our dedicated <Link href="/returns-refunds" className="text-[var(--primary)] font-bold hover:underline">Returns & Refunds Policy</Link>.
              </p>
            </section>

            {/* Section 4 */}
            <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
              <h2 className="text-lg md:text-xl font-800 text-[var(--text-main)] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">4</span>
                <span>Fabric Longevity & Care Instructions</span>
              </h2>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
                Ficcado products utilize natural high quality 240 GSM combed fibers. To maintain color saturation and the relaxed boxy silhouette, we advise cold machine wash (30°C) with like colors, gentle spin, and hang drying in the shade. Do not tumble dry high-heat or iron directly on screen-printed or embroidered graphics.
              </p>
            </section>

            {/* Section 5 */}
            <section className="card p-6 md:p-8 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4">
              <h2 className="text-lg md:text-xl font-800 text-[var(--text-main)] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-xs font-bold">5</span>
                <span>Dispute Resolution, Grievance Officer & Contact</span>
              </h2>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
                As a people’s company, we never hide behind arbitration walls. If any issue arises regarding your purchase, we pledge personal attention from our founding team.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-1">
                  <span className="font-bold text-[var(--text-main)] block">Customer Care Desk</span>
                  <p><strong>Support Email:</strong> <a href="mailto:ficcado.clothing@gmail.com" className="text-[var(--primary)] font-bold hover:underline">ficcado.clothing@gmail.com</a></p>
                  <p><strong>Phone:</strong> <a href="tel:6282000729" className="text-[var(--primary)] font-bold">6282000729</a> (+91 6282000729)</p>
                  <p><strong>Support Hours:</strong> 7:00 AM to 7:00 PM IST</p>
                  <p><strong>Live Chat:</strong> Available through contact and WhatsApp (Mon-Friday from 10am - 6pm)</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-light)] space-y-1">
                  <span className="font-bold text-[var(--text-main)] block">Point of Grievance (POG) Contact</span>
                  <p><strong>Officer:</strong> Rohith Murali</p>
                  <p><strong>POG Email:</strong> <a href="mailto:rohithficcado@gmail.com" className="text-[var(--primary)] font-bold hover:underline">rohithficcado@gmail.com</a></p>
                  <p><strong>GSTIN:</strong> 32CVNPR0498H1Z5</p>
                  <p><strong>Sales & Delivery:</strong> All India</p>
                </div>
              </div>
              <div className="pt-2 text-xs text-[var(--text-muted)] space-y-1 border-t border-[var(--border-light)]">
                <p><strong>Business Name:</strong> Ficcado Clothing</p>
                <p><strong>Registered Address:</strong> Manadath House, Thaikkattukara P O, Aluva 6, Pin: 683106, Opposite metro pillar 116</p>
              </div>
            </section>
          </div>

          {/* Quick Summary Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-4 sticky top-24">
              <h3 className="text-base font-800 text-[var(--text-main)]">
                Key Commitments
              </h3>
              <ul className="space-y-3 text-xs text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                  <span>Transparent fabric disclosures on every drop.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                  <span>Instant order confirmation with direct WhatsApp fulfillment.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                  <span>7-Day doorstep trial guarantee on all standard apparel.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[var(--accent-green)] shrink-0 mt-0.5" />
                  <span>Full replacement coverage on any transit damage.</span>
                </li>
              </ul>

              <div className="pt-4 border-t border-[var(--border-light)]">
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Have questions about these terms before placing an order?
                </p>
                <Link
                  href="/support"
                  className="btn-primary w-full py-2.5 text-xs font-bold rounded-xl"
                >
                  Contact Support Team
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
