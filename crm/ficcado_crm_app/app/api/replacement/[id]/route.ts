import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  const isNumeric = /^\d+$/.test(id);

  try {
    let replacement: any = null;
    if (isNumeric) {
      replacement = await apiClient.get(`/api/replacements/${id}`, {
        headers: { cookie: cookieHeader },
      }).catch(() => null);
    } else {
      replacement = await apiClient.get(`/api/replacements/by-invoice/${encodeURIComponent(id)}`, {
        headers: { cookie: cookieHeader },
      }).catch(() => null);
    }

    const invoiceNumber = replacement?.invoiceNumber || (isNumeric ? null : id);
    let sale: any = null;
    if (replacement?.saleId) {
      sale = await apiClient.get(`/api/sales/${replacement.saleId}`, {
        headers: { cookie: cookieHeader },
      }).catch(() => null);
    } else if (invoiceNumber) {
      sale = await apiClient.get(`/api/sales/by-invoice/${encodeURIComponent(invoiceNumber)}`, {
        headers: { cookie: cookieHeader },
      }).catch(() => null);
    }

    // Parallel fetch background datasets
    const [rawInventory, rawWarehouse, rawAdmins] = await Promise.all([
      apiClient.get('/api/inventory', { headers: { cookie: cookieHeader } }).catch(() => []),
      apiClient.get('/api/warehouse', { headers: { cookie: cookieHeader } }).catch(() => []),
      apiClient.get('/api/admins', { headers: { cookie: cookieHeader } }).catch(() => []),
    ]);

    const isSaleUnderReplacement = sale?.saleStatus === 'REPLACE_REQUESTED' ||
      sale?.fulfilmentStatus === 'Replace-Requested' ||
      sale?.fulfilmentRequestStatus === 'Replace-Requested';

    const formattedRecord = replacement ? {
      id: replacement.id,
      rowIndex: replacement.id,
      invoiceNumber: replacement.invoiceNumber,
      totalItems: String(replacement.oldItems?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 0),
      lastItems: replacement.oldItems?.map((i: any) => i.itemName).join(', ') || '—',
      lastSizes: replacement.oldItems?.map((i: any) => i.size).join(', ') || '—',
      newItems: replacement.newItems?.map((i: any) => i.itemName).join(', ') || '—',
      newSizes: replacement.newItems?.map((i: any) => i.size).join(', ') || '—',
      invoiceStatus: replacement.invoiceStatus || 'APPROVED',
      disposition: replacement.dispositionOfOldItems || '',
      restockDestination: replacement.restockDestination || '',
      newStockSource: replacement.newStockSource || '',
      newDeliveryCharge: replacement.newDeliveryCharge != null ? String(replacement.newDeliveryCharge) : undefined,
      newDiscount: replacement.newDiscount != null ? String(replacement.newDiscount) : undefined,
      newFinalItemsTotalAmount: replacement.newTotalAmount != null ? String(replacement.newTotalAmount) : '0',
      removedItemFromLastPurchase: replacement.oldItems?.map((i: any) => i.itemName).join(', '),
      sizesOfRemovedItemFromLastPurchase: replacement.oldItems?.map((i: any) => i.size).join(', '),
      numberOfRemovedItemFromLastPurchase: replacement.oldItems?.map((i: any) => i.quantity).join(', '),
      newFinalItemsSelected: replacement.newItems?.map((i: any) => i.itemName).join(', '),
      newFinalItemsSizes: replacement.newItems?.map((i: any) => i.size).join(', '),
      numberOfNewFinalItems: replacement.newItems?.map((i: any) => i.quantity).join(', '),
      newFinalItemsPricesEach: replacement.newItems?.map((i: any) => i.priceEach).join(', '),
      version: String(replacement.version || 1),
      createdAt: replacement.createdAt || '',
      createdBy: '',
    } : (isSaleUnderReplacement && sale ? {
      id: 0,
      rowIndex: 0,
      invoiceNumber: sale.invoiceNumber,
      totalItems: '0',
      lastItems: '—',
      lastSizes: '—',
      newItems: '—',
      newSizes: '—',
      invoiceStatus: 'APPROVED',
      disposition: '',
      restockDestination: '',
      newStockSource: '',
      newDeliveryCharge: undefined,
      newDiscount: undefined,
      newFinalItemsTotalAmount: '0',
      version: '1',
      createdAt: sale.createdAt || '',
      createdBy: '',
    } : null);

    const lineItems = sale?.lineItems || [];
    const saleDetails = sale ? {
      invoiceNumber: sale.invoiceNumber,
      customerName: sale.customerName,
      totalAmount: String(sale.totalAmount || '0'),
      itemNames: lineItems.map((l: any) => l.itemName).join(', '),
      sizes: lineItems.map((l: any) => l.size).join(', '),
      saleStatus: sale.saleStatus || '',
      deliveryStatus: sale.deliveryStatus || '',
      discount: Number(sale.discount || 0),
      deliveryChargeToggle: Boolean(sale.deliveryChargeEnabled),
      deliveryChargeAmount: Number(sale.deliveryChargeAmount || 0),
    } : null;

    const availableInventory = (Array.isArray(rawInventory) ? rawInventory : []).map((inv: any) => ({
      itemName: inv.itemName,
      size: inv.size,
      qty: inv.remainingQty != null ? inv.remainingQty : (inv.quantity || 0),
    }));

    const warehouseStock = (Array.isArray(rawWarehouse) ? rawWarehouse : []).map((w: any) => ({
      handler: w.handlerAdminName || w.warehouseLocation || '',
      location: w.warehouseLocation || '',
      itemName: w.itemName,
      size: w.size,
      qty: w.quantity || 0,
    }));

    const adminNames = (Array.isArray(rawAdmins) ? rawAdmins : []).map((a: any) => a.adminName || a.username).filter(Boolean);

    if (!formattedRecord && !saleDetails) {
      return Response.json({ error: 'Replacement or sale record not found.' }, { status: 404 });
    }

    return Response.json({
      replacement: formattedRecord,
      saleDetails,
      availableInventory,
      warehouseStock,
      admins: adminNames,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Replacement not found.' }, { status: 404 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  const isNumeric = /^\d+$/.test(id);

  try {
    const body = await request.json();

    // 1. Resolve numeric replacement ID
    let numericId: number | null = isNumeric ? parseInt(id, 10) : null;
    let existingRep: any = null;

    if (numericId) {
      existingRep = await apiClient.get(`/api/replacements/${numericId}`, {
        headers: { cookie: cookieHeader },
      }).catch(() => null);
    } else {
      existingRep = await apiClient.get(`/api/replacements/by-invoice/${encodeURIComponent(id)}`, {
        headers: { cookie: cookieHeader },
      }).catch(() => null);
      if (existingRep?.id) {
        numericId = existingRep.id;
      }
    }

    // If replacement doesn't exist yet, create it from the sale
    if (!numericId) {
      const sale = await apiClient.get(`/api/sales/by-invoice/${encodeURIComponent(id)}`, {
        headers: { cookie: cookieHeader },
      });
      if (!sale?.id) {
        return Response.json({ error: `Sale not found for invoice ${id}` }, { status: 404 });
      }

      const created = await apiClient.post('/api/replacements', {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        status: body.invoiceStatus || 'APPROVED',
        dispositionOfOldItems: body.disposition,
        restockDestination: body.restockDestination,
        newStockSource: body.newStockSource,
        newDeliveryCharge: body.newDeliveryCharge != null ? Number(body.newDeliveryCharge) : undefined,
        newDiscount: body.newDiscount != null ? Number(body.newDiscount) : undefined,
      }, {
        headers: { cookie: cookieHeader },
      });

      numericId = created.id;
      existingRep = created;
    }

    // 2. Map oldItems and newItems from frontend structures
    const oldItems = (body.oldItemsToReplace || []).map((oi: any) => ({
      itemId: oi.itemId || null,
      itemName: oi.itemName || oi.name,
      size: oi.size,
      quantity: oi.qty || oi.quantity || 1,
    }));

    const newItems = (body.newItemsChosen || []).map((ni: any) => ({
      itemId: ni.itemId || null,
      itemName: ni.itemName || ni.name,
      size: ni.size,
      quantity: ni.qty || ni.quantity || 1,
      priceEach: ni.unitPrice || ni.priceEach || 0,
      totalPrice: (ni.qty || ni.quantity || 1) * (ni.unitPrice || ni.priceEach || 0),
    }));

    const deliveryVal = body.newDeliveryCharge != null ? Number(body.newDeliveryCharge) : 0;
    const discountVal = body.newDiscount != null ? Number(body.newDiscount) : 0;
    const itemsSubtotal = newItems.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0);
    const newTotalAmount = Math.max(0, itemsSubtotal - discountVal + deliveryVal);

    const isComplete = body.action === 'complete';
    const statusVal = isComplete ? 'SATISFIED_AND_COMPLETED' : (body.invoiceStatus || body.status);

    const payload: any = {
      status: statusVal,
      dispositionOfOldItems: body.disposition,
      restockDestination: body.restockDestination,
      newStockSource: body.newStockSource,
      newDeliveryCharge: body.newDeliveryCharge != null ? Number(body.newDeliveryCharge) : undefined,
      newDiscount: body.newDiscount != null ? Number(body.newDiscount) : undefined,
      newTotalAmount: newTotalAmount,
      oldItems: oldItems.length > 0 ? oldItems : undefined,
      newItems: newItems.length > 0 ? newItems : undefined,
    };

    const updated = await apiClient.put(`/api/replacements/${numericId}`, payload, {
      headers: { cookie: cookieHeader },
    });

    if (isComplete) {
      const completed = await apiClient.post(`/api/replacements/${numericId}/complete`, {}, {
        headers: { cookie: cookieHeader },
      });
      return Response.json({ success: true, replacement: completed });
    }

    return Response.json({ success: true, replacement: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update replacement." }, { status: 500 });
  }
}
