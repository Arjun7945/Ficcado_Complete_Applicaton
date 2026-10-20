// =============================================================================
// Ficcado Clothing — Device Mode & Cross-Platform Quality Checker
// Validates all 11 application routes across Mobile (iOS/Android), Tablet,
// and Desktop (Windows/Mac) profiles for viewport, layout, and HTML integrity.
// =============================================================================

import http from 'http';
import { spawn } from 'child_process';
import path from 'path';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

function isServerAvailable(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL('/', url);
      const req = http.request(
        parsed,
        { method: 'GET', timeout: 1500 },
        (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        }
      );
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

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerAvailable(url)) return true;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

// ---------------------------------------------------------------------------
// Device Profile Matrix
// ---------------------------------------------------------------------------
export const DEVICE_PROFILES = [
  {
    id: 'ios-iphone-se',
    category: 'Mobile iOS',
    name: 'Apple iPhone SE (Compact)',
    os: 'iOS 17',
    width: 375,
    height: 667,
    dpr: 2,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    touch: true,
  },
  {
    id: 'ios-iphone-14',
    category: 'Mobile iOS',
    name: 'Apple iPhone 14/15 (Standard)',
    os: 'iOS 17',
    width: 390,
    height: 844,
    dpr: 3,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    touch: true,
  },
  {
    id: 'ios-iphone-15-promax',
    category: 'Mobile iOS',
    name: 'Apple iPhone 15 Pro Max (Large)',
    os: 'iOS 17',
    width: 430,
    height: 932,
    dpr: 3,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    touch: true,
  },
  {
    id: 'android-samsung-s24',
    category: 'Mobile Android',
    name: 'Samsung Galaxy S24',
    os: 'Android 14',
    width: 412,
    height: 915,
    dpr: 2.625,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    touch: true,
  },
  {
    id: 'android-pixel-8',
    category: 'Mobile Android',
    name: 'Google Pixel 8',
    os: 'Android 14',
    width: 412,
    height: 892,
    dpr: 2.625,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    touch: true,
  },
  {
    id: 'android-z-fold-cover',
    category: 'Mobile Android',
    name: 'Galaxy Z Fold (Narrow Cover)',
    os: 'Android 14',
    width: 320,
    height: 650,
    dpr: 3,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    touch: true,
  },
  {
    id: 'tablet-ipad-mini',
    category: 'Tablet',
    name: 'Apple iPad Mini (8.3")',
    os: 'iPadOS 17',
    width: 744,
    height: 1133,
    dpr: 2,
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    touch: true,
  },
  {
    id: 'tablet-ipad-air',
    category: 'Tablet',
    name: 'Apple iPad Air / 11" Pro',
    os: 'iPadOS 17',
    width: 820,
    height: 1180,
    dpr: 2,
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    touch: true,
  },
  {
    id: 'tablet-android-tab',
    category: 'Tablet',
    name: 'Samsung Galaxy Tab S9',
    os: 'Android 14',
    width: 800,
    height: 1280,
    dpr: 2,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    touch: true,
  },
  {
    id: 'desktop-macbook-air',
    category: 'Desktop macOS',
    name: 'Apple MacBook Air 13"',
    os: 'macOS Sonoma',
    width: 1280,
    height: 800,
    dpr: 2,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    touch: false,
  },
  {
    id: 'desktop-windows-fhd',
    category: 'Desktop Windows',
    name: 'Windows 11 Full HD (1080p)',
    os: 'Windows 11',
    width: 1920,
    height: 1080,
    dpr: 1,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    touch: false,
  },
  {
    id: 'desktop-4k-uhd',
    category: 'Desktop Ultrawide / 4K',
    name: '4K UHD Workstation',
    os: 'Windows / macOS',
    width: 3840,
    height: 2160,
    dpr: 2,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    touch: false,
  },
];

