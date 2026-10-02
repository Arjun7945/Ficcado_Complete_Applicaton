import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const headers = { cookie: request.headers.get('cookie') || '' };
    const [salesData, itemsData, inventoryData] = await Promise.all([
      apiClient.get('/api/sales', { headers }).catch(() => []),
      apiClient.get('/api/items', { headers }).catch(() => []),
      apiClient.get('/api/inventory', { headers }).catch(() => []),
    ]);

    const sales = salesData || [];
    const totalOrders = sales.length;
    const totalRevenue = sales.reduce((acc: number, s: any) => acc + (parseFloat(s.totalAmount) || 0), 0);

    const activeItems = (itemsData || []).filter((i: any) => i.currentStatus === 'ACTIVE').length;
    const totalStock = (inventoryData || []).reduce((acc: number, i: any) => acc + (typeof i.quantity === 'number' ? i.quantity : (parseInt(i.quantity, 10) || 0)), 0);

    return Response.json({
      stats: {
        totalOrders,
        totalRevenue,
        activeItems,
        totalStock,
      },
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load dashboard stats." }, { status: 500 });
  }
}
