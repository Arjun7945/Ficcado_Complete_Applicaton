import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const logs = await apiClient.get('/api/logs/activity', {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ logs });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load activity logs." }, { status: 500 });
  }
}
