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

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8081';

export default function () {
  const params = {
    headers: {
      'Accept': 'application/json',
      'X-Correlation-Id': `FIC-LOAD-CATALOG-${__VU}-${__ITER}`,
    },
  };

  // 1. Browse product catalog (hit cached listing)
  const listRes = http.get(`${BASE_URL}/api/public/products`, params);
  check(listRes, {
    'product list status is 200': (r) => r.status === 200,
    'product list responded within 800ms': (r) => r.timings.duration < 800,
  });

  // 2. Fetch product detail by ID (cached detail)
  const detailRes = http.get(`${BASE_URL}/api/public/products/1`, params);
  check(detailRes, {
    'product detail status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'product detail responded within 800ms': (r) => r.timings.duration < 800,
  });

  // 3. Fetch active categories
  const categoriesRes = http.get(`${BASE_URL}/api/public/categories`, params);
  check(categoriesRes, {
    'categories status is 200': (r) => r.status === 200,
    'categories responded within 800ms': (r) => r.timings.duration < 800,
  });

  sleep(0.3);
}
