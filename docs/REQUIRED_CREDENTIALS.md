# Ficcado Application Suite — Required Credentials & Configuration Inventory

This document lists every credential, secret, API key, and environment configuration setting required across the **Ficcado** application suite (Ficcado-Data CRM Backend, Ficcado-Website-Data Backend, Ficcado-Payment-Gateway-Data Backend, Website Storefront Frontend, CRM Admin Frontend, and Docker Infrastructure).

> [!CAUTION]
> **CRITICAL SECURITY RULES:**
> 1. **TEST-MODE RAZORPAY KEYS ONLY:** Only test-mode Razorpay credentials (`rzp_test_...`) may be provided and used in development/testing. **Live keys (`rzp_live_...`) are strictly refused.**
> 2. **NO HARDCODED SECRETS:** Never commit `.env`, `.env.local`, or any actual passwords/secrets to version control. All files containing real credentials must be gitignored.
> 3. **PROD vs DEV DEFAULTS:** Development defaults are provided for local development where safe; production deployments MUST override these with high-entropy secrets.

---

## 1. Quick Summary Table

| Category | Missing / Action Required from Developer | Dev Default Available? | Target Service / Component |
|---|---|:---:|---|
| **Razorpay Test Credentials** | **MISSING** (Key ID, Secret, Webhook Secret) | No (mocked in tests) | Payment Gateway Backend |
| **Razorpay Auto-Capture** | **CONFIRMATION REQUIRED** (Confirm enabled) | Default: True | Payment Gateway Backend |
| **Cloudflare R2 Media Storage** | Optional for dev / Required for real media uploads | Yes (local fallback) | CRM Backend (`ficcado_crm_backend`) |
| **SMTP Mail Server** | Optional for dev / Required for real customer emails | Yes (mail simulation) | Website Data & CRM Backends |
| **Customer JWT & Admin Secrets** | Needs high-entropy generation for prod | Yes (safe dev secret) | CRM Backend & CRM Frontend |
| **Inter-Service & Gateway Secrets**| Needs high-entropy generation for prod | Yes (safe dev secret) | Gateway & All Backends |
| **Docker Compose Passwords** | Configured in `infra/.env` by developer | Yes (`.env.example`) | Docker Compose Infrastructure |
| **Host Database (`ficcado_data`)** | Preserved on host port 5432 | Yes (`arjun7945`) | Host PostgreSQL |

---

## 2. Detailed Credentials Inventory

### 2.1 Razorpay Payment Gateway (Test-Mode)

| Variable Name | Target Service | Purpose | Expected Format | Status | Where to Obtain |
|---|---|---|---|:---:|---|
| `RAZORPAY_KEY_ID` | `ficcado_payment_gateway_data` | Public key identifier for Razorpay API requests & checkout | String starting with `rzp_test_` (e.g., `rzp_test_1DP5mmOlF5G5ag`). **Live keys (`rzp_live_`) are forbidden.** | **MISSING** | Razorpay Dashboard ➔ Settings ➔ API Keys ➔ Generate Test Key |
| `RAZORPAY_KEY_SECRET` | `ficcado_payment_gateway_data` | Secret key used to sign orders & verify HMAC payment signatures | High-entropy string (e.g., 20–40 alphanumeric characters) | **MISSING** | Razorpay Dashboard ➔ Settings ➔ API Keys ➔ Generate Test Key |
| `RAZORPAY_WEBHOOK_SECRET` | `ficcado_payment_gateway_data` | Secret used to verify Razorpay webhook raw body HMAC-SHA256 signatures | High-entropy secret string configured in webhook settings | **MISSING** | Razorpay Dashboard ➔ Settings ➔ Webhooks ➔ Add New Webhook |
| `RAZORPAY_PAYMENT_CAPTURE` | Razorpay Dashboard Account Setting | Automatic capture of authorized payments without secondary manual capture API call | Account flag: **Automatic Capture** enabled | **CONFIRM** | Razorpay Dashboard ➔ Settings ➔ Configuration ➔ Payment Capture: Set to "Automatically capture all payments" |

