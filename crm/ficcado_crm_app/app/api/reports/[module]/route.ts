import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ module: string }> }) {
  const params = await props.params;
  try {
    const data = await apiClient.get(`/api/${params.module}`).catch(() => []);
    return Response.json({ rows: data });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't export report." }, { status: 500 });
  }
}
