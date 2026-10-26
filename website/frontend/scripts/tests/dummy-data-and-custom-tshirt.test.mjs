// =============================================================================
// Phase P2-3 Test Suite — Dummy Data Removal & Custom T-Shirt Notice Page
// Verifies 3A (Dummy data removal, empty/error state separation, repository check)
// and 3B (Custom T-Shirt notice page, link presence, zero form/upload elements).
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase P2-3: Dummy Data Removal (3A)', () => {
  const rootDir = process.cwd();

  test('3A.1: verifies products-snapshot.json does not exist in src/generated', () => {
    const snapshotPath = path.join(rootDir, 'src', 'generated', 'products-snapshot.json');
    assert.strictEqual(
      fs.existsSync(snapshotPath),
      false,
      'products-snapshot.json dummy data file must be completely deleted'
    );
  });

  test('3A.2: verifies products.ts does not reference snapshot file or fallback dummy products', () => {
    const productsApiFile = path.join(rootDir, 'src', 'lib', 'api', 'products.ts');
    assert.ok(fs.existsSync(productsApiFile));
    const content = fs.readFileSync(productsApiFile, 'utf8');

    assert.strictEqual(
      content.includes('products-snapshot.json'),
      false,
      'src/lib/api/products.ts must not contain products-snapshot.json'
    );
    assert.strictEqual(
      content.includes('loadFallbackProducts'),
      false,
      'src/lib/api/products.ts must not contain loadFallbackProducts'
    );
    assert.ok(
      content.includes('getItemsResult'),
      'src/lib/api/products.ts must export getItemsResult for explicit status inspection'
    );
  });

  test('3A.3: repository-level check: no production code in src/ imports from fixtures or sample-data', () => {
    const srcDir = path.join(rootDir, 'src');

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const relPath = path.relative(rootDir, fullPath);

          // Assert no imports from fixtures, sample-data, or mock files in production code
          assert.strictEqual(
            /from\s+['"][^'"]*fixtures?[^'"]*['"]/i.test(content),
            false,
            `Production file ${relPath} must not import from fixtures`
          );
          assert.strictEqual(
            /from\s+['"][^'"]*sample-data[^'"]*['"]/i.test(content),
            false,
            `Production file ${relPath} must not import from sample-data`
          );
          assert.strictEqual(
            /from\s+['"][^'"]*products-snapshot[^'"]*['"]/i.test(content),
            false,
            `Production file ${relPath} must not import products-snapshot`
          );
        }
      }
    }

    scanDir(srcDir);
  });

  test('3A.4: verifies HomeView renders distinct empty state vs error state', () => {
    const homeViewFile = path.join(rootDir, 'src', 'components', 'home', 'HomeView.tsx');
    assert.ok(fs.existsSync(homeViewFile));
    const content = fs.readFileSync(homeViewFile, 'utf8');

    assert.ok(
      content.includes('catalog-error-state'),
      'HomeView must have distinct catalog-error-state element'
    );
    assert.ok(
      content.includes('catalog-empty-state'),
      'HomeView must have distinct catalog-empty-state element'
    );
    assert.ok(
      content.includes('catalog-filter-empty-state'),
      'HomeView must have distinct catalog-filter-empty-state element'
    );
    assert.ok(
      content.includes('Unable to load catalog'),
      'HomeView must show clear error message on backend failure'
    );
    assert.ok(
      content.includes('Catalog currently empty'),
      'HomeView must show clear empty state message when catalog has 0 items'
    );
  });
});

describe('Phase P2-3: Custom T-Shirt Notice Page (3B)', () => {
  const rootDir = process.cwd();

  test('3B.1: /custom-tshirt page exists and contains coming soon notice', () => {
    const pagePath = path.join(rootDir, 'src', 'app', 'custom-tshirt', 'page.tsx');
    assert.ok(fs.existsSync(pagePath), 'Custom T-Shirt page must exist at src/app/custom-tshirt/page.tsx');

    const content = fs.readFileSync(pagePath, 'utf8');
    assert.ok(
      content.includes('Design Your Own T-Shirt'),
      'Page must include heading "Design Your Own T-Shirt"'
    );
    assert.ok(
      content.toLowerCase().includes('coming soon'),
      'Page must state "coming soon"'
    );
    assert.ok(
      content.includes('submit their own design') || content.includes('submit their custom'),
      'Page must state customers will be able to submit their own design'
    );
    assert.ok(
      content.includes('print it and deliver') || content.includes('print it'),
      'Page must state Ficcado team will print it and deliver the T-shirt'
    );
  });

  test('3B.2: /custom-tshirt contains STRICTLY NO forms, file uploads, or pricing', () => {
    const pagePath = path.join(rootDir, 'src', 'app', 'custom-tshirt', 'page.tsx');
    const content = fs.readFileSync(pagePath, 'utf8');

    assert.strictEqual(
      /<form[\s>]/i.test(content),
      false,
      'Custom T-shirt coming soon page must have NO <form> element'
    );
    assert.strictEqual(
      /<input[\s>]/i.test(content),
      false,
      'Custom T-shirt coming soon page must have NO <input> element'
    );
    assert.strictEqual(
      /<textarea[\s>]/i.test(content),
      false,
      'Custom T-shirt coming soon page must have NO <textarea> element'
    );
    assert.strictEqual(
      /<select[\s>]/i.test(content),
      false,
      'Custom T-shirt coming soon page must have NO <select> element'
    );
    assert.strictEqual(
      /type=["']file["']/i.test(content),
      false,
      'Custom T-shirt coming soon page must have NO file upload element'
    );
  });

  test('3B.3: Navigation links to /custom-tshirt are present in Header, Footer, and Drawer', () => {
    const headerPath = path.join(rootDir, 'src', 'components', 'layout', 'DesktopHeader.tsx');
    const footerPath = path.join(rootDir, 'src', 'components', 'layout', 'DesktopFooter.tsx');
    const drawerPath = path.join(rootDir, 'src', 'components', 'modals', 'MobileNavDrawer.tsx');

    const headerContent = fs.readFileSync(headerPath, 'utf8');
    assert.ok(
      headerContent.includes('/custom-tshirt'),
      'DesktopHeader must include link to /custom-tshirt'
    );

    const footerContent = fs.readFileSync(footerPath, 'utf8');
    assert.ok(
      footerContent.includes('/custom-tshirt'),
      'DesktopFooter must include link to /custom-tshirt'
    );

    const drawerContent = fs.readFileSync(drawerPath, 'utf8');
    assert.ok(
      drawerContent.includes('/custom-tshirt'),
      'MobileNavDrawer must include link to /custom-tshirt'
    );
  });

  test('3B.4: /custom-tshirt is registered in device-checker.mjs', () => {
    const checkerPath = path.join(rootDir, 'scripts', 'device-checker.mjs');
    const content = fs.readFileSync(checkerPath, 'utf8');

    assert.ok(
      content.includes('/custom-tshirt'),
      'scripts/device-checker.mjs must contain /custom-tshirt in ROUTES'
    );
  });
});
