# Ficcado Application Suite — Local Machine Setup & Runbook

This guide describes how to run all components of the Ficcado microservices platform natively on your local machine (**Windows, macOS, or Linux**) without using Docker, Docker Compose, or Kubernetes.

---

## 1. System Architecture & Port Allocation

| Component | Directory Location | Local Port | Tech Stack | Status / Notes |
|---|---|---|---|---|
| **Website Frontend** | `website/frontend/` | `3000` | Next.js 16, React 19, Tailwind CSS | Storefront (`ficcado.in`) |
| **CRM Frontend** | `crm/ficcado_crm_app/` | `3001` | Next.js 16, React 19, Tailwind CSS | Backoffice CRM (Read-Only) |
| **API Gateway** | `gateway/` | **`8000`** | NGINX Reverse Proxy | Single entrypoint for all APIs |
| **Ficcado-Data** | `crm/backend/ficcado_crm_backend/` | **`8081`** | Spring Boot 3.4.3, Java 21, JPA | Core catalog, inventory, sales |
| **Ficcado-Website-Data** | `website/backend/ficcado_website_data/` | **`8082`** | Spring Boot 3.4.3, Java 21, JPA | Enquiries, complaints, OTP |
| **Payment Gateway** | `payment/backend/ficcado_payment_gateway_data/` | **`8083`** | Spring Boot 3.4.3, Java 21 | Razorpay integration (Phase 6) |
| **PostgreSQL** | Native Service | **`5432`** | PostgreSQL 15+ | 3 separate databases |
| **Redis** *(Optional)* | Native / WSL | **`6379`** | Redis 7+ | Caching layer (graceful fallback) |
| **RabbitMQ** *(Optional)* | Native / WSL | **`5672`** / `15672` | RabbitMQ 3.12+ | Event broker (graceful fallback) |

---

## 2. Prerequisites
1. **Java Development Kit (JDK):** Java 21 LTS installed (`java -version`).
2. **Node.js:** Node.js 20+ LTS and npm (`node -v`, `npm -v`).
3. **Maven:** Not required to be installed globally; each backend service includes its own Maven wrapper (`mvnw` / `mvnw.cmd`).
4. **PostgreSQL:** Running locally on port `5432`.
5. **NGINX:** Installed and accessible in your shell (`nginx -v`).

---

## 3. Database Initialization

Connect to your local PostgreSQL instance and create the dedicated databases:

```sql
-- Connect via psql: psql -U postgres

CREATE DATABASE ficcado_data;
CREATE DATABASE ficcado_website_data;
CREATE DATABASE ficcado_payment_gateway_data;
```

Each Spring Boot service utilizes **Flyway** for automated database migration and schema creation upon startup (`baseline-on-migrate: true`).

---

## 4. Starting the Platform (Step-by-Step)

Open separate terminal windows for each service and execute the commands below.

### Step 4.1: Start Ficcado-Data (Port 8081)
```powershell
# Windows
cd "crm\backend\ficcado_crm_backend"
.\mvnw.cmd spring-boot:run

# macOS / Linux
cd crm/backend/ficcado_crm_backend
./mvnw spring-boot:run
```
- Health Check: `http://localhost:8081/actuator/health`

### Step 4.2: Start Ficcado-Website-Data (Port 8082)
```powershell
# Windows
cd "website\backend\ficcado_website_data"
.\mvnw.cmd spring-boot:run

# macOS / Linux
cd website/backend/ficcado_website_data
./mvnw spring-boot:run
```
- Health Check: `http://localhost:8082/actuator/health`

### Step 4.3: Start NGINX Gateway (Port 8000)
```powershell
# Windows (from repository root)
nginx -c "%cd%\gateway\nginx.conf"

# macOS / Linux (from repository root)
nginx -c "$(pwd)/gateway/nginx.conf"
```
- Gateway Health Check: `http://localhost:8000/health`
- Proxy Health to Ficcado-Data: `http://localhost:8000/health/ficcado-data`
- Proxy Health to Website-Data: `http://localhost:8000/health/website-data`

### Step 4.4: Start Website Frontend (Port 3000)
```powershell
cd "website\frontend"
npm install
npm run dev
```
- Storefront URL: `http://localhost:3000`

### Step 4.5: Start CRM Frontend (Port 3001)
```powershell
cd "crm\ficcado_crm_app"
npm install
npm run dev -- -p 3001
```
- CRM Dashboard URL: `http://localhost:3001`

---

## 5. Graceful Degradation Policies

The platform is designed to degrade gracefully during local development if optional infrastructure is offline:

1. **Redis (Port 6379):**
   - If Redis is unreachable, product read caching is bypassed automatically, falling back directly to database queries. No exceptions will block startup.
2. **RabbitMQ (Port 5672):**
   - If RabbitMQ is offline, event dispatches execute synchronously or are logged locally without crashing the application.
3. **SMTP Email Server (Port 587):**
   - When `MAIL_ENABLED=false` or SMTP credentials are not configured, emails (such as customer OTPs, ticket receipts, and complaint confirmations) are automatically simulated.
   - The email payload and details are persistently recorded in the `support_emails` table of `ficcado_website_data` for immediate developer verification.

---

## 6. Verification & Test Commands

### 1. Test Gateway Health
```bash
curl http://localhost:8000/health
```
Expected output:
```json
{"status":"UP","gateway":"Ficcado API Gateway","port":8000,"version":"1.0.0"}
```

### 2. Test Customer Enquiry Submission via Gateway
```bash
curl -X POST http://localhost:8000/api/v1/enquiries \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Customer",
    "email": "customer@ficcado.in",
    "category": "SIZING_FIT",
    "subject": "Size check",
    "message": "Need advice on size M vs L"
  }'
```

### 3. Test OTP Generation via Gateway
```bash
curl -X POST http://localhost:8000/api/v1/otp/generate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@ficcado.in",
    "purpose": "CUSTOMER_LOGIN"
  }'
```

### 4. Verify Internal Security Protection
```bash
curl -i http://localhost:8000/api/internal/test
```
Expected HTTP Status: `403 Forbidden`
