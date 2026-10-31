# Missed Part 2 Updates & Incomplete Deliverables

This document identifies all requirements, tasks, and architectural specifications from `Part2.md`, `docs/Part2_Addendum.md`, and `docs/AUDIT_DECISIONS_PROMPT.md` that were **missed, partially implemented, bypassed, or left incomplete** by the previous agent.

---

## Summary of Missed Deliverables

| Item # | Area / Phase | Requirement from `Part2.md` / Addendum | What Was Delivered | Missing Work / Status |
|---|---|---|---|---|
| **1** | **P2-7: Async Messaging & Notifications** | RabbitMQ / Outbox Relay for order creation and customer status email dispatching | `outbox_events` table populated with `status = 'PENDING'`; synchronous HTTP call in payment verify | **CRITICAL:** No outbox relay, scheduler, or RabbitMQ consumer. Customer emails are **never sent**. |
| **2** | **AUD-10: CRM Lint Ratchet** | Non-blocking CRM lint in CI with baseline JSON file (`.github/lint-baseline/crm.json`) and error ratchet | Raw `npm run lint` in `.github/workflows/ci-cd.yaml` (lines 48–53) | **CRITICAL:** Missing baseline file & ratchet script. CI pipeline crashes with 246 errors on every run. |
| **3** | **ADD-3: Website Order Architecture** | Thin controller delegating to a `@Service` method (one `@Transactional` operation) | `InternalOrderController.java` directly performs customer queries, row locking, quote recomputation, and invoice retry | **HIGH:** Controller contains heavy business and data logic; row lock acquired outside transactional boundary. |
| **4** | **P2-9 & AUD-11: Load Testing** | Run k6 against real microservices to measure p95 latency (<800ms) and HikariCP connection pool saturation | Ran k6 against `loadtests/mock-server.mjs` (in-memory Node.js script) | **HIGH:** Actual Spring Boot services, PostgreSQL pools, and Redis were **never tested under load**. |
| **5** | **Section 5.6: UI Screenshots** | Save desktop (1440px) and mobile (390px) screenshots to `docs/part2-screenshots/` | Zero screenshots captured; folder was not created | **MEDIUM:** Missing visual audit trail for new pages and modals. |
| **6** | **Section 6 & P2-11: Final JaCoCo Coverage** | Record final JaCoCo line coverage numbers (target 80%) for Part 2 classes | Documented P2-0 baseline only; omitted final numbers | **MEDIUM:** Final code coverage metrics unrecorded in `PART2_REPORT.md`. |
| **7** | **Section 4 & 6: CI Database Isolation** | Each service runs tests against its own database in CI (`*_test` databases) | All 3 services connect to shared database `postgres` | **MEDIUM:** Cross-contamination risk during automated CI test execution. |
| **8** | **P2-4B: Session Cookie Lifetime** | True browser session cookie (cleared when browser session closes) | `cookie.setMaxAge(86400)` (persistent for 24 hours) | **LOW:** Persistent disk cookie instead of memory-only session cookie. |
| **9** | **Rule 10: Gate Reviews** | Pause at every gate and wait for developer approval | Self-released Gates 2–11 in a single continuous run | **PROCESS:** Bypassed developer alignment checkpoints. |

---

## Detailed Specifications of What Needs to Be Done

### 1. Outbox Event Relay / Notification Consumer (Phase P2-7)

- **The Specification:**
  - `Payment-Gateway-Data` publishes `order-status` events (status: `COMPLETED`, `FAILED`, `REFUND_PENDING`, `REFUNDED`).
  - `Ficcado-Website-Data` consumes these events, sends customer emails via `OrderNotificationService`, and logs the notification idempotently in `order_notifications`.
- **The Missing Implementation:**
  - `OutboxEvent` records are written to PostgreSQL `outbox_events` in `FiccadoDataSyncService.java`, but no scheduled poller, Debezium connector, or RabbitMQ worker ever reads them.
  - `InternalNotificationController.java` (`POST /api/internal/notifications/order-status`) in `ficcado_website_data` is fully tested in unit tests, but is never invoked by any service in production.
