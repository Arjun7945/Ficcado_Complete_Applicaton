import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/siteUrl';

// =============================================================================
// Robots Configuration — /robots.txt
// All /categories/ sections allowed for all user-agents and AI bots per owner instruction
// =============================================================================

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/checkout/',
          '/_next/',
        ],
      },
      // Explicit AI Ingestion Opt-Ins — full access across all categories
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Amazonbot'],
        allow: [
          '/',
          '/about',
          '/faq',
          '/support',
          '/journal',
          '/categories',
          '/categories/',
          '/llms.txt',
          '/llms-full.txt',
          '/humans.txt',
        ],
        disallow: ['/api/', '/checkout/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
