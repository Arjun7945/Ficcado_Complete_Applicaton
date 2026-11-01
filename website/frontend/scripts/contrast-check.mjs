// =============================================================================
// Ficcado Clothing — WCAG 2.1 AA Contrast Ratio Verification Script
// Uses Playwright to inspect rendered components and calculate effective
// text-to-background contrast ratios using WCAG relative luminance equations.
//
// Thresholds:
// - Normal text (< 18px or < 14px bold): >= 4.5:1
// - Large/Bold text (>= 18px or >= 14px bold): >= 3.0:1
// - UI Components & Graphical Objects: >= 3.0:1
// =============================================================================

import { chromium } from '@playwright/test';

function srgbChannel(val) {
  const c = val / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r, g, b) {
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

function calculateContrastRatio(fgRgb, bgRgb) {
  const l1 = relativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const l2 = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function auditElement(page, selector, description, expectedThreshold = 4.5) {
  const element = page.locator(selector).first();
  const count = await element.count();
  if (count === 0) {
    throw new Error(`Element not found: ${selector} (${description})`);
  }

  const result = await element.evaluate((el) => {
    function parseColor(str) {
      if (!str || str === 'transparent' || str === 'rgba(0, 0, 0, 0)') {
        return { r: 0, g: 0, b: 0, a: 0 };
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = str;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return {
          r: d[0],
          g: d[1],
          b: d[2],
          a: d[3] / 255,
        };
      } catch {
        return { r: 0, g: 0, b: 0, a: 0 };
      }
    }

    function blendColors(fg, bg) {
      const alpha = fg.a + bg.a * (1 - fg.a);
      if (alpha === 0) return { r: 255, g: 255, b: 255, a: 1 };
      return {
        r: Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / alpha),
        g: Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / alpha),
        b: Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / alpha),
        a: alpha,
      };
    }

    const style = window.getComputedStyle(el);
    const fg = parseColor(style.color);
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = parseInt(style.fontWeight, 10) || 400;

    // Traverse ancestors to find composite background
    let bgLayers = [];
    let cur = el;
    while (cur && cur !== document.documentElement) {
      const curStyle = window.getComputedStyle(cur);
      const bg = parseColor(curStyle.backgroundColor);
      if (bg.a > 0) {
        bgLayers.unshift(bg);
      }
      cur = cur.parentElement;
    }

    // Default document background #F7F9FC
    let finalBg = { r: 247, g: 249, b: 252, a: 1 };
    for (const layer of bgLayers) {
      finalBg = blendColors(layer, finalBg);
    }

    // Blend fg if it has opacity
    const finalFg = fg.a < 1 ? blendColors(fg, finalBg) : fg;

    return {
      fg: finalFg,
      bg: finalBg,
      fontSize,
      fontWeight,
      colorStr: style.color,
      bgStr: style.backgroundColor,
    };
  });

  const ratio = calculateContrastRatio(result.fg, result.bg);
  const isLargeText = result.fontSize >= 18 || (result.fontSize >= 14 && result.fontWeight >= 700);
  const effectiveThreshold = isLargeText ? Math.min(expectedThreshold, 3.0) : expectedThreshold;
  const passed = ratio >= effectiveThreshold;

  return {
    description,
    selector,
    ratio: Math.round(ratio * 100) / 100,
    required: effectiveThreshold,
    passed,
    fontSize: `${result.fontSize}px`,
    fontWeight: result.fontWeight,
    fg: `rgb(${result.fg.r},${result.fg.g},${result.fg.b})`,
    bg: `rgb(${result.bg.r},${result.bg.g},${result.bg.b})`,
  };
}

