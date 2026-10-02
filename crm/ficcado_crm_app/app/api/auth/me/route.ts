export const dynamic = 'force-dynamic';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export async function GET(request: Request) {
  try {
    const backendRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!backendRes.ok) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    const admin = await backendRes.json();
    const adminObj = {
      id: admin.id,
      name: admin.adminName,
      email: admin.emailId,
      role: admin.role ? admin.role.toLowerCase() : 'admin',
    };

    return Response.json({
      authenticated: true,
      user: adminObj,
      admin: adminObj,
    });
  } catch (err: any) {
    return Response.json({ authenticated: false, error: err.message }, { status: 401 });
  }
}
