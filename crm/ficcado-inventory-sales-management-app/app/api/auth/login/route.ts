export const dynamic = 'force-dynamic';

/**
 * app/api/auth/login/route.ts
 *
 * Next.js proxy route: forwards CRM login requests to the Spring Boot backend.
 *
 * Login policy: email address ONLY. The backend enforces this restriction;
 * this proxy route also enforces it by only reading `body.email`.
 * Username-based login (`body.username`) is explicitly NOT supported here.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Accept only email — username field is intentionally ignored / not forwarded
    const email = body.email;
    const password = body.password;

    const backendRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!backendRes.ok) {
      let errorMsg = 'Incorrect email or password. Try again.';
      try {
        const errJson = await backendRes.json();
        errorMsg = errJson.error || errJson.message || errorMsg;
      } catch {}
      return Response.json({ error: errorMsg }, { status: backendRes.status });
    }

    const data = await backendRes.json();
    const setCookieHeader = backendRes.headers.get('set-cookie');

    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (setCookieHeader) {
      headers.set('Set-Cookie', setCookieHeader);
    }

    const adminObj = {
      id: data.id,
      name: data.adminName,
      email: data.emailId,
      role: data.role ? data.role.toLowerCase() : 'admin',
    };

    return new Response(
      JSON.stringify({
        success: true,
        role: adminObj.role,
        name: adminObj.name,
        user: adminObj,
        admin: adminObj,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return Response.json(
      { error: err.message || "Couldn't connect to authentication server." },
      { status: 500 }
    );
  }
}
