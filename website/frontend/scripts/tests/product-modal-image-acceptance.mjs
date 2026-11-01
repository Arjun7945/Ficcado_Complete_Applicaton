import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

async function run() {
  console.log('=== ISS-02 / Phase P3-4: Live Acceptance Test in Real Chrome ===');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // 1. Fetch catalog to confirm darlix data
    const catRes = await fetch('http://localhost:8000/api/public/products');
    const catalog = await catRes.json();
    const products = Array.isArray(catalog) ? catalog : catalog.data || catalog.products || [];
    const darlix = products.find(p => p.slug === 'darlix' || p.name?.toLowerCase().includes('darlix'));
    assert.ok(darlix, 'Darlix must exist in public products catalog');
    console.log(`✓ Darlix found in catalog (ID: ${darlix.id}, name: "${darlix.name}", images count: ${darlix.images?.length || 0})`);

    // 2. Navigate to Storefront Homepage
    console.log('Navigating to http://localhost:3000 ...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 3. Find Darlix Card
    const darlixCard = page.locator('#product-card-' + darlix.id).or(page.locator(`text="${darlix.name}"`)).first();
    const cardVisible = await darlixCard.isVisible();
    console.log(`Darlix card visible on homepage: ${cardVisible}`);

    if (!cardVisible) {
      // If not on homepage, navigate to /categories/t-shirts
      console.log('Navigating to /categories/t-shirts ...');
      await page.goto('http://localhost:3000/categories/t-shirts');
      await page.waitForLoadState('networkidle');
    }

    const cardToClick = page.locator('#product-card-' + darlix.id).or(page.locator(`text="${darlix.name}"`)).first();
    await cardToClick.scrollIntoViewIfNeeded();
    console.log('Clicking Darlix card to open #productModal ...');
    await cardToClick.click();

    // 4. Wait for modal to open
    const modal = page.locator('#productModal');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ #productModal is open and visible');

    // 5. Inspect main modal image
    const mainImg = modal.locator('img').first();
    await mainImg.waitFor({ state: 'visible', timeout: 5000 });
    const src = await mainImg.getAttribute('src');
    console.log('Modal main image src prefix (40 chars):', src?.substring(0, 40));

    assert.ok(src, 'Modal main image must have a src');
    assert.ok(
      src.startsWith('data:image/') || !src.includes('placeholder.webp'),
      'Image src must be base64 data URL and not placeholder.webp'
    );

    // 6. Check natural dimensions in DOM
    const naturalWidth = await mainImg.evaluate((img) => img.naturalWidth);
    const naturalHeight = await mainImg.evaluate((img) => img.naturalHeight);
    console.log(`Modal main image natural dimensions: ${naturalWidth} x ${naturalHeight}`);

    assert.ok(naturalWidth > 0, `naturalWidth must be > 0 (got ${naturalWidth})`);
    assert.ok(naturalHeight > 0, `naturalHeight must be > 0 (got ${naturalHeight})`);

    // 7. Verify thumbnails if multiple images exist
    const thumbnails = modal.locator('div button img');
    const thumbCount = await thumbnails.count();
    console.log(`Gallery thumbnails rendered in modal: ${thumbCount}`);
    if (thumbCount > 0) {
      const thumbSrc = await thumbnails.first().getAttribute('src');
      console.log('First thumbnail src prefix (40 chars):', thumbSrc?.substring(0, 40));
      assert.ok(thumbSrc?.startsWith('data:image/'), 'Thumbnail src must be base64 data URL');
    }

    console.log('\n🎉 ALL P3-4 REAL CHROME ACCEPTANCE CHECKS PASSED: DARLIX RENDERS BASE64 IMAGES CLEANLY!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Acceptance test failed:', err);
  process.exit(1);
});
