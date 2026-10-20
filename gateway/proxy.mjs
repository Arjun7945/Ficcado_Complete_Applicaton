#!/usr/bin/env node
/**
 * =============================================================================
 * Ficcado API Gateway — Local Node.js Proxy Server (Port 8000)
 * =============================================================================
 * Zero-dependency native Node.js HTTP reverse proxy replicating gateway/nginx.conf.
 * Dispatches requests across all three Ficcado backend microservices on Windows,
 * macOS, and Linux without requiring a system NGINX installation.
 *
 * Microservices:
 *   - Ficcado-Data (Core CRM, Catalog, Sales):       http://127.0.0.1:8081
 *   - Ficcado-Website-Data (Enquiries, Complaints): http://127.0.0.1:8082
 *   - Ficcado-Payment-Gateway-Data (Razorpay):      http://127.0.0.1:8083
 * =============================================================================
 */

import http from 'node:http';
import { URL } from 'node:url';

const GATEWAY_PORT = Number(process.env.GATEWAY_PORT || 8000);
const FICCADO_DATA_URL = process.env.FICCADO_DATA_URL || 'http://127.0.0.1:8081';
const FICCADO_WEBSITE_DATA_URL = process.env.FICCADO_WEBSITE_DATA_URL || 'http://127.0.0.1:8082';
const FICCADO_PAYMENT_URL = process.env.FICCADO_PAYMENT_URL || 'http://127.0.0.1:8083';

const ALLOWED_ORIGIN_REGEX = /^https?:\/\/(localhost:3000|localhost:3001|ficcado\.in|.*\.ficcado\.in)$/i;

function applyCorsHeaders(req, res) {
  const origin = req.headers['origin'];
  if (origin && ALLOWED_ORIGIN_REGEX.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, Origin, X-Requested-With, Cookie');
    res.setHeader('Access-Control-Max-Age', '3600');
  }
  // Global security headers
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function proxyRequest(targetBaseUrl, targetPath, req, res) {
  const targetParsed = new URL(targetBaseUrl);
  const options = {
    hostname: targetParsed.hostname,
    port: targetParsed.port,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${targetParsed.hostname}:${targetParsed.port}`,
      'x-forwarded-for': req.socket.remoteAddress || '127.0.0.1',
      'x-forwarded-proto': 'http',
      'x-forwarded-host': req.headers['host'] || `localhost:${GATEWAY_PORT}`,
      'x-real-ip': req.socket.remoteAddress || '127.0.0.1'
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    applyCorsHeaders(req, res);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[Gateway Proxy Error] Target: ${targetBaseUrl}${targetPath} - ${err.message}`);
    applyCorsHeaders(req, res);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 502,
        error: 'Bad Gateway',
        message: `Upstream service at ${targetBaseUrl} is unreachable`,
        details: err.message
      }));
    }
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${GATEWAY_PORT}`);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    applyCorsHeaders(req, res);
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Gateway Self Health Check
  if (pathname === '/health') {
    applyCorsHeaders(req, res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'UP',
      gateway: 'Ficcado API Gateway (Node.js Proxy)',
      port: GATEWAY_PORT,
      version: '1.0.0',
      upstreams: {
        ficcadoData: FICCADO_DATA_URL,
        ficcadoWebsiteData: FICCADO_WEBSITE_DATA_URL,
        ficcadoPaymentGateway: FICCADO_PAYMENT_URL
      }
    }));
    return;
  }

  // 2. Microservice Actuator Health Checks via Gateway
  if (pathname === '/health/ficcado-data') {
    proxyRequest(FICCADO_DATA_URL, '/actuator/health', req, res);
    return;
  }
  if (pathname === '/health/website-data') {
    proxyRequest(FICCADO_WEBSITE_DATA_URL, '/actuator/health', req, res);
    return;
  }
  if (pathname === '/health/payment-gateway') {
    proxyRequest(FICCADO_PAYMENT_URL, '/actuator/health', req, res);
    return;
  }

  // 3. SECURITY GUARD: Block Internal Endpoints from Public Invocation
  if (pathname.startsWith('/api/internal/')) {
    applyCorsHeaders(req, res);
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      message: 'Access forbidden: internal endpoints cannot be invoked through the public gateway.'
    }));
    return;
  }

  // 4. Ficcado-Website-Data Routes (Port 8082)
  if (
    pathname.startsWith('/api/v1/enquiries') ||
    pathname.startsWith('/api/v1/complaints') ||
    pathname.startsWith('/api/v1/notifications') ||
    pathname.startsWith('/api/v1/otp')
  ) {
    proxyRequest(FICCADO_WEBSITE_DATA_URL, req.url, req, res);
    return;
  }

  // 5. Ficcado-Payment-Gateway-Data Routes (Port 8083)
  if (
    pathname.startsWith('/api/v1/payments') ||
    pathname.startsWith('/api/v1/webhooks/razorpay')
  ) {
    proxyRequest(FICCADO_PAYMENT_URL, req.url, req, res);
    return;
  }

  // 6. Ficcado-Data Primary Service (Port 8081)
  if (pathname.startsWith('/api/')) {
    proxyRequest(FICCADO_DATA_URL, req.url, req, res);
    return;
  }

  // 7. Fallback: Not Found
  applyCorsHeaders(req, res);
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 404,
    error: 'Not Found',
    message: `No gateway route configured for ${pathname}`
  }));
});

server.listen(GATEWAY_PORT, () => {
  console.log(`=============================================================`);
  console.log(`  Ficcado API Gateway running on http://localhost:${GATEWAY_PORT}`);
  console.log(`  - Ficcado-Data (Port 8081):         ${FICCADO_DATA_URL}`);
  console.log(`  - Ficcado-Website-Data (Port 8082): ${FICCADO_WEBSITE_DATA_URL}`);
  console.log(`  - Ficcado-Payment-Data (Port 8083): ${FICCADO_PAYMENT_URL}`);
  console.log(`=============================================================`);
});
