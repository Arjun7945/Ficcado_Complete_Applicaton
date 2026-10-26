// =============================================================================
// Customer Authentication & Profile API — /src/lib/api/auth.ts
// Handles sign-up, password login, OTP login, profile updates, and order history
// through the NGINX API Gateway to Ficcado-Data & Ficcado-Website-Data.
// =============================================================================

import { apiClient, ApiResponse } from './client';
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
export async function getCurrentCustomer(): Promise<CustomerProfile | null> {
  try {
    const res = await apiClient<{ success: boolean; data?: CustomerProfile }>(
      `${API_CONFIG.routes.customerAuth}/me`,
      { timeoutMs: 3000 }
    );
    return res.data || null;
  } catch {
    return null;
  }
}

/**
 * Updates customer profile details (name, phone, or adds address).
 */
export async function updateCustomerProfile(data: { name?: string; phone?: string; address?: string }): Promise<CustomerProfile | null> {
  try {
    return await apiClient<CustomerProfile>(API_CONFIG.routes.customerProfile, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch {
    return null;
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
  customerId?: number;
  paused?: boolean;
}

/**
 * Checks server-side customer session validity and remaining seconds.
 * Read-only: does NOT refresh the sliding idle window.
 */
export async function checkCustomerSession(): Promise<CustomerSessionStatus> {
  try {
    return await apiClient<CustomerSessionStatus>('/api/customer/session', {
      method: 'GET',
      headers: {
        'X-Ficcado-Background': '1',
      },
      timeoutMs: 3000,
    });
  } catch {
    return { active: false, remainingSeconds: 0 };
  }
}

/**
 * Touches the server-side customer session to extend the sliding idle timeout to 600 seconds.
 */
export async function touchCustomerSession(): Promise<{ active: boolean; remainingSeconds: number }> {
  try {
    return await apiClient<{ active: boolean; remainingSeconds: number }>('/api/customer/session/touch', {
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

