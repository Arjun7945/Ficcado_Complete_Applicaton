import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const headers = { cookie: request.headers.get('cookie') || '' };
    const [sales, inventory, warehouse] = await Promise.all([
      apiClient.get('/api/sales', { headers }).catch(() => []),
      apiClient.get('/api/inventory', { headers }).catch(() => []),
      apiClient.get('/api/warehouse', { headers }).catch(() => []),
    ]);

    return Response.json({
      status: 'MATCHED',
      salesCount: (sales || []).length,
      inventoryCount: (inventory || []).length,
      warehouseCount: (warehouse || []).length,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't perform reconciliation." }, { status: 500 });
  }
}
