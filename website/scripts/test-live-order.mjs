import fs from 'node:fs';
import path from 'node:path';

// Load .env.local if present
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { getSheetValues, appendSheetValues } from '../src/lib/sheets/client.ts';
import { getNextReferenceId } from '../src/lib/referenceId.ts';
import { formatISTDate, buildOrderMessage, buildWhatsAppUrl } from '../src/lib/whatsapp.ts';

const sheetId = process.env.GOOGLE_SHEET_ID;

console.log('Testing live Google Sheet Order Flow...');
console.log('Target Sheet ID:', sheetId);

async function testOrder() {
  // 1. Read existing rows in New Sale Request
  const rows = await getSheetValues(sheetId, "'New Sale Request'!A1:U");
  console.log(`Current 'New Sale Request' rows: ${rows.length}`);
  console.log('Header row:', rows[0]);

  // Determine last reference ID
  let lastRef = null;
  if (rows.length > 1) {
    for (let i = rows.length - 1; i >= 1; i--) {
      const ref = rows[i][0];
      if (ref && /^FIC-[A-Z]+\d+$/i.test(ref.trim())) {
        lastRef = ref.trim().toUpperCase();
        break;
      }
    }
  }
  const nextRef = getNextReferenceId(lastRef);
  console.log(`Last Ref: ${lastRef || 'None'}, Next Ref assigned: ${nextRef}`);

  const testSubmissionId = 'test-sub-' + Date.now();
  const testDate = new Date();
  const istDate = formatISTDate(testDate);

  // Prepare a row matching the 21 columns of New Sale Request
  const orderRow = [
    nextRef,                                // A: reference_id
    istDate,                                // B: created_at_ist
    'Pending Verification',                 // C: status
    'Test Customer',                        // D: customer_name
    '9876543210',                           // E: customer_mobile
    'test@ficcado.com',                     // F: customer_email
    '123 Test St, Apartment 4B',            // G: address_line1
    'Near City Center',                     // H: address_line2
    'Kochi',                                // I: city
    'Kerala',                               // J: state
    '682001',                               // K: pincode
    'Opposite Metro Pillar 120',            // L: landmark
    '[{"id":"fic-ts-01","name":"Core Oversized Tee","size":"L","color":"Jet Black","qty":1,"unitPrice":799,"lineTotal":799}]', // M: items_summary
    '799',                                  // N: subtotal
    'Indian Post (Speed Post)',             // O: delivery_option
    '0',                                    // P: delivery_fee
    '799',                                  // Q: total
    '916282000729',                         // R: whatsapp_number
    '',                                     // S: final_order_id
    '',                                     // T: admin_notes
    testSubmissionId,                       // U: submission_id
  ];

  console.log(`Appending row for ${nextRef} to 'New Sale Request'...`);
  const appendRes = await appendSheetValues(sheetId, "'New Sale Request'!A2", [orderRow]);
  console.log('Append response updatedRange:', appendRes.updates?.updatedRange);

  // Read back to verify
  const afterRows = await getSheetValues(sheetId, "'New Sale Request'!A1:U");
  console.log(`Total rows after append: ${afterRows.length}`);
  const lastRow = afterRows[afterRows.length - 1];
  console.log('Appended row verified:');
  console.log('  reference_id:', lastRow[0]);
  console.log('  created_at_ist:', lastRow[1]);
  console.log('  customer_name:', lastRow[3]);
  console.log('  submission_id:', lastRow[20]);

  // Test WhatsApp message generation
  const waMsg = buildOrderMessage({
    referenceId: nextRef,
    customer: {
      fullName: 'Test Customer',
      mobile: '9876543210',
      email: 'test@ficcado.com',
      addressLine1: '123 Test St, Apartment 4B',
      addressLine2: 'Near City Center',
      city: 'Kochi',
      state: 'Kerala',
      pincode: '682001',
      landmark: 'Opposite Metro Pillar 120',
    },
    items: [
      {
        id: 'fic-ts-01',
        name: 'Core Oversized Tee',
        slug: 'core-oversized-tee',
        category: 't-shirts',
        size: 'L',
        color: 'Jet Black',
        qty: 1,
        unitPrice: 799,
        lineTotal: 799,
      }
    ],
    deliveryOptionName: 'Indian Post (Speed Post)',
    deliveryCharge: 0,
    subtotal: 799,
    total: 799,
    date: testDate,
  });

  const waUrl = buildWhatsAppUrl(waMsg, '916282000729');
  console.log('\nGenerated WhatsApp message preview:');
  console.log(waMsg);
  console.log('\nGenerated WhatsApp URL:', waUrl.substring(0, 100) + '...');

  console.log('\n✅ Live Order Test PASSED!');
}

testOrder().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
