# Ficcado Rebuild — Part 2 Technical Audit & Concurrency Review

> **PURPOSE:** This document provides the formal architectural audit, microservices compliance checklist, code quality review, and 10,000 concurrent user scalability analysis as required by Step 5 of Phase P2-0 in `Part2.md`.
>
> **REVIEW DIRECTIVE (GATE 1):**
> Items labeled **[REQ]** are scoped and will be implemented in their designated Part 2 phases.
> Items labeled **[OUT]** are outside the baseline Part 2 requirements and **MUST be reviewed by the developer**. The developer will mark each `[OUT]` item as either **APPROVED** or **REJECTED** in Section 5 below before any Phase P2-1 code execution begins.

---

## 1. Microservices Compliance Checklist

| # | Standard | Status | Evidence (File & Line) | Notes / Observations |
|---|---|:---:|---|---|
| **1** | **Database per service** | **PASS** | `ficcado_crm_backend`: [`application.yaml:14`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/resources/application.yaml#L14)<br>`ficcado_website_data`: [`application.yaml:14`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/backend/ficcado_website_data/src/main/resources/application.yaml#L14)<br>`ficcado_payment_gateway_data`: [`application.yaml:8`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/payment/backend/ficcado_payment_gateway_data/src/main/resources/application.yaml#L8) | Each service owns its dedicated PostgreSQL database (`ficcado_data`, `ficcado_website_data`, `ficcado_payment_gateway_data`). |
| **2** | **No cross-database access** | **PASS** | Backends contain no cross-database JDBC connections or foreign table schemas. | Zero direct SQL queries across databases; data isolation strictly maintained. |
| **3** | **No shared code between services** | **PASS** | Maven `pom.xml` files in all 3 backends. | Each backend is an independent Spring Boot artifact. No shared common JAR or monorepo library coupling. |
| **4** | **Communication only through APIs or messages** | **PASS** | `FiccadoDataSyncService.java:83-87` | Payment service synchronizes sales to CRM backend via REST API (`POST /api/internal/orders/create-paid-sale`) with constant-time secret check. |
| **5** | **Timeouts, retries & circuit breakers on remote calls** | **FAIL** | `FiccadoDataSyncService.java:32-33, 86` | Uses unbounded `new RestTemplate()` without connect/read timeouts. No Resilience4j circuit breaker, retry, or fallback logic. |
| **6** | **Idempotent consumers** | **PARTIAL** | `InternalOrderController.java:80-94` | REST endpoint checks `findByTransactionId` and returns existing sale on replay. However, RabbitMQ event consumers are not yet implemented. |
| **7** | **Stateless services** | **PASS** | Spring Security configs in all backends configure `SessionCreationPolicy.STATELESS`. | No server-side HTTP in-memory sessions; all client requests authenticate via JWT or internal API token. |
| **8** | **Configuration from environment** | **PASS** | `application.yaml` in all backends. | Every host, port, secret, credential, and pool parameter uses `${VAR:default}` syntax. |
| **9** | **Health endpoints** | **PASS** | Actuator configured: [`application.yaml:118-126`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/resources/application.yaml#L118-L126) | All services expose `/actuator/health` and `/actuator/info`. Gateway exposes `/health`. |
| **10**| **Correlation IDs (`X-Request-Id`)** | **FAIL** | Gateway `nginx.conf.template` and backend filters. | Missing `X-Request-Id` generation at NGINX gateway and no propagation into downstream headers or SLF4J MDC. |
| **11**| **Logging quality and masking** | **FAIL** | Backends lack `logback-spring.xml` structured JSON logging. | Logs output in plain-text format with no automated PII masking (phone, email, secrets) in log appenders. |
| **12**| **Gateway blocking `/api/internal/**`** | **PASS** | `infra/gateway/nginx.conf.template:105` | Verified with `curl.exe http://127.0.0.1:8000/api/internal/test` returning `HTTP 403 Forbidden`. |
| **13**| **CRM frontend only talking to Ficcado-Data** | **PASS** | `crm/ficcado_crm_app/lib/apiClient.ts:53` | CRM frontend strictly calls `http://localhost:8081` (`NEXT_PUBLIC_API_URL`). Never targets the gateway or other service ports. |

---

## 2. Code Quality & Best-Practice Review

### 2.1 Transaction Boundaries & Multi-Step Atomic Writes
- **Positive:** In `crm/backend/ficcado_crm_backend`, [`SaleService.createSale`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/service/SaleService.java#L63) is annotated `@Transactional` and handles line items, customer upsert, inventory history, and sales logging atomically.
- **Risk:** In `payment/backend/ficcado_payment_gateway_data`, `FiccadoDataSyncService.java` performs remote HTTP communication synchronously inside the payment verification path. If the HTTP call fails or hangs, the local transaction handling is vulnerable to timeouts.

### 2.2 Connection Pools & Thread Sizing
- **Current Settings:**
  - `ficcado_crm_backend`: Hikari `maximum-pool-size: 30`, `minimum-idle: 5`.
  - `ficcado_website_data`: Hikari `maximum-pool-size: 15`, `minimum-idle: 2`.
  - `ficcado_payment_gateway_data`: Hikari `maximum-pool-size: 15`, `minimum-idle: 5`.
- **Analysis:** Adequate for local development, but total connections sum to 60. Under heavy traffic (10,000 concurrent sessions), a burst of synchronous write operations could exhaust connection pools without connection pooling intermediaries (such as PgBouncer) or caching.

### 2.3 Exception Handling & Validation
- **Backend:** Bean validation (`@Valid`, `@NotNull`, `@Size`) is widely used across DTOs.
- **Frontend:** Both frontends use Zod validation for form structures.
- **Gap:** Pre-existing TypeScript linting in `crm/ficcado_crm_app` has 278 lint issues (mostly explicit `any` and React 19 hook dependency warnings), documented as a baseline legacy issue.

---

## 3. Scalability & Concurrency Review (10,000 Simultaneous Users)

### 3.1 Race Condition: Stock Deduction & Overselling
- **Component:** `crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/service/InventoryService.java:51-62`
- **Mechanism:**
  ```java
  Inventory inv = inventoryRepository.findByItemIdAndSize(itemId, size).orElseThrow(...);
  if (inv.getTotalQuantity() < qty) throw new IllegalStateException(...);
  inv.setTotalQuantity(inv.getTotalQuantity() - qty);
  inventoryRepository.save(inv);
  ```
- **Vulnerability:** Neither `Inventory` nor `InventoryRepository` uses pessimistic locking (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) or conditional atomic updates (`UPDATE inventory SET total_quantity = total_quantity - :qty WHERE ... AND total_quantity >= :qty`).
- **Impact under 10k Users:** High-demand drop events (e.g. 50 units of a viral streetwear drop) will cause concurrent threads to read the same quantity simultaneously, overwriting decrements and resulting in critical overselling.

### 3.2 Race Condition: Invoice Number Collision
- **Component:** `crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/controller/InternalOrderController.java:191-199`
- **Mechanism:**
  ```java
  long timestamp = Instant.now().toEpochMilli();
  String candidate = "FIC-INV-" + timestamp;
  while (saleRepository.existsByInvoiceNumber(candidate)) {
      candidate = "FIC-INV-" + timestamp + "-" + count++;
  }
  ```
- **Vulnerability:** Non-atomic check-then-act. If two orders arrive within the same millisecond, both check `existsByInvoiceNumber` simultaneously, find `false`, and attempt to insert identical invoice numbers, throwing `DataIntegrityViolationException`.
- **Impact under 10k Users:** Spurious checkout failures and aborted orders during peak payment spikes.

### 3.3 Customer Session Invalidation on Refresh
- **Component:** `website/frontend/src/context/CustomerAuthContext.tsx` & `CustomerAuthController.java`
- **Mechanism:** The website lacks an active Redis session store. Cookies set across origins (port 3000 to port 8000) fail to persist reliably during SSR hydration and browser refreshes.
- **Impact under 10k Users:** High customer friction as shoppers find themselves logged out upon navigation.

---

## 4. Findings Registry

| ID | Area | Severity | Evidence | Impact | Recommended Fix | Scoping Label |
|---|---|:---:|---|---|---|:---:|
| **AUD-01** | Concurrency / Inventory | **Critical** | `InventoryService.java:51-62`, `InventoryRepository.java:15` | Overselling of inventory during concurrent order drops. | Add pessimistic write lock (`@Lock(PESSIMISTIC_WRITE)`) on inventory lookup or atomic conditional decrement query. | **[REQ] (Phase P2-7)** |
| **AUD-02** | Concurrency / Billing | **High** | `InternalOrderController.java:191-199` | Duplicate invoice numbers and failed checkouts under concurrent orders. | Generate invoice numbers from a dedicated database sequence (`invoice_number_seq`) or atomic Redis counter. | **[REQ] (Phase P2-7)** |
| **AUD-03** | Resilience / Remote Calls | **High** | `FiccadoDataSyncService.java:32, 86` | Unbounded `RestTemplate` causes thread exhaustion if CRM backend is slow. | Implement configured HTTP client with 3s/5s timeouts and Resilience4j circuit breaker. | **[REQ] (Phase P2-7)** |
| **AUD-04** | Customer Auth / Sessions | **High** | `CustomerAuthController.java:120`, `CustomerAuthContext.tsx:35` | Customer session lost on page refresh / SSR navigation. | Implement Redis session store (port 6380, `noeviction`) with 10-minute sliding window logout. | **[REQ] (Phase P2-4)** |
| **AUD-05** | Customer Features / Wishlist | **Medium** | `next.config.ts:15-20` (redirects `/favorites` to `/`) | Wishlist feature non-functional. | Implement database table, backend service, and frontend wishlist page with optimistic updates. | **[REQ] (Phase P2-5)** |
| **AUD-06** | Checkout / Couriers | **High** | `checkout/page.tsx:31-41`, `couriers.ts:15` | Simulated payment signatures and mock couriers in checkout. | Implement verified Razorpay SDK modal integration and backend courier rates. | **[REQ] (Phase P2-6 & P2-7)** |
| **AUD-07** | Reconciliation / Payments | **Medium** | `payment/backend/ficcado_payment_gateway_data` | Abandoned / missed webhook payments stay unreconciled. | Add 10-minute scheduled job with ShedLock to reconcile Razorpay transactions against local database. | **[REQ] (Phase P2-8)** |
| **AUD-08** | Observability / Logging | **Medium** | Gateway configuration & backend loggers | Cannot trace requests across microservices. | Inject `X-Request-Id` at NGINX, propagate via MDC, and output structured JSON logs. | **[REQ] (Phase P2-9)** |
| **AUD-09** | Database / Entity Integrity | **Medium** | `PaymentTransaction.java:18`, `Sale.java`, `Item.java` | Concurrent updates can overwrite without detection (lost updates). | Add `@Version Long version` optimistic locking to entities and Flyway migrations. | **[OUT]** |
| **AUD-10** | Code Quality / CRM Lint | **Medium** | `crm/ficcado_crm_app`: `npm run lint` (278 errors/warnings) | Blocks automated strict CI lint gate on CRM frontend. | Refactor explicit `any` types to OpenAPI-derived response types in `types/api.ts` and fix React 19 hook rules. | **[OUT]** |
| **AUD-11** | Scalability / Database Pooling | **High** | `application.yaml` connection pools (max 30 / 15 / 15) | Pool exhaustion during 10,000 concurrent user spikes. | Add Storefront Redis caching (90%+ hit rate for catalog reads) and configure PgBouncer for production scale. | **[OUT]** |
| **AUD-12** | Database / Query Performance | **Medium** | Foreign keys on `sale_line_items`, `sales`, `inventory_history` | Sequential table scans on large tables during customer/sale lookups. | Add Flyway migration creating explicit B-Tree indexes on all foreign key and filter columns. | **[OUT]** |
| **AUD-13** | Security / Data Privacy | **Medium** | `SaleService.java:65-68`, `FiccadoDataSyncService.java:85` | Potential logging of customer PII (phone, email) in plain text. | Implement custom Logback converter to mask sensitive customer fields (`******1234`, `ab***@gmail.com`). | **[OUT]** |

---

## 5. Developer Action Required: Review of [OUT] Findings (GATE 1)

> **DEVELOPER REVIEW INSTRUCTIONS:**
> Please review the five `[OUT]` items below. Mark each item as either **APPROVED** (will be implemented in Phase P2-10) or **REJECTED** (will not be implemented).

- [ ] **AUD-09: Add `@Version` Optimistic Locking to Core Entities**
  - Developer Decision: `PENDING REVIEW` *(Options: APPROVED / REJECTED)*
  - Notes: Adds version column to `PaymentTransaction`, `Sale`, and `Item` to prevent lost updates.

- [ ] **AUD-10: Fix 278 Pre-Existing ESLint Errors in CRM Frontend**
  - Developer Decision: `PENDING REVIEW` *(Options: APPROVED / REJECTED)*
  - Notes: Replaces `any` types with OpenAPI types and addresses React 19 hook dependency lint rules.

- [ ] **AUD-11: Database Connection Pool Scalability Tuning & PgBouncer Guidance**
  - Developer Decision: `PENDING REVIEW` *(Options: APPROVED / REJECTED)*
  - Notes: Adds HikariCP connection pool metrics, aggressive Redis catalog caching, and PgBouncer architecture documentation.

- [ ] **AUD-12: Add Explicit B-Tree Indexes on Foreign Keys and Filter Columns**
  - Developer Decision: `PENDING REVIEW` *(Options: APPROVED / REJECTED)*
  - Notes: Adds Flyway migration with indexes on `sale_line_items.sale_id`, `sales.customer_id`, `inventory_history.item_id`, etc.

- [ ] **AUD-13: Sensitive PII Masking in Application Logs**
  - Developer Decision: `PENDING REVIEW` *(Options: APPROVED / REJECTED)*
  - Notes: Adds Logback pattern masking for customer phone numbers, emails, and authorization secrets.
