import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  getNextReferenceId,
  parseReferenceId,
  formatReferenceId,
  isValidReferenceId,
  isValidAnyOrderId,
  getNextLetterSequence,
  generateOfflineReferenceId,
} from '../../src/lib/referenceId.ts';

import {
  buildOrderMessage,
  buildWhatsAppUrl,
  formatISTDate,
} from '../../src/lib/whatsapp.ts';

import { getColorName } from '../../src/lib/colors.ts';

import { sanitizeCell } from '../../src/lib/sheets/client.ts';

describe('Reference ID Sequence & Generator', () => {
  test('generates initial reference ID if null/empty', () => {
    assert.equal(getNextReferenceId(), 'FIC-A0001');
    assert.equal(getNextReferenceId(''), 'FIC-A0001');
    assert.equal(getNextReferenceId(null), 'FIC-A0001');
  });

  test('increments sequentially within the same letter series', () => {
    assert.equal(getNextReferenceId('FIC-A0001'), 'FIC-A0002');
    assert.equal(getNextReferenceId('FIC-A0042'), 'FIC-A0043');
    assert.equal(getNextReferenceId('FIC-B0999'), 'FIC-B1000');
  });

  test('rolls over to next letter at limit (default 9999)', () => {
    assert.equal(getNextReferenceId('FIC-A9999'), 'FIC-B0001');
    assert.equal(getNextReferenceId('FIC-B9999'), 'FIC-C0001');
    assert.equal(getNextReferenceId('FIC-Y9999'), 'FIC-Z0001');
  });

  test('rolls over from Z to AA and beyond', () => {
    assert.equal(getNextLetterSequence('Z'), 'AA');
    assert.equal(getNextLetterSequence('AA'), 'AB');
    assert.equal(getNextLetterSequence('AZ'), 'BA');
    assert.equal(getNextReferenceId('FIC-Z9999'), 'FIC-AA0001');
    assert.equal(getNextReferenceId('FIC-AA9999'), 'FIC-AB0001');
  });

  test('validates Reference IDs strictly', () => {
    assert.equal(isValidReferenceId('FIC-A0001'), true);
    assert.equal(isValidReferenceId('FIC-Z9999'), true);
    assert.equal(isValidReferenceId('FIC-AA0001'), true);
    assert.equal(isValidReferenceId('fic-a0001'), true); // Case-insensitive
    assert.equal(isValidReferenceId('FKD-240101-AB12'), false); // Old format rejected
    assert.equal(isValidReferenceId('INVALID-ID'), false);
  });

  test('validates offline fallback reference IDs (FIC-T...) format', () => {
    const offlineId = generateOfflineReferenceId();
    assert.match(offlineId, /^FIC-T[A-Z0-9]{6}$/);
    assert.equal(isValidReferenceId(offlineId), true);
  });

  test('parses and formats Reference IDs correctly', () => {
    const parsed = parseReferenceId('FIC-B0042');
    assert.equal(parsed.valid, true);
    assert.equal(parsed.prefix, 'B');
    assert.equal(parsed.num, 42);

    const formatted = formatReferenceId('C', 7);
    assert.equal(formatted, 'FIC-C0007');

    const invalid = parseReferenceId('INVALID');
    assert.equal(invalid.valid, false);
  });

  test('formats IST date string correctly', () => {
    const testDate = new Date('2026-10-02T10:30:00.000Z');
    const istStr = formatISTDate(testDate);
    assert.match(istStr, /IST$/);
    assert.match(istStr, /2026/);
  });

  test('validates Support Page input for both Reference ID and team Order ID', () => {
    assert.equal(isValidAnyOrderId('FIC-A0001'), true);
    assert.equal(isValidAnyOrderId('FIC-T8X4M2'), true);
    assert.equal(isValidAnyOrderId('ORD-2026-1042'), true);
    assert.equal(isValidAnyOrderId('FICCADO-9988'), true);
    assert.equal(isValidAnyOrderId('123'), false); // Too short
    assert.equal(isValidAnyOrderId(''), false);
  });
});

