import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const handler = searchParams.get('handler');

    const warehouseAllocs = await apiClient.get('/api/warehouse');
    const filtered = (warehouseAllocs || []).filter(
      (w: any) => !handler || (w.handlerAdminName && w.handlerAdminName.toLowerCase() === handler.toLowerCase())
    );

    return Response.json({ warehouse: filtered });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load warehouse data for handler." }, { status: 500 });
  }
}
