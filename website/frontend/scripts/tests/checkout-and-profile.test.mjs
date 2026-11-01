// website/frontend/scripts/tests/checkout-and-profile.test.mjs
import { chromium } from '@playwright/test';

async function run() {
  console.log('=== Testing Checkout & Account Profile Live End-to-End ===');

  const GATEWAY = 'http://localhost:8000';
  const testEmail = `test_shopper_${Date.now()}@ficcado.com`;
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'Password123!';

  console.log(`1. Registering customer: ${testEmail}, phone: ${testPhone}`);
  const regRes = await fetch(`${GATEWAY}/api/customer/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      phone: testPhone,
      password: testPassword,
      name: 'Arjun Test',
      address: 'Old Default Address, Palakkad, Kerala - 678612'
    })
  });

  if (!regRes.ok) {
    throw new Error(`Registration failed: ${regRes.status} ${await regRes.text()}`);
  }

  const regCookies = regRes.headers.get('set-cookie');
  console.log('Registered successfully! Cookie header:', regCookies ? 'Present' : 'None');

  const sessionMatch = regCookies?.match(/ficcado_customer_session=([^;]+)/);
  if (!sessionMatch) {
    throw new Error('No ficcado_customer_session cookie received!');
  }
  const sessionToken = sessionMatch[1];

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();

  // Inject session cookie into browser context for localhost (both port 3000 and gateway 8000)
  await context.addCookies([
    {
      name: 'ficcado_customer_session',
      value: sessionToken,
      domain: 'localhost',
      path: '/'
    }
  ]);

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Failed') || msg.text().includes('error')) {
      console.log(`[BROWSER ${msg.type()}]:`, msg.text());
    }
  });

  // Step 2: Test Account Page Profile Update and Address Management
  console.log('\n2. Testing /account page...');
  await page.goto('http://localhost:3000/account');
  await page.waitForLoadState('networkidle');

  const pageText = await page.textContent('body');
  if (pageText.includes('Sign In or Register')) {
    console.log('Not recognized as logged in on account page, reloading...');
    await page.reload();
    await page.waitForLoadState('networkidle');
  }

  console.log('Checking Account page user info...');
  const bodyAfterLoad = await page.textContent('body');
  console.log(`Contains test email? ${bodyAfterLoad.includes(testEmail)}`);

  // Test Adding Address in Account Page
  console.log('Testing adding address in Account page...');
  const addressInput = page.locator('textarea[placeholder*="address" i], input[placeholder*="address" i]');
  if (await addressInput.isVisible()) {
    await addressInput.fill('Second Account Address, Palakkad, Kerala - 678612');
    const saveAddrBtn = page.locator('button:has-text("Save Address"), button:has-text("Add Address")');
    await saveAddrBtn.click();
    await page.waitForTimeout(2000);
    const textAfterAdd = await page.textContent('body');
    const hasNewAddress = textAfterAdd.includes('Second Account Address');
    console.log(`Account page address added successfully? ${hasNewAddress ? 'YES' : 'NO'}`);
  }

  // Test Profile Update (Name / Phone)
  console.log('Testing updating profile name in Account page...');
  const nameInput = page.locator('input[value*="Arjun" i], input#name, input[name="name"]');
  if (await nameInput.isVisible()) {
    await nameInput.fill('Arjun PS Updated');
    const saveProfileBtn = page.locator('button:has-text("Save Changes"), button:has-text("Update Profile")');
    if (await saveProfileBtn.isVisible()) {
      await saveProfileBtn.click();
      await page.waitForTimeout(2000);
      const textAfterProfile = await page.textContent('body');
      const hasUpdatedName = textAfterProfile.includes('Arjun PS Updated');
      console.log(`Account page profile updated successfully? ${hasUpdatedName ? 'YES' : 'NO'}`);
    }
  }

  // Step 3: Test Checkout Page Address Saving & Order Placement
  console.log('\n3. Testing /checkout page...');
  // First add an item to cart in localStorage
  await page.evaluate(() => {
    const testCartItem = {
      id: 1,
      slug: 'eternity-black',
      name: 'ETERNITY-BLACK',
      price: 500,
      qty: 1,
      size: 'M',
      color: '#000000',
      flatImg: '/images/products/eternity-black.jpg'
    };
    localStorage.setItem('ficcado-bag-v3', JSON.stringify([testCartItem]));
  });

  await page.goto('http://localhost:3000/checkout');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Check if form is visible or address list is visible
  const addNewBtn = page.locator('#checkout-toggle-add-address-btn');
  if (await addNewBtn.isVisible()) {
    console.log('Clicking #checkout-toggle-add-address-btn...');
    await addNewBtn.click();
    await page.waitForTimeout(500);
  }

  console.log('Filling new address in Checkout...');
  await page.locator('#new-address-street').fill('THENUR POST, PALAKKAD, KERALA');
  await page.locator('#new-address-city').fill('PALAKKAD');
  await page.locator('#new-address-pincode').fill('678612');

  const saveAndUseBtn = page.locator('#save-new-address-btn');
  console.log(`Save & Use Address button visible? ${await saveAndUseBtn.isVisible()}`);
  await saveAndUseBtn.click();
  await page.waitForTimeout(2500);

  // Check for toast error
  const toasts = await page.locator('[role="alert"], .toast, .bg-red-500, .text-red-600').allTextContents();
  console.log('Any toast messages displayed:', toasts);

  // Check if address was selected
  const checkoutBody = await page.textContent('body');
  const hasThenur = checkoutBody.includes('THENUR POST');
  console.log(`Did THENUR address appear on checkout? ${hasThenur ? 'YES' : 'NO'}`);

  // Check if Razorpay / Order button is enabled
  const payBtn = page.locator('button:has-text("Pay Online"), button:has-text("Place Order")');
  const isPayDisabled = await payBtn.isDisabled();
  console.log(`Payment button enabled? ${!isPayDisabled ? 'YES' : 'NO'}`);

  await browser.close();
  console.log('\nCheckout & Profile test complete!');
}

run().catch(console.error);
