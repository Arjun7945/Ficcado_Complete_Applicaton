import { apiClient } from '@/lib/apiClient';
import { mapSaleResponse } from '@/lib/saleMapper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ invoiceNumber: string }> }) {
  const params = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const sale = await apiClient.get(`/api/sales/by-invoice/${encodeURIComponent(params.invoiceNumber)}`, {
      headers: { cookie: cookieHeader },
    });
    return Response.json({ sale: mapSaleResponse(sale) });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Invoice not found.' }, { status: 404 });
  }
}
