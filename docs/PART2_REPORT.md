# Ficcado Rebuild — Part 2 Implementation Report

This report records all verified actions, command execution results, test outputs, dependencies, and phase transitions for Part 2 of the Ficcado rebuild as defined in `Part2.md`.

---

## Phase Execution Summary

| Phase | Description | Status | Evidence / Notes |
|---|---|---|---|
| **P2-0A** | Docker Compose Infrastructure | **Completed & Verified** | All 5 containers up and healthy; connectivity and policies verified with live commands. |
| **P2-0** | Baseline, Discovery, UI Guide & Audit | **Completed & Verified (Gate 1 Released)** | Full baseline test runs, discovery items located, UI Guide, Audit and Addendum completed. Gate 1 released by developer. |
| **P2-1** | CRM Fixes (Admin Permissions, Activity Log, Sale Source) | **Completed & Verified (Ready for Gate 2 Review)** | ADD-2, P2-1A, P2-1B, and P2-1C implemented and verified. 93/93 backend tests pass (0 skipped), CRM frontend Vitest and build pass (28 routes). |
| **P2-2** | Item Colors, Plain-Text Description & Tags | Not Started | Includes approved audit item AUD-09. |
| **P2-3** | Remove Dummy Data & Custom T-Shirt Notice Page | Not Started | |
| **P2-4** | Customer Session Management (Redis 10-Min Sliding Logout) | Not Started | Starts with approved audit item AUD-13. |
| **P2-5** | Customer Wishlist Service | Not Started | |
| **P2-6** | Checkout Details & Saved Addresses | Not Started | |
| **P2-7** | Sale Only After Successful Verified Payment | Not Started | |
| **P2-8** | Razorpay Reconciliation Scheduler (10-Min, ShedLock) | Not Started | Post-P2-8 runs AUD-11 and AUD-12. |
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

## Dependencies Added Log

| Module | Package Name | Version | Scope | Reason |
|---|---|---|---|---|
| `crm/ficcado_crm_app` | `vitest` | `^2.1.9` | devDependency | Unit and component test runner for CRM frontend per ADD-6 |
| `crm/ficcado_crm_app` | `@testing-library/react` | `^16.3.2` | devDependency | Component rendering and assertions for React 19 testing |
| `crm/ficcado_crm_app` | `@testing-library/dom` | `^10.4.1` | devDependency | DOM query utilities supporting Testing Library queries |
| `crm/ficcado_crm_app` | `jsdom` | `^29.0.0` | devDependency | Headless browser DOM simulation environment for Vitest |
| `crm/ficcado_crm_app` | `@vitejs/plugin-react` | `^4.4.1` | devDependency | JSX transformation plugin compatible with Vite 5 and React 19 |

---

## Open Questions & Gate Status

### GATE 2: Ready for Developer Review
- Phase P2-1 (CRM Fixes) is fully implemented, verified, and clean.
- All 93 backend tests in `ficcado_crm_backend` pass with 0 skipped.
- CRM frontend test framework configured and passing.
- Next Phase in sequence: **Phase P2-2: Item colors, plain-text description and tags (B-1, B-4)**, incorporating approved audit item **AUD-09** (`Item` optimistic locking).
- **Status:** Paused at Gate 2 awaiting developer review and confirmation to proceed with Phase P2-2.



