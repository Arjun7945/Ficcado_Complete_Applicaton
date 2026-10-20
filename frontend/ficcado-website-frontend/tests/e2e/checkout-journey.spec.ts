// =============================================================================
// E2E Customer Checkout Journey — tests/e2e/checkout-journey.spec.ts
// Tests storefront navigation, bag addition, and checkout order submission
// against an isolated fake Sheets mock (zero requests touch real production sheets).
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('Customer Checkout & Order Flow with Fake Sheets Client', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock GET /api/delivery-options to avoid hitting real Google Sheets
    await page.route('**/api/delivery-options', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'del-standard',
              name: 'Express Surface Logistics',
              charge: 0,
              delivery_time: '3–5 Business Days',
            },
          ],
        }),
      });
    });

    // 2. Mock POST /api/orders with fake gateway response
    await page.route('**/api/orders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            referenceId: 'FIC-A0042',
            whatsappUrl: 'https://wa.me/916282000729?text=Order%20FIC-A0042',
            subtotal: 799,
            deliveryCharge: 0,
            total: 799,
            isOffline: false,
            isDuplicate: false,
          },
        }),
      });
    });
  });

  test('successfully submits order and stores summary in sessionStorage', async ({ page }) => {
    // Populate shopping bag via localStorage before navigating
    await page.addInitScript(() => {
      localStorage.setItem(
        'ficcado-bag',
        JSON.stringify([
          {
            id: 'citrus-oversized-tee',
            name: 'Citrus Minimal Oversized Tee',
            price: 799,
            size: 'L',
            color: 'Citrus Orange',
            qty: 1,
            image: '/images/hero/ficcado-banner.jpg',
            slug: 'citrus-oversized-tee',
          },
        ])
      );
    });

    await page.goto('/checkout');

    // Fill delivery form
    await page.fill('#checkout-name', 'Test Customer');
    await page.fill('input[placeholder="10-digit mobile number"]', '9876543210');
    await page.fill('input[placeholder="Active email for tracking updates"]', 'customer@example.com');
    await page.fill('input[placeholder="House / Flat No., Apartment, Street"]', '123 Baker Street');
    await page.fill('input[placeholder="City"]', 'Bengaluru');
    await page.selectOption('select', 'Karnataka');
    await page.fill('input[placeholder="6-digit PIN code"]', '560001');

    // Select courier
    const courierRadio = page.locator('input[type="radio"]').first();
    await courierRadio.check();

    // Verify Place Order CTA is enabled
    const placeOrderBtn = page.locator('#place-order-whatsapp-btn');
    await expect(placeOrderBtn).toBeEnabled();

    // Click Place Order
    await placeOrderBtn.click();

    // Verify sessionStorage receives order details
    const orderInStorage = await page.evaluate(() => {
      return sessionStorage.getItem('ficcado-last-order');
    });

    expect(orderInStorage).toBeTruthy();
    expect(orderInStorage).toContain('FIC-A0042');
  });
});
