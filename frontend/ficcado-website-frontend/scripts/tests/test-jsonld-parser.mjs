// =============================================================================
// JSON-LD Structural Validator
// Spawns production server, fetches HTML pages, extracts <script type="application/ld+json">
// parses JSON, and asserts schema.org compliance.
// =============================================================================

import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const PORT = 3006;
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJsonLdScripts(html) {
  const matches = [];
  const regex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

async function main() {
  console.log(`Starting server on port ${PORT}...`);
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    shell: true,
    stdio: 'ignore',
    cwd: process.cwd(),
  });

  // Wait for server
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/faq`);
      if (res.status === 200) break;
    } catch {
      await wait(500);
    }
  }

  try {
    // 1. Home / Root Layout JSON-LD
    const homeRes = await fetch(`http://127.0.0.1:${PORT}/`);
    const homeHtml = await homeRes.text();
    const homeScripts = extractJsonLdScripts(homeHtml);
    assert.ok(homeScripts.length > 0, 'Home page must have JSON-LD script');

    const homeData = JSON.parse(homeScripts[0]);
    assert.equal(homeData['@context'], 'https://schema.org');
    assert.ok(Array.isArray(homeData['@graph']), 'Home schema must have @graph');

    const org = homeData['@graph'].find((e) => e['@type'] === 'Organization');
    assert.ok(org, 'Must have Organization in @graph');
    assert.equal(org.name, 'Ficcado');
    assert.ok(org.logo.startsWith('http'), 'Logo must be absolute URL');
    assert.equal(org.founders.length, 3, 'Must have 3 founders');

    const website = homeData['@graph'].find((e) => e['@type'] === 'WebSite');
    assert.ok(website, 'Must have WebSite in @graph');
    assert.ok(website.potentialAction, 'Must have SearchAction');
    console.log('✓ Home/Layout Organization & WebSite JSON-LD parsed & verified');

    // 2. Category Page JSON-LD
    const catRes = await fetch(`http://127.0.0.1:${PORT}/categories/t-shirts`);
    const catHtml = await catRes.text();
    const catScripts = extractJsonLdScripts(catHtml);
    assert.ok(catScripts.length >= 2, 'Category page must have layout and category JSON-LD');

    const catData = JSON.parse(catScripts[1]);
    const breadcrumb = catData['@graph'].find((e) => e['@type'] === 'BreadcrumbList');
    assert.ok(breadcrumb, 'Must have BreadcrumbList in category schema');
    const collection = catData['@graph'].find((e) => e['@type'] === 'CollectionPage');
    assert.ok(collection, 'Must have CollectionPage in category schema');
    const itemList = catData['@graph'].find((e) => e['@type'] === 'ItemList');
    assert.ok(itemList, 'Must have ItemList in category schema');
    console.log('✓ Category BreadcrumbList, CollectionPage & ItemList JSON-LD parsed & verified');

    // 3. FAQ Page JSON-LD
    const faqRes = await fetch(`http://127.0.0.1:${PORT}/faq`);
    const faqHtml = await faqRes.text();
    const faqScripts = extractJsonLdScripts(faqHtml);
    assert.ok(faqScripts.length >= 2, 'FAQ page must have layout and FAQ JSON-LD');

    const faqData = JSON.parse(faqScripts[1]);
    assert.equal(faqData['@type'], 'FAQPage');
    assert.ok(Array.isArray(faqData.mainEntity), 'FAQPage must have mainEntity array');
    assert.ok(faqData.mainEntity.length > 10, 'FAQPage must have questions');
    assert.ok(faqData.mainEntity[0].name, 'Question must have name');
    assert.ok(faqData.mainEntity[0].acceptedAnswer.text, 'Answer must have text');
    console.log('✓ FAQPage JSON-LD parsed & verified');

    console.log('\n====================================================');
    console.log('🎉 ALL JSON-LD SCHEMAS STRICTLY VALIDATED WITH JSON.PARSE');
    console.log('====================================================\n');
  } finally {
    server.kill('SIGINT');
  }
}

main().catch((err) => {
  console.error('JSON-LD Validation Failed:', err);
  process.exit(1);
});
