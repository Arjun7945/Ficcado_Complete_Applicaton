# Ficcado Rebuild — Part 2 Technical Audit & Concurrency Review

> **PURPOSE:** This document provides the formal architectural audit, microservices compliance checklist, code quality review, 10,000 concurrent user scalability analysis, and addendum review as required by Phase P2-0 in `Part2.md` and `Part2_Addendum.md`.
>
> **GATE 1 STATUS: RELEASED.**
> Developer decisions on `[OUT]` items have been finalized per [`docs/AUDIT_DECISIONS_PROMPT.md`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/docs/AUDIT_DECISIONS_PROMPT.md) and recorded in Section 5 below.

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

### 3.3 Customer Session Invalidation on Refresh (Hypothesis)
- **Component:** `website/frontend/src/context/CustomerAuthContext.tsx` & `CustomerAuthController.java`
- **Mechanism (Hypothesis):** Cross-port origin differences (port 3000 vs 8000), cookie header extraction during Next.js SSR hydration, and absence of a Redis session store are hypothesized to cause customer logout on navigation or page refresh.
- **Resolution Path:** Per `Part2_Addendum.md` ADD-1 and P2-4A, the exact bug must be reproduced and proved under test before implementing the Redis sliding session solution.

---

## 4. Findings Registry

| ID | Area | Severity | Evidence | Impact | Recommended Fix | Scoping Label |
|---|---|:---:|---|---|---|:---:|
| **AUD-01** | Concurrency / Inventory | **Critical** | `InventoryService.java:51-62`, `InventoryRepository.java:15` | Overselling of inventory during concurrent order drops. | Add pessimistic write lock (`@Lock(PESSIMISTIC_WRITE)`) on inventory lookup or atomic conditional decrement query. | **[REQ] (Phase P2-7)** |
| **AUD-02** | Concurrency / Billing | **High** | `InternalOrderController.java:191-199` | Duplicate invoice numbers and failed checkouts under concurrent orders. | Retain `FIC-INV-<timestamp>` format; remove race via transactional retry on unique constraint violation (no schema changes / no sequence per ADD-3). | **[REQ] (Phase P2-7)** |
| **AUD-03** | Resilience / Remote Calls | **High** | `FiccadoDataSyncService.java:32, 86` | Unbounded `RestTemplate` causes thread exhaustion if CRM backend is slow. | Implement configured HTTP client with 3s/5s timeouts and Resilience4j circuit breaker. | **[REQ] (Phase P2-7)** |
| **AUD-04** | Customer Auth / Sessions | **High** | `CustomerAuthController.java:120`, `CustomerAuthContext.tsx:35` | Customer session lost on page refresh / SSR navigation (Hypothesis to be verified in P2-4A). | Reproduce root cause in P2-4A; implement Redis session store (port 6380, `noeviction`) with 10-minute sliding window logout. | **[REQ] (Phase P2-4)** |
| **AUD-05** | Customer Features / Wishlist | **Medium** | `next.config.ts:15-20` (redirects `/favorites` to `/`) | Wishlist feature non-functional. | Implement database table, backend service, and frontend wishlist page with optimistic updates. | **[REQ] (Phase P2-5)** |
| **AUD-06** | Checkout / Couriers | **High** | `checkout/page.tsx:31-41`, `couriers.ts:15` | Simulated payment signatures and mock couriers in checkout. | Implement verified Razorpay SDK modal integration and backend courier rates configuration (per ADD-4 & ADD-5). | **[REQ] (Phase P2-6 & P2-7)** |
| **AUD-07** | Reconciliation / Payments | **Medium** | `payment/backend/ficcado_payment_gateway_data` | Abandoned / missed webhook payments stay unreconciled. | Add 10-minute scheduled job with ShedLock to reconcile Razorpay transactions against local database. | **[REQ] (Phase P2-8)** |
| **AUD-08** | Observability / Logging | **Medium** | Gateway configuration & backend loggers | Cannot trace requests across microservices. | Inject `X-Request-Id` at NGINX, propagate via MDC, and output structured JSON logs. | **[REQ] (Phase P2-9)** |
| **AUD-09** | Database / Entity Integrity | **Medium** | `Item.java:21-88` | Simultaneous admin edits to the same item overwrite changes. | Add Flyway migration for `version` column on `items` only and `@Version` on `Item` entity (narrowed to `Item` per developer decision). | **[OUT] ➔ APPROVED (P2-2)** |
| **AUD-10** | Code Quality / CRM Lint | **Medium** | `crm/ficcado_crm_app`: `npm run lint` (278 errors/warnings) | Blocks automated strict CI lint gate on CRM frontend. | CI handling only: run CRM lint non-blocking with baseline error ratchet; no CRM source edits per developer decision. | **[OUT] ➔ REJECTED (P2-9 CI Ratchet)** |
| **AUD-11** | Scalability / Database Pooling | **High** | `application.yaml` connection pools (max 30 / 15 / 15) | Pool exhaustion during 10,000 concurrent user spikes. | Verify existing Redis catalog caching (`CacheConfig`), add hit/miss counters, set explicit environment pool/thread settings, and document PgBouncer guidance. | **[OUT] ➔ APPROVED (Post P2-8 / Pre P2-9)** |
| **AUD-12** | Database / Query Performance | **Medium** | Foreign keys on `sale_line_items`, `sales`, `inventory_history` | Sequential table scans on large tables during customer/sale lookups. | Add Flyway migration in Ficcado-Data creating explicit B-Tree indexes on `sale_line_items.sale_id`, `sales.customer_id`, and `inventory_history.item_id`. | **[OUT] ➔ APPROVED (Post P2-8 / Pre P2-9)** |
| **AUD-13** | Security / Data Privacy | **Medium** | `SaleService.java:65-68`, `FiccadoDataSyncService.java:85` | Potential logging of customer PII (phone, email) in plain text. | Implement central Logback pattern masking in each backend (`******1234`, `ab***@gmail.com`) at start of P2-4. | **[OUT] ➔ APPROVED (Start of P2-4)** |
| **AUD-14** | Testing / Environment Parity | **High** | `website/backend/.../application.yaml:9`, `payment/backend/.../application-test.yaml:6` | Website and Payment tests run against in-memory H2 rather than PostgreSQL. | Align test configurations to execute against Compose PostgreSQL test databases (`TEST_DB_URL`). | **[REQ] (Phase P2-0 / CI)** |
| **AUD-15** | Scalability / Thread Sizing | **High** | Unconfigured Tomcat settings (default 200 max threads) vs HikariCP (15-30 connections) | Thread starvation under concurrent load as 200 threads compete for 15-30 database connections. | Configure explicit environment-driven Tomcat max threads, accept count, and connection timeout in all backends. | **[REQ] (Phase P2-9 / AUD-11)** |
| **AUD-16** | Performance / N+1 Queries | **Medium** | `Item.java:45, 53` (`sizes`, `images`), `Sale.java:118` (`lineItems`) | Multiple eager collections (`FetchType.EAGER`) cause Cartesian products or multiple secondary queries. | Ensure repository queries utilize explicit join fetches (`JOIN FETCH`) or batch fetching (`@BatchSize`) to avoid N+1 query inflation. | **[REQ] (Phase P2-2)** |

