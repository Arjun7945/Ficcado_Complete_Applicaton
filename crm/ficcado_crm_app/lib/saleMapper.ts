/**
 * lib/saleMapper.ts
 *
 * Normalizes backend Spring Boot SaleResponse into the format expected by the
 * CRM Next.js frontend (sales list, sale detail, invoice, courier slip).
 *
 * Guarantees:
 * 1. fulfilmentStatus is explicitly 'Normal', 'Replace-Requested', or 'Refund-Requested'.
 * 2. isLocked is strictly true ONLY when under Replace-Requested or Refund-Requested.
 * 3. Line items are converted into both structured lineItems array and synthesized
 *    comma-separated itemNames, sizes, itemPrices, and totalItems.
 * 4. Dates are safe ISO strings.
 */

export function toSafeIso(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    const ms = val < 1e11 ? Math.round(val * 1000) : Math.round(val);
    return new Date(ms).toISOString();
  }
  return String(val);
}

export function mapSaleResponse(s: any): any {
  if (!s) return null;

  // Determine fulfilmentStatus & lock state
  let fulfilmentStatus = 'Normal';
  if (s.saleStatus === 'REPLACE_REQUESTED' || s.fulfilmentStatus === 'Replace-Requested' || s.fulfilmentRequestStatus === 'Replace-Requested') {
    fulfilmentStatus = 'Replace-Requested';
  } else if (s.saleStatus === 'REFUND_REQUESTED' || s.fulfilmentStatus === 'Refund-Requested' || s.fulfilmentRequestStatus === 'Refund-Requested') {
    fulfilmentStatus = 'Refund-Requested';
  }

  const lineItems: any[] = Array.isArray(s.lineItems) ? s.lineItems : [];
  const itemNames = lineItems.flatMap((li: any) => Array(li.quantity || 1).fill(li.itemName || '')).filter(Boolean).join(', ');
  const sizes = lineItems.flatMap((li: any) => Array(li.quantity || 1).fill(li.size || '')).filter(Boolean).join(', ');
  const itemPrices = lineItems.flatMap((li: any) => Array(li.quantity || 1).fill(li.priceEach != null ? li.priceEach : 0)).join(', ');
  const totalItems = lineItems.reduce((sum: number, li: any) => sum + (li.quantity || 1), 0).toString();

  return {
    id: s.id,
    rowIndex: s.id,
    invoiceNumber: s.invoiceNumber || '',
    saleStatus: s.saleStatus || 'Not Provided / Order Only Placed',
    customerName: s.customerName || '',
    customerPhone: s.customerPhoneNumber || s.customerPhone || '',
    customerPhoneNumber: s.customerPhoneNumber || s.customerPhone || '',
    customerAddress: s.customerAddress || 'Address_Not_Provided_Yet',
    customerEmail: s.customerEmail || 'No_Email_Provided',
    totalAmount: String(s.totalAmount ?? '0'),
    paymentStatus: s.paymentStatus || 'Not Paid',
    modeOfPayment: s.modeOfPayment && s.modeOfPayment !== 'N/A' ? s.modeOfPayment : 'Not_Selected_Yet',
    transactionId: s.transactionId && s.transactionId !== 'N/A' ? s.transactionId : 'No_transaction_id_Collected_Yet',
    deliveryStatus: s.deliveryStatus || 'Packed & Ready for Shipment',
    deliveryChargeToggle: Boolean(s.deliveryChargeEnabled ?? s.deliveryChargeToggle),
    deliveryChargeAmount: parseFloat(s.deliveryChargeAmount || '0') || 0,
    fulfilmentSource: s.fulfilmentSource || 'Take from Inventory',
    fulfilmentStatus,
    fulfilmentRequestStatus: s.fulfilmentRequestStatus || fulfilmentStatus,
    isLocked: fulfilmentStatus !== 'Normal',
    discount: parseFloat(s.discount || '0') || 0,
    saleClosedBy: s.saleClosedByAdminName || s.saleClosedBy || '',
    saleClosedByAdminName: s.saleClosedByAdminName || s.saleClosedBy || '',
    receivedBy: s.receivedBy && s.receivedBy !== 'N/A' ? s.receivedBy : 'Not_Received_Yet',
    remarks: s.remarks && s.remarks !== 'N/A' ? s.remarks : 'No_Remarks',
    version: s.version != null ? String(s.version) : '1',
    createdAt: toSafeIso(s.createdAt),
    createdBy: s.createdByAdminName || s.createdBy || '',
    updatedAt: toSafeIso(s.updatedAt),
    updatedBy: s.updatedByAdminName || s.updatedBy || '',
    lineItems,
    itemNames: itemNames || s.itemNames || '',
    sizes: sizes || s.sizes || '',
    itemPrices: itemPrices || s.itemPrices || '',
    totalItems: totalItems !== '0' ? totalItems : (s.totalItems || '0'),
  };
}
