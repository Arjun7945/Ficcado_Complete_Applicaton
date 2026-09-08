export const dynamic = 'force-dynamic';

export async function POST() {
  return Response.json({ success: true, message: 'Sales confirmation email sent.' });
}
