export const dynamic = 'force-dynamic';

/**
 * GET /api/public/reviews/validate/[token]
 * Proxy to the Spring Boot backend public review validation endpoint.
 * No auth cookie required.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const res = await fetch(`${API_BASE_URL}/api/public/reviews/validate/${token}`);
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
