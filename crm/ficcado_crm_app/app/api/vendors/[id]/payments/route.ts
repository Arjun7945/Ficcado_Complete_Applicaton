import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const payments = await apiClient.get(`/api/vendors/${params.id}/payments`, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ payments });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load vendor payments." }, { status: 500 });
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    const payload = {
      amount: parseFloat(body.amount || 0),
      paymentDate: body.paymentDate || new Date().toISOString().split('T')[0],
      note: body.note || '',
    };

    const saved = await apiClient.post(`/api/vendors/${params.id}/payments`, payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json({ success: true, payment: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't record vendor payment." }, { status: 500 });
  }
}
