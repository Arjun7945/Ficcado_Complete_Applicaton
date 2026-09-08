import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const reqOptions = { headers: { cookie: cookieHeader } };

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    let salesData: any[];
    if (query) {
      salesData = await apiClient.get(`/api/sales/search?q=${encodeURIComponent(query)}`, reqOptions);
    } else {
      salesData = await apiClient.get('/api/sales', reqOptions);
    }

    const [activeItems, warehouseAllocs, inventoryList] = await Promise.all([
      apiClient.get('/api/items/active', reqOptions).catch(() => []),
      apiClient.get('/api/warehouse', reqOptions).catch(() => []),
      apiClient.get('/api/inventory', reqOptions).catch(() => []),
    ]);

    const sales = (salesData || []).map((s: any) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      saleStatus: s.saleStatus,
      customerName: s.customerName,
      customerPhone: s.customerPhoneNumber,
      customerAddress: s.customerAddress,
      customerEmail: s.customerEmail,
      totalAmount: s.totalAmount,
      paymentStatus: s.paymentStatus,
      modeOfPayment: s.modeOfPayment,
      transactionId: s.transactionId,
      deliveryStatus: s.deliveryStatus,
      deliveryChargeToggle: s.deliveryChargeEnabled,
      deliveryChargeAmount: s.deliveryChargeAmount,
      fulfilmentSource: s.fulfilmentSource,
      discount: s.discount,
      saleClosedBy: s.saleClosedByAdminName,
      receivedBy: s.receivedBy,
      remarks: s.remarks,
      version: s.version,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      lineItems: s.lineItems || [],
    }));

    // Map real inventory quantities from backend
    const invMap = new Map<string, number>();
    (inventoryList || []).forEach((inv: any) => {
      if (inv.itemName && inv.size) {
        invMap.set(`${inv.itemName.toLowerCase()}:${inv.size.toLowerCase()}`, inv.totalQuantity || 0);
      }
    });

    const inventoryStock: any[] = [];
    (activeItems || []).forEach((item: any) => {
      (item.sizes || []).forEach((size: string) => {
        const key = `${item.itemName.toLowerCase()}:${size.toLowerCase()}`;
        const realQty = invMap.get(key) ?? 0;
        inventoryStock.push({
          itemName: item.itemName,
          size,
          qty: realQty,
        });
      });
    });

    const activeHandlerMap = new Map<string, string>();
    const warehouseStock: Record<string, number> = {};

    (warehouseAllocs || []).forEach((w: any) => {
      const handler = w.handlerAdminName || w.warehouseLocation;
      if (handler && w.quantity > 0) {
        activeHandlerMap.set(handler.toLowerCase(), handler);
        const key = `${handler}:${w.itemName}:${w.size}`;
        warehouseStock[key] = (warehouseStock[key] || 0) + w.quantity;
      }
    });

    const activeHandlersList = Array.from(activeHandlerMap.values());

    return Response.json({
      sales,
      inventoryStock,
      admins: activeHandlersList,
      handlers: activeHandlersList,
      warehouseStock,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load sales data." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lineItems: any[] = [];

    if (Array.isArray(body.items) && body.items.length > 0) {
      for (const item of body.items) {
        lineItems.push({
          itemId: item.itemId || null,
          itemName: item.itemName,
          size: item.size || 'M',
          quantity: parseInt(item.qty || '1', 10) || 1,
          priceEach: parseFloat(item.unitPrice || item.price || '0') || 0,
          totalPrice: (parseInt(item.qty || '1', 10) || 1) * (parseFloat(item.unitPrice || item.price || '0') || 0),
        });
      }
    }

    const payload = {
      invoiceNumber: body.invoiceNumber || `FIC-${Date.now()}`,
      customerName: body.customerName,
      customerPhoneNumber: body.customerPhoneNumber,
      customerAddress: body.customerAddress,
      customerEmail: body.customerEmail || '',
      saleStatus: body.saleStatus || 'COMPLETED',
      paymentStatus: body.paymentStatus || 'PAID',
      modeOfPayment: body.modeOfPayment,
      transactionId: body.transactionId || '',
      deliveryStatus: body.deliveryStatus || 'DELIVERED',
      deliveryChargeEnabled: Boolean(body.deliveryChargeToggle),
      deliveryChargeAmount: parseFloat(body.deliveryChargeAmount || 0),
      fulfilmentSource: body.fulfilmentSource === 'Take from Inventory' ? 'TAKE_FROM_INVENTORY' : 'WAREHOUSE_HANDLER',
      discount: parseFloat(body.discount || 0),
      totalAmount: parseFloat(body.totalAmount || 0),
      receivedBy: body.receivedBy || '',
      remarks: body.remarks || '',
      lineItems,
    };

    const savedSale = await apiClient.post('/api/sales', payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json(
      {
        success: true,
        invoiceNumber: savedSale.invoiceNumber,
        sale: savedSale,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't create sale record." }, { status: 500 });
  }
}
