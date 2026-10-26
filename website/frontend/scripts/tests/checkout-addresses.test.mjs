import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(frontendRoot, '../..');

describe('Phase P2-6: Checkout Flow & Saved Addresses (A-2, A-4, C-2, ADD-4, ADD-5)', () => {

  const checkoutPagePath = path.join(frontendRoot, 'src/app/checkout/page.tsx');
  const authApiPath = path.join(frontendRoot, 'src/lib/api/auth.ts');
  const crmProfileControllerPath = path.join(
    repoRoot,
    'crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/controller/CustomerProfileController.java'
  );
  const crmInternalOrderControllerPath = path.join(
    repoRoot,
    'crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/controller/InternalOrderController.java'
  );
  const crmPublicDeliveryControllerPath = path.join(
    repoRoot,
    'crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/controller/PublicDeliveryController.java'
  );
  const crmDeliveryServicePath = path.join(
    repoRoot,
    'crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/service/DeliveryService.java'
  );
  const crmYamlPath = path.join(
    repoRoot,
    'crm/backend/ficcado_crm_backend/src/main/resources/application.yaml'
  );

  test('P2-6.1: Unauthenticated checkout access renders luxury auth guard gate', () => {
    assert.ok(fs.existsSync(checkoutPagePath), 'checkout page must exist');
    const content = fs.readFileSync(checkoutPagePath, 'utf8');

    // Asserts auth guard logic
    assert.match(content, /!isAuthLoading\s*&&\s*!isAuthenticated/, 'must check authentication before displaying checkout');
    assert.match(content, /id="checkout-auth-guard"/, 'must render checkout auth guard container');
    assert.match(content, /id="checkout-login-trigger-btn"/, 'must provide login trigger button');
    assert.match(content, /openModal\(['"]authModal['"]\)/, 'must trigger authModal for guest users');
    assert.match(content, /Customer Log In Required/, 'must explain customer login requirement');
  });

  test('P2-6.2: Authenticated checkout renders verified customer account summary card', () => {
    const content = fs.readFileSync(checkoutPagePath, 'utf8');

    assert.match(content, /id="checkout-verified-account-card"/, 'must render verified customer account card');
    assert.match(content, /id="checkout-customer-name"/, 'must display verified customer name');
    assert.match(content, /id="checkout-customer-phone"/, 'must display verified customer phone');
    assert.match(content, /id="checkout-customer-email"/, 'must display verified customer email');
    assert.match(content, /customer\?\.name/, 'must bind directly to verified customer principal');
    assert.match(content, /customer\?\.phone/, 'must bind directly to verified customer phone');
    assert.match(content, /customer\?\.email/, 'must bind directly to verified customer email');
  });

  test('P2-6.3: Frontend auth API client exports saved address management methods', () => {
    assert.ok(fs.existsSync(authApiPath), 'auth API file must exist');
    const content = fs.readFileSync(authApiPath, 'utf8');

    assert.match(content, /export async function getCustomerAddresses/, 'must export getCustomerAddresses');
    assert.match(content, /export async function addCustomerAddress/, 'must export addCustomerAddress');
    assert.match(content, /export async function deleteCustomerAddress/, 'must export deleteCustomerAddress');
    assert.match(content, /\/addresses/, 'must target customer address endpoint');
  });

  test('P2-6.4: Backend CustomerProfileController enforces address validation and ownership isolation', () => {
    assert.ok(fs.existsSync(crmProfileControllerPath), 'CustomerProfileController must exist');
    const content = fs.readFileSync(crmProfileControllerPath, 'utf8');

    // Endpoints
    assert.match(content, /@GetMapping\(["']\/addresses["']\)/, 'must expose GET /api/customer/profile/addresses');
    assert.match(content, /@PostMapping\(["']\/addresses["']\)/, 'must expose POST /api/customer/profile/addresses');
    assert.match(content, /@DeleteMapping\(["']\/addresses\/\{id\}["']\)/, 'must expose DELETE /api/customer/profile/addresses/{id}');

    // 5-500 char validation
    assert.match(content, /trimmed\.length\(\)\s*<\s*5/, 'must reject addresses shorter than 5 chars');
    assert.match(content, /trimmed\.length\(\)\s*>\s*500/, 'must reject addresses longer than 500 chars');

    // Max 10 address cap
    assert.match(content, />=\s*10/, 'must enforce maximum 10 saved addresses cap');

    // Customer isolation on deletion
    assert.match(content, /HttpStatus\.NOT_FOUND/, 'must return 404 for address not found or belonging to other customer');
    assert.match(content, /ResponseEntity\.noContent\(\)/, 'must return 204 on successful address deletion');
  });

  test('P2-6.5: Delivery options configured in server-side YAML and exposed via PublicDeliveryController', () => {
    assert.ok(fs.existsSync(crmYamlPath), 'application.yaml must exist');
    const yamlContent = fs.readFileSync(crmYamlPath, 'utf8');

    assert.match(yamlContent, /del-standard/, 'must configure del-standard');
    assert.match(yamlContent, /Express Surface Logistics/, 'must configure Express Surface Logistics');
    assert.match(yamlContent, /rate:\s*0/, 'Express Surface Logistics must be 0 rate');
    assert.match(yamlContent, /del-priority/, 'must configure del-priority');
    assert.match(yamlContent, /Priority Air Courier/, 'must configure Priority Air Courier');
    assert.match(yamlContent, /rate:\s*99/, 'Priority Air Courier must be 99 rate');

    assert.ok(fs.existsSync(crmPublicDeliveryControllerPath), 'PublicDeliveryController must exist');
    const controllerContent = fs.readFileSync(crmPublicDeliveryControllerPath, 'utf8');
    assert.match(controllerContent, /@RequestMapping\(["']\/api\/public\/delivery-options["']\)/, 'must expose /api/public/delivery-options');

    assert.ok(fs.existsSync(crmDeliveryServicePath), 'DeliveryService must exist');
    const serviceContent = fs.readFileSync(crmDeliveryServicePath, 'utf8');
    assert.match(serviceContent, /calculateDeliveryCharge/, 'must calculate delivery charge on server');
    assert.match(serviceContent, /resolveCourierName/, 'must resolve courier name on server');
  });

  test('P2-6.6: Server-side quote endpoint protects pricing and validates inventory', () => {
    assert.ok(fs.existsSync(crmInternalOrderControllerPath), 'InternalOrderController must exist');
    const content = fs.readFileSync(crmInternalOrderControllerPath, 'utf8');

    assert.match(content, /@PostMapping\(["']\/quote["']\)/, 'must expose POST /api/internal/orders/quote');
    assert.match(content, /X-Internal-Secret/, 'must require X-Internal-Secret');
    assert.match(content, /MessageDigest\.isEqual/, 'must use constant-time secret comparison');
    assert.match(content, /item\.getPriceOfItem\(\)/, 'must look up item price strictly from database');
    assert.match(content, /inventoryRepository\.findByItemIdAndSize/, 'must check stock in InventoryRepository');
    assert.match(content, /calculateDeliveryCharge/, 'must calculate delivery charge from DeliveryService');
  });

  test('P2-6.7: Strict elimination of simulated payment tokens and dummy functions per ADD-5', () => {
    const checkoutContent = fs.readFileSync(checkoutPagePath, 'utf8');

    assert.doesNotMatch(checkoutContent, /pay_sim_/, 'must not contain pay_sim_ token');
    assert.doesNotMatch(checkoutContent, /sim_sig_/, 'must not contain sim_sig_ token');
    assert.doesNotMatch(checkoutContent, /createSimulatedPaymentId/, 'must not contain createSimulatedPaymentId');
    assert.doesNotMatch(checkoutContent, /createSimulatedSignature/, 'must not contain createSimulatedSignature');
    assert.doesNotMatch(checkoutContent, /createSimulatedInvoiceNumber/, 'must not contain createSimulatedInvoiceNumber');

    // Check all src files for pay_sim
    const srcDir = path.join(frontendRoot, 'src');
    function scanDir(dir) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scanDir(full);
        } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.mjs')) {
          const fileText = fs.readFileSync(full, 'utf8');
          assert.doesNotMatch(
            fileText,
            /pay_sim_/,
            `File ${path.relative(repoRoot, full)} must not contain simulated payment prefix pay_sim_`
          );
        }
      }
    }
    scanDir(srcDir);
  });

});
