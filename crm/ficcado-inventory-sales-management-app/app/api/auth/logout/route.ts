export const dynamic = 'force-dynamic';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function POST(request: Request) {
  try {
    const backendRes = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    const setCookieHeader = backendRes.headers.get('set-cookie');
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (setCookieHeader) {
      headers.set('Set-Cookie', setCookieHeader);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err: any) {
    return Response.json({ success: true });
  }
}
