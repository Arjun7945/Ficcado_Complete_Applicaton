// =============================================================================
// Customer Authentication & Profile API — /src/lib/api/auth.ts
// Handles sign-up, password login, OTP login, profile updates, and order history
// through the NGINX API Gateway to Ficcado-Data & Ficcado-Website-Data.
// =============================================================================

import { apiClient, ApiResponse, ApiError } from './client';
import { API_CONFIG } from './config';

export interface CustomerAddress {
  id: number;
  address: string;
  isDefault: boolean;
}

export interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  totalOrders: number;
  addresses: CustomerAddress[];
}

export interface CustomerRegistrationData {
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
}

export interface CustomerOrderLineItem {
  id: number;
  itemId?: number;
  itemName: string;
  size: string;
  quantity: number;
  priceEach: number;
  itemImage?: string;
}

export interface CustomerOrder {
  id: number;
  invoiceNumber: string;
  saleStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
  courierPartner?: string;
  trackingNumber?: string;
  subtotal: number;
  deliveryCharge: number;
  grandTotal: number;
  createdAt: string;
  lineItems: CustomerOrderLineItem[];
}

export interface CustomerAuthResult {
  success: boolean;
  message?: string;
  token?: string;
  customer?: CustomerProfile;
}

/**
 * Registers a new customer account in Ficcado-Data.
 */
