import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const item = await apiClient.get(`/api/items/${id}`);
    return Response.json({ item });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Item not found.' }, { status: 404 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const payload = {
      ...body,
      sizes: body.sizes || body.availableSizes,
      availableSizes: body.availableSizes || body.sizes,
    };
    const updated = await apiClient.put(`/api/items/${id}`, payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true, item: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update item." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const updated = await apiClient.patch(`/api/items/${id}/status`, body, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true, item: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't toggle item status." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await apiClient.delete(`/api/items/${id}`, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't delete item." }, { status: 500 });
  }
}
