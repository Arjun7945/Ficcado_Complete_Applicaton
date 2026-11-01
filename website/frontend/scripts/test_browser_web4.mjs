import { chromium } from '@playwright/test';
import { execSync } from 'child_process';

function redisCmd(cmd) {
  const fullCmd = `docker exec -i ficcado-redis-session redis-cli --no-auth-warning -a fic_redisSession_aj ${cmd}`;
  return execSync(fullCmd, { encoding: 'utf8' }).trim();
}

async function main() {
  console.log('--- Phase P4W-2 Real Browser Acceptance Test ---');

  const ping = redisCmd('ping');
  console.log('✓ Connected to Session Redis container: ping ->', ping);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const now = Date.now();
  const testEmail = `browser.web4.${now}@example.com`;
  const testPhone = '96' + String(now).slice(-8);
  const testPass = 'Password123!';

  // Step 1: Register through gateway
  console.log('1. Registering test user via API...');
  const regRes = await fetch('http://localhost:8000/api/customer/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Browser Web4 User',
      email: testEmail,
      phone: testPhone,
      password: testPass
    })
  });
  if (!regRes.ok) throw new Error(`Registration failed: ${regRes.status}`);

  // Step 2: Sign In via UI modal
  console.log('2. Logging in on website via AuthModal UI...');
  await page.goto('http://localhost:3000');
  await page.locator('#desktop-header-auth-btn').click();
  await page.waitForSelector('#authModal', { state: 'visible' });

  // Switch to Password tab/mode
  const pwBtn = page.locator('button:has-text("Password")');
  if (await pwBtn.isVisible()) {
    await pwBtn.click();
  }

  // Fill credentials and submit
  await page.locator('#authModal input[type="email"]').fill(testEmail);
  await page.locator('#authModal input[type="password"]').fill(testPass);
  await page.locator('#authModal button[type="submit"]').click();

  // Wait for login success and modal close
  await page.waitForSelector('#authModal', { state: 'hidden', timeout: 10000 });
  console.log('✓ Successfully signed in through AuthModal UI');

  // Navigate to account page
  console.log('3. Navigating to /account...');
  await page.goto('http://localhost:3000/account');
  await page.waitForSelector('#account-page', { timeout: 10000 });
  console.log('✓ Loaded Account page successfully');

  // Step 3: Update Profile in UI
  console.log('4. Updating profile in UI...');
  const profileTab = page.locator('#account-page button:has-text("Profile")');
  await profileTab.click();
  const nameInput = page.locator('#account-page input[type="text"]').first();
  await nameInput.fill('Browser Updated Name');
  const saveBtn = page.locator('#account-page button:has-text("Save Profile Changes")');
  await saveBtn.click();
  await page.waitForSelector('text=Profile updated successfully', { timeout: 8000 });
  console.log('✓ Profile updated successfully in browser');

  // Step 4: Add Address in UI
  console.log('5. Adding address in UI...');
  const addressTab = page.locator('#account-page button:has-text("Addresses")');
  await addressTab.click();
  const addrInput = page.locator('#account-page textarea');
  await addrInput.fill('Flat 402, Luxury Towers, MG Road, Bangalore 560001');
  const submitAddrBtn = page.locator('#account-page button:has-text("Save Address")');
  await submitAddrBtn.click();
  await page.waitForSelector('text=Address saved successfully', { timeout: 8000 });
  console.log('✓ Address added successfully in browser');

  // Step 5: Check Redis TTL (~3600s)
  console.log('6. Inspecting Redis session keys...');
  const cookies = await context.cookies();
  const sessionCookie = cookies.find(c => c.name === 'ficcado_customer_session');
  if (!sessionCookie) throw new Error('No ficcado_customer_session cookie found in browser context');
  const jwtPayload = JSON.parse(Buffer.from(sessionCookie.value.split('.')[1], 'base64').toString('utf8'));
  const userSid = jwtPayload.sid;
  console.log('Browser active session SID:', userSid);
  const sidKey = `session:cust:${userSid}`;

  let ttl = parseInt(redisCmd(`ttl "${sidKey}"`), 10);
  console.log(`Current TTL for ${sidKey}: ${ttl}s`);
  if (ttl < 3550 || ttl > 3600) throw new Error(`Expected TTL ~3600, got ${ttl}`);

  // Step 6: Set TTL to 1800s, trigger user write, confirm TTL refreshed to ~3600s
  console.log('7. Simulating mid-session sliding refresh: expire to 1800s...');
  redisCmd(`expire "${sidKey}" 1800`);
  ttl = parseInt(redisCmd(`ttl "${sidKey}"`), 10);
  console.log(`TTL after manual expire: ${ttl}s`);

  // Perform another profile write in browser
  await profileTab.click();
  await nameInput.fill('Sliding Test Name');
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/customer/profile') && r.request().method() === 'PUT'),
    saveBtn.click()
  ]);
  // Small pause to allow Redis write to finish
  await new Promise(r => setTimeout(r, 1000));

  ttl = parseInt(redisCmd(`ttl "${sidKey}"`), 10);
  console.log(`TTL after user write in browser: ${ttl}s`);
  if (ttl < 3500) throw new Error(`Sliding refresh failed! TTL is ${ttl}`);
  console.log('✓ Sliding refresh verified: write restored TTL to ~3600s');

  // Step 7: Restart session Redis container and confirm session survives
  console.log('8. Restarting session Redis container...');
  execSync('docker compose -f ../../infra/docker-compose.yml restart redis-session', { stdio: 'inherit' });
  await new Promise(r => setTimeout(r, 3000));

  await page.reload();
  await page.waitForSelector('#account-page', { timeout: 10000 });
  console.log('✓ Session survived Redis container restart');

  // Step 8: Multi-tab sync & logout
  console.log('9. Testing multi-tab logout synchronization...');
  const page2 = await context.newPage();
  await page2.goto('http://localhost:3000/account');
  await page2.waitForSelector('#account-page', { timeout: 10000 });

  // Log out in tab 1
  const logoutBtn = page.locator('#account-page button:has-text("Sign Out")').first();
  await logoutBtn.click();

  // Tab 2 should automatically detect logout via BroadcastChannel and show unauthenticated state
  await page2.waitForSelector('button:has-text("Sign In or Register")', { timeout: 8000 });
  console.log('✓ Multi-tab sync verified: Tab 2 automatically logged out when Tab 1 logged out');

  await browser.close();
  console.log('=== REAL BROWSER ACCEPTANCE TESTS: ALL PASSED ===');
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
