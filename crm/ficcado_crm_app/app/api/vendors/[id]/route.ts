import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const body = await request.json();
    const rawContacts = body.contactNumbers || body.phoneNumbers || [];
    const contacts = Array.isArray(rawContacts)
      ? rawContacts.map((c: any) => String(c).trim()).filter(Boolean)
      : String(rawContacts).split(',').map((c) => c.trim()).filter(Boolean);

    const payload = {
      vendorName: body.vendorName,
      vendorType: body.vendorType,
      customVendorType: body.customVendorType || '',
      emailId: body.emailId || '',
      purposeUse: body.purposeUse || '',
      contactNumbers: contacts,
    };

    const updated = await apiClient.put(`/api/vendors/${params.id}`, payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true, vendor: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update vendor." }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    await apiClient.delete(`/api/vendors/${params.id}`, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't delete vendor." }, { status: 500 });
  }
}