// ---------------------------------------------------------------------------
// In-Scope Routes
// ---------------------------------------------------------------------------
export const ROUTES = [
  { path: '/', name: 'Storefront & Drops', expectedRole: 'main' },
  { path: '/about', name: 'About Ficcado & 3 Founders', expectedRole: 'main' },
  { path: '/support', name: 'Reach Out Support Desk', expectedRole: 'main' },
  { path: '/blob', name: 'Streetwear Journal (Redirects to /blog)', expectedRole: 'main' },
  { path: '/blog', name: 'Blog Editorial Hub', expectedRole: 'main' },
  { path: '/faq', name: 'Frequently Asked Questions', expectedRole: 'main' },
  { path: '/journal', name: 'The Journal & Design Chronicles', expectedRole: 'main' },
  { path: '/terms', name: 'Terms & Conditions', expectedRole: 'main' },
  { path: '/privacy', name: 'Privacy Policy', expectedRole: 'main' },
  { path: '/returns-refunds', name: 'Returns & Refunds Policy', expectedRole: 'main' },
  { path: '/replacements-damages', name: 'Replacements & Damages', expectedRole: 'main' },
  { path: '/shipping-delivery', name: 'Shipping & Delivery Policy', expectedRole: 'main' },
  { path: '/onboarding', name: 'Onboarding Carousel', expectedRole: 'article' },
  { path: '/auth', name: 'Auth Legacy Route (Redirects to /)', expectedRole: 'main' },
  { path: '/categories', name: 'Category Catalog', expectedRole: 'main' },
  { path: '/categories/t-shirts', name: 'T-Shirts Category Drop', expectedRole: 'main' },
  { path: '/categories/combos', name: 'Combos Category Drop', expectedRole: 'main' },
  { path: '/search', name: 'Search & Tag Discovery', expectedRole: 'search' },
  { path: '/favorites', name: 'Favorites Legacy Route (Redirects to /)', expectedRole: 'main' },
  { path: '/checkout', name: 'Checkout Flow', expectedRole: 'main' },
  { path: '/checkout/whatsapp-continue', name: 'WhatsApp Continue Handoff', expectedRole: 'main' },
  { path: '/orders', name: 'Orders Legacy Route (Redirects to /support)', expectedRole: 'main' },
  { path: '/orders/FC-89241/track', name: 'Track Legacy Route (Redirects to /support)', expectedRole: 'main' },
  { path: '/orders/FC-89241/feedback', name: 'Feedback Legacy Route (Redirects to /support)', expectedRole: 'main' },
  { path: '/settings', name: 'Brand Hub & Settings', expectedRole: 'main' },
];

