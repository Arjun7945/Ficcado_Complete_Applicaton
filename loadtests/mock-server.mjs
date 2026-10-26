import http from 'http';

// Port 8081: Ficcado-Data (Catalog, Session, Quote)
const server8081 = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const correlationId = req.headers['x-correlation-id'] || 'FIC-MOCK-CORR';
  res.setHeader('X-Correlation-Id', correlationId);

  if (req.url === '/api/public/products') {
    res.writeHead(200);
    res.end(JSON.stringify([{ id: 1, name: 'TEE - BLACK', price: 1499.0 }]));
  } else if (req.url.startsWith('/api/public/products/')) {
    res.writeHead(200);
    res.end(JSON.stringify({ id: 1, name: 'TEE - BLACK', price: 1499.0 }));
  } else if (req.url === '/api/public/categories') {
    res.writeHead(200);
    res.end(JSON.stringify(['T-Shirts', 'Hoodies']));
  } else if (req.url === '/api/customer/auth/login') {
    res.writeHead(200);
    res.end(JSON.stringify({ token: 'mock-jwt-token', customerId: 1 }));
  } else if (req.url === '/api/customer/session') {
    res.writeHead(200);
    res.end(JSON.stringify({ active: true, customerId: 1 }));
  } else if (req.url === '/api/customer/session/touch') {
    res.writeHead(200);
    res.end(JSON.stringify({ touched: true }));
  } else if (req.url === '/api/internal/orders/quote') {
    res.writeHead(200);
    res.end(JSON.stringify({
      itemSubtotal: 1499.0,
      deliveryCharge: 0,
      finalTotal: 1499.0,
      courierPartner: 'Express Surface Logistics'
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Port 8082: Ficcado-Website-Data (Wishlist)
const server8082 = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const correlationId = req.headers['x-correlation-id'] || 'FIC-MOCK-CORR';
  res.setHeader('X-Correlation-Id', correlationId);

  if (req.url === '/api/wishlist' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify([{ itemId: 1, createdAt: new Date().toISOString() }]));
  } else if (req.url.startsWith('/api/wishlist/') && req.method === 'PUT') {
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, count: 1 }));
  } else if (req.url.startsWith('/api/wishlist/') && req.method === 'DELETE') {
    res.writeHead(204);
    res.end();
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Port 8083: Ficcado-Payment-Gateway-Data (Payment orders)
const server8083 = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const correlationId = req.headers['x-correlation-id'] || 'FIC-MOCK-CORR';
  res.setHeader('X-Correlation-Id', correlationId);

  if (req.url === '/api/payments/orders' && req.method === 'POST') {
    res.writeHead(201);
    res.end(JSON.stringify({
      transactionId: 'FIC-TXN-LOAD-12345',
      razorpayOrderId: 'order_mock_load_123',
      amountInPaise: 149900,
      currency: 'INR'
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server8081.listen(8081, () => {
  server8082.listen(8082, () => {
    server8083.listen(8083, () => {
      console.log('MOCK_SERVERS_READY');
    });
  });
});
