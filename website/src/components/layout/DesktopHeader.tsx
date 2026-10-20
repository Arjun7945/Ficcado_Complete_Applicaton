'use client';

// =============================================================================
// DesktopHeader — Luxury Top Navigation Bar for Tablet & Desktop screens
// Retains Brand Logo, Primary Nav Links, Search, and Shopping Bag with item count
// =============================================================================

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingBag, Menu, Settings } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useModal } from '@/context/ModalContext';

const NAV_LINKS = [
  { href: '/', label: 'Drops' },
  { href: '/categories', label: 'Categories' },
  { href: '/journal', label: 'Journal' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/support', label: 'Support' },
];

export function DesktopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItemsCount, subtotalAmount } = useCart();
  const { openModal } = useModal();

  const [searchQuery, setSearchQuery] = useState('');

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/search');
    }
  }

  return (
    <header
      suppressHydrationWarning
      className="hidden md:block w-full sticky top-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-light)] shadow-xs"
    >

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-18 flex items-center justify-between gap-2.5 lg:gap-6">
        {/* Left: Brand Logo & Unisex Subtitle */}
        <div className="flex items-center gap-3 lg:gap-5 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 lg:gap-3 group">
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[var(--border-light)] shadow-xs transition-transform group-hover:scale-105 overflow-hidden p-1"
              style={{
                boxShadow: '0 2px 8px rgba(43, 98, 198, 0.12)',
              }}
            >
              <Image
                src="/images/brand_logo/Ficcado Brand Logo.jpeg"
                alt="Ficcado Logo"
                fill
                sizes="40px"
                className="object-contain p-0.5"
                priority
                loading="eager"
              />
            </div>
            <div>
              <span className="text-base lg:text-lg font-900 tracking-tight leading-none block text-[var(--text-main)]">
                FICCADO
              </span>
              <span className="text-[9px] font-800 tracking-[0.2em] text-[var(--primary)] uppercase block mt-0.5">
                High Quality Unisex Wears
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Primary Navigation Links */}
        <nav className="flex items-center gap-0.5 lg:gap-1.5" aria-label="Primary navigation">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-2.5 lg:px-3.5 py-1.5 rounded-xl text-xs uppercase tracking-wider font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'text-[var(--primary)] bg-[var(--primary-light)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)]'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Center-Right: Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-[180px] lg:max-w-xs xl:max-w-sm relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tees, drops..."
            className="w-full h-9.5 pl-8.5 pr-8 rounded-full bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] placeholder-[var(--text-light)] focus:outline-none focus:border-[var(--primary)] focus:bg-white transition-all shadow-xs"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
          <button
            type="submit"
            aria-label="Search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-800 bg-[var(--border-light)] text-[var(--text-muted)] px-1.5 py-0.5 rounded-md hover:bg-gray-300 transition-colors cursor-pointer"
          >
            ↵
          </button>
        </form>

        {/* Right: Actions (Settings icon only, Bag, Slide Menu icon only) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Settings Icon Only */}
          <Link
            href="/settings"
            id="desktop-header-settings-btn"
            className={`flex items-center justify-center h-9 w-9 rounded-full border transition-all active:scale-90 cursor-pointer ${
              pathname.startsWith('/settings')
                ? 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/40 shadow-xs'
                : 'bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] text-[var(--text-main)] hover:text-[var(--primary)] border-[var(--border-light)]'
            }`}
            title="Settings & Brand Hub"
            aria-label="Settings and Brand Hub"
          >
            <Settings size={17} />
          </Link>

          {/* Shopping Bag CTA */}
          <button
            id="desktop-header-cart-btn"
            onClick={() => openModal('cartDrawer')}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white transition-all active:scale-95 shadow-btn font-bold text-xs cursor-pointer"
            aria-label={`Shopping Bag, ${totalItemsCount} item${totalItemsCount !== 1 ? 's' : ''}`}
          >
            <div className="relative">
              <ShoppingBag size={16} />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white text-[var(--primary)] text-[9px] font-black px-0.5 shadow-xs">
                  {totalItemsCount}
                </span>
              )}
            </div>
            <span className="hidden xl:inline">
              {totalItemsCount > 0 ? `Bag (₹${subtotalAmount.toLocaleString('en-IN')})` : 'Bag'}
            </span>
            <span className="xl:hidden">
              Bag
            </span>
          </button>

          {/* Slide Navigation Menu Icon Only */}
          <button
            id="desktop-header-menu-btn"
            onClick={() => openModal('mobileMenuDrawer')}
            className="flex items-center justify-center h-9 w-9 rounded-full bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] border border-[var(--border-light)] text-[var(--text-main)] hover:text-[var(--primary)] transition-all active:scale-90 cursor-pointer shadow-2xs"
            title="Open Slide Navigation Menu"
            aria-label="Open Slide Navigation Menu"
          >
            <Menu size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default DesktopHeader;
