// =============================================================================
// API Configuration — /src/lib/api/config.ts
// Centralized endpoints and gateway configuration for the microservices architecture.
// =============================================================================

export const API_CONFIG = {
  /**
   * Base gateway URL. In development, routes through NGINX on port 8000.
   * Can be overridden via NEXT_PUBLIC_GATEWAY_URL environment variable.
   */
  gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8000',

  /**
   * Gateway routing prefixes per microservice.
   * Handled by NGINX reverse proxy in Phase 3.
   */
  routes: {
    // Ficcado-Data (Port 8081 via Gateway)
    products: '/api/public/products',
    items: '/api/public/items',
    categories: '/api/public/categories',
    customerAuth: '/api/customer/auth',
    customerProfile: '/api/customer/profile',
    customerOrders: '/api/customer/orders',

    // Ficcado-Website-Data (Port 8082 via Gateway)
    inquiries: '/api/v1/enquiries',
    complaints: '/api/v1/complaints',
    supportEmails: '/api/v1/support-emails',
    notifications: '/api/v1/notifications',
    otp: '/api/v1/otp',

    // Ficcado-Payment-Gateway-Data (Port 8083 via Gateway)
    payments: '/api/v1/payments',
    createPaymentOrder: '/api/v1/payments/create-order',
    verifyPayment: '/api/v1/payments/verify',
    paymentStatus: '/api/v1/payments/status',
    checkout: '/api/checkout',
    razorpay: '/api/payments',
  },

  /** Request timeout in milliseconds */
  timeoutMs: 8000,
} as const;
