/**
 * lib/auth.ts
 *
 * JWT-based session management for admin authentication.
 *
 * The JWT secret is derived from GOOGLE_SERVICE_ACCOUNT_KEY so no separate
 * JWT_SECRET env var is strictly required (though one is provided in .env.local
 * for clarity). Falls back gracefully to the env var if set.
 */

import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'ficcado_session';
export const SESSION_DURATION = '12h';

export type AdminRole = 'superadmin' | 'admin';

export interface SessionAdmin {
  id:          string; // Admin id (sub)
  username?:   string;
  name:        string; // adminName
  email:       string;
  role:        AdminRole;
}

/** Get the JWT signing secret synchronized with backend. */
function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  return 'ficcado-jwt-secret-key-32-bytes-minimum-length-for-hs256!';
}

/** Sign a JWT for an admin session. */
export function signJwt(payload: SessionAdmin): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_DURATION });
}

/** Verify and decode a JWT. Returns null if invalid or expired. */
export function verifyJwt(token: string): SessionAdmin | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    if (!decoded) return null;
    return {
      id: decoded.sub || decoded.id || '',
      username: decoded.email || decoded.username || '',
      name: decoded.adminName || decoded.name || 'Admin',
      email: decoded.email || '',
      role: (decoded.role?.toLowerCase() === 'superadmin' ? 'superadmin' : 'admin'),
    };
  } catch {
    return null;
  }
}

export async function resolveAdminName(sessionAdmin: SessionAdmin): Promise<SessionAdmin> {
  return sessionAdmin;
}


/**
 * Read the session cookie and return the authenticated admin.
 * Returns null if not authenticated or session is expired/invalid.
 */
export async function getSessionAdmin(): Promise<SessionAdmin | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

/**
 * Throws a 401 Response if not authenticated.
 */
export async function requireAuth(): Promise<SessionAdmin> {
  const admin = await getSessionAdmin();
  if (!admin) {
    throw new Response(
      JSON.stringify({ error: 'Not authenticated. Please log in.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return await resolveAdminName(admin);
}

/**
 * Helper that resolves session admin or returns a standard 401 Response cleanly.
 */
export async function getAuthSession(): Promise<{ admin: SessionAdmin } | { errorResponse: Response }> {
  try {
    const admin = await requireAuth();
    return { admin };
  } catch (e) {
    if (e instanceof Response) return { errorResponse: e };
    return { errorResponse: Response.json({ error: 'Authentication required.' }, { status: 401 }) };
  }
}

/**
 * Throws a 403 Response if not an Admin or Superadmin.
 */
export async function requireSuperadmin(): Promise<SessionAdmin> {
  const admin = await requireAuth();
  if (admin.role !== 'superadmin' && admin.role !== 'admin') {
    throw new Response(
      JSON.stringify({ error: 'This action requires Admin privileges.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return admin;
}

/** Build a Set-Cookie header value for the session token. */
export function buildSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/${secure}; Max-Age=43200`;
}

/** Build a cookie that clears the session. */
export function buildClearCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}
