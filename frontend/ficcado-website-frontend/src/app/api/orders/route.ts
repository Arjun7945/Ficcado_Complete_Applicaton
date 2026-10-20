// =============================================================================
// Orders API Endpoint — /api/orders
// Processes customer orders with atomic reference ID dispatch, bot mitigation,
// rate limiting, zero PII logging, and WhatsApp continue handoff per R4 / D1 / D2 / D3.
// =============================================================================

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getProducts } from '@/lib/products';
import { getCourierPartners } from '@/lib/couriers';
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  CustomerDeliveryDetails,
  formatISTDate,
  VerifiedOrderItem,
} from '@/lib/whatsapp';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { dispatchOrder, OrderRowData } from '@/lib/orderGateway';
import { getColorName } from '@/lib/colors';

export const dynamic = 'force-dynamic';

function cleanIndianMobile(val: unknown): string {
  if (typeof val !== 'string') return '';
  let digits = val.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

function cleanPincode(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.replace(/\D/g, '').trim();
}

function checkOrigin(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host === host) return true;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl && originUrl.origin === new URL(siteUrl).origin) return true;
  } catch {}
  return false;
}

const OrderRequestSchema = z.object({
  submission_id: z.string().min(6).max(64),
  customer: z.object({
    fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    mobile: z.preprocess(
      cleanIndianMobile,
      z
        .string()
        .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number')
    ),
    email: z.string().trim().email('Please enter a valid email address').max(120),
  }),
  address: z.object({
    addressLine1: z.string().trim().min(3, 'Address line 1 is too short (min 3 characters)').max(200),
    addressLine2: z.string().trim().max(200).nullish().transform((v) => v || ''),
    city: z.string().trim().min(2, 'City is required (min 2 characters)').max(100),
    state: z.string().trim().min(2, 'State is required (min 2 characters)').max(100),
    pincode: z.preprocess(
      cleanPincode,
      z
        .string()
        .regex(/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit Indian PIN code')
    ),
    landmark: z.string().trim().max(150).nullish().transform((v) => v || ''),
  }),
  courier_partner_id: z.string().trim().min(1, 'Please select a delivery courier option'),
  items: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]),
        size: z
          .string()
          .trim()
          .nullish()
          .transform((v) => (v && v.trim() !== '' ? v.trim() : 'Free Size')),
        color: z
          .string()
          .trim()
          .nullish()
          .transform((v) => (v && v.trim() !== '' ? v.trim() : 'Standard')),
        qty: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(10, 'Max 10 per item'),
      })
    )
    .min(1, 'Shopping bag cannot be empty')
    .max(20, 'Maximum 20 distinct items per order'),
  // Bot mitigation fields (D3)
  website: z.string().optional(),
  _hp: z.string().optional(),
  form_rendered_at: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Origin verification
    if (!checkOrigin(req)) {
      return apiError('FORBIDDEN_ORIGIN', 'Cross-origin request rejected.', { status: 403 });
    }

    // 2. IP Rate limiting (D2: 10 requests per 10 minutes)
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, 'orders', 10, 600);
    if (!rateCheck.success) {
      return apiError(
        'RATE_LIMITED',
        'Too many order attempts from your network. Please wait a few minutes before trying again.',
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
          },
        }
      );
    }

    const rawBody = await req.json();
    const parseResult = OrderRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      const fieldPath = firstIssue?.path?.join('.') || 'order';
      const friendlyError = firstIssue?.message || 'Invalid order information provided.';

      return apiError('VALIDATION_FAILED', friendlyError, {
        status: 400,
        field: fieldPath,
        details: parseResult.error.format(),
      });
    }

    const { submission_id, customer, address, courier_partner_id, items, website, _hp, form_rendered_at } =
      parseResult.data;

    // 3. Honeypot check (D3)
    if (website || _hp) {
      console.warn('[Orders] Bot detected via honeypot.');
      return apiError('BOT_DETECTED', 'Unable to process order.', { status: 400 });
    }

    // 4. Minimum time-to-submit check (D3: min 1.5 seconds)
    if (form_rendered_at && Date.now() - form_rendered_at < 1500) {
      console.warn('[Orders] Bot detected via minimum submit time threshold.');
      return apiError('SUBMISSION_TOO_FAST', 'Please take a moment before placing your order.', { status: 400 });
    }

    // 5. Quantity limit
    const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
    if (totalQty > 50) {
      return apiError('QUANTITY_EXCEEDED', 'Order exceeds maximum quantity limit (50 items).', { status: 400 });
    }

    // 6. Verify items and recalculate price strictly against catalog
    const catalog = await getProducts();
    const catalogMap = new Map<string, (typeof catalog)[0]>();
    for (const p of catalog) {
      catalogMap.set(String(p.id), p);
    }

    const verifiedItems: VerifiedOrderItem[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = catalogMap.get(String(item.id));
      if (!product) {
        return apiError(
          'ITEM_UNAVAILABLE',
          `Item with ID "${item.id}" is no longer available in our catalog.`,
          { status: 400 }
        );
      }

      if (!product.inStock) {
        return apiError('OUT_OF_STOCK', `"${product.name}" is currently out of stock.`, { status: 400 });
      }

      const unitPrice = product.price;
      const lineTotal = unitPrice * item.qty;
      subtotal += lineTotal;

      verifiedItems.push({
        id: item.id,
        name: product.name,
        slug: product.slug,
        category: product.category,
        size: item.size || 'Free Size',
        color: getColorName(item.color) || 'Standard',
        qty: item.qty,
        unitPrice,
        lineTotal,
      });
    }

    // 7. Verify courier partner and delivery rate
    const courierPartners = await getCourierPartners();
    const courierPartner = courierPartners.find((c) => c.id === courier_partner_id);

    if (!courierPartner) {
      return apiError('INVALID_COURIER', 'Selected delivery partner is no longer available. Please select another.', {
        status: 400,
      });
    }

    const deliveryCharge = courierPartner.rate;
    const deliveryOptionName = courierPartner.name;
    const total = subtotal + deliveryCharge;
    const now = new Date();
    const created_at_ist = formatISTDate(now);

    const customerDetails: CustomerDeliveryDetails = {
      fullName: customer.fullName,
      mobile: customer.mobile,
      email: customer.email,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark,
    };

    const itemsSummary = verifiedItems
      .map(
        (item, idx) =>
          `${idx + 1}) ${item.name} | Size ${item.size} | Color ${getColorName(item.color)} | Qty ${item.qty} | ₹${item.unitPrice} each | ₹${item.lineTotal}`
      )
      .join('\n');

    const rowData: OrderRowData = {
      submission_id,
      customer_name: customer.fullName,
      customer_email: customer.email,
      customer_phone: customer.mobile,
      address_line1: address.addressLine1,
      address_line2: address.addressLine2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark,
      courier_partner_id: courierPartner.id,
      courier_partner_name: courierPartner.name,
      delivery_charge: deliveryCharge,
      subtotal,
      total_amount: total,
      item_count: totalQty,
      items_summary: itemsSummary,
      items_json: JSON.stringify(verifiedItems),
      created_at: created_at_ist,
      status: 'NEW',
    };

    // 8. Dispatch order via Apps Script Gateway or sheet-row mode with 8s guard
    const orderResult = await dispatchOrder(submission_id, rowData);

    const whatsappMessage = buildOrderMessage({
      referenceId: orderResult.referenceId,
      customer: customerDetails,
      items: verifiedItems,
      deliveryOptionName,
      deliveryCharge,
      subtotal,
      total,
      date: now,
      isOfflineFallback: orderResult.isOffline,
    });

    const latencyMs = Date.now() - startTime;
    console.info(`[Order API] Order completed: ref=${orderResult.referenceId} mode=${orderResult.mode} (${latencyMs}ms)`);

    return apiSuccess(
      {
        referenceId: orderResult.referenceId,
        whatsappUrl: buildWhatsAppUrl(whatsappMessage),
        subtotal,
        deliveryCharge,
        total,
        isOffline: orderResult.isOffline,
        isDuplicate: orderResult.isDuplicate,
        latencyMs,
      },
      {
        cacheControl: 'no-store, no-cache, must-revalidate',
      }
    );
  } catch (err) {
    console.error('[Order API] Unhandled server error:', (err as Error).message);
    return apiError(
      'ORDER_PROCESSING_FAILED',
      'An unexpected error occurred while placing your order. Please try again.',
      { status: 500 }
    );
  }
}
