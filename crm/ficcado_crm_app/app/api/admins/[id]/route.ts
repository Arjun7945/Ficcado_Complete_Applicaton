import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

async function resolveAdminId(identifier: string, cookieHeader: string): Promise<string> {
  if (!isNaN(Number(identifier))) {
    return identifier;
  }
  try {
    const rawAdmins = await apiClient.get<any[]>('/api/admins', {
      headers: { cookie: cookieHeader },
    });
    const found = (Array.isArray(rawAdmins) ? rawAdmins : []).find(
      (a: any) =>
        (a.adminName && a.adminName.toLowerCase() === identifier.toLowerCase()) ||
        (a.emailId && a.emailId.toLowerCase() === identifier.toLowerCase())
    );
    if (found && found.id) {
      return String(found.id);
    }
  } catch {
    // fallback to original identifier
  }
  return identifier;
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const body = await request.json();
    const resolvedId = await resolveAdminId(params.id, cookieHeader);

    const payload = {
      adminName: body.adminName || body.name,
      phoneNumber: body.phoneNumber || body.phone || '',
      notifications: body.notifications ? String(body.notifications).toUpperCase() : undefined,
      password: body.password || undefined,
      isActive: body.isActive !== undefined ? body.isActive : undefined,
    };

    const updated = await apiClient.put(`/api/admins/${resolvedId}`, payload, {
      headers: { cookie: cookieHeader },
    });
    return Response.json({ success: true, admin: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update admin." }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const resolvedId = await resolveAdminId(params.id, cookieHeader);
    await apiClient.patch(`/api/admins/${resolvedId}/deactivate`, {}, {
      headers: { cookie: cookieHeader },
    });
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't deactivate admin." }, { status: 500 });
  }
}
