import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ announcements: [] });
}
