/**
 * lib/apiClient.ts
 * Centralized API client for communicating with the Spring Boot REST backend.
 * Automatically forwards cookies in server environment and uses credentials: 'include'.
 * Authoritative client derived from OpenAPI 3.1.0 specifications.
 */

import { cookies } from 'next/headers';
import { logger } from './logger';
import type {
  AdminResponse,
  AdminCreateRequest,
  AdminUpdateRequest,
  AdminSummary,
  LoginRequest,
  CustomerResponse,
  ItemResponse,
  ItemRequest,
  QuantityAdjustRequest,
  ItemImageResponse,
  InventoryResponse,
  InventoryRequest,
  UnallocatedResponse,
  WarehouseResponse,
  WarehouseRequest,
  SaleResponse,
  SaleRequest,
  ReplacementResponse,
  ReplacementRequest,
  StatusRequest,
  ReturnRefundResponse,
  ReturnRefundRequest,
  ReturnRefundUpdateRequest,
  DamagedProductResponse,
  DamagedProductRequest,
  ExpenseResponse,
  ExpenseRequest,
  VendorResponse,
  VendorRequest,
  PaymentResponse,
  PaymentRequest,
  NoteResponse,
  NoteRequest,
  ReviewResponse,
  SubmitReviewRequest,
  ReviewTokenValidationResponse,
  ActivityLogResponse,
  SalesLogResponse,
  InventoryHistoryResponse,
  ProfitabilityReportResponse,
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('cookie') && !headers.has('Cookie')) {
    try {
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      if (allCookies && allCookies.length > 0) {
        const cookieHeaderVal = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
        headers.set('Cookie', cookieHeaderVal);
      }
    } catch {
      // Running in client component context — browser handles cookies via credentials: 'include'
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errJson.error || errorDetail;
    } catch {
      // ignore json parse error
    }
    logger.error('API request failed', { url, status: response.status, detail: errorDetail });
    throw new Error(errorDetail);
  }

  if (response.status === 204) { // 204 No Content
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};

// ── Strongly-Typed OpenAPI Client Modules ──────────────────────────────────────

export const authApi = {
  login: (req: LoginRequest) => apiClient.post<AdminSummary>('/api/auth/login', req),
  logout: () => apiClient.post<{ message: string }>('/api/auth/logout'),
  me: () => apiClient.get<AdminSummary>('/api/auth/me'),
};

export const adminApi = {
  getAll: () => apiClient.get<AdminResponse[]>('/api/admins'),
  getById: (id: number) => apiClient.get<AdminResponse>(`/api/admins/${id}`),
  create: (req: AdminCreateRequest) => apiClient.post<AdminResponse>('/api/admins', req),
  update: (id: number, req: AdminUpdateRequest) => apiClient.put<AdminResponse>(`/api/admins/${id}`, req),
};

export const customerApi = {
  getAll: () => apiClient.get<CustomerResponse[]>('/api/customers'),
  getById: (id: number) => apiClient.get<CustomerResponse>(`/api/customers/${id}`),
  search: (query: string) => apiClient.get<CustomerResponse[]>(`/api/customers/search?query=${encodeURIComponent(query)}`),
  getSales: (id: number) => apiClient.get<SaleResponse[]>(`/api/customers/${id}/sales`),
  lookupByPhone: (phone: string) => apiClient.get<CustomerResponse>(`/api/customers/lookup?phone=${encodeURIComponent(phone)}`),
  update: (req: { phone: string; name?: string; email?: string; addresses?: string[] }) =>
    apiClient.put<CustomerResponse>('/api/customers', req),
};

export const itemApi = {
  getAll: () => apiClient.get<ItemResponse[]>('/api/items'),
  getById: (id: number) => apiClient.get<ItemResponse>(`/api/items/${id}`),
  create: (req: ItemRequest) => apiClient.post<ItemResponse>('/api/items', req),
  update: (id: number, req: ItemRequest) => apiClient.put<ItemResponse>(`/api/items/${id}`, req),
  delete: (id: number) => apiClient.delete(`/api/items/${id}`),
  adjustQuantity: (req: QuantityAdjustRequest) => apiClient.post<InventoryResponse>('/api/inventory/adjust', req),
};

