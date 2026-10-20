// =============================================================================
// Inquiries & Order Support API Route Handler — /api/inquiry
// Appends inquiries, contact tickets, and order support requests to Google Sheets
// 'Support Requests' tab with rate limiting, bot mitigation, and anti-injection sanitization.
// =============================================================================

import { NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { isValidAnyOrderId, normalizeOrderId } from '@/lib/referenceId';
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

// Request Validation Schema
const InquiryInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z.string().trim().max(25).optional().default(''),
  type: z.enum(['contact', 'product-inquiry', 'order-support', 'complaints', 'issue-on-app', 'other']),
  orderId: z.string().trim().max(35).optional().default(''),
  category: z.string().trim().max(50).optional().default('general'),
  message: z.string().trim().min(5, 'Message must be at least 5 characters').max(2000),
  sourcePage: z.string().trim().max(100).optional().default('/support'),
  // Honeypot field (hidden from genuine users)
  botHp: z.string().optional(),
  form_rendered_at: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Same-origin check
    if (!checkOrigin(req)) {
      return apiError('FORBIDDEN_ORIGIN', 'Cross-origin request rejected.', { status: 403 });
    }

    // 2. IP Rate limiting (10 inquiries per 10 minutes)
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, 'inquiry', 10, 600);
    if (!rateCheck.success) {
      return apiError(
        'RATE_LIMITED',
        'Too many inquiry submissions from your network. Please wait a few minutes before trying again.',
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
          },
        }
      );
    }

    const body = await req.json();

    // 3. Honeypot trap check (D3)
    if (body.botHp && body.botHp.trim().length > 0) {
      const fakeTicket = `FIC-INQ-${new Date().getFullYear()}-${crypto.randomInt(10000, 99999)}`;
      return apiSuccess({
        inquiryId: fakeTicket,
        message: 'Support request received successfully.',
      });
    }

    // 4. Minimum submit time threshold (1.5 seconds)
    if (body.form_rendered_at && Date.now() - body.form_rendered_at < 1500) {
      return apiError('SUBMISSION_TOO_FAST', 'Please take a moment before submitting your inquiry.', { status: 400 });
    }

    // 5. Schema validation
    const parsed = InquiryInputSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return apiError('VALIDATION_FAILED', firstIssue?.message || 'Invalid submission data', {
        status: 400,
        field: firstIssue?.path?.join('.'),
        details: parsed.error.format(),
      });
    }

    const data = parsed.data;

    // 6. Validate Order ID if type is order-support
    let normalizedOrderId = '';
    if (data.type === 'order-support' || data.orderId) {
      if (data.orderId) {
        if (!isValidAnyOrderId(data.orderId)) {
          return apiError(
            'INVALID_ORDER_ID',
            'Please enter a valid Reference ID (starts with FIC-) or final Order ID',
            { status: 400, field: 'orderId' }
          );
        }
        normalizedOrderId = normalizeOrderId(data.orderId);
      }
    }

    // 7. Generate Server-Side Ticket ID using cryptographically secure random integers per CODE-02
    const randomTicketSuffix = crypto.randomInt(10000, 99999);
    const inquiryId = `FIC-INQ-${new Date().getFullYear()}-${randomTicketSuffix}`;
    const timestampIST = formatISTDate(new Date());

    // 8. Append directly to Google Sheets 'Support Requests' tab
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (sheetId) {
      try {
        const rowData = [
          sanitizeCell(timestampIST),
          sanitizeCell(inquiryId),
          sanitizeCell(data.type),
          sanitizeCell(normalizedOrderId),
          sanitizeCell(data.name),
          sanitizeCell(data.email),
          sanitizeCell(data.phone || ''),
          sanitizeCell(data.category || data.type),
          sanitizeCell(data.message),
          sanitizeCell('NEW'),
        ];

        await appendSheetValues(sheetId, "'Support Requests'!A2", [rowData]);
      } catch (sheetErr) {
        console.warn('[Support API] Failed to append to Support Requests sheet:', (sheetErr as Error).message);
      }
    }

    return apiSuccess(
      {
        inquiryId,
        message: 'Support request received successfully.',
      },
      {
        cacheControl: 'no-store, no-cache, must-revalidate',
      }
    );
  } catch (err) {
    console.error('[Support API] Server error:', (err as Error).message);
    return apiError(
      'INQUIRY_PROCESSING_FAILED',
      'An unexpected error occurred. Please reach out to us directly via WhatsApp.',
      { status: 500 }
    );
  }
}