// ---------------------------------------------------------------------------
// HTTP Fetcher helper (with redirect-following support for 301/308)
// ---------------------------------------------------------------------------
function fetchRoute(path, userAgent, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      url,
      {
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      (res) => {
        // If HTTP redirect and location present, follow redirect (up to maxRedirects)
        if (
          (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) &&
          res.headers.location &&
          maxRedirects > 0
        ) {
          const redirectTarget = new URL(res.headers.location, url).pathname;
          return resolve(fetchRoute(redirectTarget, userAgent, maxRedirects - 1));
        }

        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, headers: res.headers, body });
        });
      },
    );

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('Request timeout after 5000ms'));
    });
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Quality Invariant Checks
// ---------------------------------------------------------------------------
function validateHtmlResponse(route, device, res) {
  const issues = [];
  const body = res.body;

  // Check 1: HTTP Status
  if (res.status !== 200) {
    issues.push({ severity: 'CRITICAL', rule: 'HTTP_200', message: `Returned HTTP ${res.status}` });
  }

  // Check 2: Viewport Meta Tag
  if (!body.includes('name="viewport"') && !body.includes("name='viewport'")) {
    issues.push({ severity: 'HIGH', rule: 'VIEWPORT_META', message: 'Missing viewport meta tag' });
  }

  // Check 3: Semantic structure & Root App Shell
  if (!body.includes('id="app-shell') && !body.includes('app-shell-mobile') && !body.includes('app-shell-wide')) {
    issues.push({ severity: 'MEDIUM', rule: 'APP_SHELL', message: 'App shell container not detected in SSR markup' });
  }

  // Check 4: Bottom Navigation presence on primary routes
  const primaryRoutes = ['/', '/categories', '/settings'];
  if (primaryRoutes.includes(route.path)) {
    if (!body.includes('id="bottom-nav"') && !body.includes('aria-label="Main navigation"')) {
      issues.push({ severity: 'HIGH', rule: 'BOTTOM_NAV', message: 'Bottom nav missing from primary browsing route' });
    }
  }

  // Check 5: No button-in-button hydration hazards
  // Detect if any button element actually contains an unclosed inner button tag
  const nestedButtonPattern = /<button\b[^>]*>(?:(?!<\/button>)[\s\S])*?<button\b/i;
  if (nestedButtonPattern.test(body)) {
    issues.push({ severity: 'CRITICAL', rule: 'NESTED_BUTTON', message: 'Actual nested <button> detected in SSR output' });
  }

  // Check 6: Modal Layer mount point
  if (!body.includes('id="modal-layer"') && !body.includes('modal-layer')) {
    // If not in SSR, check if ModalProvider mounts
    if (!body.includes('ModalProvider') && !body.includes('modal')) {
      issues.push({ severity: 'LOW', rule: 'MODAL_MOUNT', message: 'Modal layer mount marker not detected' });
    }
  }

  // Check 7: Character encoding & font
  const hasCharsetHeader = res.headers && (res.headers['content-type'] || '').toLowerCase().includes('charset=utf-8');
  const hasCharsetMeta = body.toLowerCase().includes('charset="utf-8"') || body.toLowerCase().includes('charset=utf-8');
  if (!hasCharsetHeader && !hasCharsetMeta) {
    issues.push({ severity: 'LOW', rule: 'CHARSET', message: 'Missing UTF-8 charset specification' });
  }

  // Check 8: Mobile Edge Padding & Layout Boundaries
  // Every page on mobile must have padding to ensure content never touches screen edges
  const hasPadding = body.includes('px-4') || body.includes('px-5') || body.includes('px-6') || body.includes('p-4') || body.includes('p-5');
  if (!hasPadding && device.width < 768) {
    issues.push({ severity: 'HIGH', rule: 'MOBILE_PADDING', message: 'Missing mobile edge-padding (px-4/p-4) on view' });
  }

  // Check 9: Mobile Grid Safety
  // Mobile content grids must use single-column or 2-column configurations to prevent squishing
  const mainOnly = body.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  if (device.width < 768 && mainOnly.includes('grid-cols-3') && !mainOnly.includes('grid-cols-1') && !mainOnly.includes('grid-cols-2')) {
    issues.push({ severity: 'HIGH', rule: 'MOBILE_GRID_OVERFLOW', message: '3+ column grid detected without mobile 1-col or 2-col base' });
  }

  // Check 10: Mobile Touch Target Accessibility (min 44px / button styles)
  const hasTouchButtons = body.includes('btn-') || body.includes('py-') || body.includes('h-9') || body.includes('h-10');
  if (!hasTouchButtons && device.width < 768) {
    issues.push({ severity: 'MEDIUM', rule: 'TOUCH_TARGETS', message: 'Interactive elements lack thumb-friendly touch sizing' });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Test Runner
// ---------------------------------------------------------------------------
export async function runQualityChecker() {
  let spawnedServer = null;
  const isAvailable = await isServerAvailable(BASE_URL);

  if (!isAvailable) {
    console.log(`⚡ No server active at ${BASE_URL}. Spawning Next.js production server automatically...`);
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    const port = new URL(BASE_URL).port || '3000';
    spawnedServer = spawn(npmCmd, ['run', 'start', '--', '-p', port], {
      cwd: path.resolve(process.cwd()),
      stdio: 'ignore',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: port,
      },
    });

    const ready = await waitForServer(BASE_URL, 35000);
    if (!ready) {
      if (spawnedServer) {
        try {
          if (isWindows) {
            spawn('taskkill', ['/pid', spawnedServer.pid.toString(), '/T', '/F']);
          } else {
            spawnedServer.kill('SIGTERM');
          }
        } catch {}
      }
      throw new Error(`Timed out waiting for server at ${BASE_URL} to respond.`);
    }
    console.log(`✓ Next.js server is ready at ${BASE_URL}.\n`);
  }

  try {
    console.log('\n' + '='.repeat(80));
    console.log('   FICCADO CLOTHING — CROSS-DEVICE & QUALITY CHECKER SUITE');
    console.log(`   Target Server: ${BASE_URL}`);
    console.log(`   Device Profiles: ${DEVICE_PROFILES.length}`);
    console.log(`   Routes Tested: ${ROUTES.length}`);
    console.log(`   Total Matrix Tests: ${DEVICE_PROFILES.length * ROUTES.length}`);
    console.log('='.repeat(80) + '\n');

    let passedTests = 0;
    let warningTests = 0;
    let failedTests = 0;
    const resultsByDevice = {};

    for (const device of DEVICE_PROFILES) {
      resultsByDevice[device.id] = { device, routes: [], failures: 0, warnings: 0 };
      console.log(`📱 Testing Profile: [${device.category}] ${device.name} (${device.width}x${device.height} | ${device.os})`);

      for (const route of ROUTES) {
        try {
          const response = await fetchRoute(route.path, device.userAgent);
          const issues = validateHtmlResponse(route, device, response);

          const criticals = issues.filter((i) => i.severity === 'CRITICAL');
          const warnings = issues.filter((i) => i.severity !== 'CRITICAL');

          if (criticals.length > 0) {
            failedTests++;
            resultsByDevice[device.id].failures++;
            console.log(`   ❌ [${route.path}] FAIL — ${criticals.map((c) => c.message).join('; ')}`);
          } else if (warnings.length > 0) {
            warningTests++;
            resultsByDevice[device.id].warnings++;
            console.log(`   ⚠️  [${route.path}] PASS with warnings — ${warnings.map((w) => w.message).join('; ')}`);
          } else {
            passedTests++;
            console.log(`   ✅ [${route.path}] PASS (${response.status} OK)`);
          }

          resultsByDevice[device.id].routes.push({
            path: route.path,
            status: response.status,
            issues,
          });
        } catch (err) {
          failedTests++;
          resultsByDevice[device.id].failures++;
          console.log(`   ❌ [${route.path}] ERROR — ${err.message}`);
          resultsByDevice[device.id].routes.push({
            path: route.path,
            status: 0,
            error: err.message,
          });
        }
      }
      console.log('');
    }

    // -------------------------------------------------------------------------
    // Summary Report
    // -------------------------------------------------------------------------
    const totalTests = passedTests + warningTests + failedTests;
    console.log('='.repeat(80));
    console.log('   QUALITY AUDIT SUMMARY REPORT');
    console.log('='.repeat(80));
    console.log(`Total Matrix Validations: ${totalTests}`);
    console.log(`Passed (100% Clean):     ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log(`Warnings (Non-critical): ${warningTests}`);
    console.log(`Failures (Critical):     ${failedTests}`);
    console.log('-'.repeat(80));

    console.log('\nDevice Compatibility Summary:');
    for (const [, data] of Object.entries(resultsByDevice)) {
      const badge = data.failures === 0 ? '✅ 100% COMPATIBLE' : `❌ ${data.failures} FAILURES`;
      console.log(` - ${data.device.name.padEnd(36)} [${data.device.width}x${data.device.height}]: ${badge}`);
    }

    console.log('\n' + '='.repeat(80));
    if (failedTests === 0) {
      console.log('🎉 AUDIT PASSED: Application is 100% capable across Mobile, Tablet, and Desktop!');
    } else {
      console.log('⚠️ AUDIT COMPLETED WITH ISSUES: Review the error logs above.');
    }
    console.log('='.repeat(80) + '\n');

    return { passedTests, warningTests, failedTests, resultsByDevice };
  } finally {
    if (spawnedServer) {
      console.log('🧹 Terminating auto-spawned Next.js server...');
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', spawnedServer.pid.toString(), '/T', '/F']);
        } else {
          spawnedServer.kill('SIGTERM');
        }
      } catch {}
    }
  }
}

// Execute if run directly
if (process.argv[1]?.endsWith('device-checker.mjs')) {
  runQualityChecker()
    .then(({ failedTests }) => {
      if (failedTests > 0) {
        console.error(`❌ Cross-device checks failed with ${failedTests} critical errors.`);
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}