export const itemImageApi = {
  list: (itemId: number) => apiClient.get<ItemImageResponse[]>(`/api/items/${itemId}/images`),
  delete: (itemId: number, imageId: number) => apiClient.delete(`/api/items/${itemId}/images/${imageId}`),
  reorder: (itemId: number, imageIds: number[]) => apiClient.put<void>(`/api/items/${itemId}/images/reorder`, imageIds),
};

export const inventoryApi = {
  getAll: () => apiClient.get<InventoryResponse[]>('/api/inventory'),
  getById: (id: number) => apiClient.get<InventoryResponse>(`/api/inventory/${id}`),
  getUnallocated: (itemId: number, size: string) =>
    apiClient.get<UnallocatedResponse>(`/api/inventory/unallocated?itemId=${itemId}&size=${encodeURIComponent(size)}`),
  createOrUpdate: (req: InventoryRequest) => apiClient.post<InventoryResponse>('/api/inventory', req),
  adjust: (req: QuantityAdjustRequest) => apiClient.post<InventoryResponse>('/api/inventory/adjust', req),
};

export const warehouseApi = {
  getAll: () => apiClient.get<WarehouseResponse[]>('/api/warehouse'),
  getByHandler: (handlerId: number) => apiClient.get<WarehouseResponse[]>(`/api/warehouse/handler/${handlerId}`),
  create: (req: WarehouseRequest) => apiClient.post<WarehouseResponse>('/api/warehouse', req),
  update: (id: number, quantity: number) => apiClient.put<WarehouseResponse>(`/api/warehouse/${id}`, { quantity }),
  delete: (id: number) => apiClient.delete(`/api/warehouse/${id}`),
};

export const saleApi = {
  getAll: (options?: { cursor?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.cursor) params.set('cursor', options.cursor.toString());
    if (options?.limit) params.set('limit', options.limit.toString());
    const qs = params.toString();
    return apiClient.get<SaleResponse[]>(`/api/sales${qs ? `?${qs}` : ''}`);
  },
  getById: (id: number) => apiClient.get<SaleResponse>(`/api/sales/${id}`),
  getByInvoice: (invoice: string) => apiClient.get<SaleResponse>(`/api/sales/invoice/${encodeURIComponent(invoice)}`),
  search: (query: string) => apiClient.get<SaleResponse[]>(`/api/sales/search?query=${encodeURIComponent(query)}`),
  create: (req: SaleRequest) => apiClient.post<SaleResponse>('/api/sales', req),
  update: (id: number, req: SaleRequest) => apiClient.put<SaleResponse>(`/api/sales/${id}`, req),
  requestReplacement: (id: number) => apiClient.post<SaleResponse>(`/api/sales/${id}/request-replacement`),
  requestReturnRefund: (id: number) => apiClient.post<SaleResponse>(`/api/sales/${id}/request-refund`),
  getLogs: (id: number) => apiClient.get<SalesLogResponse[]>(`/api/sales/${id}/logs`),
};

export const replacementApi = {
  getAll: () => apiClient.get<ReplacementResponse[]>('/api/replacements'),
  getById: (id: number) => apiClient.get<ReplacementResponse>(`/api/replacements/${id}`),
  create: (req: ReplacementRequest) => apiClient.post<ReplacementResponse>('/api/replacements', req),
  advanceStatus: (id: number, req: StatusRequest) => apiClient.patch<ReplacementResponse>(`/api/replacements/${id}/status`, req),
  complete: (id: number, disposition: string) =>
    apiClient.post<ReplacementResponse>(`/api/replacements/${id}/complete?disposition=${encodeURIComponent(disposition)}`),
};

export const returnRefundApi = {
  getAll: () => apiClient.get<ReturnRefundResponse[]>('/api/return-refunds'),
  getById: (id: number) => apiClient.get<ReturnRefundResponse>(`/api/return-refunds/${id}`),
  create: (req: ReturnRefundRequest) => apiClient.post<ReturnRefundResponse>('/api/return-refunds', req),
  update: (id: number, req: ReturnRefundUpdateRequest) => apiClient.put<ReturnRefundResponse>(`/api/return-refunds/${id}`, req),
  close: (id: number) => apiClient.post<ReturnRefundResponse>(`/api/return-refunds/${id}/close`),
};

