'use client';

// =============================================================================
// Cookie & Browser Storage Policy — /cookies
// Comprehensive, authentic inventory of all LocalStorage and SessionStorage keys
// used by Ficcado per B-26 / D5.
// =============================================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Cookie, ShieldCheck, Settings, Menu } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { useConsent } from '@/context/ConsentContext';

const POLICY_TABS = [
  { href: '/terms', label: 'Terms & Conditions', active: false },
  { href: '/privacy', label: 'Privacy Policy', active: false },
  { href: '/cookies', label: 'Cookie Policy', active: true },
  { href: '/returns-refunds', label: 'Returns & Refunds', active: false },
  { href: '/shipping-delivery', label: 'Shipping & Delivery', active: false },
];

const STORAGE_INVENTORY = [
  {
    key: 'ficcado-bag',
    type: 'LocalStorage',
    category: 'Strictly Necessary',
    purpose: 'Stores your selected t-shirts, sizes, colors, and quantities so your bag persists as you browse collections.',
    duration: 'Persistent (Cleared manually or on order completion)',
  },
  {
    key: 'ficcado-last-order',
    type: 'SessionStorage',
    category: 'Strictly Necessary',
    purpose: 'Caches your generated Reference ID and WhatsApp URL so you can resume handoff if WhatsApp was blocked.',
    duration: 'Session (Cleared when browser tab closes)',
  },
  {
    key: 'ficcado-consent',
    type: 'LocalStorage',
    category: 'Strictly Necessary',
    purpose: 'Records your consent timestamp and category choices so you are not prompted on every page load.',
    duration: '12 Months (Per privacy guidelines)',
  },
  {
    key: 'fc_is_ios',
    type: 'SessionStorage',
    category: 'Strictly Necessary',
    purpose: 'Detects iOS WebKit viewport safe-area padding to prevent fixed action bars from overlapping bottom home indicators.',
    duration: 'Session (Transient)',
  },
  {
    key: 'ficcado-checkout-draft',
    type: 'LocalStorage',
    category: 'Preferences & Functional',
    purpose: 'Auto-saves your shipping name, address, and mobile number (ficcado-checkout-form-draft) while typing so a page refresh does not lose your work.',
    duration: 'Persistent until order completion or rejected',
  },
  {
    key: 'ficcado-recent-searches',
    type: 'LocalStorage',
    category: 'Preferences & Functional',
    purpose: 'Stores your recent search queries in the search modal for one-click re-searching.',
    duration: 'Persistent until cleared by user or rejected',
  },
];

export default function CookiesPage() {
  const router = useRouter();
  const { openModal } = useModal();
  const { openSettings } = useConsent();

  return (
    <div id="cookies-page" className="min-h-full pb-16 animate-fade-in" style={{ background: 'var(--bg-app)' }}>
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
            Cookie Policy
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
            <Cookie size={14} />
            <span>Zero Third-Party Trackers • Transparent Storage</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-900 text-[var(--text-main)]">
            Cookie & Browser Storage Policy
          </h1>

          <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Ficcado uses client-side storage strictly to power essential e-commerce capabilities. We do not run invasive third-party ad networks, behavioural tracking beacons, or cross-site data miners.
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
        {/* Actions bar */}
        <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-main)]">Your Cookie Choices</h2>
            <p className="text-xs text-[var(--text-secondary)]">You can change your non-essential storage preferences at any time.</p>
          </div>
          <button
            onClick={openSettings}
            className="px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-xs flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Settings size={14} />
            <span>Manage Preferences</span>
          </button>
        </div>

        {/* Real Inventory Table */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
            <ShieldCheck size={20} className="text-[var(--primary)]" />
            <span>Complete Storage Inventory</span>
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-light)] bg-[var(--bg-surface-alt)] text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Storage Key</th>
                  <th className="p-3.5">Mechanism</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Purpose</th>
                  <th className="p-3.5">Lifespan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-secondary)]">
                {STORAGE_INVENTORY.map((item) => (
                  <tr key={item.key} className="hover:bg-[var(--bg-surface-alt)]/50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[var(--text-main)]">{item.key}</td>
                    <td className="p-3.5">{item.type}</td>
                    <td className="p-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                        item.category.includes('Necessary')
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-xs">{item.purpose}</td>
                    <td className="p-3.5 text-[var(--text-muted)]">{item.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Third-party audit statement */}
        <section className="card p-6 bg-[var(--bg-surface)] border border-[var(--border-light)] space-y-2">
          <h3 className="text-sm font-bold text-[var(--text-main)]">Third-Party Cookies & Tracking Pixels</h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Ficcado does not load Google Analytics, Meta Pixel, TikTok tracking, or advertising remarketing cookies. If privacy-preserving analytics are introduced in the future, they will respect your consent choices and remain subject to your explicit opt-in.
          </p>
        </section>
      </div>
    </div>
  );
}
