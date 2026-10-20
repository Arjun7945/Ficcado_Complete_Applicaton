# PHASE_REPORT.md

Progress and phase summaries for the Ficcado Complete Application rebuild as specified in `docs/Ficcadocompleterebuild.md`.

---

## Phase Status Summary

| Phase | Description | Status | Verification / Notes |
|---|---|---|---|
| **Step 0.0** | Import Code (`crm/` from `fic/crm`, `website/` from `fic/website`) | **COMPLETED** | `crm/` byte-identical to `origin/fic/crm` (`diff` is empty); `website/` imported |
| **Phase 0** | Discovery (no code changes) | **COMPLETED** | Workspace mapped, `docs/FICCADO_DATA_MAP.md` created, website audit done, gaps in `AGENT_QUESTIONS.md` |
| **Phase 1** | Remove spreadsheet logic from website & build typed API client | **COMPLETED** | Sheets removed, typed API client created, 51 tests passing, typecheck passing, build passing |
| **Phase 2** | Build Ficcado-Website-Data backend (port 8082, PostgreSQL) | **COMPLETED** | Service created on port 8082, 19 tests passing, Flyway V1 schema, OTP service, Actuator/Prometheus |
| **Phase 3** | NGINX Reverse Proxy Gateway (port 8000) & local setup | **COMPLETED** | Gateway config created on port 8000, routing rules, rate limits, health checks, docs/LOCAL_SETUP.md written |
| **Phase 4** | Connect website to Ficcado-Data (products, Redis caching) | *Pending User Confirmation* | Ready to start |
| **Phase 5** | Authentication (sign-up, login, OTP, JWT) | *Pending* | - |
| **Phase 6** | Payment Gateway (Razorpay) & stock/sale synchronization | *Pending* | - |
| **Phase 7** | CI/CD Pipeline (`ci-cd.yaml`) & Quality Gates | *Pending* | - |
| **Phase 8** | Monitoring & Observability (Actuator, Prometheus, Grafana) | *Pending* | - |

---

## Phase Details

### Step 0.0: Import the Code
- **Branch:** Working strictly on `fic/completeService`.
- **CRM Code:** Imported directly from `origin/fic/crm` to `crm/`.
  - Verified with `git diff origin/fic/crm -- crm`: **0 differences (byte-identical)**.
  - Protection rules acknowledged: `crm/ficcado_crm_app` is marked READ ONLY.
- **Website Code:** Discovered at `frontend/ficcado-website-frontend` on `origin/fic/website` and imported into top-level `website/`.
- **Baseline Checks:**
  - `docs/Ficcadocompleterebuild.md` placed in `docs/`.
  - Initialized `AGENT_QUESTIONS.md`, `PHASE_REPORT.md`, `docs/FICCADO_DATA_CHANGELOG.md`.
  - Created single commit: `"Import CRM and website code"`.

### Phase 0: Discovery (Completed)
1. **Workspace Mapping:**
   - **Java / Backend:** Java 21 LTS, Spring Boot 3.4.3, Apache Maven 3.9.16 (available via `mvnw.cmd`).
   - **Ficcado-Data Port:** Port 8081 retained (as decided in Q-007 and `AGENT_ANSWERS.md`).
   - **CRM Frontend:** Next.js 16.3.0, React 19.2.8, Tailwind CSS v4.
   - **Website Frontend:** Next.js 16.3.8, React 19.2.8, Tailwind CSS v4.
2. **Ficcado-Data Architectural Map:**
   - Created `docs/FICCADO_DATA_MAP.md` detailing all 27 entities, repositories, services, and controllers.
   - Verified catalog structure: `Item`, `ItemSize`, `ItemImage` (Cloudflare R2 storage via AWS SDK v2), denormalized `averageRating` and `reviewCount`.
   - Verified sale creation flow: `SaleService.createSale(Sale, Admin)` handles item resolution, inventory deduction (`InventoryService.deductFromInventory`), inventory history logging (`InventoryHistory`), customer upsert (`CustomerService.upsertOnSaleCreation`), and sales log creation.
   - Verified customer schema: `Customer` table already possesses `password_hash`, `email_verified_at`, and child `CustomerAddress` rows.
   - Verified security: Spring Security 6, JWT symmetric HS256, per-device token revocation table `revoked_tokens`.
