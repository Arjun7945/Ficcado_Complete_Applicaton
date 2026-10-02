import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoice = searchParams.get('invoiceNumber');

    const cookieHeader = request.headers.get('cookie') || '';
    let history: any[];
    if (invoice) {
      history = await apiClient.get(`/api/logs/inventory-history/by-invoice/${encodeURIComponent(invoice)}`, {
        headers: { cookie: cookieHeader },
      });
    } else {
      history = await apiClient.get('/api/logs/inventory-history', {
        headers: { cookie: cookieHeader },
      });
    }

    return Response.json({ history });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load inventory history." }, { status: 500 });
  }
}
