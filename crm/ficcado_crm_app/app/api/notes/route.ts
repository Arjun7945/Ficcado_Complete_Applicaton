import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const rawNotes = await apiClient.get('/api/keep-notes', {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    const notes = (rawNotes || []).map((n: any) => ({
      id: n.id,
      noteContent: n.noteContent,
      createdBy: n.createdByAdminName || 'Admin',
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));

    return Response.json({ notes });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load notes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = {
      noteContent: body.noteContent || body.content,
    };

    const saved = await apiClient.post('/api/keep-notes', payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json({ success: true, note: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't create note." }, { status: 500 });
  }
}