describe('Courier Partners & Sheet Schemas per R4', () => {
  const COURIER_PARTNERS_COLS = [
    'partner_id', 'partner_name', 'partner_phone', 'partner_address',
    'rate_per_delivery', 'created_at', 'updated_at', 'status', 'delivery_time'
  ];

  const NEW_SALE_REQUEST_COLS = [
    'reference_id', 'created_at', 'status', 'final_order_id', 'customer_name',
    'customer_email', 'customer_phone', 'address_line1', 'address_line2',
    'city', 'state', 'pincode', 'landmark', 'courier_partner_id', 'courier_partner_name',
    'delivery_charge', 'subtotal', 'total_amount', 'item_count', 'items_summary', 'items_json', 'submission_id'
  ];

  test('Courier Partners schema includes required columns plus delivery_time and status', () => {
    assert.ok(COURIER_PARTNERS_COLS.includes('partner_id'));
    assert.ok(COURIER_PARTNERS_COLS.includes('partner_name'));
    assert.ok(COURIER_PARTNERS_COLS.includes('rate_per_delivery'));
    assert.ok(COURIER_PARTNERS_COLS.includes('status'));
    assert.ok(COURIER_PARTNERS_COLS.includes('delivery_time'));
  });

  test('New Sale Request schema includes courier_partner_id and courier_partner_name', () => {
    assert.ok(NEW_SALE_REQUEST_COLS.includes('courier_partner_id'));
    assert.ok(NEW_SALE_REQUEST_COLS.includes('courier_partner_name'));
    assert.ok(NEW_SALE_REQUEST_COLS.includes('delivery_charge'));
    assert.equal(NEW_SALE_REQUEST_COLS.includes('delivery_option'), false); // Old column replaced
  });
});

describe('WhatsApp Message Builder & Security', () => {
  const dummyCustomer = {
    fullName: 'Customer Name',
    mobile: '9845120489',
    email: 'customer@example.com',
    addressLine1: 'Flat 402 Sunshine Apts',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    landmark: 'Near Metro',
  };

  const dummyItems = [
    {
      id: 1,
      name: 'Colorado Heavyweight Tee',
      slug: 'colorado-heavyweight-tee',
      category: 't-shirts',
      type: 'T-Shirts',
      size: 'L',
      color: 'Black',
      qty: 2,
      unitPrice: 1499,
      lineTotal: 2998,
    },
  ];

  test('formats free delivery as "Free" in order message per R4.4', () => {
    const msg = buildOrderMessage({
      referenceId: 'FIC-A0001',
      customer: dummyCustomer,
      items: dummyItems,
      deliveryOptionName: 'India Post Speed Post',
      deliveryCharge: 0,
      subtotal: 2998,
      total: 2998,
      siteUrl: 'https://ficcado.store',
    });

    assert.ok(msg.includes('Delivery (India Post Speed Post): Free'));
    assert.ok(msg.includes('*New Order – Ficcado*'));
    assert.ok(msg.includes('Reference ID: FIC-A0001  (temporary)'));
    assert.ok(msg.includes('Subtotal: ₹2,998'));
    assert.ok(msg.includes('*Total: ₹2,998*'));
  });

  test('formats paid courier delivery rate correctly per R4.4', () => {
    const msg = buildOrderMessage({
      referenceId: 'FIC-A0002',
      customer: dummyCustomer,
      items: dummyItems,
      deliveryOptionName: 'BlueDart Express',
      deliveryCharge: 80,
      subtotal: 2998,
      total: 3078,
      siteUrl: 'https://ficcado.store',
    });

    assert.ok(msg.includes('Delivery (BlueDart Express): ₹80'));
    assert.ok(msg.includes('*Total: ₹3,078*'));
  });

  test('includes offline notice if running in offline mode', () => {
    const msg = buildOrderMessage({
      referenceId: 'FIC-T123456',
      customer: dummyCustomer,
      items: dummyItems,
      deliveryOptionName: 'Standard Courier',
      deliveryCharge: 50,
      subtotal: 2998,
      total: 3048,
      isOfflineFallback: true,
    });

    assert.ok(msg.includes('Order could not be pre-saved; team to verify manually.'));
  });

  test('formats hex color codes into human-readable color names in order message', () => {
    const hexItems = [
      {
        id: 2,
        name: 'Frame The Bloom',
        slug: 'frame-the-bloom',
        category: 't-shirts',
        type: 'T-Shirts',
        size: 'S',
        color: '#FFFFFF',
        qty: 1,
        unitPrice: 699,
        lineTotal: 699,
      },
    ];

    const msg = buildOrderMessage({
      referenceId: 'FIC-A0003',
      customer: dummyCustomer,
      items: hexItems,
      deliveryOptionName: 'India Post Speed Post',
      deliveryCharge: 0,
      subtotal: 699,
      total: 699,
    });

    assert.ok(msg.includes('Color: White'), 'Expected Color: White in WhatsApp message');
    assert.ok(!msg.includes('Color: #FFFFFF'), 'Should not show raw hex in WhatsApp message');
  });

  test('getColorName maps known hex values and keywords correctly', () => {
    assert.equal(getColorName('#FFFFFF'), 'White');
    assert.equal(getColorName('#ffffff'), 'White');
    assert.equal(getColorName('#111827'), 'Black');
    assert.equal(getColorName('#7B1113'), 'Maroon');
    assert.equal(getColorName('#D4C4A8'), 'Beige');
    assert.equal(getColorName('#99BADD'), 'Air Blue');
    assert.equal(getColorName('#DC2626'), 'Red');
    assert.equal(getColorName('#15803D'), 'Green');
    assert.equal(getColorName('#1E3A8A'), 'Blue');
    assert.equal(getColorName(null), 'Standard');
  });

  test('builds correct WhatsApp url', () => {
    const url = buildWhatsAppUrl('Hello Ficcado', '916282000729');
    assert.equal(url, 'https://wa.me/916282000729?text=Hello%20Ficcado');
  });
});