---

## 5. Developer Decisions on [OUT] Findings (GATE 1 Finalized)

The developer decisions from [`docs/AUDIT_DECISIONS_PROMPT.md`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/docs/AUDIT_DECISIONS_PROMPT.md) are recorded below:

| Audit Item | Developer Decision | Implementation Placement | Scope Notes |
|---|:---:|---|---|
| **AUD-09** | **APPROVED (Narrowed)** | Inside **Phase P2-2**, immediately after colors, description, and tags | Scoped strictly to `Item` entity. Flyway migration adds `version BIGINT NOT NULL DEFAULT 0` to `items` table. DTO accepts optional `version` and returns 409 `ITEM_VERSION_CONFLICT` on mismatch. Public/website DTOs never expose `version`. CRM edit form handles 409 with reload action. `Sale` and `PaymentTransaction` are excluded. |
| **AUD-10** | **REJECTED** | Inside **Phase P2-9** (CI Pipeline update) | No CRM frontend source files will be modified. In CI update, CRM lint step runs non-blocking with an error ratchet recording today's baseline (246 errors, 32 warnings) in `.github/lint-baseline/crm.json`. Fails only if error count exceeds baseline. Website lint remains fully blocking. |
| **AUD-11** | **APPROVED (Scoped)** | After **Phase P2-8** and before load tests in **Phase P2-9** | For all 3 backends, set explicit environment-driven values for HikariCP (`maximumPoolSize`, `minimumIdle`, `connectionTimeout`, `idleTimeout`, `maxLifetime`, `leakDetectionThreshold`) and Tomcat threads (`maxThreads`, `acceptCount`, `connectionTimeout`). Expose Micrometer pool metrics to Prometheus. Verify existing Redis catalog caching and add hit/miss counters. Write PgBouncer guidance in `docs/SCALING_NOTES.md` (no PgBouncer container in Compose). |
| **AUD-12** | **APPROVED (Scoped)** | After **Phase P2-8** and before load tests in **Phase P2-9** | Add one Flyway migration in Ficcado-Data using `CREATE INDEX IF NOT EXISTS` for exactly `sale_line_items.sale_id`, `sales.customer_id`, and `inventory_history.item_id`. Verify with `EXPLAIN` before and after on test database. |
| **AUD-13** | **APPROVED** | At the start of **Phase P2-4**, before any new authentication code | Implement central Logback masking pattern in each backend (independent copies, no shared code) masking emails (`ab***@gmail.com`), phone numbers (`******1234`), tokens/cookies, passwords, OTPs, and Razorpay secrets. Redact auth/payment request bodies. Verify website server routes do not log secrets. |

