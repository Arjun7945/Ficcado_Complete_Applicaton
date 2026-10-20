// =============================================================================
// Payment Gateway API Client — /src/lib/api/payments.ts
// Communicates with Ficcado-Payment-Gateway-Data (Port 8083) via NGINX Gateway (Port 8000)
// Supports Razorpay order creation, payment signature verification, and status tracking.
// =============================================================================

import { apiClient } from './client';
import { API_CONFIG } from './config';

export interface PaymentOrderItem {
  itemId?: number;
  itemName: string;
  size: string;
  quantity: number;
  priceEach: number;
}

export interface CreatePaymentOrderPayload {
  amount: number;
  currency?: string;
  customerId?: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  deliveryCharge?: number;
  courierPartner?: string;
  items: PaymentOrderItem[];
}

export interface CreatePaymentOrderResult {
  success: boolean;
  orderId: string;
  transactionId: string;
  amount: number;
  amountInPaise: number;
  currency: string;
  keyId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export interface VerifyPaymentPayload {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  verified: boolean;
  message: string;
  invoiceNumber?: string;
  saleId?: number;
  transactionId?: string;
  syncStatus?: string;
}

export interface PaymentStatusResult {
  transactionId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  syncStatus: string;
  invoiceNumber?: string;
  saleId?: number;
  customerName: string;
  customerEmail: string;
  createdAt?: string;
}

/**
 * Initializes a new payment order with Ficcado-Payment-Gateway-Data and Razorpay.
 */
export async function createPaymentOrder(
  payload: CreatePaymentOrderPayload
): Promise<CreatePaymentOrderResult> {
  return apiClient<CreatePaymentOrderResult>(API_CONFIG.routes.createPaymentOrder, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Verifies Razorpay payment signature and initiates automatic synchronization to Ficcado-Data.
 */
export async function verifyPayment(
  payload: VerifyPaymentPayload
): Promise<VerifyPaymentResult> {
  return apiClient<VerifyPaymentResult>(API_CONFIG.routes.verifyPayment, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetches transaction details and live invoice status.
 */
export async function getPaymentStatus(
  identifier: string
): Promise<PaymentStatusResult | null> {
  try {
    return await apiClient<PaymentStatusResult>(
      `${API_CONFIG.routes.paymentStatus}/${encodeURIComponent(identifier)}`,
      { timeoutMs: 4000 }
    );
  } catch {
    return null;
  }
}
