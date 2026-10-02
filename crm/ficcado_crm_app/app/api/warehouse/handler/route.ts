import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const handler = searchParams.get('handler');

    const warehouseAllocs = await apiClient.get('/api/warehouse', {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    const filtered = (warehouseAllocs || []).filter(
      (w: any) => !handler || (w.handlerAdminName && w.handlerAdminName.toLowerCase() === handler.toLowerCase())
    );

    return Response.json({ warehouse: filtered });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load warehouse data for handler." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const body = await request.json();
    const { originalLocation, originalHandler, newLocation, newHandler, items } = body;

    // 1. Clear previous allocations for this handler box
    if (originalLocation) {
      await apiClient.delete(
        `/api/warehouse/by-location-handler?location=${encodeURIComponent(originalLocation)}&handler=${encodeURIComponent(originalHandler || '')}`,
        { headers: { cookie: cookieHeader } }
      ).catch(() => null);
    }

    // 2. Re-create new allocations
    if (items && Array.isArray(items) && items.length > 0) {
      const requests = items.map((i: any) => ({
        warehouseLocation: newLocation || originalLocation || 'Main Warehouse',
        handlerName: newHandler || originalHandler,
        itemId: i.itemId || null,
        itemName: i.itemName,
        size: i.size,
        quantity: parseInt(i.qty || i.quantity || '0', 10),
      }));

      await apiClient.post('/api/warehouse/batch', requests, {
        headers: { cookie: cookieHeader },
      });
    }

    return Response.json({ success: true, message: 'Warehouse handler stock updated.' });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update handler stock." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') || '';
    const handler = searchParams.get('handler') || '';

    await apiClient.delete(
      `/api/warehouse/by-location-handler?location=${encodeURIComponent(location)}&handler=${encodeURIComponent(handler)}`,
      { headers: { cookie: cookieHeader } }
    );

    return Response.json({ success: true, message: 'Warehouse handler stock deleted.' });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't delete handler stock." }, { status: 500 });
  }
}
