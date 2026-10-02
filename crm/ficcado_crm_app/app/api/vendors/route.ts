import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const rawVendors = await apiClient.get('/api/vendors', {
      headers: { cookie: cookieHeader },
    });
    const vendors = (rawVendors || []).map((v: any) => ({
      id: v.id,
      sno: String(v.id),
      vendorName: v.vendorName,
      vendorType: v.vendorType,
      customVendorType: v.customVendorType || '',
      emailId: v.emailId || '',
      purposeUse: v.purposeUse || '',
      totalAmountPaid: String(v.totalAmountPaid || 0),
      contactNumbers: (v.contactNumbers || []).join(', '),
      phoneNumbers: Array.isArray(v.contactNumbers) ? v.contactNumbers : [],
      contactDetails: (v.contactNumbers || []).join(', '),
    }));

    return Response.json({ vendors });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load vendors." }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const saved = await apiClient.post('/api/vendors', payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json({ success: true, message: `Vendor '${saved.vendorName}' created.`, vendor: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't create vendor." }, { status: 500 });
  }
}