> [!NOTE]
> **Local Webhook Delivery Notice:**
> Razorpay webhooks cannot reach `http://localhost:8000` or `http://localhost:8083` directly. For local testing of real webhooks, use a tunnel such as **Cloudflare Tunnel** (`cloudflared tunnel`), **ngrok** (`ngrok http 8000`), or **localtunnel** pointing to the API Gateway. Configure the generated tunnel URL in your Razorpay Dashboard under Webhooks (e.g., `https://<tunnel-id>.ngrok.io/api/payments/webhooks/razorpay`). If a tunnel is not running, the background **reconciliation scheduler** (Phase P2-8) automatically catches and completes captured payments every 10 minutes.

---

### 2.2 Security & Authentication Keys

| Variable Name | Target Service | Purpose | Expected Format | Status | How to Generate / Where to Obtain |
|---|---|---|---|:---:|---|
| `JWT_SECRET` | `ficcado_crm_backend`, `ficcado_crm_app` | HMAC-SHA256 signing secret for Admin CRM JWT tokens | String of at least 32 bytes (256 bits) | Dev Default | Generate via: `openssl rand -base64 32` |
| `GATEWAY_SHARED_SECRET` | `ficcado-gateway` (NGINX), All 3 Backends | Shared secret header (`X-Gateway-Secret`) validating requests originate from the gateway | High-entropy random string | Dev Default (`ficcado-gateway-internal-secret-2026`) | Generate via: `openssl rand -hex 24` |
| `INTERNAL_API_KEY` | `ficcado_crm_backend`, `ficcado_payment_gateway_data` | Authorization token for inter-service HTTP endpoints under `/api/internal/**` | High-entropy string | Dev Default (`ficcado-internal-service-secret-key-change-in-prod`) | Generate via: `openssl rand -hex 32` |
| `ADMIN_TOKEN` | `website/frontend` | Token protecting website internal health and diagnostics routes | String token | Dev Default (`ficcado-admin-secure-token`) | Set in `website/frontend/.env.local` |

---

### 2.3 Database URLs & Credentials

| Variable Name | Target Service | Purpose | Expected Format | Status | Where to Obtain / Notes |
|---|---|---|---|:---:|---|
| `DB_URL` | `ficcado_crm_backend` | Host PostgreSQL connection string for CRM database | `jdbc:postgresql://localhost:5432/ficcado_data` | Provided | Host native PostgreSQL instance (Port 5432) |
| `DB_USERNAME` | `ficcado_crm_backend` | Host database username | String (`postgres`) | Provided | Host PostgreSQL |
| `DB_PASSWORD` | `ficcado_crm_backend` | Host database password | String (`arjun7945`) | Provided | Host PostgreSQL |
| `DB_URL` | `ficcado_website_data` | Compose PostgreSQL connection string for Website Data | `jdbc:postgresql://localhost:5433/ficcado_website_data` | Configured | Docker Compose container `ficcado-postgres` (Port 5433) |
| `DB_USERNAME` | `ficcado_website_data` | Website database user | `ficcado_website_user` | Configured | Initialized by `infra/postgres/init/01-create-databases.sh` |
| `DB_PASSWORD` | `ficcado_website_data` | Website database password | String set in `infra/.env` (`WEBSITE_DB_PASSWORD`) | Configured | Chosen in `infra/.env` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | `ficcado_payment_gateway_data` | Compose PostgreSQL host/port/db for Payment Data | `localhost`, `5433`, `ficcado_payment_gateway_data` | Configured | Docker Compose container `ficcado-postgres` (Port 5433) |
| `DB_USERNAME` | `ficcado_payment_gateway_data` | Payment database user | `ficcado_payment_user` | Configured | Initialized by `infra/postgres/init/01-create-databases.sh` |
| `DB_PASSWORD` | `ficcado_payment_gateway_data` | Payment database password | String set in `infra/.env` (`PAYMENT_DB_PASSWORD`) | Configured | Chosen in `infra/.env` |
| `TEST_DB_URL` / `TEST_DB_USER` / `TEST_DB_PASSWORD` | All 3 Backends (Test Profile) | Isolated integration test databases on Compose | Port 5433: `*_test` databases, user: `ficcado_test_user` | Configured | Initialized by `infra/postgres/init/01-create-databases.sh` |

