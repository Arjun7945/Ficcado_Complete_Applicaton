'use client';

// =============================================================================
// BottomNav — Floating pill navigation bar for mobile screens
// Provides quick access to Home, Shop, Support, Bag, and Menu
// =============================================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid2X2, ShoppingBag, LifeBuoy, BookOpen, type LucideProps } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useModal } from '@/context/ModalContext';

// Routes where the bottom nav should be hidden
const HIDDEN_ROUTES = ['/onboarding'];

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<LucideProps>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'nav-home', href: '/', label: 'Home', icon: Home },
  { id: 'nav-categories', href: '/categories', label: 'Shop', icon: Grid2X2 },
  { id: 'nav-support', href: '/support', label: 'Support', icon: LifeBuoy },
];

export function BottomNav({ isFixed = false }: { isFixed?: boolean }) {
  const pathname = usePathname();
  const { totalItemsCount } = useCart();
  const { openModal, activeModal } = useModal();

  // Hide on onboarding or when any modal/drawer is active
  if (HIDDEN_ROUTES.some((route) => pathname.startsWith(route)) || activeModal !== null) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      id="bottom-nav"
      aria-label="Main navigation"
      suppressHydrationWarning
      className={`${isFixed ? 'fixed bottom-0 left-0 right-0 md:hidden' : 'absolute bottom-0 left-0 right-0'} z-[100] border-t border-[var(--border-light)] bg-white/95 backdrop-blur-xl saturate-180`}
      style={{
        paddingTop: '0.625rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
    >
      <div className="flex items-center justify-around">
        {/* Standard nav items */}
        {NAV_ITEMS.map(({ id, href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={id}
              id={id}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1 transition-transform active:scale-90"
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.75}
                  style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}
                />
              </div>
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{ color: active ? 'var(--primary)' : 'var(--text-muted)' }}
              >
                {label}
              </span>
            </Link>
          );
        })}

        {/* Cart button (opens drawer) */}
        <button
          id="nav-cart"
          onClick={() => openModal('cartDrawer')}
          className="flex flex-col items-center gap-0.5 px-3 py-1 transition-transform active:scale-90 cursor-pointer"
          aria-label={`Open shopping bag${totalItemsCount > 0 ? `, ${totalItemsCount} items` : ''}`}
        >
          <div className="relative">
            <ShoppingBag
              size={22}
              strokeWidth={1.75}
              style={{ color: totalItemsCount > 0 ? 'var(--primary)' : 'var(--text-muted)' }}
            />
            {totalItemsCount > 0 && (
              <span
                className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-700 text-white"
                style={{
                  background: 'var(--primary)',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {totalItemsCount > 99 ? '99+' : totalItemsCount}
              </span>
            )}
          </div>
          <span
            className="text-[10px] font-semibold tracking-wide"
            style={{ color: totalItemsCount > 0 ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            Bag
          </span>
        </button>

        {/* Journal Link */}
        <Link
          id="nav-journal"
          href="/journal"
          className="flex flex-col items-center gap-0.5 px-3 py-1 transition-transform active:scale-90"
          aria-current={isActive('/journal') ? 'page' : undefined}
        >
          <div className="relative">
            <BookOpen
              size={22}
              strokeWidth={isActive('/journal') ? 2.5 : 1.75}
              style={{ color: isActive('/journal') ? 'var(--primary)' : 'var(--text-muted)' }}
            />
          </div>
          <span
            className="text-[10px] font-semibold tracking-wide"
            style={{ color: isActive('/journal') ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            Journal
          </span>
        </Link>
      </div>
    </nav>
  );
}

export default BottomNav;
