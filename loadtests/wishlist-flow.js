import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 20 },
    { duration: '10s', target: 50 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

const WEBSITE_DATA_URL = __ENV.WEBSITE_DATA_URL || 'http://localhost:8082';
const GATEWAY_SECRET = __ENV.GATEWAY_SHARED_SECRET || 'ficcado-gateway-internal-secret-2026';

export default function () {
  const customerId = (__VU % 100) + 1;
  const itemId = (__ITER % 20) + 1;

  const authHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Gateway-Secret': GATEWAY_SECRET,
    'X-Customer-Id': String(customerId),
    'X-Correlation-Id': `FIC-LOAD-WISH-${__VU}-${__ITER}`,
  };

  // 1. Fetch customer wishlist
  const getRes = http.get(`${WEBSITE_DATA_URL}/api/wishlist`, { headers: authHeaders });
  check(getRes, {
    'wishlist fetch status is 200': (r) => r.status === 200,
    'wishlist fetch responded within 800ms': (r) => r.timings.duration < 800,
  });

  // 2. Add item to wishlist (idempotent PUT)
  const putRes = http.put(`${WEBSITE_DATA_URL}/api/wishlist/${itemId}`, null, { headers: authHeaders });
  check(putRes, {
    'wishlist add status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'wishlist add responded within 800ms': (r) => r.timings.duration < 800,
  });

  // 3. Remove item from wishlist
  const delRes = http.del(`${WEBSITE_DATA_URL}/api/wishlist/${itemId}`, null, { headers: authHeaders });
  check(delRes, {
    'wishlist remove status is 204': (r) => r.status === 204,
    'wishlist remove responded within 800ms': (r) => r.timings.duration < 800,
  });

  sleep(0.3);
}
