import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const returnRefunds = await apiClient.get('/api/return-refunds');
    return Response.json({ returnRefunds });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load return refunds." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const saved = await apiClient.post('/api/return-refunds', body, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json({ success: true, returnRefund: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't create return refund." }, { status: 500 });
  }
}
