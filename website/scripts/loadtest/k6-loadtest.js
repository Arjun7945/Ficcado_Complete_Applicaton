// =============================================================================
// k6 Load Test Script — Ficcado E-Commerce / High-Traffic Drop Simulation
// Run: k6 run scripts/loadtest/k6-loadtest.js
// =============================================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// Custom failure rate metric
const errorRate = new Rate('errors');

// Test options: 3-stage load curve simulating a streetwear capsule drop
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 users
    { duration: '1m', target: 100 },  // Surge to 100 concurrent users during drop announcement
    { duration: '30s', target: 200 }, // Peak drop demand: 200 concurrent users
    { duration: '1m', target: 200 },  // Sustain peak
    { duration: '30s', target: 0 },   // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    errors: ['rate<0.01'],            // Error rate must remain under 1%
  },
};

const BASE_URL = __ENV.SITE_URL || 'http://localhost:3000';

export default function runLoadTest() {
  // 1. Homepage & Static Assets (Cache-First)
  group('01_Homepage_Load', () => {
    const res = http.get(`${BASE_URL}/`, {
      tags: { name: 'Homepage' },
    });
    const success = check(res, {
      'homepage status is 200': (r) => r.status === 200,
      'body contains Ficcado': (r) => r.body.includes('Ficcado'),
    });
    errorRate.add(!success);
    sleep(1);
  });

  // 2. Catalog & Category Browsing (ISR Cached)
  group('02_Catalog_Browsing', () => {
    const categories = ['t-shirts', 'combos', 'hoodies'];
    const slug = categories[Math.floor(Math.random() * categories.length)];

    const res = http.get(`${BASE_URL}/categories/${slug}`, {
      tags: { name: `Category_${slug}` },
    });
    const success = check(res, {
      'category status is 200': (r) => r.status === 200,
    });
    errorRate.add(!success);
    sleep(1.5);
  });

  // 3. Checkout Page Initial Render
  group('03_Checkout_View', () => {
    const res = http.get(`${BASE_URL}/checkout`, {
      tags: { name: 'Checkout_Page' },
    });
    const success = check(res, {
      'checkout status is 200': (r) => r.status === 200,
      'has delivery form': (r) => r.body.includes('Delivery Address') || r.body.includes('Delivery'),
    });
    errorRate.add(!success);
    sleep(1);
  });

  // 4. Support Inquiry Submission (Simulate 1 out of 20 users submitting a support ticket)
  if (__ITER % 20 === 0) {
    group('04_Support_Inquiry_Submission', () => {
      const payload = JSON.stringify({
        type: 'general',
        name: 'Load Test Visitor',
        email: `loadtest_${__VU}_${__ITER}@example.com`,
        message: 'Checking fabric specs for upcoming drop.',
      });

      const params = {
        headers: {
          'Content-Type': 'application/json',
        },
        tags: { name: 'Support_Inquiry_API' },
      };

      const res = http.post(`${BASE_URL}/api/inquiry`, payload, params);
      const success = check(res, {
        'inquiry status is 200 or 429': (r) => r.status === 200 || r.status === 429,
      });
      errorRate.add(!success);
      sleep(2);
    });
  }
}
