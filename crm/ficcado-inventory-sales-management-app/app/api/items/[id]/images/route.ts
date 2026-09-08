export const dynamic = 'force-dynamic';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// GET /api/items/[id]/images — List item images
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  const res = await fetch(`${API_BASE_URL}/api/items/${id}/images`, {
    headers: { cookie: cookieHeader },
  });
  let data = {};
  try { data = await res.json(); } catch { data = []; }
  return Response.json(data, { status: res.status });
}

// POST /api/items/[id]/images — Upload image (multipart/form-data)
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  
  try {
    const incomingFormData = await request.formData();
    const file = incomingFormData.get('file');

    if (!file) {
      return Response.json({ error: 'No image file provided' }, { status: 400 });
    }

    const outgoingFormData = new FormData();
    outgoingFormData.append('file', file);
    const caption = incomingFormData.get('caption');
    if (caption) outgoingFormData.append('caption', caption.toString());

    const res = await fetch(`${API_BASE_URL}/api/items/${id}/images`, {
      method: 'POST',
      headers: {
        cookie: cookieHeader,
      },
      body: outgoingFormData,
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = { error: `Backend upload status ${res.status}` };
    }

    return Response.json(data, { status: res.status });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Image proxy upload failed' }, { status: 500 });
  }
}

// PUT /api/items/[id]/images/reorder
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  const body = await request.json();

  const res = await fetch(`${API_BASE_URL}/api/items/${id}/images/reorder`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookieHeader,
    },
    body: JSON.stringify(body),
  });

  let data = {};
  try { data = await res.json(); } catch { data = { error: 'Failed to reorder' }; }
  return Response.json(data, { status: res.status });
}
