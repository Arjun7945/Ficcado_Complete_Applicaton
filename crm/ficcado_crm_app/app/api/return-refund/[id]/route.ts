import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const isNumeric = /^\d+$/.test(id);
  const cookieHeader = request.headers.get('cookie') || '';

  try {
    let returnRefund: any = null;
    if (isNumeric) {
      returnRefund = await apiClient.get(`/api/return-refunds/${id}`, {
        headers: { cookie: cookieHeader },
      }).catch(() => null);
    } else {
      returnRefund = await apiClient.get(`/api/return-refunds/by-invoice/${encodeURIComponent(id)}`, {
        headers: { cookie: cookieHeader },
      }).catch(() => null);
    }

    // Resolve invoice number & sale
    const invoiceNumber = returnRefund?.invoiceNumber || (isNumeric ? null : id);
    let sale: any = null;
    if (returnRefund?.saleId) {
      sale = await apiClient.get(`/api/sales/${returnRefund.saleId}`, {
        headers: { cookie: cookieHeader },
      }).catch(() => null);
    } else if (invoiceNumber) {
      sale = await apiClient.get(`/api/sales/by-invoice/${encodeURIComponent(invoiceNumber)}`, {
        headers: { cookie: cookieHeader },
      }).catch(() => null);
    }

    // Fetch admins for handler dropdowns
    const rawAdmins = await apiClient.get('/api/admins', {
      headers: { cookie: cookieHeader },
    }).catch(() => []);
    const adminNames = Array.isArray(rawAdmins) ? rawAdmins.map((a: any) => a.adminName || a.username).filter(Boolean) : [];

    const isSaleUnderRefund = sale?.saleStatus === 'REFUND_REQUESTED' ||
      sale?.fulfilmentStatus === 'Refund-Requested' ||
      sale?.fulfilmentRequestStatus === 'Refund-Requested';

    const rec = returnRefund ? {
      id: returnRefund.id,
      rowIndex: returnRefund.id,
      invoiceNumber: returnRefund.invoiceNumber,
      verificationStatus: returnRefund.itemVerificationStatus || '',
      refundStatus: returnRefund.refundStatus || 'Pending',
      refundAmount: returnRefund.refundAmount != null ? String(returnRefund.refundAmount) : '',
      refundCompletedAt: returnRefund.refundCompletedDateTime || '',
      transactionId: returnRefund.transactionId || '',
      modeOfRefund: returnRefund.modeOfRefund || 'Cash',
      disposition: returnRefund.dispositionOfReturnedItems || '',
      restockDestination: returnRefund.restockDestination || '',
      returnedItems: returnRefund.returnedItems?.map((i: any) => i.itemName).join(', ') || '',
      returnedSizes: returnRefund.returnedItems?.map((i: any) => i.size).join(', ') || '',
      returnedQty: returnRefund.returnedItems?.reduce((s: number, i: any) => s + (i.quantity || 1), 0).toString() || '',
      priceCharged: returnRefund.priceChargedReturnedItems != null ? String(returnRefund.priceChargedReturnedItems) : '',
      newDiscountApplied: returnRefund.newDiscountApplied != null ? String(returnRefund.newDiscountApplied) : '0',
      reasonForReturn: returnRefund.reasonForReturn || '',
      version: String(returnRefund.version || 1),
      createdAt: returnRefund.createdAt || '',
      createdBy: '',
      closedBy: returnRefund.closedByAdminName || '',
    } : (isSaleUnderRefund && sale ? {
      id: 0,
      rowIndex: 0,
      invoiceNumber: sale.invoiceNumber,
      verificationStatus: '',
      refundStatus: 'Pending',
      refundAmount: '0',
      refundCompletedAt: '',
      transactionId: '',
      modeOfRefund: 'Cash',
      disposition: '',
      restockDestination: '',
      returnedItems: '',
      returnedSizes: '',
      returnedQty: '0',
      priceCharged: '0',
      newDiscountApplied: '0',
      reasonForReturn: 'No_Reason_Specified',
      version: '1',
      createdAt: sale.createdAt || '',
      createdBy: '',
      closedBy: '',
    } : null);

    const lineItems = sale?.lineItems || [];
    const saleDetails = sale ? {
      invoiceNumber: sale.invoiceNumber,
      customerName: sale.customerName,
      customerPhone: sale.customerPhoneNumber,
      customerAddress: sale.customerAddress,
      customerEmail: sale.customerEmail,
      itemNames: lineItems.map((l: any) => l.itemName).join(', '),
      sizes: lineItems.map((l: any) => l.size).join(', '),
      totalItems: String(lineItems.reduce((s: number, l: any) => s + (l.quantity || 1), 0)),
      itemPrices: lineItems.map((l: any) => l.priceEach).join(', '),
      totalAmount: String(sale.totalAmount || 0),
      discount: Number(sale.discount || 0),
      deliveryChargeToggle: Boolean(sale.deliveryChargeEnabled),
      deliveryChargeAmount: Number(sale.deliveryChargeAmount || 0),
      fulfilmentSource: sale.fulfilmentSource || 'INVENTORY',
    } : null;

    if (!rec && !saleDetails) {
      return Response.json({ error: 'Return/Refund ticket or sale not found.' }, { status: 404 });
    }

    return Response.json({
      record: rec,
      saleDetails,
      admins: adminNames,
      returnRefund,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Error loading return/refund ticket.' }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  const isNumeric = /^\d+$/.test(id);

  try {
    const body = await request.json();

    // 1. Resolve numeric returnRefund ID
    let numericId: number | null = isNumeric ? parseInt(id, 10) : null;
    let existingTicket: any = null;

    if (numericId) {
      existingTicket = await apiClient.get(`/api/return-refunds/${numericId}`, {
        headers: { cookie: cookieHeader },
      }).catch(() => null);
    } else {
      existingTicket = await apiClient.get(`/api/return-refunds/by-invoice/${encodeURIComponent(id)}`, {
        headers: { cookie: cookieHeader },
      }).catch(() => null);
      if (existingTicket?.id) {
        numericId = existingTicket.id;
      }
    }

    // If ticket doesn't exist yet, create it first from the sale
    if (!numericId) {
      const sale = await apiClient.get(`/api/sales/by-invoice/${encodeURIComponent(id)}`, {
        headers: { cookie: cookieHeader },
      });
      if (!sale?.id) {
        return Response.json({ error: `Sale not found for invoice ${id}` }, { status: 404 });
      }

      const returnedItemsPayload = (body.selectedReturnedItems || []).map((item: any) => ({
        itemId: item.itemId || null,
        itemName: item.itemName,
        size: item.size,
        quantity: item.qty || item.quantity || 1,
        priceEach: item.unitPrice || item.priceEach || 0,
        totalPrice: (item.qty || item.quantity || 1) * (item.unitPrice || item.priceEach || 0),
      }));

      const created = await apiClient.post('/api/return-refunds', {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        reasonForReturn: body.reasonForReturn || 'Return requested',
        returnedItems: returnedItemsPayload,
      }, {
        headers: { cookie: cookieHeader },
      });

      numericId = created.id;
      existingTicket = created;
    }

    // 2. Map verification status and disposition from payload
    let itemVerificationStatus = body.itemVerificationStatus;
    let dispositionOfReturnedItems = body.dispositionOfReturnedItems;
    let restockDestination = body.restockDestination;

    if (body.selectedReturnedItems && body.selectedReturnedItems.length > 0) {
      const first = body.selectedReturnedItems[0];
      if (first.verificationStatus) {
        if (first.verificationStatus.includes('Good')) itemVerificationStatus = 'VERIFIED';
        else if (first.verificationStatus.includes('Damaged')) itemVerificationStatus = 'REJECTED';
        else itemVerificationStatus = 'PENDING';
      }
      if (first.disposition) {
        dispositionOfReturnedItems = first.disposition === 'Returned to Inventory'
          ? 'RETURNED_TO_INVENTORY'
          : 'SENT_TO_DAMAGED_PRODUCTS';
      }
      if (first.restockDestination) {
        restockDestination = first.restockDestination;
      }
    }

    const isClosing = body.action === 'close_ticket' || body.action === 'close' || body.refundStatus === 'CLOSED' || body.refundStatus === 'Completed';

    const updatePayload: any = {
      itemVerificationStatus,
      refundStatus: isClosing ? 'COMPLETED' : (body.refundStatus ? body.refundStatus.toUpperCase() : undefined),
      refundAmount: body.refundAmount != null ? Number(body.refundAmount) : undefined,
      transactionId: body.transactionId,
      modeOfRefund: body.modeOfRefund,
      dispositionOfReturnedItems,
      restockDestination,
      newDiscountApplied: body.newDiscountApplied != null ? Number(body.newDiscountApplied) : undefined,
      reasonForReturn: body.reasonForReturn,
      markRefundCompleted: isClosing,
    };

    const updated = await apiClient.put(`/api/return-refunds/${numericId}`, updatePayload, {
      headers: { cookie: cookieHeader },
    });

    // If closing ticket, call close-ticket endpoint
    if (isClosing) {
      const closed = await apiClient.post(`/api/return-refunds/${numericId}/close-ticket`, {}, {
        headers: { cookie: cookieHeader },
      });
      return Response.json({ success: true, returnRefund: closed });
    }

    return Response.json({ success: true, returnRefund: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update return refund ticket." }, { status: 500 });
  }
}
