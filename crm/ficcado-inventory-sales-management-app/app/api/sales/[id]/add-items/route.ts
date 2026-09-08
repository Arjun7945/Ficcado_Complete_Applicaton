import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    const updated = await apiClient.put(`/api/sales/${params.id}`, body, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true, sale: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't add items to sale." }, { status: 500 });
  }
}
