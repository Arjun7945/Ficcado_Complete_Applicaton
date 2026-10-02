import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const inventory = await apiClient.get(`/api/inventory/${params.id}`);
    return Response.json({ inventory });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Inventory record not found.' }, { status: 404 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    const updated = await apiClient.put(`/api/inventory/${params.id}/quantity`, body, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true, inventory: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update inventory quantity." }, { status: 500 });
  }
}
