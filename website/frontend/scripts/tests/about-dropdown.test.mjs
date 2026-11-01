// Test suite for WEB-5 (P4W-4): Dynamic About Dropdown Label & Responsive Overflow
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const VIEWPORT_WIDTHS = [768, 820, 1024, 1180, 1280, 1440, 1920];

describe('P4W-4: WEB-5 Dynamic About Dropdown Label & Header Clearance', async () => {
  let browser;
  let page;

  test.before(async () => {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test.after(async () => {
    if (browser) await browser.close();
  });

  test('1. Dropdown label defaults to "About" on non-about routes (home)', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    const trigger = page.locator('#desktop-header-about-dropdown');
    await trigger.waitFor({ state: 'visible' });

    const label = await trigger.locator('span').first().textContent();
    assert.equal(label.trim(), 'About', 'Trigger label should be "About" on homepage');

    const ariaCurrent = await trigger.getAttribute('aria-current');
    assert.equal(ariaCurrent, null, 'Trigger should not have aria-current on homepage');
  });

  test('2. Dropdown label shows "About Us" on /about with active styling and aria-current="page"', async () => {
    await page.goto(`${BASE_URL}/about`, { waitUntil: 'networkidle' });

    const trigger = page.locator('#desktop-header-about-dropdown');
    await trigger.waitFor({ state: 'visible' });

    const label = await trigger.locator('span').first().textContent();
    assert.equal(label.trim(), 'About Us', 'Trigger label should be "About Us" on /about');

    const ariaCurrent = await trigger.getAttribute('aria-current');
    assert.equal(ariaCurrent, 'page', 'Trigger should have aria-current="page" on /about');

    // Open dropdown and check that "About Us" link has aria-current="page"
    await trigger.hover();
    const menu = page.locator('#about-dropdown-menu');
    await menu.waitFor({ state: 'visible' });

    const activeItem = menu.locator('a[href="/about"]');
    const itemAriaCurrent = await activeItem.getAttribute('aria-current');
    assert.equal(itemAriaCurrent, 'page', 'Menu item /about should have aria-current="page"');

    // Move mouse away and click outside to close
    await page.mouse.click(10, 10);
    await menu.waitFor({ state: 'detached' });
  });

  test('3. Dropdown label shows "Journal" on /journal with active styling', async () => {
    await page.goto(`${BASE_URL}/journal`, { waitUntil: 'networkidle' });

    const trigger = page.locator('#desktop-header-about-dropdown');
    await trigger.waitFor({ state: 'visible' });

    const label = await trigger.locator('span').first().textContent();
    assert.equal(label.trim(), 'Journal', 'Trigger label should be "Journal" on /journal');

    const ariaCurrent = await trigger.getAttribute('aria-current');
    assert.equal(ariaCurrent, 'page', 'Trigger should have aria-current="page" on /journal');
  });

  test('4. Dropdown label shows "FAQ" on /faq with active styling', async () => {
    await page.goto(`${BASE_URL}/faq`, { waitUntil: 'networkidle' });

    const trigger = page.locator('#desktop-header-about-dropdown');
    await trigger.waitFor({ state: 'visible' });

    const label = await trigger.locator('span').first().textContent();
    assert.equal(label.trim(), 'FAQ', 'Trigger label should be "FAQ" on /faq');

    const ariaCurrent = await trigger.getAttribute('aria-current');
    assert.equal(ariaCurrent, 'page', 'Trigger should have aria-current="page" on /faq');
  });

  test('5. Dropdown label shows "Support" on /support with active styling', async () => {
    await page.goto(`${BASE_URL}/support`, { waitUntil: 'networkidle' });

    const trigger = page.locator('#desktop-header-about-dropdown');
    await trigger.waitFor({ state: 'visible' });

    const label = await trigger.locator('span').first().textContent();
    assert.equal(label.trim(), 'Support', 'Trigger label should be "Support" on /support');

    const ariaCurrent = await trigger.getAttribute('aria-current');
    assert.equal(ariaCurrent, 'page', 'Trigger should have aria-current="page" on /support');
  });

  test('6. Dropdown label persists after page reload and returns to "About" on other pages', async () => {
    // Reload while on /about
    await page.goto(`${BASE_URL}/about`, { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });

    let trigger = page.locator('#desktop-header-about-dropdown');
    let label = await trigger.locator('span').first().textContent();
    assert.equal(label.trim(), 'About Us', 'Trigger label should persist after reload');

    // Navigate to /categories
    await page.goto(`${BASE_URL}/categories`, { waitUntil: 'networkidle' });
    trigger = page.locator('#desktop-header-about-dropdown');
    label = await trigger.locator('span').first().textContent();
    assert.equal(label.trim(), 'About', 'Trigger label should revert to "About" on /categories');
  });

  test('7. Header controls zero-overflow audit across 768px - 1920px with longest label ("About Us")', async () => {
    // Navigate to /about where label is longest ("About Us")
    for (const width of VIEWPORT_WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE_URL}/about`, { waitUntil: 'networkidle' });

      const measurement = await page.evaluate((w) => {
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const overflows = scrollWidth > innerWidth;

        const header = document.querySelector('header');
        const headerVisible = header ? window.getComputedStyle(header).display !== 'none' : false;

        const controls = [];
        if (headerVisible && header) {
          const elements = header.querySelectorAll('a, button, input');
          elements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              const label = el.getAttribute('aria-label') || el.innerText.trim().replace(/\n+/g, ' ') || el.getAttribute('placeholder') || el.tagName;
              controls.push({
                tag: el.tagName,
                label: label.substring(0, 30),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                isClipped: rect.right > innerWidth || rect.left < 0
              });
            }
          });
        }

        return {
          width: w,
          innerWidth,
          scrollWidth,
          overflows,
          headerVisible,
          clippedControls: controls.filter(c => c.isClipped)
        };
      }, width);

      assert.equal(measurement.overflows, false, `Horizontal overflow detected at ${width}px: scrollWidth=${measurement.scrollWidth} > innerWidth=${measurement.innerWidth}`);
      assert.equal(measurement.clippedControls.length, 0, `Controls clipped at ${width}px: ${JSON.stringify(measurement.clippedControls)}`);
    }
  });
});
