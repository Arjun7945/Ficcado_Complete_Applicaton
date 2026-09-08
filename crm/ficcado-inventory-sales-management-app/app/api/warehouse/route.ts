import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawWh = await apiClient.get('/api/warehouse');
    const warehouse = (rawWh || []).map((w: any) => ({
      id: w.id,
      sno: String(w.id),
      location: w.warehouseLocation,
      handler: w.handlerAdminName || w.warehouseLocation,
      itemName: w.itemName,
      size: w.size,
      qty: String(w.quantity),
      quantity: w.quantity,
    }));

    return Response.json({ warehouse });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load warehouse allocations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = {
      warehouseLocation: body.warehouseLocation || body.location || 'Main Warehouse',
      handlerAdminId: body.handlerAdminId || null,
      itemId: body.itemId,
      size: body.size,
      quantity: parseInt(body.quantity || body.qty || '0', 10),
    };

    const saved = await apiClient.post('/api/warehouse', payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json({ success: true, message: 'Warehouse allocation created.', warehouse: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't create warehouse allocation." }, { status: 500 });
  }
}
