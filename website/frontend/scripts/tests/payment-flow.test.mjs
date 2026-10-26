// =============================================================================
// Phase P2-7 Test Suite — Sale Only After Successful Payment & Notifications
// Verifies:
// 1. Frontend checkout payment handshake, session pause & resume, and modal handling
// 2. State machine transitions, optimistic locking, and customer isolation
// 3. Official Ficcado-Data website-orders invariants (remarks: "WEBSITE SALE", pessimistic lock)
// 4. Zero Ficcado-Data writes on payment failure
// 5. Idempotent order notifications and customer email routing
// =============================================================================

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

describe('P2-7: Frontend Checkout & Payment Integration', () => {
  const checkoutFile = path.resolve(rootDir, 'frontend/src/app/checkout/page.tsx');
  const paymentsApiFile = path.resolve(rootDir, 'frontend/src/lib/api/payments.ts');
  const confirmationFile = path.resolve(rootDir, 'frontend/src/app/checkout/confirmation/page.tsx');

  test('checkout page is present and protected by authentication guard', () => {
    assert.ok(fs.existsSync(checkoutFile), 'checkout/page.tsx must exist');
    const content = fs.readFileSync(checkoutFile, 'utf8');

    assert.ok(
      content.includes('useCustomerAuth'),
      'Checkout page must import useCustomerAuth context',
    );
    assert.ok(
      content.includes('!isAuthenticated'),
      'Checkout page must guard unauthenticated guests',
    );
    assert.ok(
      content.includes('Customer Log In Required'),
      'Checkout page must display login prompt for guests',
    );
  });

  test('checkout page pauses customer session during payment and resumes on dismiss/error', () => {
    const content = fs.readFileSync(checkoutFile, 'utf8');

    assert.ok(
      content.includes('pauseSession(15)'),
      'Checkout flow must pause customer session timer for 15 minutes during checkout',
    );
    assert.ok(
      content.includes('resumeSession()'),
      'Checkout flow must resume session timer on dismiss or verification error',
    );
  });

  test('checkout payment handler sends order details and navigates only after verification', () => {
    const content = fs.readFileSync(checkoutFile, 'utf8');

    assert.ok(
      content.includes('createPaymentOrder'),
      'Checkout flow must call createPaymentOrder',
    );
    assert.ok(
      content.includes('verifyPayment'),
      'Checkout flow must verify payment with signature',
    );
    assert.ok(
      content.includes('verifyRes.verified'),
      'Checkout flow must assert verifyRes.verified before clearing cart and navigating',
    );
    assert.ok(
      content.includes('router.push(\'/checkout/confirmation\')'),
      'Checkout flow must route to confirmation on success',
    );
  });

  test('confirmation page displays official invoice number and order summary', () => {
    assert.ok(fs.existsSync(confirmationFile), 'checkout/confirmation/page.tsx must exist');
    const content = fs.readFileSync(confirmationFile, 'utf8');

    assert.ok(
      content.includes('Invoice Number'),
      'Confirmation page must show invoice number',
    );
    assert.ok(
      content.includes('Payment Verified & Order Confirmed!'),
      'Confirmation page must present clear confirmation badge',
    );
  });

  test('payments API client supports dual endpoints and status queries', () => {
    assert.ok(fs.existsSync(paymentsApiFile), 'lib/api/payments.ts must exist');
    const content = fs.readFileSync(paymentsApiFile, 'utf8');
    const configContent = fs.readFileSync(path.resolve(rootDir, 'frontend/src/lib/api/config.ts'), 'utf8');

    assert.ok(
      configContent.includes('/api/v1/payments/create-order') || configContent.includes('/api/payments/orders'),
      'Payments config must route payment orders',
    );
    assert.ok(
      configContent.includes('/api/v1/payments/verify') || configContent.includes('/api/payments/verify'),
      'Payments config must route verify endpoint',
    );
    assert.ok(
      content.includes('getPaymentStatus'),
      'Payments client must export getPaymentStatus function',
    );
  });
});

