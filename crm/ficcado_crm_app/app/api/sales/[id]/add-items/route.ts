import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const body = await request.json();
    let numericId = params.id;
    if (!/^\d+$/.test(params.id)) {
      const existing = await apiClient.get<any>(`/api/sales/by-invoice/${encodeURIComponent(params.id)}`, {
        headers: { cookie: cookieHeader },
      });
      numericId = String(existing.id);
    }

    const rawItems = Array.isArray(body.items) ? body.items : (Array.isArray(body.lineItems) ? body.lineItems : []);
    const items: any[] = [];
    for (const item of rawItems) {
      items.push({
        itemId: item.itemId ? Number(item.itemId) : null,
        itemName: item.itemName,
        size: item.size || 'M',
        quantity: parseInt(item.qty || item.quantity || '1', 10) || 1,
        priceEach: parseFloat(item.unitPrice || item.price || item.priceEach || '0') || 0,
        totalPrice: (parseInt(item.qty || item.quantity || '1', 10) || 1) * (parseFloat(item.unitPrice || item.price || item.priceEach || '0') || 0),
      });
    }

    const updated = await apiClient.post(`/api/sales/${numericId}/add-items`, { items }, {
      headers: { cookie: cookieHeader },
    });
    return Response.json({ success: true, message: 'Items added to sale successfully.', sale: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't add items to sale." }, { status: 500 });
  }
}
