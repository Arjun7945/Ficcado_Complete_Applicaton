#!/usr/bin/env node
// =============================================================================
// Parallel Orders Concurrency Load Test Runner
// Usage:
//   TEST_ORDER_GATEWAY_URL="https://script.google.com/macros/s/.../exec" \
//   TEST_GATEWAY_SECRET="your-secret" \
//   node scripts/loadtest/parallel-orders.mjs
// Or against a local/staging Next.js endpoint:
//   TARGET_URL="http://localhost:3000/api/orders" \
//   node scripts/loadtest/parallel-orders.mjs
// =============================================================================

import crypto from 'node:crypto';

const gatewayUrl = process.env.TEST_ORDER_GATEWAY_URL || process.env.ORDER_GATEWAY_URL;
const gatewaySecret = process.env.TEST_GATEWAY_SECRET || process.env.ORDER_GATEWAY_SECRET;
const targetApiUrl = process.env.TARGET_URL;

if (!gatewayUrl && !targetApiUrl) {
  console.log('=============================================================================');
  console.log('⚡ Ficcado Parallel Orders Concurrency Test Runner');
  console.log('=============================================================================');
  console.log('No test gateway or target URL configured.');
  console.log('');
  console.log('To run this concurrency test against your deployed Apps Script Gateway:');
  console.log('  TEST_ORDER_GATEWAY_URL="https://script.google.com/macros/s/.../exec" \\');
  console.log('  TEST_GATEWAY_SECRET="your-secret" \\');
  console.log('  node scripts/loadtest/parallel-orders.mjs');
  console.log('');
  console.log('To run against a running staging server:');
  console.log('  TARGET_URL="https://staging.ficcado.com/api/orders" \\');
  console.log('  node scripts/loadtest/parallel-orders.mjs');
  console.log('');
  console.log('Note: To test against an isolated Google Sheet, provide TEST_GOOGLE_SHEET_ID.');
  console.log('=============================================================================');
  process.exit(0);
}

async function runTest() {
  const PARALLEL_REQUESTS = 20;
  console.log(`🚀 Launching ${PARALLEL_REQUESTS} parallel orders simultaneously...`);
  const startTime = Date.now();

  const promises = [];

  for (let i = 0; i < PARALLEL_REQUESTS; i++) {
    const subId = `loadtest_${Date.now()}_${i}_${crypto.randomBytes(4).toString('hex')}`;
    const rowData = {
      submission_id: subId,
      customer_name: `Load Test Customer ${i + 1}`,
      customer_email: `loadtest${i + 1}@example.com`,
      customer_phone: '9876543210',
      address_line1: 'Test Address Suite 100',
      address_line2: 'Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034',
      landmark: 'Near Forum',
      courier_partner_id: 'standard',
      courier_partner_name: 'Standard Courier',
      delivery_charge: 50,
      subtotal: 999,
      total_amount: 1049,
      item_count: 1,
      items_summary: 'Load Test Heavyweight Tee',
      items_json: '[]',
      created_at: new Date().toISOString(),
      status: 'TEST',
    };

    if (gatewayUrl) {
      promises.push(
        fetch(gatewayUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: gatewaySecret,
            submission_id: subId,
            rowData,
          }),
        }).then(async (r) => {
          const json = await r.json();
          return { status: r.status, data: json };
        })
      );
    } else if (targetApiUrl) {
      promises.push(
        fetch(targetApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submission_id: subId,
            customer: {
              fullName: `Load Test ${i + 1}`,
              mobile: '9876543210',
              email: `loadtest${i + 1}@example.com`,
            },
            address: {
              addressLine1: 'Test Street 100',
              city: 'Bangalore',
              state: 'Karnataka',
              pincode: '560034',
            },
            courier_partner_id: 'standard',
            items: [{ id: 1, qty: 1 }],
          }),
        }).then(async (r) => {
          const json = await r.json();
          return { status: r.status, data: json };
        })
      );
    }
  }

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;

  console.log(`\n⏱️ Completed ${PARALLEL_REQUESTS} parallel requests in ${totalDuration}ms`);

  const refIds = [];
  let failures = 0;

  results.forEach((res, idx) => {
    const ref = res.data?.referenceId || res.data?.data?.referenceId;
    if (ref) {
      refIds.push(ref);
      console.log(`  [Req ${idx + 1}] Status ${res.status}: ${ref}`);
    } else {
      failures++;
      console.error(`  [Req ${idx + 1}] FAILED: Status ${res.status}`, res.data);
    }
  });

  const uniqueRefs = new Set(refIds);
  console.log('\n=============================================================================');
  console.log(`Total Orders:     ${PARALLEL_REQUESTS}`);
  console.log(`Successful:       ${refIds.length}`);
  console.log(`Failures:         ${failures}`);
  console.log(`Unique Ref IDs:   ${uniqueRefs.size}`);
  console.log(`Duplicates:       ${refIds.length - uniqueRefs.size}`);

  if (uniqueRefs.size === PARALLEL_REQUESTS && failures === 0) {
    console.log('✅ PASSED: 100% strictly unique Reference IDs under concurrency!');
    console.log('=============================================================================');
    process.exit(0);
  } else {
    console.log('❌ FAILED: Duplicate Reference IDs or failures detected.');
    console.log('=============================================================================');
    process.exit(1);
  }
}

runTest();
