import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge route protection middleware (FE-003).
 * Intercepts dashboard routes to ensure ficcado_session cookie is present,
 * and prevents authenticated users from landing on the login page.
 */
export function proxy(request: NextRequest) {
  const session = request.cookies.get('ficcado_session')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  if (isDashboard && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard/sales', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
