import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

// Contexts
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/context/ToastContext';
import { ModalProvider } from '@/context/ModalContext';
import { ViewportProvider } from '@/context/ViewportContext';
import { ConsentProvider } from '@/context/ConsentContext';
import { CookieConsentBanner } from '@/components/ui/CookieConsentBanner';
import { CacheInvalidator } from '@/components/providers/CacheInvalidator';

// Shell
import { AppShell } from '@/components/layout/AppShell';

// ---------------------------------------------------------------------------
// Font — Plus Jakarta Sans
// ---------------------------------------------------------------------------
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

import { getSiteUrl } from '@/lib/siteUrl';

// ---------------------------------------------------------------------------
// SEO Metadata (Unisex, WhatsApp Ordering) per Phase 2 Section 10.1
// ---------------------------------------------------------------------------
const siteUrl = getSiteUrl();
const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '916282000729';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Ficcado',
    template: '%s | Ficcado',
  },
  description:
    'Ficcado crafts signature high quality 240 GSM unisex streetwear t-shirts. Direct WhatsApp ordering and verified pan-India dispatch.',
  keywords: [
    'Ficcado',
    'high quality t-shirts',
    'unisex t-shirts',
    '240 gsm cotton',
    'streetwear',
    'combos coming soon',
    'hoodies coming soon',
    'limited drops',
  ],
  authors: [
    { name: 'Ficcado', url: siteUrl },
    { name: 'Arjun PS', url: `${siteUrl}/humans.txt` },
  ],
  creator: 'Arjun PS',
  publisher: 'Ficcado',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: 'Ficcado',
    title: 'Ficcado',
    description:
      'Ficcado crafts signature high quality 240 GSM unisex streetwear t-shirts. Direct WhatsApp ordering.',
    images: [
      {
        url: `${siteUrl}/images/hero/ficcado-banner.jpg`,
        width: 1200,
        height: 630,
        alt: 'Ficcado Clothing — High Quality Unisex Wears',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ficcado',
    description:
      'Ficcado crafts signature high quality 240 GSM unisex streetwear t-shirts. Direct WhatsApp ordering.',
    images: [`${siteUrl}/images/hero/ficcado-banner.jpg`],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/images/brand_logo/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/brand_logo/favicon-rounded.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/images/brand_logo/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  robots: { index: true, follow: true },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#2B62C6',
};

// ---------------------------------------------------------------------------
// Root Organization & WebSite JSON-LD Schema Cluster per Section 10.2
// ---------------------------------------------------------------------------
const globalJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Ficcado',
      legalName: 'Ficcado Clothing',
      url: siteUrl,
      logo: `${siteUrl}/images/brand_logo/favicon-rounded.png`,
      foundingDate: '2024',
      founders: [
        { '@type': 'Person', name: 'Sinan MS' },
        { '@type': 'Person', name: 'Ganga Lakshmi' },
        { '@type': 'Person', name: 'Rohith Murali' },
      ],
      sameAs: [
        'https://instagram.com/ficcado.clothing',
      ],
      taxID: '32CVNPR0498H1Z5',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Manadath House, Thaikkattukara P O, Opposite metro pillar 116',
        addressLocality: 'Aluva 6',
        postalCode: '683106',
        addressCountry: 'IN',
      },
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '+91 6282000729',
          email: 'ficcado.clothing@gmail.com',
          contactType: 'customer service',
          availableLanguage: ['English', 'Hindi', 'Malayalam'],
        },
        {
          '@type': 'ContactPoint',
          telephone: `+${whatsappNumber}`,
          contactType: 'WhatsApp ordering',
          availableLanguage: ['English', 'Hindi', 'Malayalam'],
        },
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Ficcado',
      publisher: {
        '@id': `${siteUrl}/#organization`,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Root Layout
// ---------------------------------------------------------------------------
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${plusJakartaSans.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="developer" content="Arjun PS" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalJsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                if (typeof console !== 'undefined' && console.log) {
                  console.log('%c Crafted with precision by Arjun PS %c ' + ${JSON.stringify(siteUrl + '/humans.txt')} + ' ', 'background:#2B62C6;color:#fff;font-weight:bold;padding:4px 8px;border-radius:4px;', 'color:#888;');
                }
              } catch(e){}
              try {
                var search = window.location.search || '';
                var ua = navigator.userAgent || '';
                var platform = navigator.platform || '';

                // Explicit Android detection — ensure clearance is always 0px on Android
                var isAndroid = /Android/i.test(ua) || search.indexOf('_mvua=mv-android') !== -1;
                if (isAndroid) {
                  document.documentElement.classList.remove('is-ios');
                  document.documentElement.removeAttribute('data-platform');
                  document.documentElement.style.setProperty('--ios-bottom-bar-clearance', '0px');
                  try { sessionStorage.removeItem('fc_is_ios'); } catch(e){}
                  return;
                }

                // iOS detection: real iPhones/iPads, simulator extensions, and Mac touch
                var isIOS = /iPad|iPhone|iPod/i.test(ua) || 
                            (platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                            search.indexOf('_mvua=mv-ios') !== -1 ||
                            (window.name && /iphone|ios|ipad/i.test(window.name)) ||
                            (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('-webkit-touch-callout', 'none')) ||
                            (function(){ try { return sessionStorage.getItem('fc_is_ios') === '1'; } catch(e){ return false; } })();

                if (isIOS) {
                  document.documentElement.classList.add('is-ios');
                  document.documentElement.setAttribute('data-platform', 'ios');
                  document.documentElement.style.setProperty('--ios-bottom-bar-clearance', '5.5rem');
                  try { sessionStorage.setItem('fc_is_ios', '1'); } catch(e){}
                }
              } catch(e) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-full bg-[var(--bg-page)] antialiased" suppressHydrationWarning>
        <ViewportProvider>
          <CacheInvalidator />
          <ToastProvider>
            <ConsentProvider>
              <CartProvider>
                <ModalProvider>
                  <AppShell>{children}</AppShell>
                  <CookieConsentBanner />
                </ModalProvider>
              </CartProvider>
            </ConsentProvider>
          </ToastProvider>
        </ViewportProvider>
      </body>
    </html>
  );
}
