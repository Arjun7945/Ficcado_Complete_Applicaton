# Ficcado Platform — Comprehensive Run & Verification Guide

This run guide provides step-by-step instructions to start, run, and verify **every backend microservice, the API gateway, and both frontends** locally on Windows, macOS, or Linux without Docker.

---

## 1. System Topology & Port Map

| Layer | Component Name | Directory Path | Local Port | Tech Stack | Primary Verification URL |
|---|---|---|---|---|---|
| **Gateway** | **NGINX Reverse Proxy** | `gateway/` | **`8000`** | NGINX Native | `http://localhost:8000/health` |
| **Backend 1** | **Ficcado-Data (CRM Backend)** | `crm/backend/ficcado_crm_backend/` | **`8081`** | Spring Boot 3.4.3, Java 21, JPA | `http://localhost:8081/actuator/health` |
| **Backend 2** | **Ficcado-Website-Data** | `website/backend/ficcado_website_data/` | **`8082`** | Spring Boot 3.4.3, Java 21, JPA | `http://localhost:8082/actuator/health` |
| **Backend 3** | **Ficcado-Payment-Gateway-Data** | `payment/backend/ficcado_payment_gateway_data/` | **`8083`** | Spring Boot 3.4.3, Java 21, JPA | `http://localhost:8083/actuator/health` |
| **Frontend 1** | **Website Storefront** | `website/frontend/` | **`3000`** | Next.js 16.3.8, React 19, TypeScript | `http://localhost:3000` |
| **Frontend 2** | **Ficcado CRM (Backoffice)** | `crm/ficcado_crm_app/` | **`3001`** | Next.js 16.3.0, React 19, SWR | `http://localhost:3001` |
| **Database** | **PostgreSQL Server** | System Service | **`5432`** | PostgreSQL 15+ | 3 dedicated databases |
| **Cache** | **Redis Server (Optional)** | System Service / WSL | **`6379`** | Redis 7+ | Graceful fallback if offline |

---

## 2. One-Time Setup & Prerequisites

### 2.1 Software Prerequisites
Verify that the following are installed and accessible in your terminal:
1. **Java 21 LTS:** `java -version`
2. **Node.js 20+ LTS & npm:** `node -v` and `npm -v`
3. **PostgreSQL 15+:** Running locally on port `5432`
4. **NGINX:** Installed locally (`nginx -v`)
5. *(Note: Global Maven is NOT required; each backend includes Maven Wrapper `mvnw` / `mvnw.cmd`)*

### 2.2 Database Initialization
Open your PostgreSQL terminal (`psql -U postgres`) or pgAdmin and run:

```sql
CREATE DATABASE ficcado_data;
CREATE DATABASE ficcado_website_data;
CREATE DATABASE ficcado_payment_gateway_data;
```

> **Note on Migrations:** You do not need to create any tables manually! Each Spring Boot backend uses **Flyway** to automatically create its tables, schemas, and initial seed data on boot.

### 2.3 Default Credentials
- **PostgreSQL Default:** Username `postgres`, Password `arjun7945` (configured in `application.yaml`). If your local PostgreSQL password differs, override it via environment variable:
  ```powershell
  $env:DB_PASSWORD="your_password"
  ```
- **Ficcado CRM Seed Admin:**
  - Email: `admin@ficcado.com`
  - Password: `Password123!` (or hash configured in seed migration)

---

## 3. Starting the Platform (Terminal by Terminal)

We recommend opening **6 separate terminal tabs** in VS Code or Windows Terminal.

```
┌─────────────────────────────────┬─────────────────────────────────┐
│ [Terminal 1: Ficcado-Data 8081] │ [Terminal 2: Website-Data 8082] │
├─────────────────────────────────┼─────────────────────────────────┤
│ [Terminal 3: Payment-Data 8083] │ [Terminal 4: NGINX Gateway 8000]│
├─────────────────────────────────┼─────────────────────────────────┤
│ [Terminal 5: Storefront 3000]   │ [Terminal 6: CRM Frontend 3001] │
└─────────────────────────────────┴─────────────────────────────────┘
```

---

### Terminal 1: Start Ficcado-Data (Port 8081)
This is the core backend holding master products, inventory, customer accounts, and sales records.

**Windows PowerShell:**
```powershell
cd "crm\backend\ficcado_crm_backend"
.\mvnw.cmd spring-boot:run
```

**macOS / Linux:**
```bash
cd crm/backend/ficcado_crm_backend
./mvnw spring-boot:run
```

**Wait for this log line:**
```
Started FiccadoCrmBackendApplication in X.XXX seconds
```
**Quick Verification:**  
Open in browser: `http://localhost:8081/actuator/health`  
Expected response: `{"status":"UP"}`

