# Agent Questions & Authoritative Answers Review (`agentanswer.md`)

This document provides a comprehensive evaluation of every question recorded in [`AGENT_QUESTIONS.md`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/AGENT_QUESTIONS.md) as well as the new architectural questions and decisions that arose during **Part 2** (`Part2.md` and `docs/Part2_Addendum.md`).

For each question, this document details:
1. **The Question / Problem Statement**
2. **Current Resolution Status** (`RESOLVED`, `PARTIALLY RESOLVED`, or `UNRESOLVED / DEVIATED`)
3. **Verification in Code & Identified Gaps**
4. **Authoritative Answer & Solution**

---

## Part 1 Historical Questions (Q-001 through Q-007)

### Q-001: Brand Check Script & Requirement Document Allowlist
- **Problem Statement:** Requirement docs and memory notes contain historical references to older spellings. How should `website/scripts/check-brand.mjs` handle them?
- **Status:** **RESOLVED**
- **Verification in Code:**
  - `website/frontend/scripts/check-brand.mjs` contains strictly scoped allowlist entries (`../docs/Ficcadocompleterebuild.md`, `../docs/briefs/...`, `../docs/memory.md`).
  - Running `node website/frontend/scripts/check-brand.mjs` passes with zero forbidden occurrences.
- **Answer & Decision:** Option A (tightly scoped allowlist with exact paths only; zero wildcards; zero tolerance for spelling errors across all application code, configs, comments, and UI text).

---

### Q-002: Root-Level `.gitignore`
- **Problem Statement:** What should be ignored at the repository root level?
- **Status:** **RESOLVED**
- **Verification in Code:**
  - Root `.gitignore` ignores OS files (`.DS_Store`, `Thumbs.db`), IDE files (`.vscode/`, `.idea/`), `.env`, `.env.local`, `*.env`, and `target/`, while leaving `.env.example` tracked.
- **Answer & Decision:** Option A (minimal safety net at root level; subproject `.gitignore` files preserved).

---

### Q-003: Website Import Directory Structure
- **Problem Statement:** Should Next.js website files sit directly under `website/` or `website/frontend`?
- **Status:** **RESOLVED**
- **Verification in Code:**
  - Next.js application lives in `website/frontend/`, scripts reference proper relative paths, and package scripts execute cleanly.
- **Answer & Decision:** Option A confirmed; directory layout verified across all test runners, device checkers, and build scripts.

---

### Q-004: Ficcado-Data Public Product Read Endpoints
- **Problem Statement:** How should public catalog browsing be exposed from the CRM backend without leaking internal cost prices or inventory details?
- **Status:** **RESOLVED**
- **Verification in Code:**
  - `PublicItemController.java` (`PublicProductController.java`) exposes `/api/public/products` and `/api/public/categories`.
  - Exposes only `ACTIVE` and `IN_STOCK` items.
  - Returns `PublicProductResponse` DTO containing name, slug, retail price, images in display order, tags, description, and boolean in-stock indicators per size (never raw inventory quantities or cost price).
  - Narrow matcher in `SecurityConfig.java` permits only `GET` methods.
- **Answer & Decision:** Option A with strict security rules (dedicated public DTOs, no entity exposure, narrow GET matchers in Spring Security).

---

### Q-005: Customer Lookup by Email & Customer Authentication in Ficcado-Data
- **Problem Statement:** How to handle customer sign-up, email uniqueness, JWT isolation from CRM admins, and phone-number mapping?
- **Status:** **RESOLVED**
- **Verification in Code:**
  - `CustomerRepository` implements `findByEmailIdIgnoreCase`.
  - Customer JWT uses distinct cookie name `ficcado_customer_session`, audience `ficcado-customer`, and role `ROLE_CUSTOMER`.
  - Admin endpoints reject customer tokens; customer endpoints reject admin tokens.
  - Password encoded via BCrypt.
- **Answer & Decision:** Option A with strict security rules (customer JWTs cannot authenticate as admin; customer identity derived strictly from session).

---