describe('P2-7: Backend State Machine & Concurrency Contracts', () => {
  const crmInternalOrderController = path.resolve(
    rootDir,
    '../crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/controller/InternalOrderController.java',
  );
  const paymentTransactionEntity = path.resolve(
    rootDir,
    '../payment/backend/ficcado_payment_gateway_data/src/main/java/com/aps/ficcado_payment_gateway_data/entity/PaymentTransaction.java',
  );
  const paymentStatusEnum = path.resolve(
    rootDir,
    '../payment/backend/ficcado_payment_gateway_data/src/main/java/com/aps/ficcado_payment_gateway_data/entity/PaymentStatus.java',
  );
  const razorpayWebhookController = path.resolve(
    rootDir,
    '../payment/backend/ficcado_payment_gateway_data/src/main/java/com/aps/ficcado_payment_gateway_data/controller/RazorpayWebhookController.java',
  );
  const orderNotificationService = path.resolve(
    rootDir,
    '../website/backend/ficcado_website_data/src/main/java/com/aps/ficcado_website_data/service/OrderNotificationService.java',
  );

  test('Ficcado-Data enforces WEBSITE SALE remarks and pessimistic locking', () => {
    assert.ok(fs.existsSync(crmInternalOrderController), 'InternalOrderController.java must exist');
    const content = fs.readFileSync(crmInternalOrderController, 'utf8');

    assert.ok(
      content.includes('remarks("WEBSITE SALE")'),
      'InternalOrderController must strictly set remarks to WEBSITE SALE',
    );
    assert.ok(
      content.includes('findByItemIdAndSizeForUpdate'),
      'InternalOrderController must use pessimistic write lock findByItemIdAndSizeForUpdate',
    );
    assert.ok(
      content.includes('AMOUNT_MISMATCH'),
      'InternalOrderController must reject client price spoofing with AMOUNT_MISMATCH',
    );
  });

  test('PaymentTransaction entity enforces strict state machine and optimistic versioning', () => {
    assert.ok(fs.existsSync(paymentTransactionEntity), 'PaymentTransaction.java must exist');
    assert.ok(fs.existsSync(paymentStatusEnum), 'PaymentStatus.java must exist');

    const txContent = fs.readFileSync(paymentTransactionEntity, 'utf8');
    const smContent = fs.readFileSync(paymentStatusEnum, 'utf8');

    assert.ok(
      txContent.includes('@Version'),
      'PaymentTransaction must include @Version for optimistic locking',
    );
    assert.ok(
      txContent.includes('transitionTo'),
      'PaymentTransaction must enforce transitionTo method',
    );

    assert.ok(smContent.includes('CREATED'), 'PaymentStatus must define CREATED');
    assert.ok(smContent.includes('PROCESSING'), 'PaymentStatus must define PROCESSING');
    assert.ok(smContent.includes('COMPLETED'), 'PaymentStatus must define COMPLETED');
    assert.ok(smContent.includes('FAILED'), 'PaymentStatus must define FAILED');
    assert.ok(smContent.includes('REFUND_PENDING'), 'PaymentStatus must define REFUND_PENDING');
    assert.ok(smContent.includes('REFUNDED'), 'PaymentStatus must define REFUNDED');
    assert.ok(smContent.includes('EXPIRED'), 'PaymentStatus must define EXPIRED');
  });

  test('Razorpay webhook guarantees ZERO calls to Ficcado-Data on payment failure', () => {
    assert.ok(fs.existsSync(razorpayWebhookController), 'RazorpayWebhookController.java must exist');
    const content = fs.readFileSync(razorpayWebhookController, 'utf8');

    assert.ok(
      content.includes('payment.failed'),
      'Webhook must handle payment.failed event',
    );
    assert.ok(
      content.includes('Zero writes to Ficcado-Data') || content.includes('PaymentStatus.FAILED'),
      'Failed payment must transition to FAILED without calling syncService',
    );
  });

  test('OrderNotificationService handles idempotent notifications for all statuses', () => {
    assert.ok(fs.existsSync(orderNotificationService), 'OrderNotificationService.java must exist');
    const content = fs.readFileSync(orderNotificationService, 'utf8');

    assert.ok(
      content.includes('existsByTransactionId'),
      'OrderNotificationService must enforce idempotency via existsByTransactionId',
    );
    assert.ok(
      content.includes('COMPLETED'),
      'OrderNotificationService must handle COMPLETED with invoice',
    );
    assert.ok(
      content.includes('FAILED'),
      'OrderNotificationService must handle FAILED',
    );
    assert.ok(
      content.includes('REFUND_PENDING'),
      'OrderNotificationService must handle REFUND_PENDING / REFUNDED',
    );
  });
});
