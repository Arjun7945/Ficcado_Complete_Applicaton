import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 10 },
    { duration: '10s', target: 30 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

const CRM_URL = __ENV.FICCADO_DATA_URL || 'http://localhost:8081';
const PAYMENT_URL = __ENV.PAYMENT_GATEWAY_URL || 'http://localhost:8083';
const INTERNAL_SECRET = __ENV.INTERNAL_API_KEY || 'ficcado-internal-service-secret-key-change-in-prod';

export default function () {
  const customerId = (__VU % 50) + 1;

  // 1. Request database price quote
  const quotePayload = JSON.stringify({
    items: [
      { itemId: 1, size: 'L', quantity: 1 },
    ],
    courierOptionId: 'del-standard',
  });

  const quoteHeaders = {
    'Content-Type': 'application/json',
    'X-Internal-Secret': INTERNAL_SECRET,
    'X-Correlation-Id': `FIC-LOAD-QUOTE-${__VU}-${__ITER}`,
  };

  const quoteRes = http.post(`${CRM_URL}/api/internal/orders/quote`, quotePayload, { headers: quoteHeaders });
  check(quoteRes, {
    'checkout quote status is 200': (r) => r.status === 200,
    'checkout quote responded within 800ms': (r) => r.timings.duration < 800,
  });

  // 2. Create payment order against mocked Razorpay
  const orderPayload = JSON.stringify({
    items: [
      { itemId: 1, itemName: 'TEE - BLACK', size: 'L', quantity: 1, price: 1499.00 },
    ],
    addressId: 1,
    shippingAddress: '123 Ficcado Lane, Bangalore, 560001',
    courierPartner: 'Express Surface Logistics',
    deliveryCharge: 0,
    customerName: 'Load Test Customer',
    customerEmail: `load_${__VU}@example.com`,
    customerPhone: '+919876543210',
  });

  const orderHeaders = {
    'Content-Type': 'application/json',
    'X-Customer-Id': String(customerId),
    'X-Correlation-Id': `FIC-LOAD-ORDER-${__VU}-${__ITER}`,
  };

  const orderRes = http.post(`${PAYMENT_URL}/api/payments/orders`, orderPayload, { headers: orderHeaders });
  check(orderRes, {
    'order creation status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    'order creation responded within 800ms': (r) => r.timings.duration < 800,
  });

  sleep(0.5);
}
