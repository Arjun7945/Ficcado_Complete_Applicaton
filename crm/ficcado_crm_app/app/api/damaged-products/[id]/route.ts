import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    const payload = {
      itemId: body.itemId || null,
      itemName: body.itemName,
      size: body.size || '',
      quantity: parseInt(body.quantity || '1', 10) || 1,
      reasonNotes: body.reasonNotes || '',
    };

    const updated = await apiClient.put(`/api/damaged-products/${params.id}`, payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true, damagedProduct: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update damaged product." }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await apiClient.delete(`/api/damaged-products/${params.id}`, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't delete damaged product." }, { status: 500 });
  }
}
