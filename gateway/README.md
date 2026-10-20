# Ficcado API Gateway (Port 8000)

This directory contains the central reverse proxy and API gateway configuration for the Ficcado microservices architecture.

## Overview
The gateway listens on port `8000` and dispatches requests to local upstreams without requiring Docker or containerization.

| Path Prefix | Upstream Target | Default Port | Description |
|---|---|---|---|
| `/health` | Gateway Self | `8000` | Gateway health status check |
| `/health/ficcado-data` | Ficcado-Data | `8081` | Core CRM & Data service health |
| `/health/website-data` | Ficcado-Website-Data | `8082` | Website Data & OTP service health |
| `/health/payment-gateway` | Ficcado-Payment-Gateway-Data | `8083` | Razorpay payment service health |
| `/api/v1/enquiries/**` | Ficcado-Website-Data | `8082` | Customer support ticket submission & lookup |
| `/api/v1/complaints/**` | Ficcado-Website-Data | `8082` | Customer complaint registration & tracking |
| `/api/v1/notifications/**` | Ficcado-Website-Data | `8082` | Capsule drop & restock notifications |
| `/api/v1/otp/**` | Ficcado-Website-Data | `8082` | Cryptographic OTP generation & verification (3 req/min limit) |
| `/api/v1/payments/**` | Ficcado-Payment-Gateway-Data | `8083` | Payment order creation & Razorpay integration |
| `/api/v1/webhooks/razorpay` | Ficcado-Payment-Gateway-Data | `8083` | Payment webhook processing |
| `/api/v1/auth/customer/login` | Ficcado-Data | `8081` | Customer authentication (5 req/min limit) |
| `/api/**` | Ficcado-Data | `8081` | Product catalog, categories, inventory, sales |
| `/api/internal/**` | **BLOCKED** | - | External access blocked with `403 Forbidden` |

---

## How to Run NGINX Locally

### On Windows
If you have NGINX installed (e.g. at `C:\nginx` or available in `PATH`):
```powershell
# Test configuration syntax:
nginx -t -c "e:\A FICCADO Full App\Ficcado_Complete_Applicaton\gateway\nginx.conf"

# Start NGINX:
nginx -c "e:\A FICCADO Full App\Ficcado_Complete_Applicaton\gateway\nginx.conf"

# Reload configuration:
nginx -s reload

# Stop NGINX:
nginx -s quit
```

### On macOS / Linux
```bash
# Test configuration syntax:
nginx -t -c $(pwd)/gateway/nginx.conf

# Start NGINX:
nginx -c $(pwd)/gateway/nginx.conf

# Reload configuration:
nginx -s reload
```
