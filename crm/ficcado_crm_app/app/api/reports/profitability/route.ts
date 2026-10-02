import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';
    const month = searchParams.get('month') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    const query = new URLSearchParams({ period });
    if (month) query.set('month', month);
    if (from) query.set('from', from);
    if (to) query.set('to', to);

    const report = await apiClient.get(`/api/reports/profitability?${query.toString()}`, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json(report);
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't generate profitability report." }, { status: 500 });
  }
}
