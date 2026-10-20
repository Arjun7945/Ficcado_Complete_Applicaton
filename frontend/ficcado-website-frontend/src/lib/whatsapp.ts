// =============================================================================
// WhatsApp Ordering Helper — /src/lib/whatsapp.ts
// Formats structured order message and builds direct WhatsApp URL.

import { getColorName } from './colors.ts';

function resolveDefaultSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && raw.length > 0) {
    const withProtocol = raw.startsWith('http://') || raw.startsWith('https://')
      ? raw
      : `https://${raw}`;
    return withProtocol.replace(/\/+$/, '');
  }
  return 'https://ficcado.store';
}

export interface CustomerDeliveryDetails {
  fullName: string;
  mobile: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

export interface VerifiedOrderItem {
  id: number | string;
  name: string;
  slug: string;
  category: string;
  type?: string;
  size: string;
  color: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BuildOrderMessageParams {
  referenceId: string;
  customer: CustomerDeliveryDetails;
  items: VerifiedOrderItem[];
  deliveryOptionName: string;
  deliveryCharge: number;
  subtotal: number;
  total: number;
  date?: Date;
  siteUrl?: string;
  isOfflineFallback?: boolean;
}

function cleanLine(text?: string): string {
  if (!text) return '';
  return text.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Formats a Date object in Indian Standard Time (IST)
 * Example: '02 Oct 2026, 02:45 PM IST'
 */
export function formatISTDate(date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  return `${formatted} IST`;
}

/**
 * Builds the server-verified WhatsApp formatted order message according to
 * REFACTOR_ON_PREVIOUS_UPDATE.md Section B4.2
 */
export function buildOrderMessage({
  referenceId,
  customer,
  items,
  deliveryOptionName,
  deliveryCharge,
  subtotal,
  total,
  date = new Date(),
  siteUrl = resolveDefaultSiteUrl(),
  isOfflineFallback = false,
}: BuildOrderMessageParams): string {
  const formattedDate = formatISTDate(date);
  const name = cleanLine(customer.fullName);
  const mobile = cleanLine(customer.mobile);
  const email = cleanLine(customer.email);

  const line1 = cleanLine(customer.addressLine1);
  const line2 = cleanLine(customer.addressLine2);
  const fullAddress = line2 ? `${line1}, ${line2}` : line1;
  const cityState = `${cleanLine(customer.city)}, ${cleanLine(customer.state)} – ${cleanLine(customer.pincode)}`;
  const landmark = cleanLine(customer.landmark) || '–';

  const baseUrl = siteUrl.replace(/\/$/, '');

  const itemsList = items
    .map((item, idx) => {
      const typeSlug = (item.type || item.category || 't-shirts').toLowerCase().replace(/\s+/g, '-');
      const itemUrl = `${baseUrl}/categories/${typeSlug}/${item.slug}`;
      const line = `${idx + 1}) ${cleanLine(item.name)} | Size: ${item.size} | Color: ${cleanLine(getColorName(item.color))} | Qty: ${item.qty} | ₹${item.unitPrice.toLocaleString('en-IN')} each = ₹${item.lineTotal.toLocaleString('en-IN')}`;
      return `${line}\n   ${itemUrl}`;
    })
    .join('\n');

  const deliveryFeeText = deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge.toLocaleString('en-IN')}`;

  const messageLines = [
    `*New Order – Ficcado*`,
    `Reference ID: ${referenceId}  (temporary)`,
    `Date: ${formattedDate}`,
    ``,
    `*Customer*`,
    `Name: ${name}`,
    `Mobile: ${mobile}`,
    `Email: ${email}`,
    ``,
    `*Delivery Address*`,
    `${fullAddress}`,
    `${cityState}`,
    `Landmark: ${landmark}`,
    ``,
    `*Items*`,
    itemsList,
    ``,
    `Subtotal: ₹${subtotal.toLocaleString('en-IN')}`,
    `Delivery (${deliveryOptionName}): ${deliveryFeeText}`,
    `*Total: ₹${total.toLocaleString('en-IN')}*`,
  ];

  if (isOfflineFallback) {
    messageLines.push(
      ``,
      `⚠️ *Note:* Order could not be pre-saved; team to verify manually.`
    );
  }

  messageLines.push(
    ``,
    `Note: This is a temporary reference ID. The Ficcado team will share your final Order ID once your order is confirmed. Our team verifies every order against our records using this reference.`
  );

  return messageLines.join('\n');
}

/**
 * Builds the direct wa.me link with encoded order message
 */
export function buildWhatsAppUrl(message: string, whatsappNumber?: string): string {
  const number = (whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '916282000729').replace(/[^0-9]/g, '');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