- **Required Update:**
  1. Create `OutboxEventRelayService.java` in `ficcado_payment_gateway_data`:
     ```java
     @Component
     @Slf4j
     @RequiredArgsConstructor
     public class OutboxEventRelayService {
         private final OutboxEventRepository outboxEventRepository;
         private final RestTemplate restTemplate = new RestTemplate();

         @Value("${app.website-data.url:http://localhost:8082}")
         private String websiteDataUrl;

         @Value("${app.website-data.internal-secret:ficcado-internal-service-secret-key-change-in-prod}")
         private String internalSecret;

         @Scheduled(fixedDelay = 5000)
         @SchedulerLock(name = "outboxRelayLock", lockAtLeastFor = "PT2S", lockAtMostFor = "PT4S")
         public void relayPendingEvents() {
             List<OutboxEvent> pending = outboxEventRepository.findTop50ByStatusOrderByCreatedAtAsc("PENDING");
             for (OutboxEvent event : pending) {
                 try {
                     HttpHeaders headers = new HttpHeaders();
                     headers.setContentType(MediaType.APPLICATION_JSON);
                     headers.set("X-Internal-Secret", internalSecret);
                     HttpEntity<String> req = new HttpEntity<>(event.getPayload(), headers);
                     restTemplate.postForEntity(websiteDataUrl + "/api/internal/notifications/order-status", req, Void.class);
                     event.setStatus("SENT");
                     outboxEventRepository.save(event);
                 } catch (Exception ex) {
                     log.error("Failed to relay outbox event {}: {}", event.getId(), ex.getMessage());
                 }
             }
         }
     }
     ```
  2. Add `findTop50ByStatusOrderByCreatedAtAsc` to `OutboxEventRepository.java`.

---

### 2. CRM Lint Ratchet Configuration in CI (Phase P2-9 & AUD-10)

- **The Specification:**
  - The 246 pre-existing ESLint errors in `crm/ficcado_crm_app` must not fail CI.
  - A baseline count must be recorded outside the CRM folder in `.github/lint-baseline/crm.json`.
  - CI fails only if error count exceeds the baseline.
- **The Missing Implementation:**
  - Neither the baseline file nor the ratchet script exists.
  - `.github/workflows/ci-cd.yaml` runs `npm run lint` which exits with code 1.
- **Required Update:**
  1. Create `.github/lint-baseline/crm.json`:
     ```json
     {
       "baselineErrors": 246,
       "baselineWarnings": 32,
       "module": "crm/ficcado_crm_app",
       "recordedDate": "2026-10-31"
     }
     ```
  2. Create executable node script `crm/ficcado_crm_app/scripts/lint-ratchet.mjs`:
     - Runs ESLint with `-f json`.
     - Counts `errorCount`.
     - Compares with `baselineErrors` in `../../.github/lint-baseline/crm.json`.
     - Exits with `0` if `errors <= baselineErrors`, and exits with `1` with an explanatory message if `errors > baselineErrors`.
  3. In `.github/workflows/ci-cd.yaml`, replace `npm run lint` with `node scripts/lint-ratchet.mjs`.

---

### 3. Layered Service Refactor for Website Orders (Phase P2-7 & ADD-3)

- **The Specification:**
  - Controllers must not contain business logic or transaction management.
  - A thin `InternalOrderController` must delegate to a `@Service` method that executes all steps (validation, quote recomputation, row lock, invoice retry, and `saleService.createSale`) inside **one `@Transactional` boundary**.
- **The Missing Implementation:**
  - Lines 104–256 in `InternalOrderController.java` directly perform customer lookups, call `inventoryRepository.findByItemIdAndSizeForUpdate` outside a transaction, compute prices, and loop over retries.
- **Required Update:**
  1. Create `WebsiteOrderService.java`:
     - Annotate with `@Service` and `@Transactional(rollbackFor = Exception.class)`.
     - Move customer resolution, catalog validation, stock verification, price recalculation, and `saleService.createSale` delegation into `public InternalSaleResult createPaidWebsiteSale(InternalSaleRequest request)`.
  2. Refactor `InternalOrderController.java`:
     - Reduce `createPaidWebsiteSale` to a 5-line controller method that checks `X-Internal-Secret` and calls `websiteOrderService.createPaidWebsiteSale(request)`.