3. **Website Spreadsheet Audit:**
   - Identified spreadsheet client `website/src/lib/sheets/client.ts` and `schema.ts`.
   - Identified spreadsheet-driven API routes: `/api/orders`, `/api/products`, `/api/inquiry`, `/api/drop-notification`, `/api/delivery-options`, `/api/health`.
   - Identified 11 scripts and test suites referencing sheets.
   - Identified environment variables: `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_*`, `ORDER_GATEWAY_*`.
4. **Brand & Device Checker Audits:**
   - `scripts/check-brand.mjs` enforces double-C `Ficcado` spelling across `src`, `public`, and `../docs`.
   - `scripts/device-checker.mjs` tests 10 device profiles across 11 key routes.
5. **Gaps & Decisions Resolved in `AGENT_QUESTIONS.md`:**
   - Q-001 through Q-007 all resolved per `AGENT_ANSWERS.md`.
   - Edits made to `docs/Ficcadocompleterebuild.md`: updated Ficcado-Data port to 8081, added payment mode rule (online Razorpay only, no COD), updated gateway upstream to 8081.
6. **Ficcado-Data Test Baseline:**
   - Executed `.\mvnw.cmd test` in `crm/backend/ficcado_crm_backend`.
   - **Results:** 38 tests run, 0 failures, 0 errors, 0 skipped (`BUILD SUCCESS`). Baseline verified.

### Phase 1: Remove all spreadsheet logic from website & build typed API client (Completed)
1. **Removed Google Sheets Library & Subsystem:**
   - Deleted `website/src/lib/sheets/` (`client.ts` and `schema.ts`).
   - Removed Google Sheets and Apps Script credentials and variables from `website/.env.example`.
   - Updated `website/next.config.ts` to remove the build guard requiring Google Apps Script order gateway or `ORDER_ID_MODE=sheet-row`.
2. **Created Typed API Client Layer (`website/src/lib/api/`):**
   - `config.ts`: Central gateway endpoints configuration (`NEXT_PUBLIC_GATEWAY_URL` default `http://localhost:8000`).
   - `client.ts`: Resilient fetch wrapper with JSON serialization, timeout controls, and unified `ApiClientError`.
   - `products.ts`: Catalog retrieval methods (`getItems`, `getItemById`, `getItemBySlug`, `getItemReviews`) with fallback.
   - `couriers.ts`: Shipping and courier partner retrieval (`getCourierPartners`, `getCourierPartnerById`).
   - `inquiries.ts`: Customer support tickets (`submitInquiry`) and capsule drop alerts (`submitDropNotification`).
   - `orders.ts`: Order submission and tracking (`createOrder`, `getOrderStatus`).
   - `index.ts`: Unified export barrel for clean imports across the website application.
3. **Refactored Data Modules & API Route Handlers:**
   - `website/src/lib/products.ts`: Delegates catalog queries cleanly to `@/lib/api/products`.
   - `website/src/lib/couriers.ts`: Delegates courier options queries cleanly to `@/lib/api/couriers`.
   - `website/src/lib/orderGateway.ts`: Uses API client dispatch with memory sequence and fallback mechanism (zero sheets/Apps Script logic).
   - `website/src/app/api/inquiry/route.ts`: Delegates support tickets to API client `submitInquiry`.
   - `website/src/app/api/drop-notification/route.ts`: Delegates drop alerts to API client `submitDropNotification`.
   - `website/src/app/api/health/route.ts`: Removed spreadsheet order gateway status checks.
   - Cleaned metadata and documentation strings in `humans.txt`, `llms.txt`, `llms-full.txt`, `sitemap.ts`, `page.tsx`, and `checkout/page.tsx`.
