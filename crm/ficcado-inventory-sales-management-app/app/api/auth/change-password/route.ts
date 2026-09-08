import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const me = await apiClient.get('/api/auth/me', {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    const body = await request.json();
    const updated = await apiClient.put(`/api/admins/${me.id}`, {
      password: body.newPassword,
    }, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json({ success: true, message: 'Password changed successfully', admin: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't change password." }, { status: 500 });
  }
}
