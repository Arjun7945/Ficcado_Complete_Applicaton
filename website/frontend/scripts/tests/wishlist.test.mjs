// =============================================================================
// Phase P2-5 Wishlist Test Suite (Items A-1 & C-1)
// scripts/tests/wishlist.test.mjs
// Verifies:
// 1. Guest prompt modal structure and action buttons (Log In, Sign Up)
// 2. Pending wishlist item storage in sessionStorage with open redirect guards
// 3. Automatic add after customer authentication
// 4. Logged-in add, remove, and get wishlist API client calls
// 5. Customer isolation and database ownership
// 6. Inactive products hidden from wishlist view via batch lookup
// 7. Storefront integration: ProductCard, ProductModal, DesktopHeader, DesktopFooter, MobileNavDrawer
// 8. Dedicated /wishlist page routing and device matrix registration
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase P2-5: Customer Wishlist & Storefront Integration Test Suite', () => {
  const rootDir = process.cwd();

  test('1. Guest prompt modal renders required IDs, accessible roles, and auth triggers', () => {
    const modalFile = path.join(rootDir, 'src', 'components', 'modals', 'GuestWishlistPromptModal.tsx');
    assert.ok(fs.existsSync(modalFile), 'GuestWishlistPromptModal.tsx must exist');
    const content = fs.readFileSync(modalFile, 'utf8');

    assert.ok(content.includes('id="guest-wishlist-modal"'), 'Modal must have id="guest-wishlist-modal"');
    assert.ok(
      content.includes('id="guest-wishlist-login-btn"'),
      'Modal must have id="guest-wishlist-login-btn"'
    );
    assert.ok(
      content.includes('id="guest-wishlist-signup-btn"'),
      'Modal must have id="guest-wishlist-signup-btn"'
    );
    assert.ok(content.includes('role="dialog"'), 'Modal must declare role="dialog"');
    assert.ok(content.includes('aria-modal="true"'), 'Modal must declare aria-modal="true"');
    assert.ok(content.includes('openModal(\'authModal\')'), 'Buttons must transition to authModal');
  });

  test('2. Pending wishlist item stored in sessionStorage with safe return path and open redirect guard', () => {
    const contextFile = path.join(rootDir, 'src', 'context', 'WishlistContext.tsx');
    assert.ok(fs.existsSync(contextFile), 'WishlistContext.tsx must exist');
    const content = fs.readFileSync(contextFile, 'utf8');

    assert.ok(
      content.includes('ficcado_pending_wishlist'),
      'WishlistContext must use session storage key "ficcado_pending_wishlist"'
    );
    assert.ok(
      content.includes('sessionStorage.setItem'),
      'Guest click must persist pending item in sessionStorage'
    );
    assert.ok(
      (content.includes("startsWith('/')") &&
        content.includes("!rawPath.startsWith('//')") &&
        content.includes("!rawPath.includes(':')")) ||
        content.includes("!returnPath.startsWith('//')"),
      'WishlistContext must guard against open redirect exploits when validating returnPath'
    );
  });

  test('3. Automatic wishlist addition upon authentication & pending cleanup', () => {
    const contextFile = path.join(rootDir, 'src', 'context', 'WishlistContext.tsx');
    const content = fs.readFileSync(contextFile, 'utf8');

    assert.ok(
      content.includes('sessionStorage.getItem(PENDING_WISHLIST_STORAGE_KEY)') ||
        content.includes('sessionStorage.getItem(\'ficcado_pending_wishlist\')'),
      'WishlistContext must inspect pending wishlist storage on auth change'
    );
    assert.ok(
      content.includes('sessionStorage.removeItem'),
      'WishlistContext must clean up pending wishlist item after processing'
    );
    assert.ok(
      content.includes('addToWishlistApi(cleanItemId)') || content.includes('addToWishlist'),
      'WishlistContext must automatically add the pending item upon authentication'
    );
  });

  test('4. Wishlist API client implements GET, PUT, DELETE, and public batch lookup', () => {
    const apiFile = path.join(rootDir, 'src', 'lib', 'api', 'wishlist.ts');
    assert.ok(fs.existsSync(apiFile), 'wishlist.ts API client must exist');
    const content = fs.readFileSync(apiFile, 'utf8');

    assert.ok(content.includes('export async function getWishlistItems'), 'Must export getWishlistItems');
    assert.ok(content.includes('export async function addToWishlistApi'), 'Must export addToWishlistApi');
    assert.ok(content.includes('export async function removeFromWishlistApi'), 'Must export removeFromWishlistApi');
    assert.ok(content.includes('export async function getBatchProducts'), 'Must export getBatchProducts');

    assert.ok(content.includes('/api/wishlist'), 'Endpoints must target /api/wishlist');
    assert.ok(content.includes('/api/public/products/by-ids'), 'Batch lookup must target /api/public/products/by-ids');
    assert.ok(content.includes('credentials: \'include\''), 'Wishlist API calls must include credentials for session cookie');
  });

  test('5. Customer isolation and database ownership boundaries', () => {
    // Ficcado-Website-Data owns wishlist_items table
    const migrationFile = path.join(
      rootDir,
      '..',
      'backend',
      'ficcado_website_data',
      'src',
      'main',
      'resources',
      'db',
      'migration',
      'V2__wishlist_items.sql'
    );
    assert.ok(fs.existsSync(migrationFile), 'V2__wishlist_items.sql must exist in ficcado_website_data');
    const migrationContent = fs.readFileSync(migrationFile, 'utf8');
    assert.ok(
      migrationContent.includes('CREATE TABLE IF NOT EXISTS wishlist_items'),
      'Migration must create wishlist_items table'
    );
    assert.ok(
      migrationContent.includes('CONSTRAINT uq_wishlist_customer_item UNIQUE (customer_id, item_id)'),
      'Migration must enforce unique constraint on (customer_id, item_id)'
    );

    // Verify no cross-database foreign key references in migration
    assert.ok(
      !migrationContent.toLowerCase().includes('references products') &&
        !migrationContent.toLowerCase().includes('references customers'),
      'Microservices rule: Foreign keys to ficcado_data products or customers are forbidden across databases'
    );
  });

  test('6. Inactive products hidden from wishlist view via backend public endpoint', () => {
    const serviceFile = path.join(
      rootDir,
      '..',
      '..',
      'crm',
      'backend',
      'ficcado_crm_backend',
      'src',
      'main',
      'java',
      'com',
      'aps',
      'ficcado_crm_backend',
      'service',
      'PublicProductService.java'
    );
    assert.ok(fs.existsSync(serviceFile), 'PublicProductService.java must exist');
    const content = fs.readFileSync(serviceFile, 'utf8');

    assert.ok(
      content.includes('getPublicProductsByIds'),
      'PublicProductService must provide getPublicProductsByIds'
    );
    assert.ok(
      content.includes('ItemStatus.ACTIVE') && content.includes('ItemStatus.IN_STOCK'),
      'getPublicProductsByIds must filter ItemStatus.ACTIVE and ItemStatus.IN_STOCK'
    );
  });

  test('7. ProductCard and ProductModal integrate wishlist toggle with accessible IDs', () => {
    const cardFile = path.join(rootDir, 'src', 'components', 'ui', 'ProductCard.tsx');
    assert.ok(fs.existsSync(cardFile), 'ProductCard.tsx must exist');
    const cardContent = fs.readFileSync(cardFile, 'utf8');

    assert.ok(
      cardContent.includes('id={`wishlist-btn-${product.id}`}'),
      'ProductCard must render id="wishlist-btn-${product.id}"'
    );
    assert.ok(
      cardContent.includes('useWishlist()'),
      'ProductCard must use useWishlist hook'
    );
    assert.ok(
      cardContent.includes('toggleWishlist(product.id)'),
      'ProductCard must invoke toggleWishlist'
    );

    const modalFile = path.join(rootDir, 'src', 'components', 'modals', 'ProductModal.tsx');
    assert.ok(fs.existsSync(modalFile), 'ProductModal.tsx must exist');
    const modalContent = fs.readFileSync(modalFile, 'utf8');

    assert.ok(
      modalContent.includes('id="modal-wishlist-btn"'),
      'ProductModal must render desktop wishlist button with id="modal-wishlist-btn"'
    );
    assert.ok(
      modalContent.includes('id="mobile-modal-wishlist-btn"'),
      'ProductModal must render mobile sticky wishlist button with id="mobile-modal-wishlist-btn"'
    );
  });

  test('8. Navigation components (Header, Footer, MobileNavDrawer) expose Wishlist links', () => {
    const headerFile = path.join(rootDir, 'src', 'components', 'layout', 'DesktopHeader.tsx');
    assert.ok(fs.existsSync(headerFile), 'DesktopHeader.tsx must exist');
    const headerContent = fs.readFileSync(headerFile, 'utf8');
    assert.ok(
      headerContent.includes('id="desktop-header-wishlist-btn"'),
      'DesktopHeader must render id="desktop-header-wishlist-btn"'
    );
    assert.ok(
      headerContent.includes('href="/wishlist"'),
      'DesktopHeader must link to /wishlist'
    );

    const footerFile = path.join(rootDir, 'src', 'components', 'layout', 'DesktopFooter.tsx');
    assert.ok(fs.existsSync(footerFile), 'DesktopFooter.tsx must exist');
    const footerContent = fs.readFileSync(footerFile, 'utf8');
    assert.ok(
      footerContent.includes('href="/wishlist"'),
      'DesktopFooter must link to /wishlist'
    );

    const drawerFile = path.join(rootDir, 'src', 'components', 'modals', 'MobileNavDrawer.tsx');
    assert.ok(fs.existsSync(drawerFile), 'MobileNavDrawer.tsx must exist');
    const drawerContent = fs.readFileSync(drawerFile, 'utf8');
    assert.ok(
      drawerContent.includes('href="/wishlist"'),
      'MobileNavDrawer must link to /wishlist'
    );
  });

  test('9. Dedicated /wishlist page and WishlistClient render correct layout, empty state, and grid', () => {
    const pageFile = path.join(rootDir, 'src', 'app', 'wishlist', 'page.tsx');
    assert.ok(fs.existsSync(pageFile), 'src/app/wishlist/page.tsx must exist');
    const pageContent = fs.readFileSync(pageFile, 'utf8');
    assert.ok(
      pageContent.includes('Saved Wishlist | Ficcado'),
      'Wishlist page must specify SEO title metadata "Saved Wishlist | Ficcado"'
    );

    const clientFile = path.join(rootDir, 'src', 'app', 'wishlist', 'WishlistClient.tsx');
    assert.ok(fs.existsSync(clientFile), 'WishlistClient.tsx must exist');
    const clientContent = fs.readFileSync(clientFile, 'utf8');
    assert.ok(clientContent.includes('id="wishlist-page"'), 'Must have id="wishlist-page"');
    assert.ok(
      clientContent.includes('id="wishlist-guest-signin-btn"'),
      'Must have id="wishlist-guest-signin-btn" for unauthenticated visitors'
    );
    assert.ok(
      clientContent.includes('id="wishlist-explore-btn"'),
      'Must have id="wishlist-explore-btn" for empty state exploration'
    );
    assert.ok(
      clientContent.includes('id="wishlist-products-grid"'),
      'Must have id="wishlist-products-grid" for populated state'
    );
  });

  test('10. AppShell mounts GuestWishlistPromptModal and layout wraps WishlistProvider', () => {
    const appShellFile = path.join(rootDir, 'src', 'components', 'layout', 'AppShell.tsx');
    const appShellContent = fs.readFileSync(appShellFile, 'utf8');
    assert.ok(
      appShellContent.includes('<GuestWishlistPromptModal />'),
      'AppShell must mount GuestWishlistPromptModal'
    );

    const layoutFile = path.join(rootDir, 'src', 'app', 'layout.tsx');
    const layoutContent = fs.readFileSync(layoutFile, 'utf8');
    assert.ok(
      layoutContent.includes('<WishlistProvider>') && layoutContent.includes('</WishlistProvider>'),
      'layout.tsx must wrap application tree with WishlistProvider'
    );
  });

  test('11. Device Matrix includes /wishlist route', () => {
    const checkerFile = path.join(rootDir, 'scripts', 'device-checker.mjs');
    assert.ok(fs.existsSync(checkerFile), 'device-checker.mjs must exist');
    const content = fs.readFileSync(checkerFile, 'utf8');
    assert.ok(
      content.includes("path: '/wishlist'"),
      'device-checker.mjs must include /wishlist in ROUTES'
    );
  });
});