describe('Spreadsheet Formula Injection Defense', () => {
  test('escapes malicious formula prefixes with single quote', () => {
    assert.equal(sanitizeCell('=SUM(A1:A10)'), "'=SUM(A1:A10)");
    assert.equal(sanitizeCell('+916282000729'), "'+916282000729");
    assert.equal(sanitizeCell('-100'), "'-100");
    assert.equal(sanitizeCell('@malicious'), "'@malicious");
  });

  test('preserves normal clean strings', () => {
    assert.equal(sanitizeCell('Customer Name'), 'Customer Name');
    assert.equal(sanitizeCell('FIC-A0001'), 'FIC-A0001');
    assert.equal(sanitizeCell(''), '');
  });
});

describe('Mobile & Pincode Resilient Normalization', () => {
  function cleanIndianMobile(val) {
    if (typeof val !== 'string') return '';
    let digits = val.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    return digits;
  }

  function cleanPincode(val) {
    if (typeof val !== 'string') return '';
    return val.replace(/\D/g, '').trim();
  }

  test('normalizes mobile numbers with +91, 91, 0, or spaces', () => {
    const isMobileValid = (num) => /^[6-9]\d{9}$/.test(cleanIndianMobile(num));

    assert.equal(cleanIndianMobile('+91 98451 20489'), '9845120489');
    assert.equal(isMobileValid('+91 98451 20489'), true);

    assert.equal(cleanIndianMobile('919845120489'), '9845120489');
    assert.equal(isMobileValid('919845120489'), true);

    assert.equal(cleanIndianMobile('09845120489'), '9845120489');
    assert.equal(isMobileValid('09845120489'), true);

    assert.equal(cleanIndianMobile('9845120489'), '9845120489');
    assert.equal(isMobileValid('9845120489'), true);

    // Invalid mobile numbers
    assert.equal(isMobileValid('1234567890'), false); // Doesn't start with 6-9
    assert.equal(isMobileValid('98451'), false); // Too short
    assert.equal(isMobileValid(''), false);
  });

  test('normalizes 6-digit PIN codes with spaces or non-digits', () => {
    const isPinValid = (pin) => /^[1-9][0-9]{5}$/.test(cleanPincode(pin));

    assert.equal(cleanPincode('560 038'), '560038');
    assert.equal(isPinValid('560 038'), true);

    assert.equal(cleanPincode('560-038'), '560038');
    assert.equal(isPinValid('560-038'), true);

    assert.equal(isPinValid('012345'), false); // Cannot start with 0
    assert.equal(isPinValid('56003'), false); // 5 digits
    assert.equal(isPinValid('5600038'), false); // 7 digits
  });
});
