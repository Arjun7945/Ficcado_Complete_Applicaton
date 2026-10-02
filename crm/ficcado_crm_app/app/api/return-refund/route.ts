import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const rawList = await apiClient.get('/api/return-refunds', {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    const list = Array.isArray(rawList) ? rawList : [];

    const records = list.map((rr: any) => {
      const items = rr.returnedItems || [];
      const itemNames = items.map((i: any) => i.itemName).filter(Boolean).join(', ') || 'Pending Selection';
      const sizes = items.map((i: any) => i.size).filter(Boolean).join(', ') || '';
      const qty = String(items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0));

      return {
        id: rr.id,
        rowIndex: rr.id,
        invoiceNumber: rr.invoiceNumber,
        refundStatus: rr.refundStatus || 'Pending',
        verificationStatus: rr.itemVerificationStatus || '',
        refundAmount: rr.refundAmount != null ? String(rr.refundAmount) : '0',
        returnedItems: itemNames,
        returnedSizes: sizes,
        returnedQty: qty,
        createdAt: rr.createdAt || '',
        createdBy: '',
        version: String(rr.version || 1),
      };
    });

    return Response.json({ records, returnRefunds: list });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load return refunds." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const saved = await apiClient.post('/api/return-refunds', body, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json({ success: true, returnRefund: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't create return refund." }, { status: 500 });
  }
}
