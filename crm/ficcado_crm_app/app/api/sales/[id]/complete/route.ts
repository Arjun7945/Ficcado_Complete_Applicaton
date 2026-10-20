import { apiClient } from '@/lib/apiClient';
import { mapSaleResponse } from '@/lib/saleMapper';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const body = await request.json().catch(() => ({}));
    let numericId = params.id;
    if (!/^\d+$/.test(params.id)) {
      const existing = await apiClient.get<any>(`/api/sales/by-invoice/${encodeURIComponent(params.id)}`, {
        headers: { cookie: cookieHeader },
      });
      numericId = String(existing.id);
    }

    const payload = {
      paymentStatus: body.paymentStatus || 'Paid',
      modeOfPayment: body.modeOfPayment || 'Cash',
      transactionId: body.transactionId || 'No_transaction_id_Collected_Yet',
      deliveryStatus: body.deliveryStatus || 'Order Delivered Successfully',
      receivedBy: body.receivedBy,
      remarks: body.remarks,
    };

    const completed = await apiClient.post(`/api/sales/${numericId}/complete`, payload, {
      headers: { cookie: cookieHeader },
    });

    const mapped = mapSaleResponse(completed);
    return Response.json({
      success: true,
      sale: mapped,
      message: `Sale ${mapped?.invoiceNumber || params.id} marked as completed & closed by ${mapped?.saleClosedBy || 'admin'}.`,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't mark sale as completed." }, { status: 500 });
  }
}
