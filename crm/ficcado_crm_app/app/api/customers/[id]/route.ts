import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const customer = await apiClient.get(`/api/customers/${encodeURIComponent(id)}`, {
      headers: { cookie: cookieHeader },
    });
    return Response.json(customer, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err: any) {
    const status = typeof err.status === 'number' ? err.status : 500;
    return Response.json({ error: err.message || "Couldn't load customer." }, { status });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const body = await request.json();
    const updated = await apiClient.put(`/api/customers/${encodeURIComponent(id)}`, body, {
      headers: { cookie: cookieHeader },
    });
    return Response.json(updated);
  } catch (err: any) {
    const status = typeof err.status === 'number' ? err.status : 500;
    return Response.json({ error: err.message || "Couldn't update customer." }, { status });
  }
}