### Q-006: Website Order Placement Endpoint
- **Problem Statement:** How should online website orders be created in Ficcado-Data without trusting client prices or allowing duplicate inventory deductions?
- **Status:** **PARTIALLY RESOLVED (Architectural Deviation Identified)**
- **Verification in Code & Gaps:**
  - **Resolved aspects:** Server recomputes quote from database prices (`Item.getPriceOfItem()`), ignoring client-supplied prices. Remarks hardcoded to `WEBSITE SALE`. Cash on delivery is completely omitted. Idempotency via `transactionId` lookup prevents duplicate sales.
  - **Identified Gap / Deviation:** `InternalOrderController.java` contains the entire validation, customer resolution, inventory row locking, and retry loop directly in the controller instead of delegating to a `@Service` method, violating ADD-3 and Section 5.2.
- **Answer & Decision:**
  - Refactor `InternalOrderController.java` to delegate all order logic to a dedicated `WebsiteOrderService` inside a single `@Transactional` boundary.

---

### Q-007: Ficcado-Data Port Alignment
- **Problem Statement:** Earlier documents referenced port 8080 for Ficcado-Data, but `application.yaml` was on port 8081. What port should be used?
- **Status:** **RESOLVED**
- **Verification in Code:**
  - Ficcado-Data CRM Backend: **Port 8081**
  - Ficcado-Website-Data: **Port 8082**
  - Ficcado-Payment-Gateway-Data: **Port 8083**
  - NGINX Gateway: **Port 8000**
  - Next.js Website: **Port 3000**
  - Port 8080 is not used.
- **Answer & Decision:** Port 8081 is permanently retained for Ficcado-Data and CRM. Gateway proxies upstream to `localhost:8081`.

---

## Part 2 Architectural Questions & Unresolved Issues

### P2-Q-001: RabbitMQ vs Synchronous Inter-Service REST Calls in P2-7
- **Question:** Part 2 Phase P2-7 specified that Payment-Gateway-Data writes an outbox message, answers `202 Accepted` quickly, and a RabbitMQ consumer calls `POST /api/internal/website-orders`. Why did the agent implement a synchronous `RestTemplate` call inside `PaymentController.verifyPayment`?
- **Status:** **UNRESOLVED / DEVIATED**
- **Identified Gap:**
  - In `PaymentController.java` line 229, `syncService.syncSaleToFiccadoData(tx)` runs synchronously before returning `202 Accepted`.
  - RabbitMQ was completely omitted from the Java code.
- **Authoritative Answer & Resolution:**
  - While synchronous HTTP ensures immediate confirmation during low traffic, under spike loads (e.g., sneaker drop checkouts), synchronous HTTP calls create cascading thread exhaustion.
  - **Action Required:**
    1. For immediate order creation: keep synchronous sync with circuit breaker and short timeout as the fast-path.
    2. For background retry and customer notifications: implement an Outbox Relay (or Spring AMQP worker) to process outbox events asynchronously.

---

### P2-Q-002: Outbox Pattern & Order Notification Dispatching
- **Question:** `outbox_events` are inserted with `status = 'PENDING'` upon payment verification, but customer emails are never sent. How should notifications be processed?
- **Status:** **UNRESOLVED / DEVIATED**
- **Identified Gap:**
  - No service reads from `outbox_events`.
  - `InternalNotificationController.java` (`POST /api/internal/notifications/order-status`) in `ficcado_website_data` is never invoked.
- **Authoritative Answer & Resolution:**
  - Implement `OutboxEventRelayService.java` in `ficcado_payment_gateway_data` with a `@Scheduled(fixedDelay = 5000)` poller guarded by ShedLock.
  - The poller reads `PENDING` outbox events, posts them to `http://localhost:8082/api/internal/notifications/order-status` with `X-Internal-Secret`, and updates event status to `SENT`.
  - This activates `OrderNotificationService` in `ficcado_website_data` so order confirmation, failure, and refund emails are actually sent to customers.

---

### P2-Q-003: CRM Lint Ratchet (AUD-10) in CI Pipeline
- **Question:** The report claimed AUD-10 was completed in CI, but CI fails with 246 lint errors. What is the required solution?
- **Status:** **UNRESOLVED / DEVIATED**
- **Identified Gap:**
  - `.github/lint-baseline/crm.json` does not exist.
  - `.github/workflows/ci-cd.yaml` executes raw `npm run lint`.
