import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

function parseSizes(sizesInput: any): string[] {
  if (!sizesInput) return ['XS', 'S', 'M', 'L', 'XL'];
  if (Array.isArray(sizesInput)) {
    return sizesInput.map((s: any) => typeof s === 'string' ? s.trim() : (s.size ? String(s.size).trim() : String(s).trim())).filter(Boolean);
  }
  if (typeof sizesInput === 'string') {
    return sizesInput.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return ['XS', 'S', 'M', 'L', 'XL'];
}

export async function GET(request: Request) {
  try {
    const headers = { cookie: request.headers.get('cookie') || '' };
    const [rawInv, rawItems] = await Promise.all([
      apiClient.get('/api/inventory', { headers }).catch(() => []),
      apiClient.get('/api/items', { headers }).catch(() => []),
    ]);

    const inventory = (rawInv || []).map((inv: any) => ({
      id: inv.id,
      sno: String(inv.id),
      itemId: inv.itemId || (inv.item ? inv.item.id : null),
      itemName: inv.itemName || (inv.item ? inv.item.itemName : ''),
      size: inv.size,
      qty: String(inv.totalQuantity || 0),
      totalQuantity: inv.totalQuantity || 0,
      status: inv.currentStatus,
    }));

    const items = (rawItems || []).map((it: any) => ({
      id: it.id,
      itemName: it.itemName,
      sizes: parseSizes(it.sizes),
      status: it.currentStatus || 'IN_STOCK',
    }));

    return Response.json({ inventory, items });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load inventory." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const headers = { cookie: request.headers.get('cookie') || '' };
    const body = await request.json();

    let targetItemId = body.itemId;

    if (!targetItemId && body.itemName) {
      const items = await apiClient.get('/api/items', { headers }).catch(() => []);
      const found = (items || []).find((i: any) => i.itemName.trim().toLowerCase() === body.itemName.trim().toLowerCase());
      if (found) targetItemId = found.id;
    }

    const payload = {
      itemId: targetItemId,
      itemName: body.itemName,
      size: body.size,
      totalQuantity: parseInt(body.totalQuantity || body.qty || '0', 10),
    };

    const saved = await apiClient.post('/api/inventory', payload, { headers });

    return Response.json({ success: true, message: 'Inventory updated.', inventory: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update inventory." }, { status: 500 });
  }
}
