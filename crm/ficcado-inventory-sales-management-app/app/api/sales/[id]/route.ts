import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const sale = await apiClient.get(`/api/sales/${params.id}`);
    return Response.json({ sale });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Sale not found.' }, { status: 404 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    const updated = await apiClient.put(`/api/sales/${params.id}`, body, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true, sale: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update sale." }, { status: 500 });
  }
}