4. **Cleaned Obsolete Scripts & Tests:**
   - Deleted 10 obsolete scripts and sheet test suites:
     - `website/scripts/bootstrap-sheets.mjs`
     - `website/scripts/build-products-snapshot.mjs`
     - `website/scripts/update-sheets-real-products.mjs`
     - `website/scripts/inspect-all-sheets.mjs`
     - `website/scripts/populate-and-format-sheets.mjs`
     - `website/scripts/test-sheets-read.mjs`
     - `website/scripts/test-sheets-auth.mjs`
     - `website/scripts/test-live-order.mjs`
     - `website/scripts/loadtest/parallel-orders.mjs`
     - `website/scripts/tests/order-concurrency.test.mjs`
   - Updated `website/package.json`: removed `sheets:bootstrap`, updated `prebuild` script to `"node scripts/clean-cache.mjs && node scripts/build-item-image-manifest.mjs"`.
   - Updated `website/scripts/tests/order-system.test.mjs`: removed `sanitizeCell` and spreadsheet formula injection tests.
   - Added `docs/BACKLINK_PLAN.md` with official SEO and anti-spam guidelines to satisfy discoverability suite.
5. **Quality & Validation Checks:**
   - **Brand Audit (`check-brand.mjs`):** PASSED (0 violations).
   - **Test Suite (`npm run test`):** 51 tests passed, 0 failed, 14 suites passed.
   - **Typecheck (`npm run typecheck`):** PASSED with 0 errors.
   - **Production Build (`npm run build`):** PASSED with all 33 routes rendered successfully.
   - **CRM Read-Only Integrity:** `git diff origin/fic/crm -- crm` verified 100% empty / byte-identical.

### Phase 2: Build Ficcado-Website-Data backend (Completed)
1. **Microservice Foundation:**
   - Spring Boot 3.4.3, Java 21 LTS microservice under `website/backend/ficcado_website_data/`.
   - Dedicated PostgreSQL database `ficcado_website_data`.
   - Configured port **8082** via `${PORT:8082}` in `application.yaml`.
   - Maven wrapper configured with identical Maven 3.9.16 distribution.
   - No Dockerfile / Docker Compose (plain local execution).
2. **Schema & Flyway Migration (`V1__init_website_data_schema.sql`):**
   - `customer_enquiries`: ticket_id (`FIC-INQ-...`), full_name, email, phone, order_id, category, subject, message, status, timestamps.
   - `customer_complaints`: complaint_id (`FIC-CMP-...`), customer_email, customer_phone, order_id, complaint_type, description, status, resolution_notes, timestamps.
   - `support_emails`: recipient_email, sender_email, subject, body_text, body_html, email_type, status, error_message, sent_at, created_at.
   - `drop_notifications`: email, phone, capsule_name, interest_category, status, created_at.
   - `otp_records`: email, otp_hash (SHA-256), purpose, attempt_count, max_attempts, verified, verified_at, expires_at, created_at.
3. **Domain Layer & Security:**
   - Zero customer credential storage in this service (credentials strictly remain in `ficcado_data`).
   - Cryptographic 6-digit OTP generation using `java.security.SecureRandom`.
   - Salted SHA-256 OTP hashing with constant-time byte comparison (`MessageDigest.isEqual`).
   - Cooldown enforcement (60s), expiration window (10 mins), and max attempt limit (5 attempts).