---

## 6. ADD-1 Audit Addendum (Comprehensive Reviews & Baselines)

### 6.1 N+1 Queries & Collection Fetch Strategy Review
- **`Item` Entity ([`Item.java:45, 53`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/entity/Item.java#L45)):**
  - Contains two `@OneToMany` collections configured with `fetch = FetchType.EAGER`:
    - `private List<ItemSize> sizes = new ArrayList<>();`
    - `private List<ItemImage> images = new ArrayList<>();`
  - In Hibernate, having multiple eager collections on an entity triggers Cartesian product joins or multiple secondary SELECT statements when querying item collections (`findAll()`). While convenient for single item display, catalog-level queries must use explicit DTO projection or batch fetching to avoid query amplification.
- **`Sale` Entity ([`Sale.java:118`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/entity/Sale.java#L118)):**
  - Contains `lineItems` configured with `fetch = FetchType.EAGER`.
  - When fetching sales in `SaleRepository.java`, queries that omit `LEFT JOIN FETCH s.lineItems` generate secondary SELECT queries for each sale row. `SaleLineItem.java:23` uses `FetchType.LAZY` for parent `Sale`, which is correct.

### 6.2 Caching Correctness & Eviction Audit
- **Architecture:** Implemented in Part 1 Phase 4 via [`CacheConfig.java`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/config/CacheConfig.java) with `RedisCacheConfiguration`.
- **TTL:** Configured to exactly 10 minutes (`Duration.ofMinutes(10)`) via `CacheConfig.DEFAULT_TTL`.
- **Caches & Keys ([`PublicProductService.java:72-133`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/service/PublicProductService.java#L72-L133)):**
  - `public-products`: key: `(#category != null ? #category : 'all') + '-' + #includeOutOfStock + '-' + (#search != null ? #search : 'none')`
  - `public-product-id`: key: `#id`
  - `public-product-slug`: key: `#slug`
  - `public-categories`: default empty key
- **Eviction Triggers:** Evicted completely on catalog changes via `@CacheEvict(value = {"public-products", "public-product-id", "public-product-slug", "public-categories"}, allEntries = true)` in:
  - `ItemService.createItem` ([`ItemService.java:46`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/service/ItemService.java#L46))
  - `ItemService.updateItem` ([`ItemService.java:83`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/service/ItemService.java#L83))
  - `ItemService.deleteItem` ([`ItemService.java:134`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/service/ItemService.java#L134))
  - `ItemService.toggleItemStatus` ([`ItemService.java:148`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/service/ItemService.java#L148))
  - `PublicProductService.evictProductCaches` ([`PublicProductService.java:191`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/service/PublicProductService.java#L191))
- **Graceful Degradation:** `CacheConfig.errorHandler` catches Redis connectivity or timeout exceptions and logs warnings without throwing errors to clients.
- **Per-User Data Confirmation:** **CONFIRMED.** No customer profile, session, authentication token, cart, order history, or private data is ever cached. Only immutable/read-only public catalog DTOs are cached in Redis cache (port 6379).

### 6.3 Tomcat Thread & Connection Settings per Backend
- **Audit Findings:** Neither `ficcado_crm_backend`, `ficcado_website_data`, nor `ficcado_payment_gateway_data` configures explicit `server.tomcat.threads.*` properties in `application.yaml`.
- **Active Defaults:**
  - `server.tomcat.threads.max`: **200**
  - `server.tomcat.threads.min-spare`: **10**
  - `server.tomcat.accept-count`: **100**
  - `server.tomcat.connection-timeout`: **20000ms** (20s)
- **HikariCP Database Pools:**
  - `ficcado_crm_backend`: `maximum-pool-size: 30`, `minimum-idle: 5`
  - `ficcado_website_data`: `maximum-pool-size: 15`, `minimum-idle: 2`
  - `ficcado_payment_gateway_data`: `maximum-pool-size: 15`, `minimum-idle: 5`
- **Sizing Gap:** Under 10,000 concurrent user load, 200 Tomcat threads per service will contend for 15-30 database connections, leading to thread queue buildup. Explicit sizing will be parameterized in AUD-11.

### 6.4 Security Headers, CORS, and Cookie Attributes
- **Customer Session Cookie ([`CustomerAuthController.java:121-130`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/controller/CustomerAuthController.java#L121-L130)):**
  - Name: `ficcado_customer_session`
  - `HttpOnly`: `true` (enforced)
  - `Path`: `/`
  - `Secure`: `httpRequest.isSecure()` (dynamically matches protocol: `true` on HTTPS, `false` on local HTTP)
  - `SameSite`: `isSecure ? "None" : "Lax"`
  - `MaxAge`: 86,400 seconds (24h)
- **CRM Admin Session Cookie ([`AuthController.java:132-140`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/controller/AuthController.java#L132-L140)):**
  - Name: `ficcado_session`
  - `HttpOnly`: `true`
  - `Path`: `/`
  - `SameSite`: `Lax`
  - `Secure`: `httpRequest.isSecure()`
- **CORS Configuration ([`SecurityConfig.java:90-107`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/security/SecurityConfig.java#L90-L107)):**
  - Allowed Origins: driven by `${app.cors.allowed-origins:http://localhost:3000}`.
  - Allowed Methods: `GET, POST, PUT, DELETE, PATCH, OPTIONS`.
  - Allowed Headers: `Authorization, Content-Type, Accept, X-Requested-With, Origin, Cookie`.
  - `allowCredentials`: `true`.
- **Security Headers:** Spring Security defaults active (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`). HSTS and CSP are managed at the NGINX Gateway level.

### 6.5 Input Validation on Public and Internal Endpoints
- **Public Product Endpoints ([`PublicProductController.java:33-75`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/controller/PublicProductController.java#L33-L75)):**
  - Read-only GET requests: `category` (optional string), `includeOutOfStock` (boolean), `search` (optional string). No request body accepted.
- **Public Review Submission ([`ReviewSubmissionController.java:75-90`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/controller/ReviewSubmissionController.java#L75-L90)):**
  - Validated with `@Valid @RequestBody SubmitReviewRequest`: rating range 1–5 enforced, review text bounded.
- **Internal Order Handshake ([`InternalOrderController.java:63-75`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/controller/InternalOrderController.java#L63-L75)):**
  - Validates `X-Internal-Secret` using constant-time `MessageDigest.isEqual`.
  - Validates `@Valid @RequestBody CreatePaidSaleRequest`: transaction ID, customer phone, line items.

### 6.6 JaCoCo Test Coverage Baseline (Generated via CLI without Editing `pom.xml`)
Executed using `.\mvnw.cmd org.jacoco:jacoco-maven-plugin:0.8.12:prepare-agent test org.jacoco:jacoco-maven-plugin:0.8.12:report`:

| Service Bundle | Instruction Coverage | Line Coverage | Branch Coverage | Strongest Packages | Gaps / Untested Areas |
|---|:---:|:---:|:---:|---|---|
| **CRM Backend** (`ficcado_crm_backend`) | **26%** (5,350 / 20,111) | **27.0%** (1,073 / 3,971) | **14%** (296 / 2,027) | Config (69%), Security (43%), Service (35%) | Controllers (21%), DTOs (16%), Mappers (0%), Converters (0%) |
| **Website Backend** (`ficcado_website_data`) | **63%** (1,092 / 1,726) | **62.8%** (267 / 425) | **25%** (21 / 81) | Config (100%), Enums (100%), DTOs (85%), Service (61%) | Controllers (42%), Entities (0%), Client (18%) |
| **Payment Backend** (`ficcado_payment_gateway_data`) | **66%** (770 / 1,155) | **63.8%** (155 / 243) | **46%** (31 / 67) | DTOs (98%), Controller (78%), Service (35%) | Remote sync client (`FiccadoDataSyncService`) not exercised in tests |

### 6.7 Database Used by Existing Tests
- **`ficcado_crm_backend`:**
  - Configured in [`src/test/resources/application.yaml`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/crm/backend/ficcado_crm_backend/src/test/resources/application.yaml): uses `org.postgresql.Driver` with fallback `localhost:5432/ficcado_data`.
  - **Risk:** If environment variables are omitted, tests connect to the local production database. Must be pointed strictly to the Compose test database (`ficcado_data_test` on port 5433).
- **`ficcado_website_data`:**
  - Configured in [`src/test/resources/application.yaml:9`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/backend/ficcado_website_data/src/test/resources/application.yaml#L9): uses in-memory **H2** (`jdbc:h2:mem:ficcado_website_data_test;MODE=PostgreSQL`).
- **`ficcado_payment_gateway_data`:**
  - Configured in [`src/test/resources/application-test.yaml:6`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/payment/backend/ficcado_payment_gateway_data/src/test/resources/application-test.yaml#L6): uses in-memory **H2** (`jdbc:h2:mem:ficcado_payment_test;MODE=PostgreSQL`).
- **Finding (AUD-14):** Website and Payment backends currently run unit tests against in-memory H2. Per `Part2.md` Section 6, all integration tests must run against PostgreSQL Compose services (`*_test` databases on port 5433).

### 6.8 Docker Compose Follow-ups Confirmation
- **`infra/.env` Git Status:** Confirmed git-ignored and untracked. Tested via `git check-ignore infra/.env` which returned `infra/.env` (matches `.env` rule in `infra/.gitignore`).
- **Redis Authentication:** Confirmed that both Redis instances are started with `--requirepass ${REDIS_SESSION_PASSWORD}` and `--requirepass ${REDIS_CACHE_PASSWORD}` in `infra/docker-compose.yml`, enforcing password validation.
- **`infra/.env` Creator:** Confirmed created by the developer in Step 5 of P2-0A using `infra/.env.example` as a template.

---

## 7. Post-Implementation Final Compliance Verification (Phase P2-9)

Following completion of Part 2 implementation (Phases P2-1 through P2-9, AUD-11, and AUD-12), the microservices checklist standards have been re-verified against the active codebase with evidence:

| # | Standard | Initial (P2-0) | Final (P2-9) | Evidence (File & Line) | Notes / Post-Implementation Status |
|---|---|:---:|:---:|---|---|
| **1** | **Database per service** | **PASS** | **PASS** | `ficcado_crm_backend`: `application.yaml:14`<br>`ficcado_website_data`: `application.yaml:14`<br>`ficcado_payment_gateway_data`: `application.yaml:8` | Each service maintains dedicated database schemas. Migrations managed independently via Flyway. |
| **2** | **No cross-database access** | **PASS** | **PASS** | `WishlistItem.java`, `PaymentTransaction.java` | Wishlist items and payment attempts store numeric IDs; zero cross-database JPA relationships or direct SQL foreign keys. |
| **3** | **No shared code between services** | **PASS** | **PASS** | `pom.xml` across all 3 backend roots | Each backend compiles as an independent Spring Boot artifact with independent copies of converters and filters (e.g. `PiiMaskingConverter`, `CorrelationIdFilter`). |
| **4** | **Communication only through APIs or messages** | **PASS** | **PASS** | `FiccadoDataSyncService.java:100-115`<br>`OutboxEventRepository.java` | Payment service synchronizes sales to CRM backend via REST API (`POST /api/internal/orders/website-orders`) with constant-time secret check. Transactional Outbox pattern implemented. |
| **5** | **Timeouts, retries & circuit breakers** | **FAIL** | **PASS** | `DefaultRazorpayApiClient.java:38-42`<br>`CircuitBreaker.java:21-65`<br>`PaymentReconciliationService.java:130-175` | Resolved in P2-8: 5000ms connect/read timeouts on HTTP clients; custom `CircuitBreaker` with CLOSED/OPEN/HALF_OPEN states; 6-run transient retry strategy with automatic customer refund on persistent failure. |
| **6** | **Idempotent consumers** | **PARTIAL** | **PASS** | `InternalOrderController.java:120-140`<br>`RazorpayWebhookController.java:85-110`<br>`PaymentReconciliationService.java:95-105` | Fully resolved: `createPaidSale` deduplicates transactions by ID; webhook events deduplicated via `WebhookLogRepository`; reconciliation refunds guarded by `tx.getRefundId() == null`; ShedLock distributed lock prevents duplicate runner execution. |
| **7** | **Stateless services** | **PASS** | **PASS** | `SecurityConfig.java`<br>`CustomerSessionService.java` | Spring Security configured `SessionCreationPolicy.STATELESS`. Storefront customer sessions stored in Redis (port 6380, `noeviction`) with 10-minute sliding idle timeout. |
| **8** | **Configuration from environment** | **PASS** | **PASS** | `application.yaml` across all 3 backends | HikariCP pool sizes (`30 / 15 / 15`), Tomcat threads (`100`), connection timeouts, secrets, and URLs all parameterizable via environment variables (AUD-11). |
| **9** | **Health endpoints** | **PASS** | **PASS** | `application.yaml` actuator config | All services expose `/actuator/health`, `/actuator/info`, `/actuator/prometheus`, and `/actuator/metrics`. |
| **10**| **Correlation IDs (`X-Correlation-Id`)** | **FAIL** | **PASS** | `CorrelationIdFilter.java` across all 3 backends | Resolved in P2-9: Every incoming request extracts or generates `FIC-<SERVICE>-<UUID>`, binds to SLF4J MDC, echoes in HTTP response header, and propagates across inter-service calls. |
| **11**| **Logging quality and masking** | **FAIL** | **PASS** | `PiiMaskingConverter.java`<br>`logback-spring.xml` across all backends | Resolved in AUD-13 & P2-9: All 3 backends feature Logback masking for emails, phones, JWTs, 256-bit session IDs, passwords, OTPs, and Razorpay secrets, with correlation ID included in standard pattern. Verified via `EndToEndPaymentTraceAndLoggingTest`. |
| **12**| **Gateway blocking `/api/internal/**`** | **PASS** | **PASS** | `infra/gateway/nginx.conf.template:105` | Verified with HTTP 403 Forbidden on external access attempts to internal routes. |
| **13**| **CRM frontend only talking to Ficcado-Data** | **PASS** | **PASS** | `crm/ficcado_crm_app/lib/apiClient.ts:53` | CRM frontend exclusively communicates with `http://localhost:8081` (`NEXT_PUBLIC_API_URL`). |

