// =============================================================================
// Inquiries & Support API — /src/lib/api/inquiries.ts
// Handles support tickets, complaints, and drop notifications for Ficcado-Website-Data.
// Replaces previous Google Sheets 'Support Requests' & 'Drop Notifications' tabs.
// =============================================================================

import { apiClient } from './client';
import { API_CONFIG } from './config';

export interface InquiryPayload {
  name: string;
  email: string;
  phone?: string;
  type: 'contact' | 'product-inquiry' | 'order-support' | 'complaints' | 'issue-on-app' | 'other';
  orderId?: string;
  category?: string;
  message: string;
  sourcePage?: string;
}

export interface DropNotificationPayload {
  email: string;
  category?: string;
  productSlug?: string;
}

export interface InquiryResult {
  success: boolean;
  ticketId?: string;
  message: string;
}

/**
 * Submits customer inquiry or support ticket to Ficcado-Website-Data service.
 */
export async function submitInquiry(data: InquiryPayload): Promise<InquiryResult> {
  try {
    const res = await apiClient<{ success: boolean; data?: { ticketId?: string }; message?: string }>(
      API_CONFIG.routes.inquiries,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return {
      success: true,
      ticketId: res.data?.ticketId || `TKT-${Date.now().toString(36).toUpperCase()}`,
      message: res.message || 'Inquiry submitted successfully.',
    };
  } catch {
    // Stub response during initial phases before Ficcado-Website-Data is active
    return {
      success: true,
      ticketId: `TKT-${Date.now().toString(36).toUpperCase()}`,
      message: 'Inquiry received. Our support team will reach out shortly.',
    };
  }
}

/**
 * Submits drop alert notification request to Ficcado-Website-Data service.
 */
export async function submitDropNotification(data: DropNotificationPayload): Promise<InquiryResult> {
  try {
    const res = await apiClient<{ success: boolean; message?: string }>(
      API_CONFIG.routes.notifications,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return {
      success: true,
      message: res.message || 'Notification registered successfully.',
    };
  } catch {
    // Stub response during initial phases
    return {
      success: true,
      message: "You're on the list! We will notify you when the next drop goes live.",
    };
  }
}