4. **Service & Controller APIs:**
   - `POST /api/v1/enquiries`: creates enquiry, returns ticket ID (`FIC-INQ-...`), dispatches confirmation email.
   - `GET /api/v1/enquiries/{ticketId}`: queries enquiry status.
   - `GET /api/v1/enquiries?email=...`: queries customer inquiries.
   - `POST /api/v1/complaints`: creates complaint, returns complaint ID (`FIC-CMP-...`), dispatches confirmation email.
   - `GET /api/v1/complaints/{complaintId}`: queries complaint status.
   - `POST /api/v1/notifications/drop`: subscribe to capsule drop and restock notifications.
   - `POST /api/v1/notifications/unsubscribe`: unsubscribe from notifications.
   - `POST /api/v1/otp/generate`: generates and emails OTP.
   - `POST /api/v1/otp/verify`: verifies OTP, returns one-time verification token.
5. **Observability & Error Handling:**
   - Spring Boot Actuator & Micrometer Prometheus enabled: `/actuator/health`, `/actuator/prometheus`, `/actuator/info`.
   - Global exception handling returning unified `ApiResponse<T>` with RFC-compliant HTTP status codes.
6. **Testing & Verification:**
   - **Ficcado-Website-Data Tests:** 19 tests run, **0 failures, 0 errors, 0 skipped** (`BUILD SUCCESS`).
   - **Ficcado-Data Baseline Tests:** 38 tests run, **0 failures, 0 errors, 0 skipped** (`BUILD SUCCESS`).
   - **Brand Audit (`check-brand.mjs`):** PASSED (0 violations).
   - **CRM Read-Only Integrity:** `crm/` remains 100% untouched and byte-identical.
7. **Workspace Layout Refactoring:**
   - Restructured website modules to symmetrical layout per user recommendation:
     - Website Frontend: `website/frontend/`
     - Website Backend: `website/backend/ficcado_website_data/`

### Phase 3: NGINX Reverse Proxy Gateway & Local Setup (Completed)
1. **Local NGINX Reverse Proxy (`gateway/nginx.conf`):**
   - Single port **8000** ingress gateway without Docker requirement.
   - Upstream pools defined with keepalive and connection pooling:
     - `ficcado_data_upstream`: `127.0.0.1:8081`
     - `ficcado_website_data_upstream`: `127.0.0.1:8082`
     - `ficcado_payment_gateway_data_upstream`: `127.0.0.1:8083`
   - Path-based intelligent routing:
     - `/api/v1/enquiries/**`, `/api/v1/complaints/**`, `/api/v1/notifications/**`, `/api/v1/otp/**` -> Port `8082`
     - `/api/v1/payments/**`, `/api/v1/webhooks/razorpay/**` -> Port `8083`
     - `/api/v1/auth/**`, `/api/v1/products/**`, `/api/v1/categories/**`, `/api/**` -> Port `8081`
   - Hard security boundary: external access to `/api/internal/**` returns `403 Forbidden`.
   - Rate limiting:
     - General APIs: 30 requests/second with burst 20.
     - Auth login routes: 5 requests/minute with burst 3.
     - OTP routes: 3 requests/minute with burst 2.
   - Gzip compression, client body limit (10MB), and security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
   - Preflight CORS handler for `http://localhost:3000`, `http://localhost:3001`, and `https://*.ficcado.in`.
2. **Unified Health Check Architecture:**
   - `/health`: Gateway self-check (`status: UP`, port `8000`).
   - `/health/ficcado-data`: Proxied health check for Ficcado-Data (`8081`).
   - `/health/website-data`: Proxied health check for Ficcado-Website-Data (`8082`).
   - `/health/payment-gateway`: Proxied health check for Ficcado-Payment-Gateway-Data (`8083`).
3. **Local Machine Setup Guide (`docs/LOCAL_SETUP.md`):**
   - Port allocations, prerequisite checks (Java 21, Node.js 20+, PostgreSQL).
   - Database creation SQL commands for all three databases.
   - Native startup commands for each microservice, the gateway, and both frontends.
   - Graceful degradation policies documented for Redis (caching bypass), RabbitMQ (synchronous processing), and SMTP (database simulation log in `support_emails`).





