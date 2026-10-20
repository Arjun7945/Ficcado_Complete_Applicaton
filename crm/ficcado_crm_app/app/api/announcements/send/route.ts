export const dynamic = 'force-dynamic';

export async function POST() {
  return Response.json(
    { error: 'Not Implemented', detail: 'Announcement broadcast is not configured in this environment.' },
    { status: 501 }
  );
}
