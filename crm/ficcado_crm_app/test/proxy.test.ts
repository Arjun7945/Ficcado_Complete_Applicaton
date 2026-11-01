import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy, config } from '../proxy';

describe('CRM Edge Proxy Route Protection (FE-003 & ISS-06/ISS-07)', () => {
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/sales',
    '/dashboard/items',
    '/dashboard/inventory',
    '/dashboard/customers',
    '/dashboard/warehouse',
    '/dashboard/expenses',
    '/dashboard/reports',
  ];

  it('redirects unauthenticated requests to /login for each protected route', () => {
    for (const route of protectedRoutes) {
      const req = new NextRequest(`http://localhost:3001${route}`);
      const res = proxy(req);

      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toBe('http://localhost:3001/login');
    }
  });

  it('allows authenticated requests with valid session to pass through', () => {
    for (const route of protectedRoutes) {
      const req = new NextRequest(`http://localhost:3001${route}`, {
        headers: {
          cookie: 'ficcado_session=valid_jwt_token',
        },
      });
      const res = proxy(req);

      // NextResponse.next() returns a 200 with x-middleware-next header
      expect(res.status).toBe(200);
      expect(res.headers.get('x-middleware-next')).toBe('1');
    }
  });

  it('redirects authenticated users away from /login to /dashboard/sales', () => {
    const req = new NextRequest('http://localhost:3001/login', {
      headers: {
        cookie: 'ficcado_session=valid_jwt_token',
      },
    });
    const res = proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3001/dashboard/sales');
  });

  it('allows unauthenticated users to view /login page', () => {
    const req = new NextRequest('http://localhost:3001/login');
    const res = proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('leaves unmatched routes and static assets untouched', () => {
    const req = new NextRequest('http://localhost:3001/review/token-123');
    const res = proxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('config matcher covers dashboard routes and login', () => {
    expect(config.matcher).toEqual(['/dashboard/:path*', '/login']);
  });
});
