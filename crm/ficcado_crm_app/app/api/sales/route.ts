import { apiClient } from '@/lib/apiClient';
import { mapSaleResponse } from '@/lib/saleMapper';

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

    const sales = (salesData || []).map(mapSaleResponse);

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

    const rawItemsList = Array.isArray(body.items) ? body.items : (Array.isArray(body.lineItems) ? body.lineItems : []);
    if (rawItemsList.length > 0) {
      for (const item of rawItemsList) {
        lineItems.push({
          itemId: item.itemId ? Number(item.itemId) : null,
          itemName: item.itemName,
          size: item.size || 'M',
          quantity: parseInt(item.qty || '1', 10) || 1,
          priceEach: parseFloat(item.unitPrice || item.price || '0') || 0,
          totalPrice: (parseInt(item.qty || '1', 10) || 1) * (parseFloat(item.unitPrice || item.price || '0') || 0),
        });
      }
    }

    // Defensive fallback: If any line item is missing itemId, resolve from items catalog
    if (lineItems.some((li) => !li.itemId && li.itemName)) {
      try {
        const rawItems = await apiClient.get<any[]>('/api/items', {
          headers: { cookie: request.headers.get('cookie') || '' },
        });
        if (Array.isArray(rawItems)) {
          for (const li of lineItems) {
            if (!li.itemId && li.itemName) {
              const matched = rawItems.find(
                (it: any) => it.itemName?.toLowerCase().trim() === li.itemName?.toLowerCase().trim()
              );
              if (matched && matched.id) {
                li.itemId = Number(matched.id);
              }
            }
          }
        }
      } catch {
        // Spring Boot SaleController/SaleService also has fallback resolution
      }
    }

    const modeOfPayment = body.modeOfPayment && body.modeOfPayment !== 'N/A' ? body.modeOfPayment : 'Not_Selected_Yet';
    const transactionId = body.transactionId && body.transactionId !== 'N/A' ? body.transactionId : 'No_transaction_id_Collected_Yet';
    const customerAddress = body.customerAddress && body.customerAddress !== 'N/A' ? body.customerAddress : 'Address_Not_Provided_Yet';
    const customerEmail = body.customerEmail && body.customerEmail !== 'N/A' ? body.customerEmail : 'No_Email_Provided';
    const receivedBy = body.receivedBy && body.receivedBy !== 'N/A' ? body.receivedBy : 'Not_Received_Yet';
    const remarks = body.remarks && body.remarks !== 'N/A' ? body.remarks : 'No_Remarks';
    const fulfilmentRequestStatus = body.fulfilmentRequestStatus || body.fulfilmentStatus || 'Normal';

    const payload = {
      invoiceNumber: body.invoiceNumber || `FIC-${Date.now()}`,
      customerName: body.customerName || 'Walk-in Customer',
      customerPhoneNumber: body.customerPhoneNumber,
      customerAddress,
      customerEmail,
      saleStatus: body.saleStatus || 'COMPLETED',
      paymentStatus: body.paymentStatus || 'PAID',
      modeOfPayment,
      transactionId,
      deliveryStatus: body.deliveryStatus || 'DELIVERED',
      deliveryChargeEnabled: Boolean(body.deliveryChargeToggle),
      deliveryChargeAmount: parseFloat(body.deliveryChargeAmount || 0),
      fulfilmentSource: body.fulfilmentSource === 'Take from Inventory' || body.fulfilmentSource === 'TAKE_FROM_INVENTORY' ? 'TAKE_FROM_INVENTORY' : 'WAREHOUSE_HANDLER',
      fulfilmentRequestStatus,
      fulfilmentStatus: fulfilmentRequestStatus,
      discount: parseFloat(body.discount || 0),
      totalAmount: parseFloat(body.totalAmount || 0),
      receivedBy,
      remarks,
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
