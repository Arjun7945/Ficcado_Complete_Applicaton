import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ invoiceNumber: string }> }) {
  const params = await props.params;
  try {
    const sale = await apiClient.get(`/api/sales/by-invoice/${params.invoiceNumber}`);
    return Response.json({ sale });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Invoice not found.' }, { status: 404 });
  }
}
