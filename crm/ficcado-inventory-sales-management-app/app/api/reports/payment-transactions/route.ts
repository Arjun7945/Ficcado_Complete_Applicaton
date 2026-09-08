import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const sales = await apiClient.get('/api/sales', {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    const transactions = (sales || []).map((s: any) => ({
      invoiceNumber: s.invoiceNumber,
      customerName: s.customerName,
      paymentStatus: s.paymentStatus,
      modeOfPayment: s.modeOfPayment,
      transactionId: s.transactionId,
      totalAmount: s.totalAmount,
      createdAt: s.createdAt,
    }));

    return Response.json({ transactions });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load payment transactions." }, { status: 500 });
  }
}
