import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { chromium } from '../../../website/frontend/node_modules/playwright/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const crmRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(crmRoot, '../..');
const outDir = path.join(repoRoot, 'docs/part2-screenshots/crm');

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

const sampleItems = [
  {
    rowIndex: 0,
    sno: '1',
    id: 1,
    itemName: 'CLASSIC OVERSIZED TEE',
    itemType: 'T-Shirt',
    price: '999.00',
    costPrice: '450.00',
    sizes: 'M, L, XL',
    status: 'In Stock',
    currentStatus: 'ACTIVE',
    description: 'A premium heavyweight 240 GSM cotton streetwear tee.',
    colors: ['#000000', '#FFFFFF', '#2B62C6'],
    tags: ['streetwear', 'cotton', '240gsm', 'oversized'],
    version: 3,
    images: [],
    reviewCount: 5,
    averageRating: 4.8,
  },
];

const sampleSales = [
  {
    rowIndex: 0,
    invoiceNumber: 'FIC-INV-2026-0042',
    saleStatus: 'COMPLETED',
    customerName: 'Arjun P. Sharma',
    customerPhone: '+91 98765 43210',
    customerAddress: 'Villa 42, Palm Meadows, Whitefield, Bengaluru',
    totalItems: '1',
    itemNames: 'Ficcado Luxury 240 GSM Unisex Tee',
    sizes: 'L',
    totalAmount: '1499.00',
    paymentStatus: 'PAID',
    modeOfPayment: 'RAZORPAY',
    transactionId: 'pay_P2Test99149',
    createdAt: '2026-10-31T20:15:00Z',
    createdBy: 'WEBSITE',
    updatedAt: '2026-10-31T20:15:00Z',
    saleClosedBy: 'AUTOMATED_GATEWAY',
    discount: 0,
    customerEmail: 'arjun@ficcado.com',
    remarks: 'WEBSITE SALE',
  },
];

async function run() {
  const PORT = 3001;
  const BASE_URL = `http://localhost:${PORT}`;
  let spawnedServer = null;

  const available = await isServerAvailable(BASE_URL);
  if (!available) {
    console.log(`Starting CRM production server on ${BASE_URL}...`);
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    spawnedServer = spawn(npmCmd, ['run', 'start', '--', '-p', PORT.toString()], {
      cwd: crmRoot,
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
      throw new Error(`Timed out waiting for CRM server at ${BASE_URL}`);
    }
  }

  console.log(`CRM server ready at ${BASE_URL}. Launching Playwright...`);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Add auth cookie
  const validToken = 'mock-valid-jwt-token';
  await context.addCookies([
    {
      name: 'ficcado_session',
      value: validToken,
      url: BASE_URL,
    },
  ]);

  await context.route('**/api/auth/me**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        admin: {
          id: '1',
          name: 'Operations Lead',
          email: 'admin@ficcado.com',
          role: 'superadmin',
        },
      }),
    });
  });

  try {
    // 1. Items Edit Modal with Colors and Tags
    console.log('Capturing item-colors-tags-modal.png...');
    const pageItems = await context.newPage();
    await pageItems.route('**/api/items**', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: sampleItems }),
        });
      } else if (method === 'PUT' || method === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'CONFLICT',
            message: 'Item was modified by another administrator (version conflict). Please reload to see latest data.',
          }),
        });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      }
    });
    await pageItems.route('**/api/items/images**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await pageItems.goto(`${BASE_URL}/dashboard/items`, { waitUntil: 'networkidle' });
    await pageItems.waitForSelector('.desktop-only table.data-table', { timeout: 10000 });

    // Click Edit button in desktop view
    const editBtn = pageItems.locator('.desktop-only button:has-text("Edit / Images")').first();
    await editBtn.click();
    await pageItems.waitForSelector('text=Edit: CLASSIC OVERSIZED TEE', { timeout: 10000 });
    await pageItems.waitForTimeout(600);
    await pageItems.screenshot({ path: path.join(outDir, 'item-colors-tags-modal.png') });

    // 2. 409 Conflict Banner
    console.log('Capturing item-409-conflict-banner.png...');
    const saveBtn = pageItems.locator('button:has-text("Save Changes")');
    await saveBtn.click();
    await pageItems.waitForSelector('[data-testid="item-conflict-banner"]', { timeout: 10000 });
    await pageItems.waitForTimeout(500);
    await pageItems.screenshot({ path: path.join(outDir, 'item-409-conflict-banner.png') });
    await pageItems.close();

    // 3. Sales Remarks Source Mark (WEBSITE SALE)
    console.log('Capturing sales-remarks-source-mark.png...');
    const pageSales = await context.newPage();
    await pageSales.route('**/api/sales**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sales: sampleSales }),
      });
    });

    await pageSales.goto(`${BASE_URL}/dashboard/sales`, { waitUntil: 'networkidle' });
    await pageSales.waitForSelector('.desktop-only table.data-table', { timeout: 10000 });
    await pageSales.locator('.desktop-only :text("WEBSITE SALE")').first().waitFor({ state: 'visible', timeout: 10000 });
    await pageSales.waitForTimeout(600);
    await pageSales.screenshot({ path: path.join(outDir, 'sales-remarks-source-mark.png') });
    await pageSales.close();

    console.log('All 3 CRM screenshots captured successfully!');
  } finally {
    await browser.close();
    if (spawnedServer) {
      console.log('Stopping CRM server...');
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', spawnedServer.pid.toString(), '/T', '/F']);
      } else {
        spawnedServer.kill('SIGTERM');
      }
    }
  }
}

run().catch((err) => {
  console.error('Fatal CRM screenshot error:', err);
  process.exit(1);
});
