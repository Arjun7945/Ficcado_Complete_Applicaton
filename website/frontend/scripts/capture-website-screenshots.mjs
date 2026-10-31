import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '../..');
const outDir = path.join(repoRoot, 'docs/part2-screenshots/website');

fs.mkdirSync(outDir, { recursive: true });

function isServerAvailable(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL('/', url);
      const req = http.request(parsed, { method: 'GET', timeout: 1500 }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

async function waitForServer(url, timeoutMs = 35000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerAvailable(url)) return true;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function run() {
  const PORT = 3000;
  const BASE_URL = `http://localhost:${PORT}`;
  let spawnedServer = null;

  const available = await isServerAvailable(BASE_URL);
  if (!available) {
    console.log(`Starting Next.js production server on ${BASE_URL}...`);
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    spawnedServer = spawn(npmCmd, ['run', 'start', '--', '-p', PORT.toString()], {
      cwd: frontendRoot,
      stdio: 'ignore',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: PORT.toString(),
      },
    });

    const ready = await waitForServer(BASE_URL, 35000);
    if (!ready) {
      if (spawnedServer) {
        if (isWindows) {
          spawn('taskkill', ['/pid', spawnedServer.pid.toString(), '/T', '/F']);
        } else {
          spawnedServer.kill('SIGTERM');
        }
      }
      throw new Error(`Timed out waiting for server at ${BASE_URL}`);
    }
  }

  console.log(`Server ready at ${BASE_URL}. Launching Playwright...`);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    // 1. Custom T-Shirt Desktop (1440x900)
    console.log('Capturing custom-tshirt-desktop.png (1440x900)...');
    const pageDesktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageDesktop.goto(`${BASE_URL}/custom-tshirt`, { waitUntil: 'networkidle' });
    await pageDesktop.waitForTimeout(1000);
    await pageDesktop.screenshot({ path: path.join(outDir, 'custom-tshirt-desktop.png') });
    await pageDesktop.close();

    // 2. Custom T-Shirt Mobile (390x844)
    console.log('Capturing custom-tshirt-mobile.png (390x844)...');
    const pageMobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    });
    await pageMobile.goto(`${BASE_URL}/custom-tshirt`, { waitUntil: 'networkidle' });
    await pageMobile.waitForTimeout(1000);
    await pageMobile.screenshot({ path: path.join(outDir, 'custom-tshirt-mobile.png') });
    await pageMobile.close();

    // 3. Wishlist Page (1440x900)
    console.log('Capturing wishlist-page.png (1440x900)...');
    const pageWishlist = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageWishlist.goto(`${BASE_URL}/wishlist`, { waitUntil: 'networkidle' });
    await pageWishlist.waitForTimeout(1000);
    await pageWishlist.screenshot({ path: path.join(outDir, 'wishlist-page.png') });
    await pageWishlist.close();

    // 4. Wishlist Guest Modal (1440x900)
    console.log('Capturing wishlist-guest-modal.png (1440x900)...');
    const pageModal = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageModal.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    // Click any wishlist heart button to trigger guest modal
    const heartBtn = await pageModal.$('button[aria-label*="wishlist" i], button[id*="wishlist" i], button[data-testid*="wishlist" i]');
    if (heartBtn) {
      await heartBtn.click();
      await pageModal.waitForTimeout(600);
    }
    await pageModal.screenshot({ path: path.join(outDir, 'wishlist-guest-modal.png') });
    await pageModal.close();

    // 5. Checkout Addresses (1440x900)
    console.log('Capturing checkout-addresses.png (1440x900)...');
    const pageCheckout = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    // Mock customer session & customer me & addresses & bag
    await pageCheckout.route('**/api/customer/session', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ active: true }) });
    });
    await pageCheckout.route('**/api/customer/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 101,
          name: 'Arjun P. Sharma',
          email: 'arjun@ficcado.com',
          phone: '+91 98765 43210',
          addresses: [
            {
              id: 1,
              fullName: 'Arjun P. Sharma',
              phone: '+91 98765 43210',
              addressLine1: 'Villa 42, Palm Meadows, Whitefield',
              addressLine2: 'Near Prestige Ozone',
              city: 'Bengaluru',
              state: 'Karnataka',
              pincode: '560066',
              isDefault: true,
            },
          ],
        }),
      });
    });
    await pageCheckout.route('**/api/customer/addresses', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              fullName: 'Arjun P. Sharma',
              phone: '+91 98765 43210',
              addressLine1: 'Villa 42, Palm Meadows, Whitefield',
              addressLine2: 'Near Prestige Ozone',
              city: 'Bengaluru',
              state: 'Karnataka',
              pincode: '560066',
              isDefault: true,
            },
          ],
        }),
      });
    });
    await pageCheckout.route('**/api/delivery-options', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'del-standard', name: 'Standard Surface Express', charge: 0, delivery_time: '3–5 Business Days' },
            { id: 'del-express', name: 'Priority Air Courier', charge: 99, delivery_time: '1–2 Business Days' },
          ],
        }),
      });
    });
    // Add cart item before loading checkout
    await pageCheckout.addInitScript(() => {
      localStorage.setItem(
        'ficcado-bag',
        JSON.stringify([
          {
            id: 'fic-heavyweight-tee',
            name: 'Ficcado Luxury 240 GSM Unisex Tee',
            price: 1499,
            qty: 1,
            size: 'L',
            color: '#1A1A1A',
            colorName: 'Pitch Black',
            image: '/images/hero/front.png',
          },
        ])
      );
    });
    await pageCheckout.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle' });
    await pageCheckout.waitForTimeout(1500);
    await pageCheckout.screenshot({ path: path.join(outDir, 'checkout-addresses.png') });
    await pageCheckout.close();

    // 6. Order Confirmation (1440x900)
    console.log('Capturing order-confirmation.png (1440x900)...');
    const pageConfirm = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageConfirm.addInitScript(() => {
      sessionStorage.setItem(
        'ficcado-last-confirmed-order',
        JSON.stringify({
          invoiceNumber: 'FIC-INV-2026-0042',
          transactionId: 'TXN-RAZORPAY-P2-8842',
          total: 1499,
          subtotal: 1499,
          deliveryCharge: 0,
          customerName: 'Arjun P. Sharma',
          customerEmail: 'arjun@ficcado.com',
          customerPhone: '+91 98765 43210',
          shippingAddress: 'Villa 42, Palm Meadows, Whitefield, Bengaluru, Karnataka - 560066',
        })
      );
    });
    await pageConfirm.goto(`${BASE_URL}/checkout/confirmation`, { waitUntil: 'networkidle' });
    await pageConfirm.waitForTimeout(1000);
    await pageConfirm.screenshot({ path: path.join(outDir, 'order-confirmation.png') });
    await pageConfirm.close();

    console.log('All 6 website screenshots captured successfully!');
  } finally {
    await browser.close();
    if (spawnedServer) {
      console.log('Stopping Next.js production server...');
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', spawnedServer.pid.toString(), '/T', '/F']);
      } else {
        spawnedServer.kill('SIGTERM');
      }
    }
  }
}

run().catch((err) => {
  console.error('Fatal screenshot error:', err);
  process.exit(1);
});
