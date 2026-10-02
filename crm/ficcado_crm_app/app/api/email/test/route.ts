import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request) {
  try {
    await requireAuth();
    return Response.json(
      { error: 'Not Implemented', detail: 'Outbound test email dispatch is not configured in this environment.' },
      { status: 501 }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }
}
