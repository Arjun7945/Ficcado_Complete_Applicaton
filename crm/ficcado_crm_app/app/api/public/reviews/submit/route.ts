export const dynamic = 'force-dynamic';

/**
 * POST /api/public/reviews/submit
 * Proxy to the Spring Boot backend public review submission endpoint.
 * No auth cookie required.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export async function POST(request: Request) {
  const body = await request.json();
  const res = await fetch(`${API_BASE_URL}/api/public/reviews/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
