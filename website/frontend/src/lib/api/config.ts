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
    customerAuth: '/api/public/auth',
    customerOrders: '/api/customer/orders',

    // Ficcado-Website-Data (Port 8082 via Gateway)
    inquiries: '/api/inquiries',
    complaints: '/api/complaints',
    supportEmails: '/api/support-emails',
    notifications: '/api/notifications',
    otp: '/api/otp',

    // Ficcado-Payment-Gateway-Data (Port 8083 via Gateway)
    checkout: '/api/checkout',
    razorpay: '/api/payments',
  },

  /** Request timeout in milliseconds */
  timeoutMs: 8000,
} as const;
