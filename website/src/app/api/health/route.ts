// =============================================================================
// Health & Diagnostic Endpoint — /api/health
// Protected by ADMIN_TOKEN per Decision D4. Returns status flags only (Zero PII).
// =============================================================================

import type { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { apiSuccess, apiError } from '../../../lib/apiResponse.ts';

export const dynamic = 'force-dynamic';

function verifyAdminToken(req: NextRequest): boolean {
  const configuredToken = process.env.ADMIN_TOKEN;
  if (!configuredToken) return false;

  // 1. Check Authorization header: Bearer <token>
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer === configuredToken) return true;
  }

  // 2. Check query param: ?token=<token>
  const url = new URL(req.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken && queryToken === configuredToken) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req)) {
    return apiError('UNAUTHORIZED', 'Invalid or missing administrator token.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Bearer realm="Admin"',
      },
    });
  }

  // Inspect build-time snapshot file existence
  let snapshotAvailable = false;
  try {
    const snapshotPath = path.resolve(process.cwd(), 'src/generated/products-snapshot.json');
    snapshotAvailable = fs.existsSync(snapshotPath);
  } catch {
    snapshotAvailable = false;
  }

  const orderGatewayConfigured = Boolean(
    (process.env.ORDER_GATEWAY_URL && process.env.ORDER_GATEWAY_SECRET) ||
    process.env.ORDER_ID_MODE === 'sheet-row'
  );

  const rateLimitStore = process.env.RATE_LIMIT_STORE || 'memory';
  const privacyEmailConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVACY_EMAIL);
  const whatsappConfigured = Boolean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);

  return apiSuccess(
    {
      status: 'healthy',
      timestamp: Date.now(),
      checks: {
        orderGatewayConfigured,
        rateLimitStore,
        productsSnapshotAvailable: snapshotAvailable,
        privacyEmailConfigured,
        whatsappConfigured,
      },
    },
    {
      cacheControl: 'no-store, no-cache, must-revalidate',
    }
  );
}
