import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const customers = await apiClient.get('/api/customers', {
      headers: { cookie: cookieHeader },
    });
    return Response.json(customers, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err: any) {
    const status = typeof err.status === 'number' ? err.status : 500;
    return Response.json({ error: err.message || "Couldn't load customers." }, { status });
  }
}

export async function PUT(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const body = await request.json();
    const updated = await apiClient.put('/api/customers', body, {
      headers: { cookie: cookieHeader },
    });
    return Response.json(updated);
  } catch (err: any) {
    const status = typeof err.status === 'number' ? err.status : 500;
    return Response.json({ error: err.message || "Couldn't update customer." }, { status });
  }
}