- **Authoritative Answer & Resolution:**
  - Create `.github/lint-baseline/crm.json` with baseline error count (246 errors, 32 warnings).
  - Create `crm/ficcado_crm_app/scripts/lint-ratchet.mjs` to compare lint output against the baseline.
  - Update `.github/workflows/ci-cd.yaml` to run the ratchet script, allowing CI to pass as long as new lint errors are not introduced.

---

### P2-Q-004: Real Load Testing vs Mock Server (AUD-11 & P2-9)
- **Question:** Load tests were executed against `loadtests/mock-server.mjs` (in-memory Node.js server) instead of the actual Spring Boot microservices. Did the real system pass load testing?
- **Status:** **UNRESOLVED / DEVIATED**
- **Identified Gap:**
  - Measured latency of 833 µs was an artifact of testing static Node.js responses, not Spring Boot HikariCP pools or PostgreSQL.
- **Authoritative Answer & Resolution:**
  - Start the Docker infrastructure (`docker compose up -d`) and start the three Spring Boot services.
  - Run the k6 scripts against `http://localhost:8000` (NGINX Gateway).
  - Monitor PostgreSQL `active_connections` and HikariCP Micrometer metrics to verify real capacity.

---

### P2-Q-005: Customer Session Cookie Expiration (Session vs 24-Hour Persistent)
- **Question:** `CustomerAuthController.java` sets `cookie.setMaxAge(86400)` (24 hours). Why should this be a pure session cookie?
- **Status:** **UNRESOLVED / DEVIATED**
- **Identified Gap:**
  - Spec P2-4B explicitly mandated a **session cookie** (cleared by the browser when closed). Setting `maxAge = 86400` persists the cookie on disk across browser restarts.
- **Authoritative Answer & Resolution:**
  - Update `buildSessionCookie` in `CustomerAuthController.java` to set `cookie.setMaxAge(-1)`.
  - The browser will clear the cookie upon closing the browser session, while Redis maintains the sliding 10-minute idle TTL on the server.

---

### P2-Q-006: Courier Options & Delivery Charges (ADD-4 Confirmation)
- **Question:** ADD-4 asked the developer to confirm whether courier rates should be Standard ₹0 and Priority ₹99 or real rates.
- **Status:** **RESOLVED (Default Adopted)**
- **Verification in Code:**
  - Implemented server-side properties in `crm/backend/ficcado_crm_backend/src/main/resources/application.yaml`:
    - `del-standard`: "Express Surface Logistics", ₹0
    - `del-priority`: "Priority Air Courier", ₹99
  - Public endpoint `GET /api/public/delivery-options` returns these options to the website.
  - Server quote endpoint calculates charges strictly from these values.
- **Answer & Decision:** Default confirmed. The two rates (Standard ₹0 and Priority ₹99) are enforced server-side.

---

### P2-Q-007: CRM Frontend Vitest Framework (ADD-6 Confirmation)
- **Question:** ADD-6 asked the developer to confirm adding Vitest, React Testing Library, and jsdom as devDependencies in `crm/ficcado_crm_app`.
- **Status:** **RESOLVED (Default Adopted)**
- **Verification in Code:**
  - Added Vitest 2.1.9, `@testing-library/react` 16.3.2, `@testing-library/dom` 10.4.1, and `jsdom` 29.0.0 to `crm/ficcado_crm_app/package.json`.
  - Verified tests in `test/AppSidebar.test.tsx` and `test/ItemForm.test.tsx` pass cleanly (5/5 tests).
- **Answer & Decision:** Confirmed. Vitest framework added as devDependencies only; 0 CRM production source files were modified for test infrastructure.

---

### P2-Q-008: Razorpay Webhooks on Local Machine
- **Question:** Razorpay cannot send webhooks to `http://localhost:8000`. How are webhooks tested locally?
- **Status:** **RESOLVED**
- **Verification in Code:**
  - Documented in `docs/REQUIRED_CREDENTIALS.md` and `docs/LOCAL_SETUP.md`.
  - Local tunnel options: Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:8000`), ngrok (`ngrok http 8000`), or localtunnel.
  - If no tunnel is running, the **reconciliation scheduler** (Phase P2-8) automatically polls Razorpay every 10 minutes and completes any captured orders.
- **Answer & Decision:** Use a local tunnel for real-time webhook delivery during manual testing, or rely on the ShedLock reconciliation job running every 10 minutes.
