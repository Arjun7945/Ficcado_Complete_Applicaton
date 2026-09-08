import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const replacement = await apiClient.get(`/api/replacements/${params.id}`);
    return Response.json({ replacement });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Replacement not found.' }, { status: 404 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    let updated;
    if (body.action === 'complete') {
      updated = await apiClient.post(`/api/replacements/${params.id}/complete`, {}, {
        headers: { cookie: request.headers.get('cookie') || '' },
      });
    } else {
      updated = await apiClient.put(`/api/replacements/${params.id}/status`, { status: body.invoiceStatus || body.status }, {
        headers: { cookie: request.headers.get('cookie') || '' },
      });
    }
    return Response.json({ success: true, replacement: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update replacement." }, { status: 500 });
  }
}