---

### Terminal 2: Start Ficcado-Website-Data (Port 8082)
This backend manages customer enquiries, complaints, restock notifications, and email OTP generation.

**Windows PowerShell:**
```powershell
cd "website\backend\ficcado_website_data"
.\mvnw.cmd spring-boot:run
```

**macOS / Linux:**
```bash
cd website/backend/ficcado_website_data
./mvnw spring-boot:run
```

**Wait for this log line:**
```
Started FiccadoWebsiteDataApplication in X.XXX seconds
```
**Quick Verification:**  
Open in browser: `http://localhost:8082/actuator/health`  
Expected response: `{"status":"UP"}`

---

### Terminal 3: Start Ficcado-Payment-Gateway-Data (Port 8083)
This microservice creates Razorpay orders, verifies HMAC-SHA256 signatures, processes webhooks, and synchronizes paid sales to Ficcado-Data.

**Windows PowerShell:**
```powershell
cd "payment\backend\ficcado_payment_gateway_data"
.\mvnw.cmd spring-boot:run
```

**macOS / Linux:**
```bash
cd payment/backend/ficcado_payment_gateway_data
./mvnw spring-boot:run
```

**Wait for this log line:**
```
Started FiccadoPaymentGatewayDataApplication in X.XXX seconds
```
**Quick Verification:**  
Open in browser: `http://localhost:8083/actuator/health`  
Expected response: `{"status":"UP"}`

---

### Terminal 4: Start NGINX API Gateway (Port 8000)
The gateway acts as the single reverse proxy for the website, handling routing, CORS, rate limiting, and blocking internal APIs.

**Windows PowerShell (from repository root):**
```powershell
# Test configuration syntax
nginx -t -c "$pwd\gateway\nginx.conf"

# Launch NGINX
nginx -c "$pwd\gateway\nginx.conf"
```

**macOS / Linux (from repository root):**
```bash
# Test configuration syntax
nginx -t -c "$(pwd)/gateway/nginx.conf"

# Launch NGINX
nginx -c "$(pwd)/gateway/nginx.conf"
```

**To reload or stop NGINX when needed:**
```powershell
nginx -s reload
nginx -s stop
```

**Quick Verification:**  
Open in browser: `http://localhost:8000/health`  
Expected response: `{"status":"UP","gateway":"Ficcado API Gateway","port":8000,"version":"1.0.0"}`

---

### Terminal 5: Start Website Storefront (Port 3000)
The customer-facing Next.js unisex streetwear storefront.

**Windows PowerShell / macOS / Linux:**
```powershell
cd "website\frontend"
npm install
npm run dev
```

**Wait for this log line:**
```
▲ Next.js 16.3.8
- Local: http://localhost:3000
✓ Ready in X.Xs
```

**Quick Verification:**  
Open in browser: `http://localhost:3000`

---

### Terminal 6: Start Ficcado CRM Frontend (Port 3001)
The backoffice operations dashboard (kept strictly read-only and unedited).

**Windows PowerShell / macOS / Linux:**
```powershell
cd "crm\ficcado_crm_app"
npm install
npm run dev -- -p 3001
```

**Wait for this log line:**
```
▲ Next.js 16.3.0
- Local: http://localhost:3001
✓ Ready in X.Xs
```

**Quick Verification:**  
Open in browser: `http://localhost:3001`

---

## 4. Complete Verification Walkthrough (Step-by-Step)

Follow this 7-step test sequence to verify that all components are working harmoniously.

### Test 1: Verify Gateway Routing & Health Probes
Open your browser or run curl to test the gateway's proxied health probes:

```powershell
# Gateway self-check
curl http://localhost:8000/health

# Proxied check to Ficcado-Data (Port 8081)
curl http://localhost:8000/health/ficcado-data

# Proxied check to Website-Data (Port 8082)
curl http://localhost:8000/health/website-data

# Proxied check to Payment-Gateway (Port 8083)
curl http://localhost:8000/health/payment-gateway
```
✅ **Pass Criteria:** All return HTTP 200 with `status: "UP"`.

---

### Test 2: Verify Gateway Internal Endpoint Security Guard
Attempt to access an internal service handshake endpoint from the public gateway:

```powershell
curl http://localhost:8000/api/internal/orders/create-paid-sale
```
✅ **Pass Criteria:** NGINX immediately blocks the request with HTTP **`403 Forbidden`**:  
`{"success":false,"message":"Access forbidden: internal endpoints cannot be invoked through the public gateway."}`

---

### Test 3: Verify Public Product Catalog via Gateway
Fetch the public catalog items and category list through the gateway:

