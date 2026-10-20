import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const [rawWh, rawAdmins, rawInventory] = await Promise.all([
      apiClient.get('/api/warehouse', { headers: { cookie: cookieHeader } }).catch(() => []),
      apiClient.get('/api/admins', { headers: { cookie: cookieHeader } }).catch(() => []),
      apiClient.get('/api/inventory', { headers: { cookie: cookieHeader } }).catch(() => []),
    ]);

    const warehouse = (rawWh || []).map((w: any) => ({
      id: w.id,
      sno: String(w.id),
      rowIndex: w.id,
      location: w.warehouseLocation,
      handler: w.handlerAdminName || w.warehouseLocation,
      itemName: w.itemName,
      size: w.size,
      qty: Number(w.quantity),
      quantity: Number(w.quantity),
    }));

    const admins = (rawAdmins || []).map((a: any) => a.adminName || a.username).filter(Boolean);

    const inventoryStock = (rawInventory || []).map((inv: any) => ({
      itemName: inv.itemName,
      size: inv.size,
      remainingQty: inv.remainingQty != null ? inv.remainingQty : (inv.quantity || 0),
    }));

    return Response.json({ warehouse, admins, inventoryStock });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load warehouse allocations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const body = await request.json();

    if (body.items && Array.isArray(body.items)) {
      const requests = body.items.map((i: any) => ({
        warehouseLocation: body.warehouseLocation || body.location || 'Main Warehouse',
        handlerName: body.handlerName || body.handler,
        handlerAdminId: body.handlerAdminId || null,
        itemId: i.itemId || null,
        itemName: i.itemName,
        size: i.size,
        quantity: parseInt(i.qty || i.quantity || '0', 10),
      }));

      const savedList = await apiClient.post('/api/warehouse/batch', requests, {
        headers: { cookie: cookieHeader },
      });

      return Response.json({ success: true, message: 'Warehouse stock allocation saved.', warehouse: savedList }, { status: 201 });
    }

    const payload = {
      warehouseLocation: body.warehouseLocation || body.location || 'Main Warehouse',
      handlerName: body.handlerName || body.handler,
      handlerAdminId: body.handlerAdminId || null,
      itemId: body.itemId || null,
      itemName: body.itemName,
      size: body.size,
      quantity: parseInt(body.quantity || body.qty || '0', 10),
    };

    const saved = await apiClient.post('/api/warehouse', payload, {
      headers: { cookie: cookieHeader },
    });

    return Response.json({ success: true, message: 'Warehouse allocation created.', warehouse: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't create warehouse allocation." }, { status: 500 });
  }
}