---

### 2.4 Redis Connection Settings

| Variable Name | Target Service | Purpose | Host / Port | Eviction Policy | Notes |
|---|---|---|---|:---:|---|
| `REDIS_SESSION_HOST` / `PORT` / `PASSWORD` | `ficcado_crm_backend` | Customer sliding sessions (10-min idle timeout) | `localhost:6380` | `noeviction` | Password defined in `infra/.env` (`REDIS_SESSION_PASSWORD`). Must reject evictions. |
| `REDIS_HOST` / `PORT` / `PASSWORD` | `ficcado_crm_backend` | Public product catalog cache | `localhost:6379` | `allkeys-lru` | Password defined in `infra/.env` (`REDIS_CACHE_PASSWORD`). 256MB LRU memory cap. |

---

### 2.5 RabbitMQ Message Broker

| Variable Name | Target Service | Purpose | Host / Port | Status | Notes |
|---|---|---|---|:---:|---|
| `RABBITMQ_HOST` / `PORT` | `ficcado_website_data`, `ficcado_payment_gateway_data` | Asynchronous order status events & notification dispatching | `localhost:5672` | Configured | AMQP port on Docker Compose `ficcado-rabbitmq` |
| `RABBITMQ_USER` / `PASSWORD` | Backends & Management Dashboard | Broker authentication & Management UI (`http://localhost:15672`) | `localhost:15672` | Configured | Set in `infra/.env` (`RABBITMQ_USER`, `RABBITMQ_PASSWORD`) |

---

### 2.6 Cloudflare R2 Media Storage (Product Images)

| Variable Name | Target Service | Purpose | Expected Format | Status | Where to Obtain |
|---|---|---|---|:---:|---|
| `R2_ACCOUNT_ID` | `ficcado_crm_backend` | Cloudflare account identifier | 32-character hexadecimal string | Optional in Dev | Cloudflare Dashboard ➔ R2 ➔ Account ID |
| `R2_ACCESS_KEY_ID` | `ficcado_crm_backend` | S3-compatible R2 API Access Key ID | 32-character hexadecimal string | Optional in Dev | Cloudflare Dashboard ➔ R2 ➔ Manage R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | `ficcado_crm_backend` | S3-compatible R2 API Secret Access Key | 64-character hexadecimal string | Optional in Dev | Cloudflare Dashboard ➔ R2 ➔ Manage R2 API Tokens |
| `R2_BUCKET_NAME` | `ficcado_crm_backend` | R2 bucket name | String (default: `ficcado-media`) | Default | Cloudflare Dashboard ➔ R2 ➔ Create Bucket |
| `R2_PUBLIC_URL` | `ficcado_crm_backend` | Custom domain or R2 dev subdomain for public image URLs | HTTPS URL (e.g., `https://media.ficcado.store`) | Default | Cloudflare Dashboard ➔ R2 ➔ Custom Domains |

---

### 2.7 SMTP Mail Server (Customer Email Notifications)