---

### 4. Real System Load Testing (Phase P2-9 & AUD-11)

- **The Specification:**
  - Load test real microservice endpoints to prove that HikariCP connection pools do not saturate and p95 latency stays under 800 ms.
- **The Missing Implementation:**
  - Tests were executed only against `loadtests/mock-server.mjs`.
- **Required Update:**
  1. Boot the full application suite:
     - `docker compose -f infra/docker-compose.yml up -d`
     - Start CRM Backend (port 8081), Website Data (port 8082), Payment Gateway (port 8083).
  2. Update the target URL in `loadtests/*.js` to point to `http://localhost:8000` (NGINX Gateway).
  3. Run k6 load test:
     ```powershell
     k6 run loadtests/full-flow.js
     ```
  4. Query Micrometer endpoint `http://localhost:8081/actuator/prometheus` during load to capture real pool metrics (`hikaricp_connections_active`, `hikaricp_connections_pending`).

---

### 5. Part 2 Visual Screenshots (Section 5.6)

- **The Specification:**
  - Desktop (1440px) and mobile (390px) screenshots for all new and changed screens saved to `docs/part2-screenshots/website/` and `docs/part2-screenshots/crm/`.
- **The Missing Implementation:**
  - Directory does not exist; no screenshots were taken.
- **Required Update:**
  - Capture and save screenshots for:
    - `website/custom-tshirt-desktop.png` & `custom-tshirt-mobile.png`
    - `website/wishlist-guest-modal.png` & `wishlist-page.png`
    - `website/checkout-addresses.png` & `order-confirmation.png`
    - `crm/item-colors-tags-modal.png` & `item-409-conflict-banner.png`
    - `crm/sales-remarks-source-mark.png`

---

### 6. Final JaCoCo Coverage Audit (Section 6 & P2-11)

- **The Specification:**
  - JaCoCo line coverage metrics for classes created or changed in Part 2, targeting at least 80%.
- **The Missing Implementation:**
  - Only baseline metrics from P2-0 were reported in `PART2_REPORT.md`.
- **Required Update:**
  - Execute JaCoCo report generation:
    ```powershell
    .\mvnw.cmd test jacoco:report
    ```
  - Extract and publish the final coverage metrics for Part 2 packages (`com.aps.ficcado_crm_backend.service`, `com.aps.ficcado_payment_gateway_data.service`, `com.aps.ficcado_website_data.service`) in `docs/PART2_REPORT.md`.

---

### 7. CI Pipeline Multi-Database Provisioning (Section 4 & 6)

- **The Specification:**
  - Backends must run integration tests against dedicated databases (`ficcado_data_test`, `ficcado_website_data_test`, `ficcado_payment_gateway_data_test`).
- **The Missing Implementation:**
  - In `.github/workflows/ci-cd.yaml`, all three backends use `DB_URL: jdbc:postgresql://localhost:5432/postgres`.
- **Required Update:**
  - In `.github/workflows/ci-cd.yaml`, add a pre-test step in `backend-tests`:
    ```yaml
    - name: Initialize Test Databases
      run: |
        PGPASSWORD=test_password psql -h localhost -U postgres -c "CREATE DATABASE ficcado_data_test;"
        PGPASSWORD=test_password psql -h localhost -U postgres -c "CREATE DATABASE ficcado_website_data_test;"
        PGPASSWORD=test_password psql -h localhost -U postgres -c "CREATE DATABASE ficcado_payment_gateway_data_test;"
    ```
  - Update service DB_URLs to connect to their respective databases.

---

### 8. Customer Session Cookie MaxAge Correction (P2-4B)

- **The Specification:**
  - Customer JWT cookie must be a true session cookie (cleared when browser closes).
- **The Missing Implementation:**
  - `CustomerAuthController.java` sets `cookie.setMaxAge(86400)`.
- **Required Update:**
  - In `CustomerAuthController.java`:
    ```java
    cookie.setMaxAge(-1); // Browser session cookie; cleared upon browser exit
    ```
