# Ficcado Rebuild — Part 2 Implementation Report

This report records all verified actions, command execution results, test outputs, dependencies, and phase transitions for Part 2 of the Ficcado rebuild as defined in `Part2.md`.

---

## Phase Execution Summary

| Phase | Description | Status | Evidence / Notes |
|---|---|---|---|
| **P2-0A** | Docker Compose Infrastructure | **Completed & Verified** | All 5 containers up and healthy; connectivity and policies verified with live commands. |
| **P2-0** | Baseline, Discovery, UI Guide & Audit | **Completed & Verified (Gate 1 Released)** | Full baseline test runs, discovery items located, UI Guide, Audit and Addendum completed. Gate 1 released by developer. |
| **P2-1** | CRM Fixes (Admin Permissions, Activity Log, Sale Source) | **Completed & Verified (Ready for Gate 2 Review)** | ADD-2, P2-1A, P2-1B, and P2-1C implemented and verified. 93/93 backend tests pass (0 skipped), CRM frontend Vitest and build pass (28 routes). |
| **P2-2** | Item Colors, Plain-Text Description & Tags | **Completed & Verified (Ready for Gate 3 Review)** | B-1, B-4 & AUD-09 implemented across backend, CRM frontend, and website. 111/111 backend tests pass, 5/5 CRM frontend tests pass, 51/51 website tests pass, 300/300 device checks clean. |
| **P2-3** | Remove Dummy Data & Custom T-Shirt Notice Page | **Completed & Verified (Ready for Gate 4 Review)** | A-4 & A-new implemented. Deleted products-snapshot.json; removed loadFallbackProducts; empty catalog renders empty state (#catalog-empty-state); backend error renders error state (#catalog-error-state); repo-level check confirms no production code imports fixtures or sample-data; /custom-tshirt page implemented with zero forms/uploads/pricing; registered in device-checker (312/312 tests pass 100%); 59/59 website tests pass; Next.js build clean (36 routes). |
| **P2-4** | Customer Session Management (Redis 10-Min Sliding Logout) | **Completed & Verified (Gate 5 Released)** | Redis sliding 10-min session with 9-min prompt modal, cross-tab sync via BroadcastChannel, pause during checkout, and zero cross-user leakage. |
| **P2-5** | Customer Wishlist Service | **Completed & Verified (Gate 6 Released)** | Microservice-isolated wishlist on ficcado_website_data, 200 items hard cap, optimistic UI, guest prompt with redirect protection, and batch product hydration. |
| **P2-6** | Checkout Details & Saved Addresses | **Completed & Verified (Gate 7 Released)** | Guest auth guard, verified account display, saved address selector with 10-cap management, courier delivery selection, server-side quote calculation, and zero simulated payment code. |
| **P2-7** | Sale Only After Successful Verified Payment | **Completed & Verified (Gate 8 Released)** | Pessimistic locking (AUD-01), invoice retry (AUD-02), website sale remark, state machine with @Version, transactional outbox, customer isolation, and idempotent email notifications. |
| **P2-8** | Razorpay Reconciliation Scheduler (10-Min, ShedLock) | **Completed & Verified (Gate 9 Released)** | 10-min ShedLock scheduled job, Razorpay client with circuit breaker, captured order sync, business/transient refund handling, 48-hour expiry, idempotent refund guard, and Micrometer metrics. |
| **P2-9** | Load Tests (k6), Logging Audit & CI Compliance | Not Started | |
| **P2-10**| Approved Audit Fixes | Not Started | |
| **P2-11**| Handoff & Required Credentials | Not Started | |

---

## Detailed Phase Reports

### P2-0A: Docker Compose Infrastructure

#### 1. Pre-Flight Checks & Host Discovery
- **Command:** `docker --version`
  - **Result:** `Docker version 29.8.2, build 7fc2dff` (Exit code: 0)
- **Command:** `docker compose version`
  - **Result:** `Docker Compose version v5.6.0` (Exit code: 0)
- **Host PostgreSQL Detection:**
  - Service: `postgresql-x64-18 - PostgreSQL Server 18` (Running on port 5432)
  - Executable: `D:\PostgreSQL\18\bin\psql.exe`
  - Version: `PostgreSQL 18.6 on x86_64-windows`
  - Existing Database: `ficcado_data` (CRM database, preserved natively without modification)

#### 2. Infrastructure Artifacts Created
- `infra/docker-compose.yml`:
  - Pinned images: `postgres:18.6-alpine`, `redis:7.4.2-alpine`, `rabbitmq:4.0.5-management-alpine`, `nginx:1.27.4-alpine`, `prom/prometheus:v2.54.1`, `grafana/grafana:11.2.2`.
  - Ports bound to `127.0.0.1` (`5433`, `6380`, `6379`, `5672`, `15672`, `8000`).
  - Named volumes: `ficcado_postgres_data`, `ficcado_redis_session_data`, `ficcado_redis_cache_data`, `ficcado_rabbitmq_data`, `ficcado_prometheus_data`, `ficcado_grafana_data`.
  - Health checks defined for every active service.
- `infra/postgres/init/01-create-databases.sh`:
  - Auto-creates `ficcado_website_data`, `ficcado_payment_gateway_data`, and test databases `ficcado_data_test`, `ficcado_website_data_test`, `ficcado_payment_gateway_data_test` with least-privilege logins.
  - Grants schema public ownership for Flyway migration compatibility.
- `infra/gateway/nginx.conf.template`:
  - Enforces 403 on `/api/internal/**`.
  - Upstream configuration templated with `host.docker.internal`.
- `infra/.env.example`: Safe environment template with variable placeholders.
- `infra/.gitattributes`: Enforces LF line endings for shell scripts.
- `infra/.gitignore`: Ignores `.env` and `*.env`.
- `docs/LOCAL_SETUP.md`: Comprehensive local setup and operations guide.

#### 3. Container Startup & Health Status
- **Command:** `docker compose -f infra/docker-compose.yml ps`
- **Output:**
  ```text
  NAME                    IMAGE                              COMMAND                  SERVICE         CREATED         STATUS                   PORTS
  ficcado-gateway         nginx:1.27.4-alpine                "/docker-entrypoint.…"   gateway         2 minutes ago   Up 2 minutes (healthy)   127.0.0.1:8000->8000/tcp
  ficcado-postgres        postgres:18.6-alpine               "docker-entrypoint.s…"   postgres        2 minutes ago   Up 2 minutes (healthy)   127.0.0.1:5433->5432/tcp
  ficcado-rabbitmq        rabbitmq:4.0.5-management-alpine   "docker-entrypoint.s…"   rabbitmq        2 minutes ago   Up 2 minutes (healthy)   127.0.0.1:5672->5672/tcp, 127.0.0.1:15672->15672/tcp
  ficcado-redis-cache     redis:7.4.2-alpine                 "docker-entrypoint.s…"   redis-cache     2 minutes ago   Up 2 minutes (healthy)   127.0.0.1:6379->6379/tcp
  ficcado-redis-session   redis:7.4.2-alpine                 "docker-entrypoint.s…"   redis-session   2 minutes ago   Up 2 minutes (healthy)   127.0.0.1:6380->6379/tcp
  ```

#### 4. Live Connectivity & Configuration Verification
- **PostgreSQL Databases (Port 5433):**
  - `ficcado_website_data` connected as `ficcado_website_user`: **PASS** (`SELECT current_database(), current_user;` returned `ficcado_website_data | ficcado_website_user`)
  - `ficcado_payment_gateway_data` connected as `ficcado_payment_user`: **PASS** (`ficcado_payment_gateway_data | ficcado_payment_user`)
  - `ficcado_data_test` connected as `ficcado_test_user`: **PASS** (`ficcado_data_test | ficcado_test_user`)
  - `ficcado_website_data_test` connected as `ficcado_test_user`: **PASS** (`ficcado_website_data_test | ficcado_test_user`)
  - `ficcado_payment_gateway_data_test` connected as `ficcado_test_user`: **PASS** (`ficcado_payment_gateway_data_test | ficcado_test_user`)
  - Untouched native database `ficcado_data` (Port 5432): **PASS** (1 row in items table)
- **Redis Instances:**
  - `ficcado-redis-session` (Port 6380): `PING` ➔ `PONG` (**PASS**)
  - `ficcado-redis-cache` (Port 6379): `PING` ➔ `PONG` (**PASS**)
- **Redis Eviction Policies:**
  - `ficcado-redis-session`: `config get maxmemory-policy` ➔ `noeviction` (**PASS**, rejects evictions)
  - `ficcado-redis-cache`: `config get maxmemory-policy` ➔ `allkeys-lru` (**PASS**, evicts by LRU)
- **RabbitMQ Management API (Port 15672):**
  - `http://localhost:15672/api/overview` via HTTP Basic Auth: **PASS** (Version `4.0.5`, cluster `rabbit@89b2dcf1a632`)
- **Gateway (Port 8000):**
  - `GET http://localhost:8000/health`: `HTTP/1.1 200 OK` ➔ `{"status":"UP","gateway":"Ficcado API Gateway","port":8000,"version":"1.0.0"}` (**PASS**)
  - `GET http://localhost:8000/api/internal/test`: `HTTP/1.1 403 Forbidden` ➔ `{"success":false,"message":"Access forbidden: internal endpoints cannot be invoked through the public gateway."}` (**PASS**)
  - Upstream health checks (`/health/ficcado-data`, `/health/website-data`, `/health/payment-gateway`): `HTTP/1.1 502 Bad Gateway` (**EXPECTED**, backend applications not yet running on host)

---

### P2-0: Baseline, Discovery, UI Guide & Technical Audit

#### 1. Baseline Test Suite Verification (All 5 Modules)

| Module | Build / Test Command | Result | Pass | Fail | Skipped | Notes |
|---|---|:---:|:---:|:---:|:---:|---|
| **CRM Backend** (`ficcado_crm_backend`) | `.\mvnw.cmd test` | **PASS** | 62 | 0 | 0 | All unit and MockMvc tests passed cleanly. |
| **Website Backend** (`ficcado_website_data`) | `.\mvnw.cmd test` | **PASS** | 19 | 0 | 0 | Flyway migrations & WebMvc tests passed cleanly. |
| **Payment Backend** (`ficcado_payment_gateway_data`) | `.\mvnw.cmd test` | **PASS** | 10 | 0 | 0 | Razorpay webhook & payment controller tests passed. |
| **Website Frontend** (`website/frontend`) | `npm test`<br>`npm run typecheck`<br>`npm run lint`<br>`npm run build`<br>`npm run check:brand`<br>`node scripts/device-checker.mjs` | **PASS** | 51 tests (14 suites)<br>0 type errors<br>0 lint errors<br>35 routes built<br>0 brand violations<br>300/300 device checks | 0 | 0 | Full clean pass across all 6 verification tools and 12 device matrix profiles. |
| **CRM Frontend** (`crm/ficcado_crm_app`) | `npm run build`<br>`npm run lint` | **MIXED (Baseline)** | 28 routes compiled | 246 errors (lint)<br>32 warnings | 0 | Next.js compilation succeeds with 28 routes. Pre-existing lint failure documented (explicit `any` and React 19 hook rules). |

#### 2. Discovery Items Registry

| Item Marked *(discover)* | File & Line Reference | Current Implementation & Behavior |
|---|---|---|
| **Customer Auth & JWT** | `CustomerAuthController.java:55-140`<br>`CustomerJwtAuthenticationFilter.java:45-80` | Implements `/register`, `/login`, `/logout`, and `/me`. Sets `ficcado_customer_session` cookie. |
| **Session Loss on Refresh** | `CustomerAuthContext.tsx:35-80`<br>`CustomerJwtAuthenticationFilter.java` | Cross-port origin differences (port 3000 vs 8000) and missing Redis session store cause cookie loss during SSR navigation and browser refresh. |
| **Wishlist Feature** | `next.config.ts:18` | Wishlist does not yet exist in backend database. Legacy `/favorites` route redirects to `/`. |
| **Checkout Couriers & Charges** | `website/frontend/src/lib/api/couriers.ts:15-30`<br>`checkout/page.tsx:31-41` | Default couriers (`del-standard`: ₹0, `del-priority`: ₹99). Checkout still contains simulated payment IDs (`pay_sim_...`) and simulated signatures. |
| **Payment Service State** | `FiccadoDataSyncService.java:32, 86`<br>`PaymentTransaction.java:18-89` | Synchronous `RestTemplate` calls to Ficcado-Data without circuit breaker. `PaymentTransaction` lacks `@Version` and state machine enums. |
| **Sales `remarks` Column** | `crm/backend/.../entity/Sale.java:115`<br>`dashboard/sales/page.tsx` | Column `remarks` exists (default `"No_Remarks"`). Displayed in CRM sales reports and table details. |
| **Activity Log Stray Separator** | `crm/backend/.../service/InventoryService.java:209` | Message builder produces `"Inventory adjusted: ... from 2 → 5 — "` when reason/note is empty due to unconditional ` + " — "`. |
| **Admin Role Checks** | `AdminController.java`, `SecurityConfig.java`, `AppSidebar.tsx:165-220` | Certain administrative endpoints and sidebar sections restrict access to `SUPERADMIN`, denying newly created `ADMIN` users. |
| **Concurrency & Atomic Safety** | `SaleService.java:63` (`@Transactional`)<br>`InventoryService.java:42` (`@Transactional`)<br>`InventoryRepository.java:15` | `createSale` is `@Transactional`, but `deductFromInventory` reads and updates quantity without pessimistic locks (`@Lock(PESSIMISTIC_WRITE)`) or conditional atomic queries, risking overselling under concurrent checkouts. |
| **Device Checker Route List** | `website/frontend/scripts/device-checker.mjs:198-220` | Explicit list of 22 routes tested across 12 mobile, tablet, and desktop device profiles. |

#### 3. Created Governance Artifacts
- **UI Guide:** [`docs/PART2_UI_GUIDE.md`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/docs/PART2_UI_GUIDE.md) — Comprehensive guide with dedicated sections for Website and CRM frontends detailing tokens, typography, layouts, components, and error states with file citations.
- **Technical Audit:** [`docs/PART2_AUDIT.md`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/docs/PART2_AUDIT.md) — Full Microservices Compliance Checklist (13 items), Code Quality Review, 10,000 User Scalability Analysis, and Findings Registry with `[REQ]` and `[OUT]` labels.

#### 4. GATE 1 Status: RELEASED
- The developer reviewed `docs/PART2_AUDIT.md` and finalized decisions in `docs/AUDIT_DECISIONS_PROMPT.md`:
  - **AUD-09 (`Item` Optimistic Locking):** **APPROVED (Narrowed to `Item` only)** ➔ Slated for Phase P2-2.
  - **AUD-10 (CRM Lint Errors):** **REJECTED** ➔ Handled in CI update (Phase P2-9) with error ratchet baseline; 0 CRM source file modifications.
  - **AUD-11 (Connection Pools & Redis Verification):** **APPROVED (Scoped)** ➔ Slated post-P2-8 / pre-P2-9.
  - **AUD-12 (Database Indexes on Foreign Keys):** **APPROVED (Scoped)** ➔ Slated post-P2-8 / pre-P2-9.
  - **AUD-13 (PII Log Masking):** **APPROVED** ➔ Slated at start of Phase P2-4.

#### 5. ADD-1: Audit Addendum Execution & JaCoCo Baseline
- **JaCoCo Baseline (Executed via CLI without editing `pom.xml`):**
  - **CRM Backend (`ficcado_crm_backend`):** Instruction coverage: **26%** (5,350/20,111), Line coverage: **27.0%** (1,073/3,971 lines).
  - **Website Backend (`ficcado_website_data`):** Instruction coverage: **63%** (1,092/1,726), Line coverage: **62.8%** (267/425 lines).
  - **Payment Backend (`ficcado_payment_gateway_data`):** Instruction coverage: **66%** (770/1,155), Line coverage: **63.8%** (155/243 lines).
- **Test Database Audit:**
  - `ficcado_crm_backend`: Uses PostgreSQL driver (`localhost:5432/ficcado_data`).
  - `ficcado_website_data`: Uses in-memory H2 (`jdbc:h2:mem:...;MODE=PostgreSQL`).
  - `ficcado_payment_gateway_data`: Uses in-memory H2 (`jdbc:h2:mem:...;MODE=PostgreSQL`).
  - Finding logged as `AUD-14` (Website and Payment unit tests run on H2; integration tests must be aligned to Compose PostgreSQL test databases).
- **Compose Follow-ups Verified:**
  - `infra/.env` confirmed git-ignored (`git check-ignore infra/.env` returned `infra/.env`).
  - Both Redis instances configured with `--requirepass` enforcing password authentication.
  - `infra/.env` created by developer from `infra/.env.example`.

---

### P2-1: CRM Fixes (Admin Permissions, Activity Log, Sale Source)

#### 1. ADD-2: Narrow Public Security Rule (First Task of P2-1)
- **Problem:** `SecurityConfig.java` contained a blanket `.requestMatchers("/api/public/**").permitAll()` rule which risked exposing future or unauthorized public endpoints without authentication.
- **Solution:** Replaced blanket permit-all with exact HTTP method and route matchers:
  - `HttpMethod.GET, "/api/public/products/**"`
  - `HttpMethod.GET, "/api/public/categories/**"`
  - `"/api/public/reviews/**"`
- **Verification:** Added `SecurityRulesTest.java` (8 tests):
  - Confirms GET on products and categories permits unauthenticated access.
  - Confirms POST/PUT/DELETE on `/api/public/**` is blocked with 401 Unauthorized.
  - Confirms `/api/internal/**` rejects unauthenticated external requests.
  - Output: `Tests run: 8, Failures: 0, Errors: 0, Skipped: 0`.

#### 2. P2-1A (A-3) & ADD-7: Admin Permissions Fix
- **Root Cause Analysis (Diagnose First):**
  - Created `AdminPermissionsDiagnosisTest.java` reproducing the issue.
  - **Root Cause:** When an admin account with role `ADMIN` called admin panel endpoints (`GET /api/admins`, `POST /api/admins`, `PUT /api/admins/{id}`, `PATCH /api/admins/{id}/deactivate`, and `GET /api/reports/profitability`), Spring Security threw `org.springframework.security.authorization.AuthorizationDeniedException: Access Denied` (403) because:
    1. `AdminController.java` methods were annotated with `@PreAuthorize("hasRole('SUPERADMIN')")` instead of `hasAnyRole('SUPERADMIN', 'ADMIN')`.
    2. In `AdminController.java`, method bodies contained explicit manual checks `hasRole(currentAdmin, AdminRole.SUPERADMIN)` restricting edits/deactivations to `SUPERADMIN`.
    3. `ReportsController.java` method `getProfitability` was annotated with `@PreAuthorize("hasRole('SUPERADMIN')")`.
    4. Frontend route guard `crm/ficcado_crm_app/lib/auth.ts:requireSuperadmin()` only allowed role `'superadmin'` and threw 403 on role `'admin'`.
- **Implementation:**
  - `AdminController.java`: Updated `@PreAuthorize` to `hasAnyRole('SUPERADMIN', 'ADMIN')` on `getAll`, `getById`, `create`, `update`, and `deactivate`. Updated `hasAdminAccess` helper so `ADMIN` role has parity with `SUPERADMIN`.
  - `ReportsController.java`: Updated `@PreAuthorize` on `getProfitability` to `hasAnyRole('SUPERADMIN', 'ADMIN')`.
  - `crm/ficcado_crm_app/lib/auth.ts`: Updated `requireSuperadmin()` to allow both `'superadmin'` and `'admin'`.
- **Verification:**
  - `AdminRoleReflectionTest.java`: Scans every controller class and method via reflection to ensure no `@PreAuthorize` expression allows `SUPERADMIN` without `ADMIN`. (1/1 pass).
  - `AdminPermissionsTest.java`: Integration tests verifying a newly created `ADMIN` can call `GET /api/admins`, `GET /api/admins/{id}`, `POST /api/admins`, `PUT /api/admins/{id}`, `PATCH /api/admins/{id}/deactivate`, and `GET /api/reports/profitability`, while `WAREHOUSE_HANDLER` is denied 403. (7/7 pass).
  - Frontend Vitest: Configured Vitest per ADD-6 and created `test/AppSidebar.test.tsx` verifying Admin section and menu items render for `ADMIN` role. (1/1 pass).

#### 3. P2-1B (B-2): Activity Log Stray Separator Fix
- **Problem:** Activity log messages for quantity adjustments printed a stray separator and empty placeholder (`"Inventory adjusted: ... from 2 → 5 — "`) when no reason was provided.
- **Implementation:**
  - `InventoryDto.java`: Added optional `reason` field to `QuantityAdjustRequest`.
  - `InventoryService.java`: Extracted `buildAdjustMessage` helper and overloaded `adjustQuantity` to accept `reason`. Formats with `" — <reason>"` only when reason is non-empty, and omits the separator and reason entirely when reason is null, empty, or blank (`"Inventory adjusted: <item> size <size> from <old> → <new>"`).
  - `InventoryController.java`: Forwards `request.reason()` to `inventoryService.adjustQuantity`.
- **Verification:**
  - `InventoryServiceTest.java`: Verified null reason, empty reason, blank whitespace reason, and non-empty reason. Output: `Tests run: 12, Failures: 0, Errors: 0, Skipped: 0`.

#### 4. P2-1C (B-3): Sale Source Mark for CRM Sales
- **Discovery:** Verified `remarks` column exists on `Sale.java` entity (default `"No_Remarks"`) and schema `V1__create_schema.sql`.
- **Implementation:**
  - `SaleService.java`:
    - Added helper `formatSaleRemarksOnCreate(String initialRemarks, Admin performedByAdmin)`:
      - If created by CRM admin (`performedByAdmin != null`): sets `"CRM SALE"` when remarks is empty/blank/"No_Remarks"/"N/A"; sets `"CRM SALE | <admin text>"` when text is provided; does not duplicate prefix if already present.
      - If created without admin (website/system order): sets trimmed remarks or `"No_Remarks"` if empty/blank.
    - Added helper `preserveSourceMark(String existingRemarks, String incomingRemarks)`:
      - Guarantees `CRM SALE` (or `WEBSITE SALE`) prefix is preserved during sale updates (`updateSale`) and completion (`markSaleCompleted`).
      - Prevents retroactive backfill on legacy pre-existing sales that lack a source mark prefix.
    - Added null-safe admin name retrieval in `salesLogService.log` to prevent NPE when sales are created by system/website orders.
  - `crm/ficcado_crm_app/app/(app)/dashboard/sales/page.tsx`:
    - Added `remarks?: string` to `interface Sale`.
    - Rendered `sale.remarks` beneath the invoice number in both the desktop table view and mobile card view when remarks is present and not `"No_Remarks"`.
- **Verification:**
  - `SaleServiceTest.java`: Added 8 tests covering:
    - CRM sale created without remarks defaults to `"CRM SALE"`.
    - CRM sale created with admin remarks stores `"CRM SALE | <admin text>"`.
    - Non-admin sale creation defaults to `"No_Remarks"`.
    - Updating sale preserves `"CRM SALE"` mark when incoming remarks is blank/omitted.
    - Updating sale preserves `"CRM SALE"` mark when incoming remarks has new text.
    - Updating sale does not duplicate prefix when incoming already has prefix.
    - Pre-existing legacy sale without prefix is not retroactively backfilled on update.
    - Completing sale via `markSaleCompleted` preserves `"CRM SALE"` mark.
    - Output: `Tests run: 21, Failures: 0, Errors: 0, Skipped: 0`.

#### 5. Module-Wide Test & Build Verification
- **CRM Backend (`ficcado_crm_backend`):**
  - Command: `.\mvnw.cmd test`
  - Result: **PASS** (`Tests run: 93, Failures: 0, Errors: 0, Skipped: 0`). 0 tests skipped.
- **CRM Frontend (`crm/ficcado_crm_app`):**
  - Command: `npm test` (Vitest) ➔ **PASS** (`1 passed (1 test)`).
  - Command: `npm run build` ➔ **PASS** (28 routes compiled cleanly, 0 build errors).
- **Brand Spelling Compliance:**
  - Command: `node website/frontend/scripts/check-brand.mjs`
  - Result: **PASS** (Zero forbidden spellings found; brand spelling strictly `Ficcado` and prefix `FIC-`).
- **Data Changelog:**
  - All touched files, methods, reasons, and verification statuses recorded in `docs/FICCADO_DATA_CHANGELOG.md`.

---

### P2-2: Item Colors, Plain-Text Description, Tags & AUD-09 Optimistic Locking

#### 1. Backend Architecture & Implementation
- **Flyway Migration (`V3__item_colors_description_tags_version.sql`):**
  - Added `description TEXT` and `version BIGINT DEFAULT 0 NOT NULL` to table `items`.
  - Created `item_colors` table (`id BIGSERIAL PRIMARY KEY`, `item_id BIGINT REFERENCES items(id) ON DELETE CASCADE`, `color_hex VARCHAR(7) NOT NULL`, `display_order INT NOT NULL`, `CONSTRAINT uq_item_color UNIQUE (item_id, color_hex)`).
  - Created `item_tags` table (`id BIGSERIAL PRIMARY KEY`, `item_id BIGINT REFERENCES items(id) ON DELETE CASCADE`, `tag VARCHAR(30) NOT NULL`, `CONSTRAINT uq_item_tag UNIQUE (item_id, tag)`).
  - Created index `idx_item_tags_lower ON item_tags(lower(tag))`.
- **Entities & Mappings:**
  - `ItemColor.java`: Maps `item_id`, `colorHex` (#RRGGBB uppercase), `displayOrder`.
  - `ItemTag.java`: Maps `item_id`, `tag` (trimmed, lowercase unique constraint per item).
  - `Item.java`: Annotated with `@Version private Long version = 0L;`, mapped `colors` (OneToMany LAZY `ItemColor` with `@OrderBy("displayOrder ASC")`), mapped `tags` (OneToMany LAZY `ItemTag`), and `description`.
- **Validation Business Rules (`ItemService.java`):**
  - `validateColors`: Maximum 12 colors; format strictly `#RRGGBB` (normalized to uppercase); rejects duplicates case-insensitively.
  - `validateTags`: Maximum 10 tags; length 2 to 30 characters; rejects duplicates case-insensitively.
  - `validateDescription`: Maximum 2000 characters plain text.
- **AUD-09 Optimistic Locking (`ItemService.java`, `ItemVersionConflictException.java`, `GlobalExceptionHandler.java`):**
  - Scope strictly on `Item` entity per AUD-09 decisions.
  - If `version` is supplied in `updateItem` and differs from current entity version, throws `ItemVersionConflictException(version, item.getVersion())`.
  - If `version` is null, update proceeds normally (backward-compatible).
  - `GlobalExceptionHandler`: Maps both `ItemVersionConflictException` and Spring ORM `ObjectOptimisticLockingFailureException` to RFC 9457 ProblemDetail with HTTP 409 Conflict, `code: "ITEM_VERSION_CONFLICT"`, message `"This item was changed by another admin. Reload to see the latest version."`, and expected/actual version metadata.
  - **AUD-09 Rule 5 Compliance:** `version` is never exposed in public product DTOs (`PublicProductResponse`). Verified by reflection tests.
- **Backend Test Verification:**
  - Created `ItemValidationAndLockingTest.java`: 18 tests covering color validation (valid, invalid hex, >12 colors, duplicates), tag validation (valid, lengths, >10 tags, duplicates), description length (>2000), optimistic locking (matching version, stale version conflict, backward-compatible null version, concurrent update simulation), exception handler ProblemDetail mapping, and public DTO safety reflection.
  - Overall suite: `Tests run: 111, Failures: 0, Errors: 0, Skipped: 0`.

#### 2. CRM Frontend Implementation (`crm/ficcado_crm_app`)
- **API Route Handlers:**
  - `app/api/items/route.ts`: Maps `description`, `colors`, `tags`, and `version` in GET; forwards `description`, `colors`, `tags` in POST; forwards backend error status.
  - `app/api/items/[id]/route.ts`: Forwards `description`, `colors`, `tags`, `version` in PUT; catches 409 and returns HTTP 409 with RFC 9457 error code `ITEM_VERSION_CONFLICT`.
  - `lib/apiClient.ts`: Enhanced `apiFetch` to attach HTTP `status` and `data` to thrown Error instances.
- **Items Management Page (`app/(app)/dashboard/items/page.tsx`):**
  - Extended `Item` interface with `description?: string; colors?: string[]; tags?: string[]; version?: number;`.
  - **Color Picker & Swatches:** Color picker input synced with text input, `#RRGGBB` validation, swatch circles with delete button, max 12 indicator.
  - **Tags Management:** Tag input, Enter key / click to add, 2-30 char validation, duplicate tag warning, tag badge list with delete button, max 10 indicator.
  - **Description:** Plain-text textarea with dynamic character counter (`{length} / 2000`).
  - **Conflict Handling (AUD-09):** On HTTP 409 Conflict / `ITEM_VERSION_CONFLICT`, renders an error banner:
    `⚠️ This item was changed by another admin. Reload to see the latest version.` with a **"Reload Item"** button that reloads the catalog and closes the stale edit modal.
  - **Catalog Table & Mobile View:** Displays color swatch dots and tag badges directly in table rows.
- **CRM Frontend Tests & Build:**
  - Created `test/ItemForm.test.tsx`: 4 Vitest tests verifying table rendering, edit modal fields, color hex validation, and optimistic locking 409 banner + reload.
  - Command: `npm test` ➔ **PASS** (`2 passed, 5 tests passed`).
  - Command: `npm run build` ➔ **PASS** (All 28 static and dynamic routes compiled cleanly).

#### 3. Website Frontend Implementation (`website/frontend`)
- **Types (`src/types/index.ts`):** Added `tags?: string[];` to `Product` interface.
- **Product Modal (`src/components/modals/ProductModal.tsx`):**
  - Renders plain-text description with `whitespace-pre-line` (escaped, line breaks preserved, never rendered as HTML).
  - Renders `#tag` badges below description; hidden cleanly if empty.
- **Product Card (`src/components/ui/ProductCard.tsx`):**
  - Renders `#tag` badges below color swatches; hidden cleanly if empty.
- **Website Quality & Device Compatibility:**
  - `npm test`: **PASS** (51/51 unit tests passed).
  - `npm run typecheck`: **PASS** (0 TypeScript errors).
  - `npm run check:brand`: **PASS** (Strict brand spelling `Ficcado` and prefix `FIC-`).
  - `npm run lint`: **PASS** (0 ESLint errors).
  - `node scripts/device-checker.mjs`: **PASS** (300/300 device matrix validations passed across 12 mobile, tablet, and desktop viewports).
  - `npm run build`: **PASS** (35/35 routes compiled cleanly with Next.js Turbopack).

---

## Dependencies Added Log

| Module | Package Name | Version | Scope | Reason |
|---|---|---|---|---|
| `crm/ficcado_crm_app` | `vitest` | `^2.1.9` | devDependency | Unit and component test runner for CRM frontend per ADD-6 |
| `crm/ficcado_crm_app` | `@testing-library/react` | `^16.3.2` | devDependency | Component rendering and assertions for React 19 testing |
| `crm/ficcado_crm_app` | `@testing-library/dom` | `^10.4.1` | devDependency | DOM query utilities supporting Testing Library queries |
| `crm/ficcado_crm_app` | `jsdom` | `^29.0.0` | devDependency | Headless browser DOM simulation environment for Vitest |
| `crm/ficcado_crm_app` | `@vitejs/plugin-react` | `^4.4.1` | devDependency | JSX transformation plugin compatible with Vite 5 and React 19 |

---

### P2-3: Remove Dummy Data & Custom T-Shirt Notice Page

#### 1. Scope & Implementation Details
- **3A. Remove Dummy Data (A-4):**
  - Deleted `website/frontend/src/generated/products-snapshot.json` (10KB of snapshot catalog data).
  - In `website/frontend/src/lib/api/products.ts`:
    - Removed `SNAPSHOT_FILE` constant, `loadFallbackProducts()` function, and fallback calls.
    - Implemented `getItemsResult()` returning `{ products: Product[], error: string | null }`.
    - Made `getItems()` return `[]` cleanly when the catalog is empty or backend is unreachable (zero dummy data returned under any condition).
    - Made `getItemById()` and `getItemBySlug()` query the API directly and return `undefined` on not-found or backend failure (zero search against snapshot files).
  - In `website/frontend/src/lib/products.ts`:
    - Exported `getProductsResult()`, `CatalogResult`, and `GetItemsOptions`.
  - In `website/frontend/src/app/api/health/route.ts`:
    - Removed filesystem inspection of snapshot file.
    - Configured checks to report `productsSnapshotAvailable: false` and `liveCatalogService: true`.
  - In `website/frontend/src/app/page.tsx` & `src/components/home/HomeView.tsx`:
    - `HomePage` fetches via `getProductsResult()` and forwards `catalogError`.
    - `HomeView` differentiates between:
      - **Backend Error State (`#catalog-error-state`):** Renders alert circle icon, "Unable to load catalog", helpful explanation, "Retry / Refresh" button (`window.location.reload()`), and WhatsApp button.
      - **Empty Catalog State (`#catalog-empty-state`):** Renders shopping bag icon, "Catalog currently empty", drop notice, and WhatsApp button.
      - **Filter Empty State (`#catalog-filter-empty-state`):** Renders sliders icon, "No items match your filter selection", and "Reset All Filters" button.
  - In `website/frontend/src/components/category/CategoryProductGrid.tsx`:
    - Differentiated empty collection (`initialProducts.length === 0`, "Collection Currently Empty") from filter empty state.
  - Repository-Level Check:
    - Scanned all production code in `src/` to strictly verify zero imports from `fixtures/`, `sample-data/`, or snapshot files.

- **3B. Custom T-Shirt Notice Page (A-new):**
  - Implemented `website/frontend/src/app/custom-tshirt/page.tsx`:
    - Notice announcement: Clearly states **"Design Your Own T-Shirt"** is **"Coming Soon"**.
    - Notice explanation: Customers will soon be able to submit their own design or artwork, and the Ficcado team will print it on signature 240 GSM combed cotton unisex blanks and deliver the finished T-shirt directly.
    - Zero interactive input controls: Strictly NO `<form>`, NO `<input>`, NO `<textarea>`, NO `<select>`, NO file uploads, NO pricing, NO checkout buttons.
    - Follows luxury brand design tokens and layout (`AppShell`, `DesktopHeader`, `DesktopFooter`).
    - SEO metadata: `title: 'Custom T-Shirt | Design Your Own | Ficcado'` with compelling description.
  - Navigation links:
    - `DesktopHeader.tsx`: Added `/custom-tshirt` to `NAV_LINKS`.
    - `DesktopFooter.tsx`: Added `/custom-tshirt` under Collections.
    - `MobileNavDrawer.tsx`: Added `/custom-tshirt` with "Soon" badge.
  - Device Checker:
    - Added `{ path: '/custom-tshirt', name: 'Custom T-Shirt Notice (Coming Soon)', expectedRole: 'main' }` to `scripts/device-checker.mjs`.

#### 2. Test Verification & Results
- **P2-3 Test Suite (`scripts/tests/dummy-data-and-custom-tshirt.test.mjs`):**
  - `3A.1: verifies products-snapshot.json does not exist in src/generated`: PASS
  - `3A.2: verifies products.ts does not reference snapshot file or fallback dummy products`: PASS
  - `3A.3: repository-level check: no production code in src/ imports from fixtures or sample-data`: PASS
  - `3A.4: verifies HomeView renders distinct empty state vs error state`: PASS
  - `3B.1: /custom-tshirt page exists and contains coming soon notice`: PASS
  - `3B.2: /custom-tshirt contains STRICTLY NO forms, file uploads, or pricing`: PASS
  - `3B.3: Navigation links to /custom-tshirt are present in Header, Footer, and Drawer`: PASS
  - `3B.4: /custom-tshirt is registered in device-checker.mjs`: PASS
  - Result: 8/8 tests pass.
- **Full Website Test Suite:**
  - `npm test`: 59/59 tests pass across 16 suites (0 skipped, 0 failed).
- **Brand Spelling Audit:**
  - `npm run check:brand`: PASS (strictly `Ficcado` and `FIC-`).
- **TypeScript & Lint:**
  - `npm run typecheck`: PASS (0 errors).
  - `npm run lint`: PASS (0 errors).
- **Production Next.js Build:**
  - `npm run build`: PASS (36/36 static/SSG/dynamic routes compiled cleanly including `/custom-tshirt`).
- **Cross-Platform Device Matrix:**
  - `npm run check:devices`: 312/312 tests pass (100% clean across all 12 mobile, tablet, desktop, and 4K profiles; zero warnings, zero failures).
- **Backend & CRM Regression Verification:**
  - Backend `mvnw test`: 66/66 tests pass (0 skipped).
  - CRM `vitest run`: 5/5 tests pass (0 skipped).

---

### Phase P2-4: Customer Session Management & AUD-13 Masking

#### 1. Implementation Summary
- **AUD-13 (Mask PII and Secrets in Logs):**
  - Implemented `PiiMaskingConverter.java` extending Logback's `ch.qos.logback.core.pattern.CompositeConverter` in package `com.aps.ficcado_crm_backend.logging`.
  - Uses precompiled regular expression patterns for:
    - Emails: masks local-part (e.g., `ab***@gmail.com`)
    - Phone numbers: masks all but last 4 digits (e.g., `******1234`)
    - 256-bit Session IDs & Hex Tokens: masks 64-char strings to `[SESSION_ID_MASKED]`
    - JWTs: masks `Bearer eyJ...` and standard 3-segment JWT strings
    - JSON / KV credentials: masks `password`, `secret`, `otp`, `pin`, `client_secret`
    - Razorpay credentials: masks `rzp_test_...` and `rzp_live_...`
    - Authorization & Cookie headers: masks raw token values
  - Configured `logback-spring.xml` with `<conversionRule conversionWord="mask" ... />` wrapping console and file appender pattern layouts (`%mask(%m)`).
  - Verified with `PiiMaskingConverterTest` (8/8 pass) and `PiiLogCaptureTest` (1/1 pass).

- **4A (Diagnostic Reproduction):**
  - Created `website/frontend/scripts/tests/session-diagnosis.test.mjs`.
  - Diagnosed exact root causes of refresh logout:
    1. In-memory `CustomerAuthContext` lost auth state on page refresh because no persistent server session check occurred on load.
    2. Lack of `auth_request` in NGINX gateway configuration allowed requests with missing/forged headers.
    3. Backend lacked a lightweight read-only `GET /api/customer/session` endpoint to poll or query session validity without prematurely extending TTL.
  - Test suite captures and verifies resolution of all three root causes.

- **4B (Backend & Gateway Target Architecture):**
  - Configured dedicated session Redis connection on port 6380 (`noeviction`) via `SessionRedisConfig.java` creating `sessionRedisTemplate`.
  - Implemented immutable record `CustomerSession.java` (`sessionId`, `customerId`, `createdAt`, `lastActivity`, `pausedUntil`).
  - Added RFC 9457 `SessionServiceUnavailableException.java` and global exception mapping to HTTP 503 `SESSION_STORE_UNAVAILABLE`.
  - Created `CustomerSessionService.java`:
    - Session ID: 256 bits (64 hex characters) from `SecureRandom`.
    - Key structure: `session:cust:{sessionId}` with 600s TTL and reverse index set `cust:sessions:{customerId}`.
    - User-initiated requests atomically refresh `lastActivity` and reset TTL to 600s.
    - Background requests (`X-Ficcado-Background: 1`) validate without touching TTL.
    - Pause mechanism: `pauseSession(sessionId, minutes)` clamps duration to 15m max and maintains active status.
    - Single logout revocation (`deleteSession`) and multi-session revocation on password change (`deleteAllSessionsForCustomer`).
  - Updated `CustomerAuthService.java`:
    - Overloaded `generateCustomerToken(Customer, String sessionId)` embedding `sid` claim with 30-day JWT backstop.
    - Validates incoming token session against Redis session store.
    - `changePassword` revokes all active customer sessions across all devices.
  - Updated `CustomerJwtAuthenticationFilter.java`:
    - Checks `X-Ficcado-Background` header; fails closed with HTTP 503 ProblemDetail if Redis is unavailable.
  - Endpoints:
    - `GET /api/customer/session`: returns session status and remaining seconds (read-only, does not touch sliding window).
    - `POST /api/customer/session/touch`: keep-alive, extends TTL to 600s.
    - `POST /api/customer/session/pause`: pauses session up to 15m during payment.
    - `GET /api/internal/session/validate`: internal validation endpoint for gateway `auth_request`.
  - Gateway configuration (`infra/gateway/nginx.conf.template`):
    - Subrequest `/_auth_customer_session` proxies to backend internal validate endpoint.
    - Applied `auth_request /_auth_customer_session` on `/api/customer/`, `/api/wishlist`, `/api/v1/payments`.
    - Explicitly strips client `X-Customer-Id` (`proxy_set_header X-Customer-Id "";`) and forwards verified `X-Customer-Id` and `X-Gateway-Secret`.
    - Blocked external access to `/api/internal/**` with HTTP 403 Forbidden.

- **4C (Website Session Handling & Idle Detection):**
  - Implemented `IdleTimeoutPromptModal.tsx` following luxury brand design system with `#idle-timeout-prompt-modal`, "Still there?" heading, countdown notice, `#stay-logged-in-btn` ("Stay logged in"), and `#idle-logout-btn` ("Log out").
  - `CustomerAuthContext.tsx`:
    - Restores server session on initial load and page navigation (`usePathname()`) via `checkCustomerSession()` without visual logout flash.
    - Activity listener: throttled events (`mousedown`, `keydown`, `scroll`, `touchstart`, `pointerdown`) reset client idle timer.
    - 9-minute idle warning: triggers `showIdlePrompt` showing `IdleTimeoutPromptModal`.
    - 10-minute inactivity logout: triggers `logout()` and redirects to `/login?message=You%20were%20logged%20out%20due%20to%20inactivity.`
    - Multi-tab synchronization: `BroadcastChannel('ficcado_customer_session')` synchronizes `LOGIN`, `LOGOUT`, `ACTIVITY`, `TOUCH`, `PAUSE`, `RESUME` across all open tabs.
    - Payment pause: exposes `pauseSession(minutes)` and `resumeSession()` for checkout.

#### 2. Test Verification & Results
- **Backend Tests:**
  - `PiiMaskingConverterTest.java`: 8/8 pass (email, phone, JWT, 256-bit hex, JSON/KV, headers, Razorpay secrets, clean non-PII).
  - `PiiLogCaptureTest.java`: 1/1 pass (captured log verification).
  - `CustomerSessionServiceTest.java`: 10/10 pass (256-bit token creation, 600s TTL, activity sliding extension, background header does not extend, logout deletes single session, password change deletes all customer sessions, payment pause survives and clamps to 15m, Redis down fails closed with 503 `SESSION_STORE_UNAVAILABLE`, tampered session returns empty, touchSession extends TTL).
  - `CustomerSessionConcurrencyTest.java`: 2/2 pass (200 concurrent logins asserting distinct 256-bit session IDs, isolated customer IDs, zero cross-talk, client-supplied customerId in body/header ignored).
  - `CustomerAuthServiceTest.java`: 4/4 pass.
  - Full Backend Suite: 132/132 tests pass (0 failures, 0 errors, 0 skipped).
- **Website Tests:**
  - `scripts/tests/session-diagnosis.test.mjs`: 3/3 pass.
  - `scripts/tests/session-management.test.mjs`: 7/7 pass.
  - Full Website Suite: 69/69 tests pass across 18 suites (0 failures, 0 errors, 0 skipped).
- **CRM Frontend Tests:**
  - `vitest run`: 5/5 tests pass (0 skipped).
- **Brand & Device Verifications:**
  - `npm run check:brand`: PASS (100% clean `Ficcado` and `FIC-`).
  - `npm run check:devices`: 312/312 tests pass (100% clean across all 12 screen profiles).
- **Production Builds:**
  - Website Next.js Build: 36/36 routes pass cleanly.
  - CRM Next.js Build: 28/28 routes pass cleanly.

---

### Phase P2-5: Wishlist Service & Storefront Integration (A-1, C-1) — COMPLETE & VERIFIED

#### 1. Architectural Implementation & Deliverables
- **Microservices Ownership & Database Boundaries:**
  - Owner: `Ficcado-Website-Data` (Port 8082, Docker DB port 5433).
  - Strict isolation: Foreign keys from `ficcado_website_data` to `ficcado_data` (products/customers) are strictly forbidden. The table stores `customer_id` and `item_id` as raw BIGINTs.
  - Applied Flyway migration `V2__wishlist_items.sql` creating `wishlist_items` with unique constraint `(customer_id, item_id)` and lookup indexes.
- **Ficcado-Website-Data Backend Implementation:**
  - Entity `WishlistItem.java` mapping `wishlist_items`.
  - Repository `WishlistRepository.java` with custom transactional deletion and customer count.
  - Exceptions `WishlistLimitExceededException` (HTTP 400 ProblemDetail, max 200 items cap) and `UnauthorizedGatewayException` (HTTP 401 ProblemDetail).
  - `WishlistService.java`:
    - Enforces hard limit of 200 items per customer.
    - Idempotent `addToWishlist`: uses JPA `saveAndFlush` recovering from concurrent unique constraint violations to prevent duplicate errors.
    - Idempotent `removeFromWishlist`: returns HTTP 204/success even if item was already absent.
    - Strict customer isolation: queries strictly filter by `customerId`.
  - `WishlistController.java`:
    - Endpoints: `GET /api/wishlist`, `PUT /api/wishlist/{itemId}`, `DELETE /api/wishlist/{itemId}`.
    - Identity: Reads `X-Customer-Id` and `X-Gateway-Secret` injected by NGINX gateway `auth_request`. Any client-supplied customer ID in body/query is strictly ignored.
  - Masking & Logging: Registered `PiiMaskingConverter.java` and `logback-spring.xml` in `ficcado_website_data`.
- **Ficcado-Data (Port 8081) Batch Product Lookup:**
  - Added `getPublicProductsByIds(List<Long> ids)` to `PublicProductService.java` filtering only active and in-stock items (`item.getCurrentStatus() == ItemStatus.ACTIVE || item.getCurrentStatus() == ItemStatus.IN_STOCK`).
  - Added endpoint `@GetMapping("/products/by-ids")` to `PublicProductController.java` returning `List<PublicProductResponse>`.
- **Storefront Frontend Integration:**
  - Central types: Added `'guestWishlistModal'` to `ModalId` and exported `WishlistItem`.
  - API Client (`src/lib/api/wishlist.ts`): Implemented `getWishlistItems()`, `addToWishlistApi()`, `removeFromWishlistApi()`, and `getBatchProducts(ids)`.
  - State Management (`src/context/WishlistContext.tsx`):
    - Server-backed state for authenticated customers with optimistic updates and rollback on error.
    - Guest handling: clicking heart stores pending item `{ itemId, returnPath }` in `sessionStorage` and opens guest prompt modal.
    - Open redirect protection: validates `returnPath` strictly starts with `/` and contains no `//`, `:`, or `http`.
    - Auto-add: upon authentication (login or register), automatically executes `addToWishlist(pending.itemId)` and clears storage.
  - UI Components:
    - `GuestWishlistPromptModal.tsx`: Accessible dialog with `#guest-wishlist-modal`, `#guest-wishlist-login-btn`, and `#guest-wishlist-signup-btn`.
    - `ProductCard.tsx`: Wishlist heart toggle button with `#wishlist-btn-{id}`, `aria-label`, filled red heart state, and event propagation stopping.
    - `ProductModal.tsx`: Added `#modal-wishlist-btn` (desktop) and `#mobile-modal-wishlist-btn` (mobile sticky bar).
    - `DesktopHeader.tsx`: Added `#desktop-header-wishlist-btn` with dynamic counter badge linking to `/wishlist`.
    - `DesktopFooter.tsx`: Added "Saved Wishlist" link under Collections.
    - `MobileNavDrawer.tsx`: Added Saved Wishlist navigation link with live counter badge.
    - `AppShell.tsx`: Mounted `<GuestWishlistPromptModal />` in universal modal layer.
    - `layout.tsx`: Wrapped tree with `<WishlistProvider>`.
    - `RouteTitleSync.tsx`: Registered `'/wishlist': 'Ficcado Clothing | Saved Wishlist'`.
  - Dedicated Wishlist Page (`src/app/wishlist/page.tsx` & `WishlistClient.tsx`):
    - Route: `/wishlist`.
    - Server SEO metadata (`title: 'Saved Wishlist | Ficcado'`, OpenGraph).
    - Hydrates product details via `getBatchProducts`.
    - Inactive / deleted products are automatically excluded.
    - Distinct states: Skeleton loading, unauthenticated guest banner with sign-in trigger, empty wishlist curation state with CTA to drops, and populated responsive product grid.
    - Registered in `device-checker.mjs` matrix.

#### 2. Test Verification & Results
- **Website Data Backend Tests (`ficcado_website_data`):**
  - `WishlistServiceTest.java`: 9/9 pass (add, duplicate idempotent add, remove, duplicate idempotent remove, 200 items limit exceeded, get items ordered by created_at, customer isolation).
  - `WishlistControllerTest.java`: 8/8 pass (missing gateway secret returns 401, missing customer header returns 401, GET items, PUT item, DELETE item, limit exceeded returns 400 ProblemDetail, client customerId in query ignored).
  - `WishlistConcurrencyTest.java`: 2/2 pass (50 concurrent thread stress test proving zero deadlocks, race condition recovery, and strict customer isolation).
  - `PiiMaskingConverterTest.java`: 5/5 pass (masking emails, phones, JWTs, hex tokens).
  - Full Website Data Backend Suite: 44/44 tests pass (0 failures, 0 errors, 0 skipped).
- **CRM Backend Tests (`ficcado_crm_backend`):**
  - `PublicProductControllerTest.java`: 7/7 pass (including batch product lookup).
  - Full CRM Backend Suite: 133/133 tests pass (0 failures, 0 errors, 0 skipped).
- **Website Frontend Tests:**
  - `scripts/tests/wishlist.test.mjs`: 11/11 pass (guest modal structure, sessionStorage safety with open redirect guard, auto-add upon auth, API client, microservice isolation, inactive filtering, ProductCard/ProductModal IDs, header/footer/drawer links, dedicated /wishlist page, AppShell mounting, device matrix registration).
  - Full Website Frontend Suite: 80/80 tests pass across 19 suites (0 failures, 0 errors, 0 skipped).
- **Brand & Device Verifications:**
  - `npm run check:brand`: PASS (0 forbidden words, strictly `Ficcado` and `FIC-`).
  - `npm run check:devices`: 324/324 tests pass (100% clean across all 12 screen profiles and 27 routes).
- **Code Quality & Production Build:**
  - `npm run typecheck`: PASS (0 TypeScript errors).
  - `npm run lint`: PASS (0 ESLint errors).
  - `npm run build`: PASS (37/37 static and dynamic routes compiled, `/wishlist` statically generated).

---

### P2-6: Checkout Flow & Saved Addresses (A-2, A-4, C-2, ADD-4, ADD-5)

#### 1. Implementations & Architectural Changes
- **Courier Delivery Options Configuration & Endpoint (ADD-4):**
  - Configured delivery options under `app.delivery.options` in `crm/backend/ficcado_crm_backend/src/main/resources/application.yaml` and `src/test/resources/application.yaml`:
    - `del-standard`: "Express Surface Logistics", rate: ₹0, "3–5 Business Days", status: "ACTIVE"
    - `del-priority`: "Priority Air Courier", rate: ₹99, "1–2 Business Days", status: "ACTIVE"
  - Created `DeliveryOptionDto.java` (`DeliveryOptionResponse`).
  - Created `DeliveryService.java` providing `getActiveDeliveryOptions()`, `calculateDeliveryCharge(courierId)`, and `resolveCourierName(courierId)` to enforce server-computed rates.
  - Created `PublicDeliveryController.java` (`GET /api/public/delivery-options`) permitting unauthenticated access in `SecurityConfig.java`.
- **Customer Address Management (A-4, C-2):**
  - Updated `CustomerProfileController.java`:
    - `GET /api/customer/profile/addresses`: returns `List<CustomerAddressDto>` for the authenticated customer.
    - `POST /api/customer/profile/addresses`: validates address text length (5 to 500 characters), enforces a hard cap of maximum 10 saved addresses per customer, and manages default flag.
    - `DELETE /api/customer/profile/addresses/{id}`: enforces strict customer ownership (returns HTTP 404 if not found or belongs to another customer), promotes remaining address to default if default address is deleted, and returns HTTP 204 No Content.
  - Invariant strictly preserved: single address column in `CustomerAddress` retained without modifying database schema.
- **Internal Server-Side Quote Endpoint (Microservices Security Rule):**
  - Added `POST /api/internal/orders/quote` in `InternalOrderController.java`:
    - Secured with constant-time `MessageDigest.isEqual` comparison of `X-Internal-Secret`.
    - Queries database prices (`Item.getPriceOfItem()`), completely ignoring any client-supplied prices.
    - Verifies active status (`ACTIVE`, `IN_STOCK`) and checks inventory availability in `InventoryRepository`.
    - Computes server-side delivery charge via `DeliveryService`.
    - Returns `valid: false` if any requested item is missing, inactive, or out of stock.
- **Storefront Checkout Refactoring (`website/frontend/src/app/checkout/page.tsx`):**
  - **Guest Auth Guard (A-2, A-4, C-2):** Unauthenticated users are shown a luxury login gate (`#checkout-auth-guard`) prompting them to sign in via `#checkout-login-trigger-btn` (triggers `AuthModal`) or return to bag.
  - **Verified Customer Account Card (A-2):** Authenticated customer name, verified phone (`+91 ...`), and email are rendered in read-only card `#checkout-verified-account-card`.
  - **Saved Address Selector & Inline Form (C-2):**
    - Saved addresses rendered as selectable radio cards with `Default` badge and delete button.
    - Inline "Add New Delivery Address" form captures street address, optional landmark, city, state (from `INDIAN_STATES`), and 6-digit PIN code.
    - Combines fields into standard formatted string `${street}, ${landmark ? landmark + ', ' : ''}${city}, ${state} - ${pincode}` and saves via `POST /api/customer/profile/addresses`.
  - **Courier Delivery Selector (ADD-4):**
    - Dynamically loads courier options from `/api/delivery-options`.
    - Allows selecting Express Surface Logistics (Free) or Priority Air Courier (+₹99).
    - Dynamically updates grand total in sticky order summary.
  - **Strict Removal of Simulated Payment Code (ADD-5):**
    - Completely deleted `createSimulatedPaymentId()`, `createSimulatedSignature()`, `createSimulatedInvoiceNumber()`, and all `pay_sim_` mock fallback paths from `checkout/page.tsx` and all production files in `src/`.
    - Online payment wired to `createPaymentOrder` and Razorpay Checkout modal with session pausing (`pauseSession(15)`).

#### 2. Test Verification & Results
- **CRM Backend Tests (`ficcado_crm_backend`):**
  - `CustomerAddressTest.java`: 8/8 pass (valid address addition, <5 chars rejected, >500 chars rejected, 10 addresses limit, address deletion, unauthorized delete 404, unauthenticated 401).
  - `InternalQuoteTest.java`: 5/5 pass (missing secret 403, standard quote, priority courier rate, insufficient stock `valid: false`, unknown courier 400).
  - `PublicDeliveryTest.java`: 1/1 pass (verifying public delivery options endpoint).
  - Full CRM Backend Suite: 147/147 tests pass (0 failures, 0 errors, 0 skipped).
- **Website Data Backend Tests (`ficcado_website_data`):**
  - Full Website Data Backend Suite: 44/44 tests pass (0 failures, 0 errors, 0 skipped).
- **Website Frontend Tests:**
  - `scripts/tests/checkout-addresses.test.mjs`: 7/7 pass (unauthenticated access guard, verified customer display, address management APIs, delivery configuration, server quote endpoint, and zero simulated payment code).
  - Full Website Frontend Suite: 87/87 tests pass across 20 suites (0 failures, 0 errors, 0 skipped).
- **Brand & Device Verifications:**
  - `npm run check:brand`: PASS (0 forbidden words, strictly `Ficcado` and `FIC-`).
  - `npm run check:devices`: 324/324 tests pass (100% clean across all 12 screen profiles and 27 routes).
- **Code Quality & Production Build:**
  - `npm run typecheck`: PASS (0 TypeScript errors).
  - `npm run lint`: PASS (0 ESLint errors, 0 warnings).
  - `npm run build`: PASS (37/37 static and dynamic routes compiled, `/checkout` optimized).

---

### P2-7: Sale Only After Successful Payment (C-3, B-3 website part) — COMPLETE & VERIFIED

#### 1. Implementations & Architectural Changes
- **Ficcado-Data CRM Backend (`crm/backend/ficcado_crm_backend`):**
  - **Pessimistic Locking on Inventory (AUD-01):**
    - Added `@Lock(LockModeType.PESSIMISTIC_WRITE)` query `findByItemIdAndSizeForUpdate` in `InventoryRepository`.
    - Added `@Lock(LockModeType.PESSIMISTIC_WRITE)` query `findByHandlerAdminIdAndItemIdAndSizeForUpdate` in `WarehouseAllocationRepository`.
    - Updated `InventoryService.deductStock()` to execute pessimistic write locks, serializing concurrent orders at the database level and preventing overselling during concurrent drop spikes.
  - **Internal Paid Sale Endpoint (`POST /api/internal/orders/website-orders` and `/create-paid-sale`):**
    - Secured with constant-time `MessageDigest.isEqual` comparison of `X-Internal-Secret`.
    - Resolves customer details from the database (`CustomerRepository`); validates active customer status.
    - Recalculates expected quote from database prices (`Item.getPriceOfItem()`) and active delivery options; rejects mismatches with HTTP 409 `AMOUNT_MISMATCH`.
    - Generates invoice with candidate format `FIC-INV-<timestamp>` with transactional retry loop (up to 3 attempts) recovering from unique collision (AUD-02).
    - Hardcoded sale remarks strictly to `"WEBSITE SALE"` (satisfies P2-1C and C-3).
    - Deducts inventory and warehouse allocation inside a single `@Transactional` boundary; creates `Sale` and `SaleLineItem`s.
  - **Concurrency Stress Test (`InventoryConcurrencyTest.java`):**
    - 50 concurrent threads competing for 10 stock units.
    - Verified: exactly 10 succeed, exactly 40 fail with `InsufficientStockException`, remaining stock is strictly 0 and never negative.
  - **Test Suite Results:** 150/150 tests pass (0 failures, 0 errors, 0 skipped).

- **Payment Gateway Data Backend (`payment/backend/ficcado_payment_gateway_data`):**
  - **Flyway Migration `V2__payment_state_machine_and_outbox.sql`:**
    - Added `version BIGINT DEFAULT 0 NOT NULL` for optimistic locking (`@Version`).
    - Added order snapshot columns: `courier_partner`, `delivery_charge`, `address_id`.
    - Created `outbox_events` table (`id`, `aggregate_type`, `aggregate_id`, `event_type`, `payload`, `status`, `created_at`).
  - **Payment State Machine (`PaymentStatus.java` & `PaymentTransaction.java`):**
    - Enforces valid state transitions:
      - `CREATED` -> `PROCESSING` or `FAILED` or `EXPIRED`
      - `PROCESSING` -> `COMPLETED` or `REFUND_PENDING` or `FAILED`
      - `REFUND_PENDING` -> `REFUNDED`
      - Terminal states (`COMPLETED`, `REFUNDED`, `EXPIRED`, `FAILED`) allow no further state modifications.
  - **Payment APIs (`PaymentController.java`):**
    - Mapped `/api/v1/payments` and `/api/payments` dual routes.
    - `POST /create-order` & `POST /orders`: Validates server quote against Ficcado-Data; creates Razorpay order; initiates 15-minute checkout window.
    - `POST /verify`: Moves transaction to `PROCESSING`, triggers async sync to Ficcado-Data, and returns HTTP 202 Accepted immediately.
    - `GET /{id}/status`: Enforces customer isolation; rejects requests where `X-Customer-Id` does not match transaction owner with HTTP 403 Forbidden.
  - **Data Sync & Outbox Pattern (`FiccadoDataSyncService.java`):**
    - Calls `POST /api/internal/orders/website-orders` on Ficcado-Data.
    - Distinguishes business failures (e.g. stock exhausted, price mismatch -> `REFUND_PENDING`) from transient failures (e.g. network timeout -> stays `PROCESSING`).
    - Publishes transactional outbox event for `order-status` notification.
  - **Razorpay Webhook Handling (`RazorpayWebhookController.java`):**
    - Validates HMAC SHA-256 signature against raw request body using `X-Razorpay-Signature`.
    - Deduplicates events via `WebhookLogRepository`.
    - Handles `payment.captured` (moves to `PROCESSING` and triggers sync) and `payment.failed` (moves to `FAILED` with zero calls to Ficcado-Data).
  - **Test Suite Results:** 15/15 tests pass (0 failures, 0 errors, 0 skipped).

- **Website Data Backend (`website/backend/ficcado_website_data`):**
  - **Flyway Migration `V3__order_notifications.sql`:**
    - Created `order_notifications` table with unique constraint on `transaction_id`.
  - **Idempotent Order Notifications (`OrderNotificationService.java` & `InternalNotificationController.java`):**
    - Protected endpoint `POST /api/internal/notifications/order-status` guarded by `X-Internal-Secret`.
    - Dispatches customer email notifications:
      - `COMPLETED`: order confirmation with invoice number and delivery estimate.
      - `FAILED`: payment failure alert.
      - `REFUND_PENDING` / `REFUNDED`: refund processing notice.
    - Records notification in database; idempotent processing skips duplicate transmissions.
  - **Test Suite Results:** 49/49 tests pass (0 failures, 0 errors, 0 skipped).

- **Website Frontend Verification & Tests:**
  - `website/frontend/scripts/tests/payment-flow.test.mjs`:
    - 9 comprehensive contract/unit tests verifying:
      1. Checkout requires authenticated customer (#checkout-auth-guard).
      2. Session timer pauses (15 mins) during payment modal.
      3. Order creation with server-validated quote.
      4. Verification endpoint with 202 Accepted.
      5. Order confirmation page structure (#order-confirmation-receipt).
      6. Sale remarks strictly "WEBSITE SALE".
      7. Pessimistic write locking on stock deduction.
      8. Payment state machine validation.
      9. Zero Ficcado-Data calls on failed payment.
  - Full Website Frontend Suite: 96/96 tests pass across 22 suites (0 failures, 0 errors, 0 skipped).
  - `npm run check:brand`: PASS (strictly `Ficcado` and `FIC-`).
  - `npm run check:devices`: 324/324 tests pass (100% clean across all 12 screen profiles and 27 routes).
  - `npm run typecheck`: PASS (0 errors).
  - `npm run lint`: PASS (0 errors, 0 warnings).
  - `npm run build`: PASS (37/37 routes compiled).

---

### P2-8: Razorpay Reconciliation Scheduler (10-Min, ShedLock) (C-4) — COMPLETE & VERIFIED

#### 1. Implementations & Architectural Changes
- **Distributed Scheduler Locking with ShedLock (AUD-07):**
  - Integrated `shedlock-spring` (5.16.0) and `shedlock-provider-jdbc-template` (5.16.0) in `ficcado_payment_gateway_data`.
  - Created Flyway migration `V3__reconciliation_and_shedlock.sql`:
    - Table `shedlock` (`name VARCHAR(64) PRIMARY KEY`, `lock_until`, `locked_at`, `locked_by`).
    - Added columns `refund_id VARCHAR(100)`, `reconciliation_run_count INT NOT NULL DEFAULT 0`, and `last_reconciled_at TIMESTAMPTZ` on `payment_transactions`.
    - Added composite lookup index `idx_payment_tx_reconciliation (payment_status, created_at)`.
  - Created `ShedLockConfig.java` enabling `@EnableSchedulerLock(defaultLockAtMostFor = "PT10M")` with `JdbcTemplateLockProvider` using database time.
  - Created `PaymentReconciliationScheduler.java` executing `@Scheduled(cron = "${app.reconciliation.cron:0 */10 * * * *}")` guarded by `@SchedulerLock(name = "paymentReconciliationLock", lockAtLeastFor = "PT1M", lockAtMostFor = "PT9M")`.
- **Razorpay REST API Client & Circuit Breaker:**
  - Implemented thread-safe `CircuitBreaker.java` (`CLOSED`, `OPEN`, `HALF_OPEN`):
    - Failure threshold: 5 consecutive failures trips circuit breaker to `OPEN` for 30,000 ms.
    - Probing: after 30s open duration, transitions to `HALF_OPEN` for single trial call. Success resets to `CLOSED`, failure trips back to `OPEN`.
    - Fast fail: throws `CircuitBreakerOpenException` when `OPEN`.
  - Created `DefaultRazorpayApiClient.java` with 5000 ms connect timeout and 5000 ms read timeout via `SimpleClientHttpRequestFactory`.
  - Methods implemented:
    - `fetchPaymentsForOrder(orderId)`: queries `GET /orders/{orderId}/payments` with Basic Auth.
    - `initiateRefund(paymentId, amount, note)`: calls `POST /payments/{paymentId}/refund`.
    - `fetchRefundStatus(refundId)`: calls `GET /refunds/{refundId}`.
- **Reconciliation Engine (`PaymentReconciliationService.java`):**
  - Queries candidate transactions: `paymentStatus IN ('CREATED', 'PROCESSING', 'REFUND_PENDING')` where `createdAt <= now - 5 minutes`, ordered by `createdAt ASC`, limit 100.
  - Implements all 5 reconciliation branches:
    1. **Branch 1 (Captured payment without sale):** transitions `CREATED -> PROCESSING -> COMPLETED`, calls `syncService.executeSyncSale`, resets `reconciliationRunCount = 0`, and notifies customer via outbox event.
    2. **Branch 2 (Business failure):** initiates refund of full captured amount via Razorpay API, stores `refundId`, transitions to `REFUND_PENDING`, and notifies customer to place the order again.
    3. **Branch 2B (Transient retry threshold):** transient failures are retried for up to 5 runs staying in `PROCESSING` (`syncStatus = RETRY_QUEUED`). On the 6th run (~1 hour of transient errors), starts refund, stores `refundId`, transitions to `REFUND_PENDING`, and notifies customer.
    4. **Branch 3 (All payments failed):** transitions to `FAILED`, sets `syncStatus = PAYMENT_FAILED`, and notifies customer.
    5. **Branch 4 (>48 hours without payment):** transitions to `EXPIRED`, sets `syncStatus = EXPIRED`, with strictly zero customer notification.
    6. **Branch 5 (Refund processed):** verifies `refundId` with Razorpay API; when status is `processed`, transitions `REFUND_PENDING -> REFUNDED`, sets `syncStatus = REFUNDED`, and notifies customer.
  - **Idempotent Refund Guard:** strictly checks `tx.getRefundId() == null` before calling Razorpay refund API; refund is never created twice even if job runs repeatedly or concurrently.
  - **Batch Resilience:** individual candidate processing is wrapped in try-catch; failure or exception on one candidate never interrupts the remainder of the batch.
  - **Micrometer Metrics:** records `ficcado.reconciliation.runs` (counter), `ficcado.reconciliation.duration` (timer), and `ficcado.reconciliation.outcomes` with tag `outcome`.
- **Webhook Controller Enhancement (`RazorpayWebhookController.java`):**
  - Enhanced `refund.processed` webhook handler to locate transactions by `orderId`, `paymentId`, or `refundId`.

#### 2. Test Verification & Results
- **Payment Gateway Backend Tests (`ficcado_payment_gateway_data`):**
  - `PaymentReconciliationTest.java`: 10/10 pass
    1. `capturedPaymentCompletesSaleAndNotifiesCustomer` (Branch 1)
    2. `businessFailureInitiatesRefundAndNotifiesCustomer` (Branch 2)
    3. `transientFailureRetriedUpTo6RunsThenRefunds` (Branch 2B)
    4. `refundCreatedOnceEvenIfJobRunsTwice` (Idempotent refund guard)
    5. `allPaymentsFailedMarksFailedAndNotifiesCustomer` (Branch 3)
    6. `olderThan48HoursWithoutPaymentMarksExpiredWithoutNotification` (Branch 4)
    7. `refundProcessedMarksRefunded` (Branch 5)
    8. `batchContinuesAfterOneAttemptFails` (Batch resilience)
    9. `userPaidBrowserClosedWebhookLostReconciliationCompletesSale` (Full end-to-end recovery)
    10. `shedLockPreventsSimultaneousRuns` (ShedLock distributed locking)
  - `CircuitBreakerTest.java`: 4/4 pass (threshold trip, recovery through half-open, probe failure trip, reset)
  - `PaymentControllerTest.java`: 7/7 pass
  - `RazorpayServiceTest.java`: 3/3 pass
  - `RazorpayWebhookControllerTest.java`: 4/4 pass
  - Full Payment Gateway Backend Suite: **29/29 tests pass (0 failures, 0 errors, 0 skipped)**.
- **CRM Backend Tests (`ficcado_crm_backend`):**
  - Full CRM Backend Suite: **151/151 tests pass (0 failures, 0 errors, 0 skipped)**.
- **Website Data Backend Tests (`ficcado_website_data`):**
  - Full Website Data Backend Suite: **49/49 tests pass (0 failures, 0 errors, 0 skipped)**.
- **Website Frontend Tests:**
  - `scripts/tests/reconciliation.test.mjs`: 5/5 pass (ShedLock, 10-min scheduler, circuit breaker, 5 branches, Micrometer metrics).
  - Full Website Frontend Suite: **101/101 tests pass across 23 suites (0 failures, 0 errors, 0 skipped)**.
- **Brand & Device Verifications:**
  - `npm run check:brand`: PASS (strictly `Ficcado` and `FIC-`).
  - `npm run check:devices`: 324/324 tests pass (100% clean across all 12 screen profiles and 27 routes).
- **Code Quality & Production Builds:**
  - `npm run typecheck`: PASS (0 errors).
  - `npm run lint`: PASS (0 errors, 0 warnings).
  - Next.js Website Build: 37/37 routes compiled cleanly.
  - Next.js CRM Build: 28/28 routes compiled cleanly.

---

## Open Questions & Gate Status

### GATE 9: Released — Slated Post-P2-8 Audit Items & Phase P2-9
- Phase P2-8 (Razorpay Reconciliation Scheduler) is 100% implemented, verified, and committed.
- Test verification tally across all modules:
  - CRM Backend (`ficcado_crm_backend`): **151/151 pass** (0 skipped)
  - Payment Gateway (`ficcado_payment_gateway_data`): **29/29 pass** (0 skipped)
  - Website Data Backend (`ficcado_website_data`): **49/49 pass** (0 skipped)
  - Website Frontend: **101/101 pass** (0 skipped, 23 suites)
  - Device Compatibility Checker: **324/324 pass** (12 mobile, tablet, and desktop device profiles)
  - Brand Spelling Audit: **PASS** (strictly `Ficcado` and prefix `FIC-`)
  - Typecheck & Lint: **PASS** (0 errors, 0 warnings)
  - Next.js Builds: **PASS** (Website 37/37 routes, CRM 28/28 routes)
- Approved Audit Items prior to Phase P2-9:
  - **AUD-11 (Connection Pools & Redis Verification):** Scheduled after P2-8 and before P2-9 load tests.
  - **AUD-12 (Database Indexes on Foreign Keys):** Scheduled after P2-8 and before P2-9 load tests.
- Next Phase in sequence: **AUD-11 / AUD-12 and Phase P2-9: Load tests (k6), Logging check, CI and compliance verification**.









