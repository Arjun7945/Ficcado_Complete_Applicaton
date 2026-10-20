// =============================================================================
// Drop Notification & Early Access API Route Handler — /api/drop-notification
// Records customer email and subscriber ID into Google Sheets 'Drop Notification List' tab
// with rate limiting, anti-injection formula defense, and honest feedback.
// =============================================================================

import { NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { appendSheetValues, sanitizeCell } from '@/lib/sheets/client';
import { formatISTDate } from '@/lib/whatsapp';
import { apiSuccess, apiError } from '@/lib/apiResponse';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function checkOrigin(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host === host) return true;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl && originUrl.origin === new URL(siteUrl).origin) return true;
  } catch {}
  return false;
}

const SubscribeInputSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(120),
  source: z.string().trim().max(100).optional().default('The Drop Notification List'),
  // Honeypot field for bot mitigation
  botHp: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Same-origin check
    if (!checkOrigin(req)) {
      return apiError('FORBIDDEN_ORIGIN', 'Cross-origin request rejected.', { status: 403 });
    }

    // 2. IP Rate limiting (5 subscriptions per 10 minutes)
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, 'drop-notification', 5, 600);
    if (!rateCheck.success) {
      return apiError(
        'RATE_LIMITED',
        'Too many subscription attempts from your network. Please wait a few minutes before trying again.',
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
          },
        }
      );
    }

    const body = await req.json();

    // 3. Honeypot trap check
    if (body.botHp && body.botHp.trim().length > 0) {
      const fakeId = `FIC-DROP-${Date.now().toString(36).toUpperCase()}`;
      return apiSuccess({
        subscriberId: fakeId,
        message: 'Successfully subscribed to drop notifications.',
      });
    }

    // 4. Schema validation
    const parsed = SubscribeInputSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return apiError('VALIDATION_FAILED', firstIssue?.message || 'Invalid email address', {
        status: 400,
        field: firstIssue?.path?.join('.'),
      });
    }

    const { email, source } = parsed.data;

    // 5. Generate unique subscriber ID & timestamp
    const randomSuffix = crypto.randomInt(100, 999);
    const subscriberId = `FIC-DROP-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
    const timestampIST = formatISTDate(new Date());

    const sheetId = process.env.GOOGLE_SHEET_ID || '1U1bdFZH68Seg3OcV3Wtucmsqg8JL5i3MIGECglu_hfs';

    // 6. Format row: subscriber_id, created_at, email, status, source
    const rowValues = [
      sanitizeCell(subscriberId),
      sanitizeCell(timestampIST),
      sanitizeCell(email),
      'Active',
      sanitizeCell(source),
    ];

    await appendSheetValues(sheetId, "'Drop Notification List'!A:E", [rowValues]);

    return apiSuccess({
      subscriberId,
      message: 'You have been added to The Drop Notification List! Ficcado will email you early access invites.',
    });
  } catch (err: unknown) {
    console.error('[Drop Notification API] Error recording subscriber:', err);
    return apiError(
      'SHEET_ERROR',
      'Unable to register notification request right now. Please try again shortly.',
      { status: 500 }
    );
  }
}
