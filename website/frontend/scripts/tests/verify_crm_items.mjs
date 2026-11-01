// scratch/verify_crm_items.mjs
import { chromium } from '@playwright/test';

async function run() {
  console.log('=== Verifying CRM Items & Frontend ===');

  // 1. Direct API call to backend /api/items
  console.log('1. Admin login to backend...');
  const loginRes = await fetch('http://localhost:8081/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ficcado.com', password: 'Password123!' })
  });
  console.log(`Login status: ${loginRes.status}`);
  const cookie = loginRes.headers.get('set-cookie');
  console.log(`Admin cookie acquired: ${cookie ? 'YES' : 'NO'}`);

  console.log('2. GET /api/items with admin cookie...');
  const itemsRes = await fetch('http://localhost:8081/api/items', {
    headers: {
      'Cookie': cookie,
      'Accept': 'application/json'
    }
  });
  console.log(`Items status: ${itemsRes.status}`);
  const items = await itemsRes.json();
  console.log(`Items count: ${Array.isArray(items) ? items.length : 'NOT ARRAY'}`);
  if (Array.isArray(items) && items.length > 0) {
    console.log('Sample item 0:', {
      id: items[0].id,
      name: items[0].itemName,
      price: items[0].priceOfItem,
      colors: items[0].colors,
      tags: items[0].tags,
      sizes: items[0].availableSizes
    });
  }

  // 2. Playwright test on http://localhost:3001/dashboard/items
  console.log('\n3. Opening http://localhost:3001 in Playwright...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();

  const page = await context.newPage();
  page.on('console', msg => console.log(`[CRM CONSOLE]:`, msg.text()));

  await page.goto('http://localhost:3001/login');
  await page.waitForLoadState('networkidle');

  // If login page visible, fill it
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  if (await emailInput.isVisible()) {
    console.log('Logging in to CRM UI...');
    await emailInput.fill('admin@ficcado.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);
  }

  console.log('Navigating to http://localhost:3001/dashboard/items ...');
  await page.goto('http://localhost:3001/dashboard/items');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const pageText = await page.textContent('body');
  const hasErrorBanner = pageText.includes('An unexpected error occurred. Reference error ID');
  const hasItems = pageText.includes('0 items') ? 'Zero items' : 'Items loaded';

  console.log(`Error banner present? ${hasErrorBanner ? 'YES (FAIL)' : 'NO (FIXED!)'}`);
  console.log(`Items status on CRM: ${hasItems}`);

  // Count item rows
  const itemRows = await page.locator('table tr, [role="row"], .item-card, tr:has-text("₹")').count();
  console.log(`Rendered item rows/cards count: ${itemRows}`);

  await browser.close();
  console.log('CRM Items test finished!');
}

run().catch(console.error);