export const damagedProductApi = {
  getAll: () => apiClient.get<DamagedProductResponse[]>('/api/damaged-products'),
  getById: (id: number) => apiClient.get<DamagedProductResponse>(`/api/damaged-products/${id}`),
  create: (req: DamagedProductRequest) => apiClient.post<DamagedProductResponse>('/api/damaged-products', req),
  update: (id: number, req: DamagedProductRequest) => apiClient.put<DamagedProductResponse>(`/api/damaged-products/${id}`, req),
  delete: (id: number) => apiClient.delete(`/api/damaged-products/${id}`),
};

export const expenseApi = {
  getAll: () => apiClient.get<ExpenseResponse[]>('/api/expenses'),
  getById: (id: number) => apiClient.get<ExpenseResponse>(`/api/expenses/${id}`),
  create: (req: ExpenseRequest) => apiClient.post<ExpenseResponse>('/api/expenses', req),
  update: (id: number, req: ExpenseRequest) => apiClient.put<ExpenseResponse>(`/api/expenses/${id}`, req),
  delete: (id: number) => apiClient.delete(`/api/expenses/${id}`),
};

export const vendorApi = {
  getAll: () => apiClient.get<VendorResponse[]>('/api/vendors'),
  getById: (id: number) => apiClient.get<VendorResponse>(`/api/vendors/${id}`),
  create: (req: VendorRequest) => apiClient.post<VendorResponse>('/api/vendors', req),
  update: (id: number, req: VendorRequest) => apiClient.put<VendorResponse>(`/api/vendors/${id}`, req),
  delete: (id: number) => apiClient.delete(`/api/vendors/${id}`),
  getPayments: (id: number) => apiClient.get<PaymentResponse[]>(`/api/vendors/${id}/payments`),
  recordPayment: (id: number, req: PaymentRequest) => apiClient.post<PaymentResponse>(`/api/vendors/${id}/payments`, req),
};

export const noteApi = {
  getAll: () => apiClient.get<NoteResponse[]>('/api/notes'),
  create: (req: NoteRequest) => apiClient.post<NoteResponse>('/api/notes', req),
  update: (id: number, req: NoteRequest) => apiClient.put<NoteResponse>(`/api/notes/${id}`, req),
  delete: (id: number) => apiClient.delete(`/api/notes/${id}`),
};

export const reviewApi = {
  getReviewsForItem: (itemId: number) => apiClient.get<ReviewResponse[]>(`/api/reviews/item/${itemId}`),
  validateToken: (token: string) => apiClient.get<ReviewTokenValidationResponse>(`/api/reviews/validate?token=${encodeURIComponent(token)}`),
  submitReview: (req: SubmitReviewRequest) => apiClient.post<{ message: string }>('/api/reviews/submit', req),
};

export const logsApi = {
  getRecentActivityLogs: () => apiClient.get<ActivityLogResponse[]>('/api/logs/activity/recent'),
  getAllActivityLogs: () => apiClient.get<ActivityLogResponse[]>('/api/logs/activity'),
  getRecentSalesLogs: () => apiClient.get<SalesLogResponse[]>('/api/logs/sales/recent'),
  getAllSalesLogs: () => apiClient.get<SalesLogResponse[]>('/api/logs/sales'),
  getSalesLogsByInvoice: (invoice: string) => apiClient.get<SalesLogResponse[]>(`/api/logs/sales/invoice/${encodeURIComponent(invoice)}`),
  getRecentInventoryHistory: () => apiClient.get<InventoryHistoryResponse[]>('/api/logs/inventory/recent'),
  getInventoryHistoryByItem: (itemId: number) => apiClient.get<InventoryHistoryResponse[]>(`/api/logs/inventory/item/${itemId}`),
  getInventoryHistoryByInvoice: (invoice: string) => apiClient.get<InventoryHistoryResponse[]>(`/api/logs/inventory/invoice/${encodeURIComponent(invoice)}`),
};

export const reportsApi = {
  getProfitability: (params: { period?: string; startDate?: string; endDate?: string }) => {
    const qp = new URLSearchParams();
    if (params.period) qp.set('period', params.period);
    if (params.startDate) qp.set('startDate', params.startDate);
    if (params.endDate) qp.set('endDate', params.endDate);
    return apiClient.get<ProfitabilityReportResponse>(`/api/reports/profitability?${qp.toString()}`);
  },
};
