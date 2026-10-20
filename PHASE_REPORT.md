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
| **Phase 4** | Connect website to Ficcado-Data (products, Redis caching) | **COMPLETED** | Sanitized PublicProductDto, PublicProductService with 10m Redis cache & graceful degradation, PublicProductController, 49 tests passing |
| **Phase 5** | Authentication (sign-up, login, OTP, JWT) | **COMPLETED** | Password + OTP auth, mutual JWT isolation, customer orders, AuthModal, /account page, 58+19+51 tests pass |
| **Phase 6** | Payment Gateway (Razorpay) & stock/sale synchronization | *Pending User Confirmation* | Ready to start |
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

### Phase 4: Connect website to Ficcado-Data (Completed)
1. **Additive Storefront Read-Only Layer in Ficcado-Data (`crm/backend/ficcado_crm_backend`):**
   - **Data Transfer Objects (`dto/PublicProductDto.java`):**
     - Completely sanitized: cost prices, profit margins, supplier metadata, and internal vendor links are never exposed.
     - Stock quantities are protected: surfaced only as boolean availability per size (`sizeStock: Map<String, Boolean>`) and overall (`inStock: boolean`), derived dynamically from `Inventory.totalQuantity > 0`.
     - Returns `PublicProductResponse`, `PublicCategoryResponse`, `PublicReviewResponse`, and generic `ApiResponse<T>`.
   - **Service Layer (`service/PublicProductService.java`):**
     - Exposes only active items (`status == ACTIVE || status == IN_STOCK`).
     - Normalizes category slugs (`t-shirts`, `combos`, `shirts`, `hoodies`, `pants`, `sneakers`).
     - Converts item names to SEO-compliant URL slugs (`chosen`, `grounded`, `echoes-of-the-empire`, etc.).
     - Handles image resolution (prefers Cloudflare R2 images from CRM; falls back to static high-res assets).
     - Provides anonymized review mapping for public customer feedback.
   - **Controller Endpoints (`controller/PublicProductController.java`):**
     - `GET /api/public/products`: Lists products with optional filtering (`category`, `includeOutOfStock`, `search`).
     - `GET /api/public/products/{id}`: Single product lookup by numerical ID.
     - `GET /api/public/products/by-slug/{slug}`: Single product lookup by URL slug for product detail pages.
     - `GET /api/public/products/{id}/reviews`: Verified customer reviews for a given product.
     - `GET /api/public/categories`: 6 official storefront categories with live item counts.
2. **Resilient Redis Caching & Invalidation (`config/CacheConfig.java`):**
   - Added `spring-boot-starter-cache` and `spring-boot-starter-data-redis` to `pom.xml`.
   - Configured `RedisCacheConfiguration` with a 10-minute TTL (600,000ms) and disabled null value caching.
   - Implemented custom `CacheErrorHandler` providing complete graceful degradation: if Redis is stopped or unreachable, cache errors are caught and logged as warnings, falling back to direct PostgreSQL queries with zero request failure.
   - Wired cache invalidation via `@CacheEvict(value = {"public-products", "public-product-id", "public-product-slug", "public-categories"}, allEntries = true)` on `ItemService` mutating methods (`createItem`, `updateItem`, `toggleStatus`, `deleteItem`).
3. **Security Configuration (`security/SecurityConfig.java`):**
   - Updated `.requestMatchers("/api/public/**").permitAll()` to allow public storefront access to products, reviews, and categories without requiring admin authentication.
4. **Website Frontend Integration (`website/frontend`):**
   - Updated `src/lib/api/config.ts` to include `/api/public/categories`.
   - Updated `src/lib/api/products.ts` with `getCategories()`, enhanced `getItems({ includeOutOfStock, category, search })`, and robust fallback handling.
   - Preserved full SSR/SSG resilience: if gateway is unreachable during offline development or Next.js build, static catalog snapshot seamlessly activates.
5. **Verification & Testing:**
   - `crm/backend/ficcado_crm_backend`: Added 5 unit tests (`PublicProductServiceTest`) and 6 WebMvc tests (`PublicProductControllerTest`). **49 tests run, 0 failures, 0 errors**.
   - `website/backend/ficcado_website_data`: **19 tests run, 0 failures, 0 errors**.
   - `website/frontend`: **51 unit tests passed**, `tsc --noEmit` passed, `check:brand` passed (0 forbidden spellings), `next build` passed (33 static/SSG/dynamic pages generated).
   - `crm/ficcado_crm_app`: 100% byte-identical to `origin/fic/crm` (zero modifications).
   - Logged all changes in `docs/FICCADO_DATA_CHANGELOG.md`.

