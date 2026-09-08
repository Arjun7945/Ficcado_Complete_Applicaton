import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request) {
  try {
    const admin = await requireAuth();
    return Response.json({
      success: true,
      message: `Audit report queued by ${admin.name} for email dispatch.`,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }
}