```powershell
# Get all active public products
curl http://localhost:8000/api/public/products

# Get category list with live item counts
curl http://localhost:8000/api/public/categories
```
✅ **Pass Criteria:** Returns sanitized JSON containing active drops (e.g. `chosen`, `echoes-of-the-empire`), image URLs, per-size `sizeStock` availability maps, and zero internal cost/vendor data.

---

### Test 4: Verify Storefront UI Browsing (Browser: `http://localhost:3000`)
1. Open `http://localhost:3000` in Google Chrome or Edge.
2. Confirm the hero banner, category pills (`T-Shirts`, `Combos`, `Shirts`, `Hoodies`, `Pants`, `Sneakers`), and drops load seamlessly.
3. Click on any product card (e.g., *Echoes of the Empire*).
4. Verify the Product Modal opens, displays size selection (`M`, `L`, `XL`), 240 GSM heavy-weight fabric badges, and verified reviews.

---

### Test 5: Verify Customer Authentication & Account Hub
1. On `http://localhost:3000`, click the **Sign In / Account** icon in the desktop top header or mobile drawer.
2. The glassmorphic `AuthModal` will open.
3. **Register a new account:**
   - Full Name: `Test Customer`
   - Mobile: `9876543210`
   - Email: `tester@ficcado.in`
   - Password: `Password123!`
4. Click **Create Account**.
5. Once authenticated, the header displays your customer initials.
6. Click the account button to navigate to `/account`.
7. Verify that you can view your profile, manage saved delivery addresses, and see your order history.

---

### Test 6: Verify Checkout & Online Razorpay Payment Flow
1. Add any available product to your bag.
2. Open the Shopping Bag drawer and click **Proceed to Checkout**.
3. On `/checkout`:
   - Your delivery details and address will be auto-filled from your authenticated customer profile.
   - Select a delivery courier option (e.g., *Standard Express*).
   - Notice the security banner: *"Online Payment Only (Razorpay). No Cash on Delivery (COD) permitted."*
4. Click **Pay Online with Razorpay**.
5. In development mode (or if Razorpay test keys are active):
   - The Razorpay checkout modal opens or simulates immediate payment verification.
   - The transaction is recorded in Ficcado-Payment-Gateway-Data (`8083`).
   - Payment-Gateway makes an internal call to Ficcado-Data (`8081`) via `X-Internal-Secret`.
   - Ficcado-Data verifies warehouse inventory stock and creates an official `Sale` record with an invoice number (`FIC-INV-[timestamp]`).
6. You will be redirected to `/checkout/confirmation`.
7. Verify the confirmation page displays:
   - Green **Payment Verified & Order Confirmed** badge.
   - Unique Invoice Number.
   - Delivery address and item breakdown.

---

### Test 7: Verify Order in Customer Account & CRM Backoffice
1. Navigate to `http://localhost:3000/account`.
2. Under **Order History**, verify that the order you just paid for appears with status `PAID ONLINE`, `PROCESSING`, and the exact invoice number.
3. Open `http://localhost:3001` (CRM Frontend).
4. Log in with admin credentials (`admin@ficcado.com` / `Password123!`).
5. Open the **Sales Management** view and confirm the sale record is present with payment mode `ONLINE` and delivery status `PENDING`.

---

## 5. Troubleshooting & Common Questions

### Q1: Port is already in use (`Address already in use: bind`)
Check which process is holding the port and terminate it:

**Windows PowerShell:**
```powershell
# Example for port 8081
netstat -ano | findstr :8081
# Terminate using the PID (last column)
taskkill /PID <PID> /F
```

### Q2: PostgreSQL Connection Failed
Verify that PostgreSQL service is running:
- **Windows:** Run `services.msc` and ensure `postgresql-x64-XX` is **Running**.
- **macOS:** `brew services start postgresql@15`
- **Linux:** `sudo systemctl start postgresql`

### Q3: Redis connection warnings in backend logs
If Redis is not running locally on port `6379`, Ficcado-Data logs a warning:
```
WARN - Redis cache unavailable. Falling back directly to database.
```
This is **expected and intentional behavior**. Ficcado-Data implements a graceful fallback mechanism; the entire application will function normally without Redis.

### Q4: NGINX failed to start
Check the NGINX error log at `gateway/logs/error.log` or test the config:
```powershell
nginx -t -c "$pwd\gateway\nginx.conf"
```
Ensure no other process is bound to port `8000`.

---

## 6. Stopping the Services

To shut down the local development environment:
1. In each terminal window (Terminals 1, 2, 3, 5, 6), press `Ctrl + C`.
2. In Terminal 4 (or any shell), stop NGINX:
   ```powershell
   nginx -s stop
   ```

You are now ready to verify the entire Ficcado microservices platform!
