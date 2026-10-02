import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

function formatCustomer(c: any) {
  if (!c || (!c.id && !c.customerName && !c.phoneNumber)) return null;
  const rawAddrs = Array.isArray(c.addresses) ? c.addresses : [];
  const addresses = rawAddrs.map((a: any, idx: number) => ({
    label: a.isDefault ? 'Default' : (a.label || `Address ${idx + 1}`),
    address: typeof a === 'string' ? a : a.address || '',
  }));
  const firstAddress = addresses.length > 0 ? addresses[0].address : '';

  return {
    id: c.id,
    sno: String(c.id),
    name: c.customerName || c.name || '',
    customerName: c.customerName || c.name || '',
    phone: c.phoneNumber || c.phone || '',
    phoneNumber: c.phoneNumber || c.phone || '',
    email: c.emailId || c.email || '',
    emailId: c.emailId || c.email || '',
    totalOrders: String(c.totalOrdersPlaced ?? c.totalOrders ?? 0),
    totalOrdersPlaced: c.totalOrdersPlaced ?? c.totalOrders ?? 0,
    addresses,
    address: firstAddress,
    invoiceNumbers: '',
    createdAt: c.createdAt || '',
  };
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (phone) {
      try {
        const cust = await apiClient.get(`/api/customers/lookup?phone=${encodeURIComponent(phone)}`, {
          headers: { cookie: cookieHeader },
        });
        const formatted = formatCustomer(cust);
        return Response.json({
          found: Boolean(formatted),
          customer: formatted,
        });
      } catch {
        return Response.json({ found: false, customer: null });
      }
    }

    const rawCustomers = await apiClient.get('/api/customers', {
      headers: { cookie: cookieHeader },
    });
    const customers = (Array.isArray(rawCustomers) ? rawCustomers : []).map(formatCustomer);
    return Response.json({ customers });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load customer records." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const body = await request.json();
    const rawAddrs = Array.isArray(body.addresses) ? body.addresses : [];
    const cleanAddresses = rawAddrs
      .map((a: any) => (typeof a === 'string' ? a : a.address || ''))
      .map((s: string) => s.trim())
      .filter(Boolean);

    const payload = {
      phone: body.phone || body.phoneNumber,
      name: body.name || body.customerName,
      email: body.email || body.emailId || '',
      addresses: cleanAddresses,
    };

    const updated = await apiClient.put('/api/customers', payload, {
      headers: { cookie: cookieHeader },
    });

    return Response.json({ success: true, customer: formatCustomer(updated) });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update customer profile." }, { status: 500 });
  }
}
