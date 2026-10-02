import { apiClient } from '@/lib/apiClient';
import { mapSaleResponse } from '@/lib/saleMapper';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    let numericId = params.id;
    if (!/^\d+$/.test(params.id)) {
      const existing = await apiClient.get<any>(`/api/sales/by-invoice/${encodeURIComponent(params.id)}`, {
        headers: { cookie: cookieHeader },
      });
      numericId = String(existing.id);
    }

    const updated = await apiClient.post<any>(`/api/sales/${numericId}/request-replacement`, {}, {
      headers: { cookie: cookieHeader },
    });

    return Response.json({
      success: true,
      message: `Sale ${params.id} moved to Replacement Management.`,
      sale: mapSaleResponse(updated),
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't request replacement on sale." }, { status: 500 });
  }
}
