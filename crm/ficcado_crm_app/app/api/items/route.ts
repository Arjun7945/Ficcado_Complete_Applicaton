import { apiClient } from '@/lib/apiClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const rawItems = await apiClient.get('/api/items', {
      headers: { cookie: request.headers.get('cookie') || '' },
    });
    const items = (rawItems || []).map((it: any) => {
      const rawStatus = String(it.currentStatus || 'ACTIVE').toUpperCase();
      const STATUS_LABEL_MAP: Record<string, string> = {
        ACTIVE: 'In Stock',
        IN_STOCK: 'In Stock',
        OUT_OF_STOCK: 'Out of Stock',
        OUT: 'Out of Stock',
        INACTIVE: 'Inactive',
        DISCONTINUED: 'Discontinued',
      };
      const statusLabel = STATUS_LABEL_MAP[rawStatus] ?? (rawStatus.includes('DISCONTINU') ? 'Discontinued' : 'In Stock');


      return {
        id: it.id,
        sno: String(it.id),
        itemName: it.itemName,
        itemType: it.itemType || '',
        price: String(it.priceOfItem || 0),
        costPrice: String(it.costPrice || 0),
        sizes: Array.isArray(it.sizes) ? it.sizes.map((s: any) => s.size || s).join(', ') : '',
        currentStatus: it.currentStatus || 'ACTIVE',
        status: statusLabel,
        coverThumbnailUrl: it.coverThumbnailUrl || null,
        images: it.images || [],
        averageRating: it.averageRating || 0,
        reviewCount: it.reviewCount || 0,
      };
    });

    return Response.json({ items });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't load items." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sizes = Array.isArray(body.availableSizes)
      ? body.availableSizes
      : String(body.availableSizes || '').split(',').map((s) => s.trim()).filter(Boolean);

    const payload = {
      itemName: body.itemName,
      itemType: body.itemType,
      priceOfItem: parseFloat(body.priceOfItem || 0),
      costPrice: parseFloat(body.costPrice || 0),
      sizes,
      currentStatus: body.currentStatus || 'ACTIVE',
    };

    const saved = await apiClient.post('/api/items', payload, {
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    return Response.json({ success: true, message: `Item '${saved.itemName}' created.`, item: saved }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message || "Couldn't create item." }, { status: 500 });
  }
}