export async function registerCustomer(data: CustomerRegistrationData): Promise<CustomerAuthResult> {
  return apiClient<CustomerAuthResult>(`${API_CONFIG.routes.customerAuth}/register`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Authenticates an existing customer via email and password.
 */
export async function loginWithPassword(email: string, password: string): Promise<CustomerAuthResult> {
  return apiClient<CustomerAuthResult>(`${API_CONFIG.routes.customerAuth}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Requests a 6-digit OTP to be generated and emailed by Ficcado-Website-Data.
 */
export async function requestLoginOtp(email: string): Promise<{ success: boolean; message: string; cooldownSeconds?: number }> {
  const res = await apiClient<ApiResponse<{ email: string; purpose: string; expiresInSeconds: number }>>(
    `${API_CONFIG.routes.otp}/generate`,
    {
      method: 'POST',
      body: JSON.stringify({ email, purpose: 'CUSTOMER_LOGIN' }),
    }
  );
  return {
    success: res.success,
    message: res.message || 'Verification code sent to your email.',
    cooldownSeconds: 60,
  };
}

/**
 * Verifies the 6-digit OTP and completes authentication via service-to-service handshake.
 */
export async function verifyLoginOtp(email: string, otp: string): Promise<CustomerAuthResult> {
  const res = await apiClient<ApiResponse<{ verified: boolean; email: string; verificationToken: string; customerToken?: string }>>(
    `${API_CONFIG.routes.otp}/verify`,
    {
      method: 'POST',
      body: JSON.stringify({ email, otp, purpose: 'CUSTOMER_LOGIN' }),
    }
  );

  if (res.success && res.data?.verified) {
    // If customerToken was attached from handshake, return it; otherwise check profile
    const token = res.data.customerToken;
    return {
      success: true,
      message: 'OTP verified successfully.',
      token,
    };
  }

  return {
    success: false,
    message: res.message || 'Invalid or expired verification code.',
  };
}

/**
 * Fetches the currently authenticated customer's profile using the session cookie.
 */
export async function getCurrentCustomer(headers?: Record<string, string>): Promise<CustomerProfile | null> {
  try {
    const res = await apiClient<{ success: boolean; data?: CustomerProfile }>(
      `${API_CONFIG.routes.customerAuth}/me`,
      {
        headers,
        timeoutMs: 5000,
      }
    );
    return res.data || null;
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) {
      return null;
    }
    throw err;
  }
}

/**
 * Updates customer profile details (name, phone, or adds address).
 */
export async function updateCustomerProfile(data: { name?: string; phone?: string; address?: string }): Promise<CustomerProfile | null> {
  return apiClient<CustomerProfile>(API_CONFIG.routes.customerProfile, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Fetches all saved addresses for the authenticated customer.
 */
export async function getCustomerAddresses(): Promise<CustomerAddress[]> {
  try {
    return await apiClient<CustomerAddress[]>(`${API_CONFIG.routes.customerProfile}/addresses`, {
      method: 'GET',
    });
  } catch {
    return [];
  }
}

/**
 * Adds a new address for the authenticated customer (max 10 addresses).
 * Gracefully normalizes both CustomerProfileResponse and direct CustomerAddressDto returns
 * so that callers receive the genuine address ID.
 */
export async function addCustomerAddress(address: string, isDefault: boolean = false): Promise<CustomerAddress | null> {
  try {
    const raw = await apiClient<any>(`${API_CONFIG.routes.customerProfile}/addresses`, {
      method: 'POST',
      body: JSON.stringify({ address, isDefault }),
    });

    if (!raw) return null;

    // 1. Handle CustomerProfileResponse return format ({ id: customerId, addresses: [ ... ] })
    if (raw && Array.isArray(raw.addresses)) {
      const addrs = raw.addresses as CustomerAddress[];
      const match = addrs.find((a) => a.address === address) || addrs[addrs.length - 1];
      if (match) {
        return {
          id: match.id,
          address: match.address,
          isDefault: Boolean(match.isDefault),
        };
      }
    }

    // 2. Handle direct CustomerAddressDto return format ({ id: addressId, address: '...', isDefault: true })
    if (raw && typeof raw.id === 'number' && typeof raw.address === 'string') {
      return {
        id: raw.id,
        address: raw.address,
        isDefault: Boolean(raw.isDefault),
      };
    }

    return null;
  } catch (err) {
    throw err;
  }
}

/**
 * Deletes a saved address belonging to the authenticated customer.
 */
export async function deleteCustomerAddress(addressId: number): Promise<boolean> {
  try {
    await apiClient(`${API_CONFIG.routes.customerProfile}/addresses/${addressId}`, {
      method: 'DELETE',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches orders placed by the authenticated customer.
 */
export async function getCustomerOrders(): Promise<CustomerOrder[]> {
  try {
    const res = await apiClient<{ success: boolean; data: CustomerOrder[] }>(
      API_CONFIG.routes.customerOrders,
      { timeoutMs: 4000 }
    );
    return res.data || [];
  } catch {
    return [];
  }
}

export async function logoutCustomer(): Promise<boolean> {
  try {
    await apiClient(`${API_CONFIG.routes.customerAuth}/logout`, { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

export interface CustomerSessionStatus {
  active: boolean;
  remainingSeconds: number;
  idleTimeoutSeconds?: number;
  customerId?: number;
  paused?: boolean;
}

/**
 * Checks server-side customer session validity and remaining seconds.
 * Read-only: does NOT refresh the sliding idle window.
 */
export async function checkCustomerSession(headers?: Record<string, string>): Promise<CustomerSessionStatus> {
  try {
    return await apiClient<CustomerSessionStatus>('/api/customer/session', {
      method: 'GET',
      headers: {
        'X-Ficcado-Background': '1',
        ...headers,
      },
      timeoutMs: 5000,
    });
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) {
      return { active: false, remainingSeconds: 0 };
    }
    throw err;
  }
}

/**
 * Touches the server-side customer session to extend the sliding idle timeout.
 */
export async function touchCustomerSession(): Promise<{ active: boolean; remainingSeconds: number; idleTimeoutSeconds?: number }> {
  try {
    return await apiClient<{ active: boolean; remainingSeconds: number; idleTimeoutSeconds?: number }>('/api/customer/session/touch', {
      method: 'POST',
      timeoutMs: 3000,
    });
  } catch {
    return { active: false, remainingSeconds: 0 };
  }
}

/**
 * Pauses the customer session timer during payment checkout (up to 15 minutes).
 */
export async function pauseCustomerSession(minutes: number = 15): Promise<{ active: boolean; paused: boolean }> {
  try {
    return await apiClient<{ active: boolean; paused: boolean }>(`/api/customer/session/pause?minutes=${minutes}`, {
      method: 'POST',
      timeoutMs: 3000,
    });
  } catch {
    return { active: false, paused: false };
  }
}

