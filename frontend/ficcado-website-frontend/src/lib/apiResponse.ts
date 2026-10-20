// =============================================================================
// Unified API Response & Error Envelope — /src/lib/apiResponse.ts
// Standard shape across all /api/* routes per Phase 4 / B-09 / P0-7.
// =============================================================================

import crypto from 'node:crypto';

export interface ApiErrorPayload {
  code: string;
  message: string;
  requestId: string;
  field?: string;
  details?: unknown;
}

export interface ApiResponsePayload<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  // Compatibility aliases for existing UI hooks
  ok?: boolean;
  options?: T;
}

export function generateRequestId(): string {
  return `req_${crypto.randomUUID().slice(0, 12)}`;
}

export function apiSuccess<T>(
  data: T,
  init?: {
    status?: number;
    headers?: Record<string, string>;
    cacheControl?: string;
  }
): Response {
  const headers = new Headers(init?.headers);
  if (init?.cacheControl) {
    headers.set('Cache-Control', init.cacheControl);
  }

  const payload: ApiResponsePayload<T> = {
    success: true,
    data,
    ok: true,
    ...(Array.isArray(data) ? { options: data } : {}),
  };

  return Response.json(payload, {
    status: init?.status ?? 200,
    headers,
  });
}

export function apiError(
  code: string,
  message: string,
  options?: {
    status?: number;
    field?: string;
    requestId?: string;
    headers?: Record<string, string>;
    details?: unknown;
  }
): Response {
  const requestId = options?.requestId || generateRequestId();
  const headers = new Headers(options?.headers);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  const payload: ApiResponsePayload = {
    success: false,
    ok: false,
    error: {
      code,
      message,
      requestId,
      ...(options?.field ? { field: options.field } : {}),
      ...(options?.details ? { details: options.details } : {}),
    },
  };

  return Response.json(payload, {
    status: options?.status ?? 400,
    headers,
  });
}
