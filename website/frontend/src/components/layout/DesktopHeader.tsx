'use client';

// =============================================================================
// DesktopHeader — Luxury Top Navigation Bar for Tablet & Desktop screens
// Primary nav: Drops, Categories, Custom Print, About ▾ dropdown
// Search, Wishlist, Account, Bag, Menu
// Responsive across 768px - 1920px viewports without horizontal overflow
// =============================================================================

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingBag, Menu, Settings, User, Heart, ChevronDown } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useModal } from '@/context/ModalContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useWishlist } from '@/context/WishlistContext';

interface NavLink {
  href: string;
  label: string;
}

const PRIMARY_LINKS: NavLink[] = [
  { href: '/', label: 'Drops' },
  { href: '/categories', label: 'Categories' },
  { href: '/custom-tshirt', label: 'Custom Print' },
];

const ABOUT_DROPDOWN_LINKS: NavLink[] = [
  { href: '/about', label: 'About Us' },
  { href: '/journal', label: 'Journal' },
  { href: '/faq', label: 'FAQ' },
  { href: '/support', label: 'Support' },
];

export function DesktopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItemsCount } = useCart();
  const { openModal } = useModal();
  const { customer, isAuthenticated } = useCustomerAuth();
  const { wishlistCount } = useWishlist();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const aboutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAboutMouseEnter = () => {
    if (aboutTimeoutRef.current) {
      clearTimeout(aboutTimeoutRef.current);
      aboutTimeoutRef.current = null;
    }
    setIsAboutOpen(true);
  };

  const handleAboutMouseLeave = () => {
    if (aboutTimeoutRef.current) {
      clearTimeout(aboutTimeoutRef.current);
    }
    aboutTimeoutRef.current = setTimeout(() => {
      setIsAboutOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (aboutTimeoutRef.current) {
        clearTimeout(aboutTimeoutRef.current);
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (aboutTimeoutRef.current) clearTimeout(aboutTimeoutRef.current);
        setIsAboutOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (aboutTimeoutRef.current) clearTimeout(aboutTimeoutRef.current);
        setIsAboutOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/search');
    }
  }

  // Find which about link is currently active based on pathname
  const activeAboutLink = ABOUT_DROPDOWN_LINKS.find(
    (link) => pathname === link.href || pathname.startsWith(`${link.href}/`)
  );
  const isAboutActive = Boolean(activeAboutLink);
  const dropdownLabel = activeAboutLink ? activeAboutLink.label : 'About';

  return (
    <header
      suppressHydrationWarning
      className="hidden md:block w-full sticky top-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-light)] shadow-xs"
    >
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-2 lg:px-6 h-16 flex items-center justify-between gap-1 lg:gap-4">
        {/* Left: Brand Logo & Unisex Subtitle */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 lg:gap-2.5 group">
            <div
              className="relative flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-xl bg-white border border-[var(--border-light)] shadow-xs transition-transform group-hover:scale-105 overflow-hidden p-1"
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
              <span className="text-sm lg:text-base font-900 tracking-tight leading-none block text-[var(--text-main)]">
                FICCADO
              </span>
              <span className="text-[9px] font-800 tracking-[0.2em] text-[var(--primary)] uppercase hidden 2xl:block mt-0.5">
                High Quality Unisex Wears
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Primary Navigation Links */}
        <nav className="flex items-center gap-0.5 lg:gap-1.5" aria-label="Primary navigation">
          {PRIMARY_LINKS.map(({ href, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={`px-2 md:px-2.5 lg:px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'text-[var(--primary)] bg-[var(--primary-light)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)]'
                }`}
              >
                {label}
              </Link>
            );
          })}

          {/* About Dropdown */}
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={handleAboutMouseEnter}
            onMouseLeave={handleAboutMouseLeave}
          >
            <button
              type="button"
              id="desktop-header-about-dropdown"
              aria-haspopup="menu"
              aria-expanded={isAboutOpen}
              aria-current={isAboutActive ? 'page' : undefined}
              onClick={() => {
                if (aboutTimeoutRef.current) clearTimeout(aboutTimeoutRef.current);
                setIsAboutOpen(true);
              }}
              className={`flex items-center gap-1 px-2 md:px-2.5 lg:px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider font-bold whitespace-nowrap transition-all cursor-pointer ${
                isAboutActive || isAboutOpen
                  ? 'text-[var(--primary)] bg-[var(--primary-light)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <span>{dropdownLabel}</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${isAboutOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isAboutOpen && (
              <div
                role="menu"
                id="about-dropdown-menu"
                aria-label="About Menu"
                onMouseEnter={handleAboutMouseEnter}
                onMouseLeave={handleAboutMouseLeave}
                className="absolute top-full left-0 mt-1.5 w-40 rounded-2xl bg-[var(--bg-surface)]/95 backdrop-blur-xl border border-[var(--border-light)] shadow-xl p-1.5 z-50 animate-fade-in before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:bg-transparent"
              >
                {ABOUT_DROPDOWN_LINKS.map(({ href, label }) => {
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      role="menuitem"
                      href={href}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setIsAboutOpen(false)}
                      className={`block px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'text-[var(--primary)] bg-[var(--primary-light)]'
                          : 'text-[var(--text-main)] hover:bg-[var(--bg-surface-alt)] hover:text-[var(--primary)]'
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Center-Right: Search Input (full on lg+, icon button on md) */}
        <div className="flex items-center">
          <Link
            href="/search"
            id="desktop-header-search-btn"
            aria-label="Search catalog"
            className="lg:hidden flex items-center justify-center h-9 w-9 rounded-full bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] border border-[var(--border-light)] text-[var(--text-main)] hover:text-[var(--primary)] transition-all active:scale-90 cursor-pointer shadow-2xs"
            title="Search catalog"
          >
            <Search size={16} />
          </Link>

          <form onSubmit={handleSearchSubmit} className="hidden lg:flex flex-1 max-w-[150px] xl:max-w-xs relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drops..."
              className="w-full h-9 pl-8 pr-7 rounded-full bg-[var(--bg-surface-alt)] border border-[var(--border-light)] text-xs text-[var(--text-main)] placeholder-[var(--text-light)] focus:outline-none focus:border-[var(--primary)] focus:bg-white transition-all shadow-xs"
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
            <button
              type="submit"
              aria-label="Submit search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-800 bg-[var(--border-light)] text-[var(--text-muted)] px-1.5 py-0.5 rounded-md hover:bg-[var(--border-medium)] transition-colors cursor-pointer"
            >
              ↵
            </button>
          </form>
        </div>

        {/* Right: Actions (Account, Wishlist, Settings, Bag, Menu) */}
        <div className="flex items-center gap-1 lg:gap-1.5 shrink-0">
          {/* Customer Account Button */}
          {isAuthenticated ? (
            <Link
              href="/account"
              id="desktop-header-account-btn"
              className={`flex items-center gap-1.5 h-9 px-2.5 xl:px-3 rounded-full border transition-all active:scale-90 cursor-pointer ${
                pathname.startsWith('/account')
                  ? 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/40 shadow-xs'
                  : 'bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] text-[var(--text-main)] hover:text-[var(--primary)] border-[var(--border-light)]'
              }`}
              title={`Account (${customer?.name || 'Customer'})`}
              aria-label="Customer Account"
            >
              <User size={15} />
              <span className="text-xs font-bold hidden xl:inline max-w-[80px] truncate">
                {customer?.name?.split(' ')[0] || 'Account'}
              </span>
            </Link>
          ) : (
            <button
              type="button"
              id="desktop-header-auth-btn"
              onClick={() => openModal('authModal')}
              className="flex items-center gap-1.5 h-9 px-2.5 xl:px-3 rounded-full border border-[var(--border-light)] bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] text-[var(--text-main)] hover:text-[var(--primary)] text-xs font-bold transition-all active:scale-90 cursor-pointer shadow-2xs"
              title="Sign In or Register"
              aria-label="Sign In or Register"
            >
              <User size={15} />
              <span className="hidden xl:inline">Sign In</span>
            </button>
          )}

          {/* Wishlist Link */}
          <Link
            href="/wishlist"
            id="desktop-header-wishlist-btn"
            className={`relative flex items-center justify-center h-9 w-9 rounded-full border transition-all active:scale-90 cursor-pointer ${
              pathname.startsWith('/wishlist')
                ? 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/40 shadow-xs'
                : 'bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] text-[var(--text-main)] hover:text-[var(--accent-red)] border-[var(--border-light)]'
            }`}
            title={`Wishlist (${wishlistCount})`}
            aria-label={`Wishlist, ${wishlistCount} item${wishlistCount !== 1 ? 's' : ''}`}
          >
            <Heart size={15} className={wishlistCount > 0 ? 'fill-[var(--accent-red)] text-[var(--accent-red)]' : ''} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] text-white text-[9px] font-black px-0.5 shadow-xs">
                {wishlistCount}
              </span>
            )}
          </Link>

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
            <Settings size={15} />
          </Link>

          {/* Shopping Bag CTA — icon-only circular button matching Wishlist & Settings geometry */}
          <button
            id="desktop-header-cart-btn"
            onClick={() => openModal('cartDrawer')}
            className="relative flex items-center justify-center h-9 w-9 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white transition-all active:scale-90 shadow-btn font-bold cursor-pointer"
            aria-label={`Open bag, ${totalItemsCount} item${totalItemsCount !== 1 ? 's' : ''}`}
            title="Shopping Bag"
          >
            <ShoppingBag size={15} />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white text-[var(--primary)] text-[9px] font-black px-0.5 shadow-xs">
                {totalItemsCount}
              </span>
            )}
          </button>

          {/* Slide Navigation Menu Icon Only */}
          <button
            id="desktop-header-menu-btn"
            onClick={() => openModal('mobileMenuDrawer')}
            className="flex items-center justify-center h-9 w-9 rounded-full bg-[var(--bg-surface-alt)] hover:bg-[var(--border-light)] border border-[var(--border-light)] text-[var(--text-main)] hover:text-[var(--primary)] transition-all active:scale-90 cursor-pointer shadow-2xs"
            title="Open Slide Navigation Menu"
            aria-label="Open Slide Navigation Menu"
          >
            <Menu size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default DesktopHeader;
