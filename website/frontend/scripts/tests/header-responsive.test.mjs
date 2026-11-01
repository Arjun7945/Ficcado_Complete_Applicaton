// =============================================================================
// Header Responsive Layout & Overflow Audit Suite — ISS-03 / Phase P3-5
// scripts/tests/header-responsive.test.mjs
// Verifies zero horizontal overflow across all 9 tablet/desktop breakpoints
// (768px, 820px, 912px, 1024px, 1180px, 1280px, 1366px, 1440px, 1536px),
// accessible About dropdown menu, and Custom Print rename.
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const BREAKPOINTS = [768, 820, 912, 1024, 1180, 1280, 1366, 1440, 1536];

describe('Phase P3-5 (ISS-03): Responsive Header Refactor & Custom Print Rename', () => {
  const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

  test('Header renders with zero horizontal overflow across all 9 tablet & desktop widths', async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();

    try {
      for (const width of BREAKPOINTS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });

        const measurement = await page.evaluate(() => {
          const scrollWidth = document.documentElement.scrollWidth;
          const innerWidth = window.innerWidth;
          const header = document.querySelector('header');
          const headerScrollWidth = header?.scrollWidth || 0;
          const headerClientWidth = header?.clientWidth || 0;

          // Check if any header child element clips beyond innerWidth
          const clippedElements = [];
          if (header) {
            header.querySelectorAll('a, button, input, div').forEach((el) => {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0 && rect.right > innerWidth) {
                clippedElements.push({
                  tag: el.tagName,
                  id: el.id,
                  right: rect.right,
                  innerWidth,
                  overflowBy: Math.round(rect.right - innerWidth),
                });
              }
            });
          }

          return {
            scrollWidth,
            innerWidth,
            headerScrollWidth,
            headerClientWidth,
            hasOverflow: scrollWidth > innerWidth,
            clippedElements,
          };
        });

        assert.strictEqual(
          measurement.hasOverflow,
          false,
          `Width ${width}px has horizontal overflow: scrollWidth (${measurement.scrollWidth}px) > innerWidth (${measurement.innerWidth}px)`
        );

        assert.strictEqual(
          measurement.clippedElements.length,
          0,
          `Width ${width}px has ${measurement.clippedElements.length} clipped elements: ${JSON.stringify(measurement.clippedElements)}`
        );
      }
    } finally {
      await browser.close();
    }
  });

  test('Primary navigation links include Drops, Categories, Custom Print, and About dropdown', async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();

    try {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // 1. Verify Drops link
      const dropsLink = page.locator('nav a[href="/"]').first();
      assert.ok(await dropsLink.isVisible(), 'Drops link must be visible');
      assert.strictEqual((await dropsLink.innerText()).trim(), 'DROPS');

      // 2. Verify Categories link
      const catLink = page.locator('nav a[href="/categories"]').first();
      assert.ok(await catLink.isVisible(), 'Categories link must be visible');
      assert.strictEqual((await catLink.innerText()).trim(), 'CATEGORIES');

      // 3. Verify Custom Print link (renamed from Custom T-Shirt)
      const customPrintLink = page.locator('nav a[href="/custom-tshirt"]').first();
      assert.ok(await customPrintLink.isVisible(), 'Custom Print link must be visible in nav');
      assert.strictEqual((await customPrintLink.innerText()).trim(), 'CUSTOM PRINT');

      // 4. Verify About dropdown toggle
      const aboutBtn = page.locator('#desktop-header-about-dropdown');
      assert.ok(await aboutBtn.isVisible(), 'About dropdown toggle must be visible');
      assert.strictEqual(await aboutBtn.getAttribute('aria-haspopup'), 'menu');
      assert.strictEqual(await aboutBtn.getAttribute('aria-expanded'), 'false');

      // 5. Click About dropdown to open
      await aboutBtn.click();
      const aboutMenu = page.locator('#about-dropdown-menu');
      await aboutMenu.waitFor({ state: 'visible', timeout: 3000 });
      assert.strictEqual(await aboutBtn.getAttribute('aria-expanded'), 'true');

      // Verify the 4 sub-links inside the dropdown
      const aboutUsSub = aboutMenu.locator('a[href="/about"]');
      const journalSub = aboutMenu.locator('a[href="/journal"]');
      const faqSub = aboutMenu.locator('a[href="/faq"]');
      const supportSub = aboutMenu.locator('a[href="/support"]');

      assert.ok(await aboutUsSub.isVisible(), 'About Us sub-link must be visible');
      assert.ok(await journalSub.isVisible(), 'Journal sub-link must be visible');
      assert.ok(await faqSub.isVisible(), 'FAQ sub-link must be visible');
      assert.ok(await supportSub.isVisible(), 'Support sub-link must be visible');

      // 6. Close dropdown by clicking outside or pressing Escape
      await page.keyboard.press('Escape');
      await aboutMenu.waitFor({ state: 'hidden', timeout: 3000 });
      assert.strictEqual(await aboutBtn.getAttribute('aria-expanded'), 'false');
    } finally {
      await browser.close();
    }
  });

  test('Bag button and Search are responsive and accessible without text overflow on tablet', async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();

    try {
      // Test at 768px (iPad portrait / smallest desktop breakpoint)
      await page.setViewportSize({ width: 768, height: 900 });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Bag button is rendered as compact icon button with badge
      const cartBtn = page.locator('#desktop-header-cart-btn');
      assert.ok(await cartBtn.isVisible(), 'Shopping bag button must be visible at 768px');

      // Search button is rendered as compact button on md
      const searchBtn = page.locator('#desktop-header-search-btn');
      assert.ok(await searchBtn.isVisible(), 'Search button must be visible at 768px');

      // Full search input is hidden at 768px
      const searchForm = page.locator('header form');
      assert.strictEqual(await searchForm.isVisible(), false, 'Full search form should be hidden at 768px');

      // Now test at 1280px
      await page.setViewportSize({ width: 1280, height: 900 });
      assert.strictEqual(await searchForm.isVisible(), true, 'Full search form should be visible at 1280px');
    } finally {
      await browser.close();
    }
  });
});
