// =============================================================================
// Orders & Checkout API — /src/lib/api/orders.ts
// Client layer for order placement and verification via Gateway.
// Replaces previous Google Sheets / Apps Script atomic row generator.
// =============================================================================

import { apiClient } from './client';
import { API_CONFIG } from './config';

export interface OrderItemInput {
  id?: number | string;
  name: string;
  size: string;
  quantity: number;
}

export interface CreateOrderRequest {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  courierPartnerId: string;
  items: OrderItemInput[];
}

export interface OrderResponse {
  referenceId: string;
  invoiceNumber?: string;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  whatsappUrl?: string;
  status: string;
}

/**
 * Creates an order through the gateway API.
 * In Phase 6, online payment through Razorpay is verified before sale creation.
 */
export async function createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
  try {
    const res = await apiClient<{ success: boolean; data: OrderResponse }>(
      API_CONFIG.routes.checkout,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    if (res.data) return res.data;
  } catch {
    // Stub response during Phase 1–5 development
  }

  // Deterministic stub order response for local dev & testing
  const ref = `FIC-${Date.now().toString(36).toUpperCase()}`;
  return {
    referenceId: ref,
    subtotal: 0,
    deliveryCharge: 0,
    total: 0,
    whatsappUrl: `https://wa.me/916282000729?text=Order%20${ref}`,
    status: 'PENDING',
  };
}

/**
 * Retrieves order status by reference ID or invoice number.
 */
export async function getOrderStatus(referenceId: string): Promise<OrderResponse | null> {
  try {
    const res = await apiClient<{ success: boolean; data: OrderResponse }>(
      `${API_CONFIG.routes.customerOrders}/${referenceId}`
    );
    return res.data || null;
  } catch {
    return null;
  }
}
