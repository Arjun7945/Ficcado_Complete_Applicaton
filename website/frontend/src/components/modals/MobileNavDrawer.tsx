'use client';

// =============================================================================
// MobileNavDrawer — Universal Mobile & Tablet Navigation Drawer
// Provides access to Drops, Categories, Story, FAQ, Support, Bag, and Policies
// =============================================================================

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  X,
  Sparkles,
  Grid2X2,
  BookOpen,
  LifeBuoy,
  Settings,
  ShieldCheck,
  FileText,
  RotateCcw,
  RefreshCw,
  Truck,
  Mail,
  ChevronRight,
  ShoppingBag,
  HelpCircle,
  Feather,
  Cookie,
} from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { useCart } from '@/context/CartContext';
import { useConsent } from '@/context/ConsentContext';
import { BRAND } from '@/config/site';

export function MobileNavDrawer() {
  const { activeModal, closeModal, openModal } = useModal();
  const { openSettings: openConsentSettings } = useConsent();
  const pathname = usePathname();
  const { totalItemsCount, subtotalAmount } = useCart();
  const [isClosing, setIsClosing] = useState(false);

  const isOpen = activeModal === 'mobileMenuDrawer';

  if (!isOpen && !isClosing) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      closeModal();
    }, 300);
  };

  const navigateTo = () => {
    handleClose();
  };

  return (
    <div
      className="fixed inset-0 flex pointer-events-none"
      style={{ zIndex: 'var(--z-drawer)' }}
    >
      {/* Backdrop with smooth fade in/out */}
      <div
        className={`overlay pointer-events-auto ${
          isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer Body — smooth slide in & out with luxury curved edges */}
      <div
        className={`relative w-[calc(100%-2rem)] max-w-[320px] sm:max-w-sm my-2.5 sm:my-3.5 ml-2.5 sm:ml-3.5 h-[calc(100%-1.25rem-var(--ios-bottom-bar-clearance,0px))] sm:h-[calc(100%-1.75rem-var(--ios-bottom-bar-clearance,0px))] bg-[var(--bg-surface)] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden rounded-[28px] sm:rounded-[32px] border border-[var(--border-light)] pointer-events-auto ${
          isClosing ? 'animate-drawer-left-out' : 'animate-drawer-left-in'
        }`}
        style={{ zIndex: 10 }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-surface-alt)] rounded-t-[28px] sm:rounded-t-[32px]">
          <Link href="/" onClick={navigateTo} className="flex items-center gap-2.5 group">
            <div
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-[var(--border-light)] overflow-hidden p-0.5 shadow-2xs"
            >
              <Image
                src="/images/brand_logo/Ficcado Brand Logo.jpeg"
                alt="Ficcado Logo"
                fill
                sizes="36px"
                className="object-contain p-0.5"
                priority
                loading="eager"
              />
            </div>
            <div>
              <span className="text-base font-900 tracking-tight leading-none block text-[var(--text-main)]">
                FICCADO
              </span>
              <span className="text-[9px] font-800 tracking-widest text-[var(--primary)] uppercase block mt-0.5">
                High Quality Unisex Wears
              </span>
            </div>
          </Link>

          <button
            onClick={handleClose}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-transparent hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-main)] transition-all cursor-pointer active:scale-90"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
          {/* Main Collections & Pages */}
          <div className="space-y-1">
            <p className="text-[10px] font-800 uppercase tracking-widest text-[var(--text-muted)] px-3 mb-2">
              Storefront & Drops
            </p>

            <Link
              href="/"
              onClick={navigateTo}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                pathname === '/'
                  ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                  : 'text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles size={16} className="text-[var(--primary)]" />
                <span>Drops & New Arrivals</span>
              </div>
              <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                Live
              </span>
            </Link>

            <Link
              href="/categories"
              onClick={navigateTo}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                pathname.startsWith('/categories')
                  ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                  : 'text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Grid2X2 size={16} className="text-[var(--primary)]" />
                <span>All Categories & Silhouettes</span>
              </div>
              <ChevronRight size={14} className="text-gray-400" />
            </Link>

            <Link
              href="/journal"
              onClick={navigateTo}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                pathname.startsWith('/journal')
                  ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                  : 'text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Feather size={16} className="text-[var(--primary)]" />
                <span>The Journal & Chronicles</span>
              </div>
              <ChevronRight size={14} className="text-gray-400" />
            </Link>

            <Link
              href="/about"
              onClick={navigateTo}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                pathname.startsWith('/about')
                  ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                  : 'text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen size={16} className="text-[var(--primary)]" />
                <span>About Ficcado</span>
              </div>
              <ChevronRight size={14} className="text-gray-400" />
            </Link>

            <Link
              href="/faq"
              onClick={navigateTo}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                pathname.startsWith('/faq')
                  ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                  : 'text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <HelpCircle size={16} className="text-[var(--primary)]" />
                <span>Frequently Asked Questions (FAQ)</span>
              </div>
              <ChevronRight size={14} className="text-gray-400" />
            </Link>

            <Link
              href="/support"
              onClick={navigateTo}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                pathname.startsWith('/support')
                  ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                  : 'text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <LifeBuoy size={16} className="text-[var(--primary)]" />
                <span>Reach Out To Us (Support Desk)</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </Link>
          </div>

          {/* Commerce Suite */}
          <div className="space-y-1">
            <p className="text-[10px] font-800 uppercase tracking-widest text-[var(--text-muted)] px-3 mb-2">
              Shopping Bag
            </p>

            <button
              onClick={() => {
                handleClose();
                setTimeout(() => openModal('cartDrawer'), 310);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)] transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag size={16} className="text-[var(--primary)]" />
                <span>Shopping Bag ({totalItemsCount})</span>
              </div>
              <span className="text-xs font-black text-[var(--primary)]">
                ₹{subtotalAmount.toLocaleString('en-IN')}
              </span>
            </button>

            <Link
              href="/settings"
              onClick={navigateTo}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                pathname.startsWith('/settings')
                  ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                  : 'text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings size={16} className="text-[var(--primary)]" />
                <span>Settings & Brand Hub</span>
              </div>
              <ChevronRight size={14} className="text-gray-400" />
            </Link>
          </div>

          {/* Transparent Policies */}
          <div className="space-y-1">
            <p className="text-[10px] font-800 uppercase tracking-widest text-[var(--text-muted)] px-3 mb-2">
              Transparent Policies
            </p>

            <Link
              href="/terms"
              onClick={navigateTo}
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText size={15} className="text-gray-400" />
                <span>Terms & Conditions</span>
              </div>
            </Link>

            <Link
              href="/privacy"
              onClick={navigateTo}
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={15} className="text-gray-400" />
                <span>Privacy & Security</span>
              </div>
            </Link>

            <Link
              href="/returns-refunds"
              onClick={navigateTo}
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <RotateCcw size={15} className="text-gray-400" />
                <span>Returns & 7-Day Refunds</span>
              </div>
            </Link>

            <Link
              href="/replacements-damages"
              onClick={navigateTo}
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <RefreshCw size={15} className="text-gray-400" />
                <span>Replacements Guarantee</span>
              </div>
            </Link>

            <Link
              href="/shipping-delivery"
              onClick={navigateTo}
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Truck size={15} className="text-gray-400" />
                <span>Shipping & Delivery Speeds</span>
              </div>
            </Link>

            <Link
              href="/cookies"
              onClick={navigateTo}
              className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Cookie size={15} className="text-gray-400" />
                <span>Cookie & Storage Policy</span>
              </div>
            </Link>

            <button
              onClick={() => {
                handleClose();
                openConsentSettings();
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <Settings size={15} className="text-gray-400" />
                <span>Manage Cookie Settings</span>
              </div>
            </button>
          </div>
        </div>

        {/* Drawer Footer with Direct Support */}
        <div className="p-4 border-t border-[var(--border-light)] bg-[var(--bg-surface-alt)] rounded-b-[28px] sm:rounded-b-[32px]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] font-medium">Need immediate help?</span>
            <a
              href={`mailto:${BRAND.support}`}
              className="font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              <Mail size={12} />
              <span>Email Support</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileNavDrawer;