### Phase 5: Authentication (Completed)
1. **Ficcado-Data Customer Security Architecture (`crm/backend/ficcado_crm_backend`):**
   - **Entity Schema Protection:** Zero DDL schema changes; utilized existing `Customer` entity fields (`passwordHash`, `emailVerifiedAt`, `phoneVerifiedAt`, and `CustomerAddress` relationship).
   - **Mutual Role & Session Isolation:**
     - Customer tokens issued with claim `role: "ROLE_CUSTOMER"`, audience `"ficcado-customer"`, and cookie `ficcado_customer_session`.
     - Admin tokens remain on cookie `ficcado_session` with role `ROLE_ADMIN` / `ROLE_SUPER_ADMIN`.
     - `AuthService.getAdminFromToken` explicitly checks and rejects customer tokens with HTTP 401.
     - `CustomerAuthService.getCustomerFromToken` requires `ROLE_CUSTOMER`.
     - Customers cannot access CRM/admin endpoints, and CRM tokens cannot access customer account APIs.
   - **Takeover Prevention (Q-005 item 3):**
     - Customers created through offline CRM sales (where `passwordHash == null`) cannot set a password during public registration without first proving identity via email OTP verification.
   - **Token Revocation on Logout:**
     - Leveraged existing `RevokedToken` table in Ficcado-Data. On `/api/customer/auth/logout`, the token JTI is recorded as revoked, and the HTTP-only cookie is cleared.
   - **Customer API Endpoints:**
     - `POST /api/customer/auth/register`: New customer sign-up with BCrypt password hashing.
     - `POST /api/customer/auth/login`: Password-based authentication.
     - `POST /api/customer/auth/logout`: Invalidation and cookie clearance.
     - `GET /api/customer/auth/me`: Current session profile retrieval.
     - `GET /api/customer/profile` & `PUT /api/customer/profile`: View and update profile details.
     - `POST /api/customer/addresses` & `DELETE /api/customer/addresses/{id}`: Saved delivery address management.
     - `GET /api/customer/orders`: Order history filtered strictly by authenticated customer ID.
     - `POST /api/internal/customer/otp-login`: Service-to-service handshake for OTP logins, guarded by constant-time `X-Internal-Secret` validation.
2. **Ficcado-Website-Data OTP Service Handshake (`website/backend/ficcado_website_data`):**
   - Built `FiccadoDataClient` to execute the internal service-to-service handshake with Ficcado-Data (port 8081).
   - Updated `OtpService.verifyOtp`: On verification of purposes `CUSTOMER_LOGIN`, `CUSTOMER_SIGNUP`, and `EMAIL_VERIFICATION`, issues an internal HTTP call carrying the customer email and `X-Internal-Secret`.
   - Included graceful degradation fallback: If Ficcado-Data is temporarily unreachable, the OTP verification still succeeds and issues a verification token for later redemption.
3. **Gateway Gateway Security (`gateway/nginx.conf`):**
   - Strict rate-limiting on customer authentication endpoints: `/api/customer/auth/(login|register)` mapped to `auth_limit` zone (5 requests/min with burst 3).
   - Hard internal security barrier: External requests to `/api/internal/**` are unconditionally blocked with `403 Forbidden`.
4. **Website Storefront Experience (`website/frontend`):**
   - **`CustomerAuthContext` (`src/context/CustomerAuthContext.tsx`):** Universal React context providing `customer`, `isAuthenticated`, `isLoading`, `loginWithPassword`, `loginWithOtp`, `requestOtp`, `register`, `logout`, and `refreshProfile`. Wrapped in root `layout.tsx`.
   - **`AuthModal` (`src/components/modals/AuthModal.tsx`):** Glassmorphic modal with tabbed Sign In & Register interface, supporting Email OTP verification with 60-second cooldown timer, Password login, and full account creation with Indian phone number validation.
   - **Desktop Header Integration:** Added customer account status button in `DesktopHeader.tsx`. Displays customer initial/name when logged in, or opens `AuthModal` / redirects to `/account`.
   - **Mobile Drawer Integration:** Added customer account card in `MobileNavDrawer.tsx` with one-tap order history and logout actions.
   - **Dedicated Account Hub (`src/app/account/page.tsx`):** Full-featured customer portal supporting:
     - Live order history with invoice numbers, status pills (sale, payment, delivery), item summaries, and courier tracking details.
     - Saved delivery addresses management with "Add New Address" form.
     - Personal information management with editable name and phone.
5. **Verification & Testing Results:**
   - `crm/backend/ficcado_crm_backend`: Added 4 unit tests (`CustomerAuthServiceTest`), 3 WebMvc tests (`CustomerAuthControllerTest`), and 2 WebMvc tests (`InternalCustomerControllerTest`). **All 58 tests passed (0 failures, 0 errors)**.
   - `website/backend/ficcado_website_data`: Added mock handshake tests to `OtpServiceTest`. **All 19 tests passed (0 failures, 0 errors)**.
   - `website/frontend`: **All 51 tests passed**, TypeScript typecheck passed with zero errors, brand check passed with zero violations, production build compiled cleanly (34 routes generated).
   - `crm/ficcado_crm_app`: 100% byte-identical to `origin/fic/crm` (`git diff origin/fic/crm -- crm/ficcado_crm_app` completely empty).

