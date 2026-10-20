// =============================================================================
// HTTP API Client — /src/lib/api/client.ts
// Standardized client for microservice requests through the NGINX gateway.
// =============================================================================

import { API_CONFIG } from './config';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: number;
}

export class ApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeoutMs = API_CONFIG.timeoutMs, params, ...fetchOptions } = options;

  let url = path.startsWith('http') ? path : `${API_CONFIG.gatewayUrl}${path}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      credentials: fetchOptions.credentials || 'include',
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      let errorBody: unknown;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = await res.text();
      }
      const message =
        (typeof errorBody === 'object' && errorBody !== null && 'message' in errorBody
          ? String((errorBody as { message: unknown }).message)
          : null) ||
        `Request to ${path} failed with HTTP ${res.status}`;

      throw new ApiError(message, res.status, errorBody);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof ApiError) {
      throw err;
    }
    const errorMsg =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `Request to ${path} timed out after ${timeoutMs}ms`
          : err.message
        : 'Network error occurred';
    throw new ApiError(errorMsg, 503);
  }
}
