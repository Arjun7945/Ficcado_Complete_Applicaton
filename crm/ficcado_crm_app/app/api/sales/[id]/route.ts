import { apiClient } from '@/lib/apiClient';
import { mapSaleResponse } from '@/lib/saleMapper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const rawSale = !/^\d+$/.test(params.id)
      ? await apiClient.get(`/api/sales/by-invoice/${encodeURIComponent(params.id)}`, { headers: { cookie: cookieHeader } })
      : await apiClient.get(`/api/sales/${params.id}`, { headers: { cookie: cookieHeader } });
    return Response.json({ sale: mapSaleResponse(rawSale) });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Sale not found.' }, { status: 404 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cookieHeader = request.headers.get('cookie') || '';
  try {
    const body = await request.json();
    let numericId = params.id;
    if (!/^\d+$/.test(params.id)) {
      const existing = await apiClient.get<any>(`/api/sales/by-invoice/${encodeURIComponent(params.id)}`, {
        headers: { cookie: cookieHeader },
      });
      numericId = String(existing.id);
    }

    if (body.requestAction === 'replace_requested' || body.requestAction === 'replace') {
      const resp = await apiClient.post<any>(`/api/sales/${numericId}/request-replacement`, {}, {
        headers: { cookie: cookieHeader },
      });
      return Response.json({
        success: true,
        message: `Sale ${params.id} moved to Replacement Management.`,
        sale: mapSaleResponse(resp),
      });
    }

    if (body.requestAction === 'refund_requested' || body.requestAction === 'refund') {
      const resp = await apiClient.post<any>(`/api/sales/${numericId}/request-refund`, {}, {
        headers: { cookie: cookieHeader },
      });
      return Response.json({
        success: true,
        message: `Sale ${params.id} moved to Return/Refund Management.`,
        sale: mapSaleResponse(resp),
      });
    }

    const payload: any = {
      version: body.version,
      customerName: body.customerName,
      customerPhoneNumber: body.customerPhoneNumber || body.customerPhone,
      customerAddress: body.customerAddress,
      customerEmail: body.customerEmail,
      saleStatus: body.saleStatus,
      paymentStatus: body.paymentStatus,
      modeOfPayment: body.modeOfPayment,
      transactionId: body.transactionId,
      deliveryStatus: body.deliveryStatus,
      deliveryChargeEnabled: body.deliveryChargeEnabled !== undefined ? body.deliveryChargeEnabled : body.deliveryChargeToggle,
      deliveryChargeAmount: body.deliveryChargeAmount !== undefined ? parseFloat(body.deliveryChargeAmount || '0') : undefined,
      fulfilmentSource: body.fulfilmentSource,
      discount: body.discount !== undefined ? parseFloat(body.discount || '0') : undefined,
      totalAmount: body.totalAmount !== undefined ? parseFloat(body.totalAmount || '0') : undefined,
      receivedBy: body.receivedBy,
      remarks: body.remarks,
      saleClosedByAdminId: body.saleClosedByAdminId,
    };

    const updated = await apiClient.put(`/api/sales/${numericId}`, payload, {
      headers: { cookie: cookieHeader },
    });
    return Response.json({ success: true, sale: mapSaleResponse(updated) });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't update sale." }, { status: 500 });
  }
}
