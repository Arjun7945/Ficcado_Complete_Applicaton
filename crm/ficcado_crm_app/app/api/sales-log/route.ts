import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoice = searchParams.get('invoiceNumber');

    const cookieHeader = request.headers.get('cookie') || '';
    let logs: any[];
    if (invoice) {
      logs = await apiClient.get(`/api/logs/sales/by-invoice/${encodeURIComponent(invoice)}`, {
        headers: { cookie: cookieHeader },
      });
    } else {
      logs = await apiClient.get('/api/logs/sales', {
        headers: { cookie: cookieHeader },
      });
    }

    return Response.json({ logs });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load sales logs." }, { status: 500 });
  }
}
