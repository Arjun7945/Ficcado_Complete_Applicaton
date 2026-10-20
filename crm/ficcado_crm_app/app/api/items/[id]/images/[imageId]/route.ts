export const dynamic = 'force-dynamic';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

// DELETE /api/items/[id]/images/[imageId] — Delete image
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string; imageId: string }> }
) {
  const { id, imageId } = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  const res = await fetch(`${API_BASE_URL}/api/items/${id}/images/${imageId}`, {
    method: 'DELETE',
    headers: { cookie: cookieHeader },
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
