import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 15 },
    { duration: '15s', target: 35 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

const CRM_URL = __ENV.FICCADO_DATA_URL || 'http://localhost:8081';
const WEBSITE_DATA_URL = __ENV.WEBSITE_DATA_URL || 'http://localhost:8082';
const PAYMENT_URL = __ENV.PAYMENT_GATEWAY_URL || 'http://localhost:8083';
const INTERNAL_SECRET = __ENV.INTERNAL_API_KEY || 'ficcado-internal-service-secret-key-change-in-prod';
const GATEWAY_SECRET = __ENV.GATEWAY_SHARED_SECRET || 'ficcado-gateway-internal-secret-2026';

export default function () {
  const customerId = (__VU % 50) + 1;
  const correlationId = `FIC-LOAD-FULL-${__VU}-${__ITER}`;

  group('Catalog Browsing', function () {
    const res = http.get(`${CRM_URL}/api/public/products`, {
      headers: { 'X-Correlation-Id': correlationId },
    });
    check(res, {
      'catalog responded < 800ms': (r) => r.timings.duration < 800,
    });
  });

  group('Wishlist Operations', function () {
    const res = http.get(`${WEBSITE_DATA_URL}/api/wishlist`, {
      headers: {
        'X-Gateway-Secret': GATEWAY_SECRET,
        'X-Customer-Id': String(customerId),
        'X-Correlation-Id': correlationId,
      },
    });
    check(res, {
      'wishlist responded < 800ms': (r) => r.timings.duration < 800,
    });
  });

  group('Checkout & Payment Order', function () {
    const quotePayload = JSON.stringify({
      items: [{ itemId: 1, size: 'L', quantity: 1 }],
      courierOptionId: 'del-standard',
    });

    const quoteRes = http.post(`${CRM_URL}/api/internal/orders/quote`, quotePayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET,
        'X-Correlation-Id': correlationId,
      },
    });
    check(quoteRes, {
      'quote responded < 800ms': (r) => r.timings.duration < 800,
    });
  });

  sleep(0.5);
}
