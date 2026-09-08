import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const rawReplacements = await apiClient.get('/api/replacements', {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    const replacements = (rawReplacements || []).map((r: any) => {
      const oldItemsList = r.oldItems || [];
      const newItemsList = r.newItems || [];

      const lastItemsStr = oldItemsList.map((i: any) => i.itemName).filter(Boolean).join(', ') || '—';
      const lastSizesStr = oldItemsList.map((i: any) => i.size).filter(Boolean).join(', ') || '—';
      const newItemsStr = newItemsList.map((i: any) => i.itemName).filter(Boolean).join(', ') || '—';
      const newSizesStr = newItemsList.map((i: any) => i.size).filter(Boolean).join(', ') || '—';

      return {
        id: r.id,
        rowIndex: r.id,
        invoiceNumber: r.invoiceNumber || '',
        invoiceStatus: r.invoiceStatus || 'APPROVED',
        lastItems: lastItemsStr,
        lastSizes: lastSizesStr,
        totalItems: String(oldItemsList.reduce((acc: number, curr: any) => acc + (curr.quantity || 1), 0)),
        newItems: newItemsStr,
        newSizes: newSizesStr,
        disposition: r.dispositionOfOldItems || '',
        restockDestination: r.restockDestination || '',
        newStockSource: r.newStockSource || '',
        newFinalItemsTotalAmount: r.newTotalAmount != null ? String(r.newTotalAmount) : '0',
        oldItems: oldItemsList,
        newItemsList: newItemsList,
        createdAt: r.createdAt || '',
        version: String(r.version || 1),
      };
    });

    return Response.json({ replacements });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load replacements." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const saved = await apiClient.post('/api/replacements', body, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json({ success: true, replacement: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't create replacement." }, { status: 500 });
  }
}