async function runContrastAudit() {
  console.log('--- Starting Ficcado WCAG 2.1 AA Contrast Verification ---');
  console.log(`Target: ${BASE_URL}\n`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const auditResults = [];

  try {
    // 1. Custom T-Shirt Page (/custom-tshirt)
    console.log('• Testing /custom-tshirt...');
    await page.goto(`${BASE_URL}/custom-tshirt`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#custom-tshirt-coming-soon-badge', { state: 'visible' });

    auditResults.push(
      await auditElement(page, '#custom-tshirt-coming-soon-badge', 'Custom T-Shirt Coming Soon Badge', 4.5),
      await auditElement(page, '#custom-tshirt-title', 'Custom T-Shirt Heading', 3.0),
      await auditElement(page, '#custom-tshirt-explore-btn', 'Custom T-Shirt Primary Explore CTA', 4.5),
      await auditElement(page, '#custom-tshirt-whatsapp-btn', 'Custom T-Shirt Secondary WhatsApp CTA', 4.5),
      await auditElement(page, '#custom-tshirt-step-1-title', 'Custom T-Shirt Step 1 Title', 3.0)
    );

    // 2. Auth Modal (#authModal)
    console.log('• Testing Auth Modal (#authModal)...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const authBtn = page.locator('#desktop-header-auth-btn');
    if (await authBtn.isVisible()) {
      await authBtn.click();
      await page.waitForSelector('#authModal', { state: 'visible' });

      auditResults.push(
        await auditElement(page, '#auth-heading', 'Auth Modal Heading', 3.0),
        await auditElement(page, '#auth-tab-signin', 'Auth Modal Sign In Tab', 4.5),
        await auditElement(page, '#auth-tab-register', 'Auth Modal Register Tab', 4.5),
        await auditElement(page, '#auth-signin-submit', 'Auth Modal Sign In Submit Button', 4.5)
      );

      // Close modal
      const closeBtn = page.locator('#auth-modal-close-btn');
      if (await closeBtn.isVisible()) await closeBtn.click();
    }

    // 3. Desktop Header Navigation & About Dropdown
    console.log('• Testing Desktop Header & About Dropdown...');
    auditResults.push(
      await auditElement(page, '#desktop-header-about-dropdown', 'Desktop Header About Dropdown Trigger', 4.5)
    );
    await page.locator('#desktop-header-about-dropdown').click();
    await page.waitForSelector('#about-dropdown-menu', { state: 'visible' });
    auditResults.push(
      await auditElement(page, '#about-dropdown-menu a[href="/about"]', 'About Dropdown Item "Our Story"', 4.5),
      await auditElement(page, '#about-dropdown-menu a[href="/support"]', 'About Dropdown Item "Support & Reach Out"', 4.5)
    );

    // 4. Wishlist Page (/wishlist)
    console.log('• Testing /wishlist guest state...');
    await page.goto(`${BASE_URL}/wishlist`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#wishlist-guest-title', { state: 'visible' });
    auditResults.push(
      await auditElement(page, '#wishlist-guest-title', 'Wishlist Guest Banner Title', 3.0),
      await auditElement(page, '#wishlist-guest-signin-btn', 'Wishlist Sign In CTA Button', 4.5)
    );

    // 5. Checkout Page (/checkout)
    console.log('• Testing /checkout...');
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#checkout-auth-guard', { state: 'visible' });
    auditResults.push(
      await auditElement(page, '#checkout-auth-guard h1', 'Checkout Auth Guard Title', 3.0),
      await auditElement(page, '#checkout-login-trigger-btn', 'Checkout Login Trigger CTA', 4.5)
    );

    // 6. Support Page (/support)
    console.log('• Testing /support...');
    await page.goto(`${BASE_URL}/support`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#support-submit-btn', { state: 'visible' });
    auditResults.push(
      await auditElement(page, '#support-heading', 'Support Page Heading', 3.0),
      await auditElement(page, '#support-submit-btn', 'Support Submit Ticket CTA', 4.5)
    );
  } finally {
    await browser.close();
  }

  // Summary Table
  console.log('\n--- Contrast Verification Results ---');
  console.log('| Component | Element | Ratio | Min Req | Status |');
  console.log('|---|---|---|---|---|');

  let failedCount = 0;
  for (const r of auditResults) {
    const status = r.passed ? '✓ PASS' : '❌ FAIL';
    if (!r.passed) {
      failedCount++;
      console.log(`| ${r.description} | \`${r.selector}\` | **${r.ratio}:1** | ${r.required}:1 | ${status} | fg: ${r.fg} bg: ${r.bg} (${r.fontSize}, w:${r.fontWeight})`);
    } else {
      console.log(`| ${r.description} | \`${r.selector}\` | **${r.ratio}:1** | ${r.required}:1 | ${status} |`);
    }
  }

  console.log(`\nTotal Elements Tested: ${auditResults.length}`);
  console.log(`Passed: ${auditResults.length - failedCount}`);
  console.log(`Failed: ${failedCount}\n`);

  if (failedCount > 0) {
    console.error(`❌ WCAG AA Contrast Check failed: ${failedCount} element(s) below threshold.`);
    process.exit(1);
  } else {
    console.log('✓ All target elements strictly satisfy WCAG 2.1 AA contrast requirements.');
  }
}

runContrastAudit().catch((err) => {
  console.error('Contrast audit encountered an error:', err);
  process.exit(1);
});
