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
  const email = `testuser_${__VU}@example.com`;
  const password = 'Password123!';

  // 1. Customer login attempt
  const loginPayload = JSON.stringify({ email, password });
  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-Id': `FIC-LOAD-LOGIN-${__VU}-${__ITER}`,
    },
  };

  const loginRes = http.post(`${BASE_URL}/api/customer/auth/login`, loginPayload, loginParams);
  check(loginRes, {
    'login responded within 800ms': (r) => r.timings.duration < 800,
    'login status is valid HTTP response': (r) => r.status === 200 || r.status === 401 || r.status === 404,
  });

  // 2. Session read
  const sessionParams = {
    headers: {
      'X-Correlation-Id': `FIC-LOAD-SESSION-${__VU}-${__ITER}`,
    },
  };
  const sessionRes = http.get(`${BASE_URL}/api/customer/session`, sessionParams);
  check(sessionRes, {
    'session check responded within 800ms': (r) => r.timings.duration < 800,
  });

  // 3. Session touch keep-alive
  const touchRes = http.post(`${BASE_URL}/api/customer/session/touch`, null, loginParams);
  check(touchRes, {
    'session touch responded within 800ms': (r) => r.timings.duration < 800,
  });

  sleep(0.5);
}
