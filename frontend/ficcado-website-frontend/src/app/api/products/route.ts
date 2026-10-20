// =============================================================================
// Public Catalog Endpoint — /api/products
// Cached at edge with s-maxage=60, rate-limited per IP, unified API envelope.
// =============================================================================

import { NextRequest } from 'next/server';
import { getProducts } from '@/lib/products';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, 'products', 60, 60);

    if (!rateCheck.success) {
      return apiError(
        'RATE_LIMITED',
        'Too many product requests. Please slow down.',
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
          },
        }
      );
    }

    const products = await getProducts();

    return apiSuccess(products, {
      cacheControl: 'public, s-maxage=60, stale-while-revalidate=300',
    });
  } catch (err) {
    console.error('[GET /api/products] Error fetching products:', err);
    return apiError(
      'CATALOG_FETCH_FAILED',
      'Unable to load product catalog. Please try again shortly.',
      { status: 500 }
    );
  }
}
