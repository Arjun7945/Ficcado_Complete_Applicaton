import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const rawAdmins = await apiClient.get('/api/admins', {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    const admins = (Array.isArray(rawAdmins) ? rawAdmins : []).map((a: any) => ({
      id: a.id,
      sno: String(a.id),
      adminName: a.adminName,
      email: a.emailId,
      emailId: a.emailId,
      phone: a.phoneNumber || '',
      phoneNumber: a.phoneNumber || '',
      role: a.role,
      notifications: a.notifications,
      isActive: a.isActive,
      salesCreated: a.salesCreated ?? 0,
      salesClosed: a.salesClosed ?? 0,
      revenueGenerated: a.revenueGenerated ?? 0,
      createdAt: a.createdAt || '',
    }));

    return Response.json({ admins });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load admin records." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = {
      adminName: body.adminName || body.name,
      emailId: body.emailId || body.email,
      phoneNumber: body.phoneNumber || body.phone || '',
      password: body.password,
      role: (body.role || 'ADMIN').toUpperCase(),
    };

    const saved = await apiClient.post('/api/admins', payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json({ success: true, admin: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't create admin." }, { status: 500 });
  }
}
