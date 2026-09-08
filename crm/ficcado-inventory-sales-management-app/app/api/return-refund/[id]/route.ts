import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const returnRefund = await apiClient.get(`/api/return-refunds/${params.id}`);
    return Response.json({ returnRefund });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Return refund ticket not found.' }, { status: 404 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    let updated;
    if (body.action === 'close' || body.refundStatus === 'CLOSED') {
      updated = await apiClient.post(`/api/return-refunds/${params.id}/close-ticket`, {}, {
        headers: { cookie: request.headers.get('cookie') || '' },
      });
    } else {
      updated = await apiClient.put(`/api/return-refunds/${params.id}`, body, {
        headers: { cookie: request.headers.get('cookie') || '' },
      });
    }
    return Response.json({ success: true, returnRefund: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update return refund ticket." }, { status: 500 });
  }
}
