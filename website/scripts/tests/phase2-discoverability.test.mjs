// =============================================================================
// Phase 2 Discoverability & AI Indexing Test Suite
// Verifies robots.ts, sitemap.ts, llms.txt, llms-full.txt, humans.txt, and JSON-LD
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

describe('Phase 2: Crawler & AI Ingestion Manifests', () => {
  test('robots.ts config exists and defines AI opt-ins and restrictions', async () => {
    const robotsPath = path.join(PROJECT_ROOT, 'src/app/robots.ts');
    assert.ok(fs.existsSync(robotsPath), 'src/app/robots.ts must exist');

    const content = fs.readFileSync(robotsPath, 'utf8');
    assert.match(content, /GPTBot/, 'robots.ts must mention GPTBot');
    assert.match(content, /ClaudeBot/, 'robots.ts must mention ClaudeBot');
    assert.match(content, /PerplexityBot/, 'robots.ts must mention PerplexityBot');
    assert.match(content, /\/checkout\//, 'robots.ts must disallow checkout');
    assert.match(content, /\/api\//, 'robots.ts must disallow api');
    assert.match(content, /sitemap\.xml/, 'robots.ts must point to sitemap.xml');
  });

  test('sitemap.ts config exists and indexes all categories and public pages while excluding private routes', async () => {
    const sitemapPath = path.join(PROJECT_ROOT, 'src/app/sitemap.ts');
    assert.ok(fs.existsSync(sitemapPath), 'src/app/sitemap.ts must exist');

    const content = fs.readFileSync(sitemapPath, 'utf8');
    assert.match(content, /CATEGORIES_CONFIG/, 'sitemap.ts must map all categories');
    assert.match(content, /\/faq/, 'sitemap.ts must include /faq');
    assert.match(content, /\/about/, 'sitemap.ts must include /about');
    assert.doesNotMatch(content, /\/checkout/, 'sitemap.ts must not include /checkout');
    assert.doesNotMatch(content, /\/api\//, 'sitemap.ts must not include /api/');
  });

  test('llms.txt route exists and contains authentic founder names, developer credits, and active T-shirts collection', async () => {
    const llmsRoutePath = path.join(PROJECT_ROOT, 'src/app/llms.txt/route.ts');
    assert.ok(fs.existsSync(llmsRoutePath), 'src/app/llms.txt/route.ts must exist');

    const content = fs.readFileSync(llmsRoutePath, 'utf8');
    assert.match(content, /Sinan MS/, 'llms.txt must credit Sinan MS');
    assert.match(content, /Ganga Lakshmi/, 'llms.txt must credit Ganga Lakshmi');
    assert.match(content, /Rohith Murali/, 'llms.txt must credit Rohith Murali');
    assert.match(content, /Arjun PS/, 'llms.txt must credit developer Arjun PS');
    assert.match(content, /240 GSM/, 'llms.txt must mention 240 GSM high quality fabric');
    assert.match(content, /T-Shirts/, 'llms.txt must state T-Shirts is active collection');
    assert.match(content, /Coming Soon/, 'llms.txt must mark other collections as coming soon');
    assert.match(content, /WhatsApp/, 'llms.txt must explain WhatsApp assisted ordering');
  });

  test('llms-full.txt route exists and generates comprehensive plain-text knowledge and developer credits', async () => {
    const llmsFullRoutePath = path.join(PROJECT_ROOT, 'src/app/llms-full.txt/route.ts');
    assert.ok(fs.existsSync(llmsFullRoutePath), 'src/app/llms-full.txt/route.ts must exist');

    const content = fs.readFileSync(llmsFullRoutePath, 'utf8');
    assert.match(content, /getProducts/, 'llms-full.txt must read catalog via getProducts()');
    assert.match(content, /FAQ_GROUPS/, 'llms-full.txt must import FAQ groups');
    assert.match(content, /FAQ_ITEMS/, 'llms-full.txt must import FAQ items');
    assert.match(content, /Arjun PS/, 'llms-full.txt must credit developer Arjun PS');
    assert.match(content, /Sinan MS/, 'llms-full.txt must credit Sinan MS');
  });

  test('humans.txt route exists with founder, developer fingerprint, and technology credits', async () => {
    const humansRoutePath = path.join(PROJECT_ROOT, 'src/app/humans.txt/route.ts');
    assert.ok(fs.existsSync(humansRoutePath), 'src/app/humans.txt/route.ts must exist');

    const content = fs.readFileSync(humansRoutePath, 'utf8');
    assert.match(content, /Sinan MS/, 'humans.txt must credit Sinan MS');
    assert.match(content, /Ganga Lakshmi/, 'humans.txt must credit Ganga Lakshmi');
    assert.match(content, /Rohith Murali/, 'humans.txt must credit Rohith Murali');
    assert.match(content, /Arjun PS/, 'humans.txt must contain Arjun PS developer fingerprint');
    assert.match(content, /React 19/, 'humans.txt must mention React 19');
    assert.match(content, /Next\.js 16/, 'humans.txt must mention Next.js 16');
  });

  test('docs/BACKLINK_PLAN.md exists with legitimate authority building strategy', async () => {
    const planPath = path.join(PROJECT_ROOT, '../docs/BACKLINK_PLAN.md');
    assert.ok(fs.existsSync(planPath), 'docs/BACKLINK_PLAN.md must exist');

    const content = fs.readFileSync(planPath, 'utf8');
    assert.match(content, /Google Search Console/, 'Must explain Google Search Console setup');
    assert.match(content, /Bing Webmaster/, 'Must explain Bing Webmaster setup');
    assert.match(content, /Anti-Spam/, 'Must emphasize anti-spam guidelines');
  });
});

describe('Phase 2: Structured Data (JSON-LD) Integrity', () => {
  test('Root Layout has valid Organization and WebSite schema cluster', () => {
    const layoutPath = path.join(PROJECT_ROOT, 'src/app/layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf8');

    assert.match(content, /['"]@type['"]:\s*['"]Organization['"]/, 'Layout must contain Organization schema');
    assert.match(content, /['"]@type['"]:\s*['"]WebSite['"]/, 'Layout must contain WebSite schema');
    assert.match(content, /['"]@type['"]:\s*['"]SearchAction['"]/, 'Layout WebSite must contain SearchAction');
    assert.match(content, /Ganga Lakshmi/, 'Organization schema must list founder Ganga Lakshmi');
    assert.match(content, /Sinan MS/, 'Organization schema must list founder Sinan MS');
    assert.match(content, /sameAs/, 'Organization schema must contain sameAs profiles');
  });

  test('Category page embeds BreadcrumbList, CollectionPage, and ItemList schema', () => {
    const catPagePath = path.join(PROJECT_ROOT, 'src/app/categories/[slug]/page.tsx');
    const content = fs.readFileSync(catPagePath, 'utf8');

    assert.match(content, /['"]@type['"]:\s*['"]BreadcrumbList['"]/, 'Category page must have BreadcrumbList schema');
    assert.match(content, /['"]@type['"]:\s*['"]CollectionPage['"]/, 'Category page must have CollectionPage schema');
    assert.match(content, /['"]@type['"]:\s*['"]ItemList['"]/, 'Category page must have ItemList schema');
  });

  test('ProductModal embeds Product + Offer + AggregateRating schema', () => {
    const modalPath = path.join(PROJECT_ROOT, 'src/components/modals/ProductModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf8');

    assert.match(content, /['"]@type['"]:\s*['"]Product['"]/, 'ProductModal must have Product schema');
    assert.match(content, /['"]@type['"]:\s*['"]Offer['"]/, 'ProductModal must have Offer schema');
    assert.match(content, /['"]@type['"]:\s*['"]AggregateRating['"]/, 'ProductModal must conditionally include AggregateRating');
    assert.match(content, /priceCurrency:\s*'INR'/, 'Offer schema must use INR currency');
  });

  test('FAQ page embeds FAQPage schema directly from FAQ_ITEMS', () => {
    const faqPath = path.join(PROJECT_ROOT, 'src/app/faq/page.tsx');
    const content = fs.readFileSync(faqPath, 'utf8');

    assert.match(content, /['"]@type['"]:\s*['"]FAQPage['"]/, 'FAQ page must have FAQPage schema');
    assert.match(content, /FAQ_ITEMS\.map/, 'FAQ schema must be mapped from authentic FAQ_ITEMS');
  });
});