| Variable Name | Target Service | Purpose | Expected Format | Status | Where to Obtain |
|---|---|---|---|:---:|---|
| `MAIL_HOST` | `ficcado_website_data`, `ficcado_crm_backend` | SMTP relay server host | Hostname (e.g., `smtp.gmail.com`, `smtp.sendgrid.net`) | Dev Default (`localhost`) | Mail provider / Google Workspace SMTP Relay |
| `MAIL_PORT` | Backends | SMTP port | Integer (`587` for STARTTLS, `465` for SSL) | Default (`587`) | Mail provider |
| `MAIL_USERNAME` | Backends | SMTP login username | Email or username | **MISSING** | Mail provider |
| `MAIL_PASSWORD` | Backends | SMTP login password or App Password | String or 16-character App Password | **MISSING** | Mail provider / Google Account App Password |
| `MAIL_FROM` | `ficcado_website_data` | Sender address for order receipts & status updates | RFC 5322 email (e.g., `support@ficcado.in`) | Default (`support@ficcado.in`) | Domain email address |
| `MAIL_ENABLED` | `ficcado_website_data` | Controls whether real emails are dispatched or simulated in DB | Boolean (`true` / `false`) | Default (`false` in dev) | Set `true` once SMTP credentials are provided |

---

### 2.8 Frontend Storefront & CRM Public Variables

| Variable Name | Target Service | Purpose | Default / Example Value |
|---|---|---|---|
| `NEXT_PUBLIC_GATEWAY_URL` | `website/frontend` | Base URL for API Gateway requests | `http://localhost:8000` |
| `NEXT_PUBLIC_SITE_URL` | `website/frontend` | Canonical storefront URL for metadata & sitemaps | `https://ficcado.in` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `website/frontend` | Official WhatsApp customer care contact line | `916282000729` |
| `NEXT_PUBLIC_PRIVACY_EMAIL` | `website/frontend` | Contact email for privacy & data inquiries | `ficcado.clothing@gmail.com` |
| `NEXT_PUBLIC_API_URL` | `crm/ficcado_crm_app` | Backend URL for CRM API calls | `http://localhost:8081` |
| `RATE_LIMIT_STORE` | `website/frontend` | Rate limit backend storage (`memory` or `upstash`) | `memory` |

---

### 2.9 GitHub Actions CI/CD Pipeline Secrets

If setting up GitHub Actions automated testing on the repository (`.github/workflows/ci-cd.yaml`), configure these repository secrets under **GitHub ➔ Settings ➔ Secrets and variables ➔ Actions**:

| Secret Name | Purpose | Recommended Value |
|---|---|---|
| `CI_POSTGRES_PASSWORD` | Root password for CI PostgreSQL container | `ci_postgres_password_2026` |
| `CI_TEST_DB_PASSWORD` | Password for CI `ficcado_test_user` | `ci_test_password_2026` |
| `CI_REDIS_PASSWORD` | Password for CI Redis containers | `ci_redis_password_2026` |
| `CI_RABBITMQ_PASSWORD` | Password for CI RabbitMQ container | `ci_rabbitmq_password_2026` |
| `CI_JWT_SECRET` | JWT secret for CI backend test suites | High-entropy test secret |
| `CI_GATEWAY_SHARED_SECRET` | Gateway secret for CI backend test suites | High-entropy test secret |
| `CI_INTERNAL_API_KEY` | Internal service key for CI backend test suites | High-entropy test secret |

---

## 3. Checklist of Immediate Actions for Developer

1. **Provide Razorpay Test Keys:**
   - [ ] Generate Razorpay Test Key ID (`rzp_test_...`) and Secret from Razorpay Dashboard.
   - [ ] Create Webhook Secret in Razorpay Dashboard.
   - [ ] Verify "Automatically capture all payments" is toggled ON.
   - [ ] Add keys to `payment/backend/ficcado_payment_gateway_data/src/main/resources/application.yaml` or set environment variables `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
2. **Start Docker Desktop & Compose Infrastructure:**
   - [ ] Launch Docker Desktop on Windows.
   - [ ] Ensure `infra/.env` is created from `infra/.env.example`.
   - [ ] Run `docker compose -f infra/docker-compose.yml --env-file infra/.env up -d`.
3. **Configure Local Environment Files:**
   - [ ] Copy `website/frontend/.env.example` to `website/frontend/.env.local`.
   - [ ] Verify `crm/ficcado_crm_app` has `NEXT_PUBLIC_API_URL=http://localhost:8081`.
