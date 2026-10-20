'use client';

// =============================================================================
// RouteTitleSync — Client-side Navigation Tab Title Synchronizer
// Enforces the standard:
// - Home: "Ficcado Clothing"
// - All other routes/sections: "Ficcado Clothing | [Page Name]"
// =============================================================================

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Ficcado Clothing',
  '/support': 'Ficcado Clothing | Support',
  '/faq': "Ficcado Clothing | FAQ's",
  '/about': 'Ficcado Clothing | About Us',
  '/journal': 'Ficcado Clothing | Journal',
  '/blob': 'Ficcado Clothing | Journal',
  '/blog': 'Ficcado Clothing | Journal',
  '/settings': 'Ficcado Clothing | Settings',
  '/search': 'Ficcado Clothing | Search',
  '/categories': 'Ficcado Clothing | Categories',
  '/categories/t-shirts': 'Ficcado Clothing | High Quality T-Shirts',
  '/categories/combos': 'Ficcado Clothing | Streetwear Combos',
  '/checkout': 'Ficcado Clothing | Checkout',
  '/checkout/whatsapp-continue': 'Ficcado Clothing | WhatsApp Continue',
  '/terms': 'Ficcado Clothing | Terms & Conditions',
  '/privacy': 'Ficcado Clothing | Privacy Policy',
  '/shipping-delivery': 'Ficcado Clothing | Shipping & Delivery',
  '/returns-refunds': 'Ficcado Clothing | Returns & Refunds',
  '/replacements-damages': 'Ficcado Clothing | Replacements & Damages',
  '/onboarding': 'Ficcado Clothing | Welcome',
};

export function RouteTitleSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    if (ROUTE_TITLES[pathname]) {
      document.title = ROUTE_TITLES[pathname];
      return;
    }

    if (pathname.startsWith('/categories/')) {
      const slug = pathname.replace('/categories/', '');
      const formatted = slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      document.title = `Ficcado Clothing | ${formatted}`;
      return;
    }

    const segment = pathname.split('/').filter(Boolean).pop();
    if (segment) {
      const formatted = segment
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      document.title = `Ficcado Clothing | ${formatted}`;
    } else {
      document.title = 'Ficcado Clothing';
    }
  }, [pathname]);

  return null;
}
