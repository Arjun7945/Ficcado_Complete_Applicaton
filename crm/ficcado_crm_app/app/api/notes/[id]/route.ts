import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    const noteContent = body.noteContent || body.content;
    const updated = await apiClient.put(`/api/keep-notes/${params.id}`, { noteContent }, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true, note: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update note." }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await apiClient.delete(`/api/keep-notes/${params.id}`, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't delete note." }, { status: 500 });
  }
}
