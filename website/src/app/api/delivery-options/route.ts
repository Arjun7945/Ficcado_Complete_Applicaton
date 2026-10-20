// =============================================================================
// Public Delivery Options Endpoint — /api/delivery-options
// Cached at edge with s-maxage=60, rate-limited, strictly pruned (no phone/address).
// =============================================================================

import { NextRequest } from 'next/server';
import { getCourierPartners } from '@/lib/couriers';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, 'delivery-options', 60, 60);

    if (!rateCheck.success) {
      return apiError(
        'RATE_LIMITED',
        'Too many delivery options requests. Please try again shortly.',
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
          },
        }
      );
    }

    const rawPartners = await getCourierPartners();

    // Strictly sanitize and prune fields: id, name, charge, delivery_time only
    const options = rawPartners.map((p) => ({
      id: p.id,
      name: p.name,
      charge: p.rate,
      rate: p.rate,
      deliveryTime: p.deliveryTime,
      delivery_time: p.deliveryTime,
      status: p.status,
    }));

    return apiSuccess(options, {
      cacheControl: 'public, s-maxage=60, stale-while-revalidate=300',
    });
  } catch (err) {
    console.error('[GET /api/delivery-options] Error fetching options:', err);
    return apiError(
      'DELIVERY_FETCH_FAILED',
      'Unable to load delivery options. Please try again shortly.',
      { status: 500 }
    );
  }
}