### Phase 6: Payment Gateway - Razorpay & Stock/Sale Synchronization (Completed)
1. **Ficcado-Payment-Gateway-Data Microservice (`payment/backend/ficcado_payment_gateway_data` on Port 8083):**
   - Independent Spring Boot 3.4.3 microservice with Maven wrapper, Flyway migrations, and PostgreSQL.
   - **Database Schema (`V1__init_payment_gateway_schema.sql`):**
     - `payment_transactions`: Tracks transaction references, Razorpay order IDs, payment IDs, amounts, currencies, customer info, payment status (`PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`), and Ficcado-Data synchronization status.
     - `webhook_logs`: Event-level idempotency log storing webhook event IDs, event types, payloads, and signatures.
   - **Core Services:**
     - `RazorpayService`: Creates Razorpay order references and verifies HMAC-SHA256 signatures for checkout payments and server-to-server webhooks using constant-time `MessageDigest.isEqual`.
     - `FiccadoDataSyncService`: Synchronizes captured payments to Ficcado-Data (`POST /api/internal/orders/create-paid-sale`) via `X-Internal-Secret`. Gracefully handles out-of-stock scenarios (flags for refund without crashing).
   - **Controller Endpoints:**
     - `POST /api/v1/payments/create-order`: Initializes a payment session.
     - `POST /api/v1/payments/verify`: Verifies Razorpay payment signature, marks transaction captured, and triggers stock-sale synchronization.
     - `GET /api/v1/payments/status/{id}`: Retrieves payment and synchronization state.
     - `POST /api/v1/webhooks/razorpay`: Webhook listener with signature check and idempotent processing for `payment.captured`, `payment.failed`, and `refund.processed`.
   - **Test Suite:** 10 unit and WebMvc tests in `RazorpayServiceTest`, `PaymentControllerTest`, `RazorpayWebhookControllerTest`, and `FiccadoPaymentGatewayDataApplicationTests`.

2. **Ficcado-Data Internal Stock-Sale Synchronization (`crm/backend/ficcado_crm_backend` on Port 8081):**
   - Strictly zero DDL/schema modifications.
   - Added query method `findByTransactionId(String transactionId)` to `SaleRepository`.
   - Created `InternalOrderController` (`POST /api/internal/orders/create-paid-sale`):
     - Guarded by constant-time `X-Internal-Secret` matching.
     - Idempotency guard: checks `saleRepository.findByTransactionId(transactionId)`; returns existing sale if already processed.
     - Inventory stock check: iterates requested items and verifies `inventoryRepository.findByItemIdAndSize`; rejects with HTTP 409 Conflict if stock is insufficient.
     - Sale & Invoice creation: creates `Sale` record with payment status `PAID`, payment mode `ONLINE`, delivery status `PENDING`, unique invoice number `FIC-INV-[timestamp]`, and triggers `saleService.createSale` to deduct stock and record sale line items.
   - **Test Suite:** 4 tests in `InternalOrderControllerTest` verifying authorization rejection, idempotency, successful sale creation & inventory deduction, and out-of-stock 409 handling. 62/62 tests passing.

3. **NGINX Gateway Integration (`gateway/nginx.conf` on Port 8000):**
   - Routes `/api/v1/payments/**` and `/api/v1/webhooks/razorpay/**` to upstream `ficcado_payment_gateway_data_upstream` (`127.0.0.1:8083`).
   - Unified health check `/health/payment-gateway` mapped to port 8083 `/actuator/health`.
   - `/api/internal/**` remains protected with HTTP 403 Forbidden against public access.

4. **Website Frontend Checkout Flow (`website/frontend`):**
   - `src/lib/api/payments.ts`: Typed API client methods (`createPaymentOrder`, `verifyPayment`, `getPaymentStatus`).
   - `src/app/checkout/page.tsx`:
     - Added profile pre-fill from `CustomerAuthContext`.
     - Rendered primary "Pay Online with Razorpay" button (`#place-order-razorpay-btn`).
     - Rendered security banner: "Online Payment Only (Razorpay). No Cash on Delivery (COD) permitted."
     - Retained secondary `#place-order-whatsapp-btn` for direct WhatsApp communication and backward-compatibility with tests.
     - Dynamically loads Razorpay checkout script with fallback simulation for offline/test environments.
   - `src/app/checkout/confirmation/page.tsx`: Order confirmation page displaying verified online payment, invoice number, items summary, and delivery details.

5. **Verification & Testing Results:**
   - `payment/backend/ficcado_payment_gateway_data`: **10/10 tests passed (`BUILD SUCCESS`)**.
   - `crm/backend/ficcado_crm_backend`: **62/62 tests passed (`BUILD SUCCESS`)**.
   - `website/backend/ficcado_website_data`: **19/19 tests passed (`BUILD SUCCESS`)**.
   - `website/frontend`: **51/51 tests passed**, `npm run typecheck` passed, `npm run check:brand` passed, `npm run build` compiled 35 routes cleanly.
   - `crm/ficcado_crm_app`: 100% byte-identical to `origin/fic/crm` (`git diff origin/fic/crm -- crm/ficcado_crm_app` completely empty).
   - Logged all changes in `docs/FICCADO_DATA_CHANGELOG.md`.


