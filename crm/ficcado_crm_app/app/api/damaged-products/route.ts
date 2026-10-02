import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const rawDamaged = await apiClient.get('/api/damaged-products', {
      headers: { cookie: cookieHeader },
    });
    const damagedProducts = (rawDamaged || []).map((d: any) => ({
      id: d.id,
      rowIndex: d.id,
      sno: String(d.id),
      invoiceNumber: d.invoiceNumber || '',
      itemName: d.itemName,
      size: d.size || '',
      quantity: d.quantity,
      customerName: d.customerName || '',
      reasonNotes: d.reasonNotes || '',
      source: d.source || 'MANUAL',
      createdAt: d.createdAt,
    }));

    return Response.json({ damagedProducts });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load damaged product records." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = {
      itemId: body.itemId || null,
      itemName: body.itemName,
      size: body.size || '',
      quantity: parseInt(body.quantity || '1', 10) || 1,
      reasonNotes: body.reasonNotes || '',
    };

    const saved = await apiClient.post('/api/damaged-products', payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json({ success: true, damagedProduct: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't record damaged product." }, { status: 500 });
  }
}
