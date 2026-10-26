# Part2.md

> **Brand spelling: always `Ficcado` (double C).** The website `check-brand.mjs` must keep passing.

This file is **Part 2** of the Ficcado rebuild. It adds new requirements and refactors on top of Part 1 (`docs/Ficcadocompleterebuild.md`). The agent works **only** from this file.

---

## 1. Agent rules (non-negotiable)

These rules exist so the agent does not guess, invent, or expand scope.

1. **Scope lock.** Implement only what this file lists. No extra features, no extra refactors, no "while I'm here" improvements, no style or formatting changes to untouched code, no dependency upgrades. If something not listed seems wrong, record it in the audit or in `AGENT_QUESTIONS.md` and do not change it.
2. **Decisions in this file are final.** Do not replace a decision with an alternative you prefer. If a decision turns out to be impossible, stop, write the problem and options to `AGENT_QUESTIONS.md` under the heading **"Part 2"** (ids `P2-Q-001`, `P2-Q-002`, ...), and wait.
3. **Verify before you act.** Many names are marked *(discover)*. Read the code to find the real class, file, endpoint, table, column or script. **Never invent a name and never assume it exists.** If something this file says exists does not exist, stop and ask.
4. **No hallucinated claims.** Never write "done", "passing" or "verified" unless you ran the command in this session and saw the result. Put evidence (command and result summary, test names, file paths) in `docs/PART2_REPORT.md`. If you could not run something, say so plainly.
5. **Never weaken tests.** Do not delete, skip, `@Disabled`, loosen, or special-case a test to make it pass. A failing test means the code is wrong (or the test has a proven bug, which you must explain in the report).
6. **Pre-existing failures** found in the baseline are recorded and left alone unless a phase here requires touching that code.
7. **New dependencies** are allowed only from this list: Spring Data Redis (Lettuce), Spring AMQP, ShedLock (JDBC provider), Resilience4j, Razorpay Java SDK (or plain HTTPS client if the SDK is unsuitable), logstash-logback-encoder, Micrometer, JaCoCo, WireMock (test scope), and a test library already present in the project. Anything else needs a question first. List every added dependency (name, version, reason, module) in `docs/PART2_REPORT.md`.
8. **Secrets** never go into the repo, logs, tests or reports. Use environment variables and `.env.example` files.
9. **Work on branch `fic/completeService` only.** Commit at the end of each task with a clear message. Do not touch `fic/crm` or `fic/website`.
10. **Pause at every GATE** and at the end of every phase: update `docs/PART2_REPORT.md`, list open questions, and wait for the developer.
11. **Docker Compose is used for infrastructure only** (PostgreSQL for the new and test databases, two Redis instances, RabbitMQ, the NGINX gateway, and optional monitoring). **Do not create Dockerfiles for the application services** and do not create Kubernetes files; containerizing the app services is a later step. The Java services and Next.js apps keep running on the host machine (`mvnw`, `npm`). Before using Docker run `docker --version` and `docker compose version`; if either fails, stop and tell the developer (do not substitute a native install).

---

## 2. Relationship to Part 1

Part 1 and its resolved decisions (see the "Resolved Questions" log in `AGENT_QUESTIONS.md`) stay in force **except** for these overrides:

| Part 1 rule | Part 2 override |
|---|---|
| CRM frontend is never modified | The CRM frontend, CRM backend (Ficcado-Data) and all other services **may be modified, but only for the items listed in this file**. |
| No schema changes to Ficcado-Data | Allowed **only** for the tables and columns named in this file (item colors, description, tags). Use Flyway migrations. No other schema change. |
| No Docker | **Docker Compose for infrastructure is now required and replaces native installs of Redis, RabbitMQ and NGINX** (see P2-0A). Part 1 text about running those natively is superseded. Application services are still not containerized. |
| Redis may degrade gracefully | **Customer sessions require Redis.** If Redis is down, authenticated customer requests fail safely (see P2-4). Product caching may still degrade gracefully. |
| Existing logic in Ficcado-Data is reused, not reimplemented | Still true. Reuse `SaleService.createSale`; wrap it, do not copy it. |

Everything else from Part 1 still applies: ports (Ficcado-Data 8081, Website-Data 8082, Payment-Gateway-Data 8083, gateway 8000, website 3000), Java + Spring Boot + Maven, PostgreSQL only, Next.js, RabbitMQ, Redis, internal endpoints under `/api/internal/**` protected by a shared secret and blocked at the gateway, customer tokens separate from admin tokens, no Dockerfiles for application services.

**CRM admin sessions are not part of the idle-logout change.** Only website customers get the 10-minute rule.

---

## 3. Requirement map

| Id | Requirement | Phase |
|---|---|---|
| A-new | Custom T-shirt feature (coming-soon page only for now) | P2-3 |
| A-1 | Guest wishlist click leads to sign-up or login | P2-5 |
| A-2 | Session management fix, 10-minute idle logout, session isolation, new pages match design and pass `device:checker` | P2-4 (and every UI phase) |
| A-3 | New admins denied access to the admin panel | P2-1 |
| A-4 | Remove all dummy data from the website | P2-3 |
| B-1 | Item colors (hex codes) and plain-text description in CRM, shown on website | P2-2 |
| B-2 | Activity log message shows a stray "—" | P2-1 |
| B-3 | Sale source mark in remarks: CRM SALE or WEBSITE SALE | P2-1 (CRM) and P2-7 (website) |
| B-4 | Item tags in CRM, shown on website | P2-2 |
| C-1 | Wishlist saved in `ficcado_website_data` | P2-5 |
| C-2 | Checkout with stored customer details, delivery selection, "Add new" address | P2-6 |
| C-3 | Sale created only after successful payment, `@Transactional` throughout | P2-7 |
| C-4 | Razorpay reconciliation | P2-8 |
| Tests | Backend and frontend tests for C-1 to C-4, used in CI | each phase and P2-9 |
| Quality | Microservices audit, logging, load tests | P2-0 and P2-9 |

---

## 4. Fixed decisions

| Topic | Decision |
|---|---|
| Idle logout | **10 minutes** of inactivity, **customers only**. A **"Still there?" prompt at 9 minutes**. No hard maximum session length. No cart persistence work. |
| Payment and session | The idle timer is **paused while a Razorpay payment is in progress** (maximum pause 15 minutes, see P2-4). |
| Custom T-shirt | **Coming-soon page with a notice only.** No upload, no backend, no pricing, no ordering. Details come in a later part. |
| Admin permissions | The `ADMIN` role gets **every permission `SUPERADMIN` has**. Nothing else changes. `WAREHOUSE_HANDLER` is untouched. |
| Colors | Admin enters **hex codes**. The website shows them as **color swatches**. Display only: no color choice at ordering, no stock per color. |
| Failed payments | A failed payment creates **no sale, no stock change and no customer change** in Ficcado-Data. A payment attempt record is kept in the Payment-Gateway database (needed for reconciliation and audit). |
| Slow payments | The user sees a "processing" status. Work continues in the background through RabbitMQ. The user is notified of success or failure. |
| Reconciliation | Runs **every 10 minutes**. See P2-8 for the exact rules. |
| Notifications to customers | **Email** sent by Ficcado-Website-Data (it already sends OTP emails), plus the status shown on the website order-status page. |
| No COD | Online payment only. |
| Infrastructure | **Docker Compose, infrastructure only**, defined in `infra/`. All development runs and all test runs use these containers. |
| Databases | The existing `ficcado_data` database **stays where it is today** (the developer's current PostgreSQL). It is **never moved, dumped, reset or used by tests**. The new `ficcado_website_data` and `ficcado_payment_gateway_data` databases, and every **test database**, live in the Compose PostgreSQL container. |
| Redis | **Two separate Redis instances**: a **session** Redis (`REDIS_SESSION_URL`, policy `noeviction`) and a **cache** Redis (`REDIS_URL`, policy `allkeys-lru`). Cache pressure must never evict sessions. |
| Test databases | Test databases in the Compose PostgreSQL (`ficcado_data_test`, `ficcado_website_data_test`, `ficcado_payment_gateway_data_test`), names from environment variables. In GitHub Actions use service containers with the same image versions. |
| Razorpay in tests | Always mocked. No real Razorpay calls in any test. |

---

## 5. Engineering standards (apply to every new or changed line)

### 5.1 Microservices rules
- Each service owns its database. **No service reads or writes another service's database.** No shared entity classes or shared libraries between services.
- Services talk only through HTTP APIs or RabbitMQ messages.
- Every remote HTTP call has a **connect and read timeout**, a bounded **retry with backoff** (only for idempotent calls), and a **circuit breaker** (Resilience4j).
- All message consumers are **idempotent** and use manual acknowledgement, durable queues, persistent messages, bounded retries with backoff, and a dead-letter queue.
- Services are **stateless** (no per-user data in process memory; sessions live in the session Redis).
- Configuration comes from environment variables. Every service has a health endpoint.

### 5.2 Transactions (`@Transactional`)
- Put `@Transactional` on **service-layer** methods only, never on controllers. Read-only methods use `readOnly = true`.
- Use `rollbackFor = Exception.class` where checked exceptions can occur.
- **Never keep a database transaction open across a remote call** (Razorpay, another service, RabbitMQ).
- Where a database write must be followed by a message, use the **transactional outbox pattern** (write the message to an outbox table in the same transaction, a relay publishes it, consumers are idempotent).
- Multi-step writes (sale, line items, stock, inventory history, customer upsert, sales log) must be **atomic**. A failure at any step leaves no partial rows.
- Use optimistic locking (`@Version`) for status changes, and a pessimistic lock or atomic conditional update for stock.

### 5.3 Concurrency, thread safety and caching
- No mutable shared state in singletons. Use immutable objects or thread-safe structures.
- Every thread pool, HTTP client and connection pool has an explicit, environment-driven size. Never create unbounded executors.
- **Never cache per-user data in a shared cache** (Redis, NGINX or the Next.js data cache). Authenticated responses use `Cache-Control: no-store` and `Vary: Cookie`.
- Product cache entries are evicted when the admin changes an item (P2-2).

### 5.4 Logging
- Structured JSON logs in every backend, with a **correlation id** (`X-Request-Id`, created at NGINX if missing, passed to every downstream call and message, stored in MDC).
- Log levels: ERROR for failures needing attention, WARN for handled anomalies, INFO for business milestones (login, sale created, payment verified, refund issued), DEBUG off by default.
- **Never log**: passwords, OTPs, tokens, cookies, session ids, Razorpay secrets or signatures, full phone numbers or emails. Mask them (for example `ab***@gmail.com`, `******1234`).
- Log each exception **once**, at the boundary that handles it, with the stack trace and the correlation id. Error messages must say what failed, for which entity id, and why.

### 5.5 Security
- Customer identity always comes from the **validated session**, never from a request body, query string or client-supplied header.
- Validate all input (Bean Validation on DTOs). Return consistent error bodies without stack traces.
- Public responses use DTOs, never entities.

### 5.6 UI rules for every new page or component
- **The website and the CRM frontend have different design rules and patterns. Never mix them.** Every UI change must follow the rules of the frontend it belongs to, learned from that frontend's own code (see the UI study in P2-0).
- Reuse that frontend's existing design tokens, components, spacing, typography, layout, form, modal, button and state (loading, empty, error) patterns, file structure and naming. Look at several existing pages first. Do not introduce new colors, fonts, spacing values, libraries or layout patterns, and do not write one-off styles when an existing component or token does the job.
- A new page or component must look and behave as if the original author built it.
- Every new website page must work on all device profiles used by the checker and **pass `device:checker`**. Add each new route to the checker's route list if it keeps an explicit list. The CRM frontend must stay usable at the screen sizes its existing pages support.
- For every new or changed screen, save screenshots at a desktop and a mobile width to `docs/part2-screenshots/` (website and CRM in separate folders) and mention them in `docs/PART2_REPORT.md`.
- The website's lint, types check, brand check and build must pass. Same for the CRM frontend where it is changed.

---

## 6. Test standards

- **Backend:** JUnit 5, Mockito, Spring Boot Test, MockMvc. Integration tests use a PostgreSQL test database from environment variables (`TEST_DB_URL`, `TEST_DB_USER`, `TEST_DB_PASSWORD`). Tests needing Redis or RabbitMQ read `REDIS_URL`, `REDIS_SESSION_URL` or `RABBITMQ_URL`. **Run all integration tests against the Docker Compose services.** A test may be skipped only when its variable is absent, with the reason printed, and **skipped tests do not count as passing**: before reporting any phase done, the Compose stack must be up and the full suite must run with zero skipped. Tests must never connect to the real `ficcado_data` database.
- **Frontend:** use the test framework already present in each project *(discover)*. If an end-to-end tool such as Playwright is already a dependency, use it for browser flows.
- **Razorpay:** wrap it behind an interface and mock the interface (and use WireMock for HTTP-level tests). Never call the real API.
- Every feature needs: happy path, validation errors, authorization and **user isolation** (user A can never see or change user B's data), failure paths, idempotency (the same request twice), and concurrency where stated.
- Run the full suite of every touched module before and after each phase. Record results in `docs/PART2_REPORT.md`.
- Generate a JaCoCo report for each backend. Aim for at least 80% line coverage on classes created or changed in Part 2 and report the actual numbers. This is a target, not a pipeline gate.
- **CI:** update `.github/workflows/ci-cd.yaml` so all new backend and frontend tests run in the existing pipeline, with PostgreSQL, two Redis and RabbitMQ service containers using the **same pinned image versions** as `infra/docker-compose.yml`. Deploy stays blocked unless everything passes. Keep all existing gates.

---

## 7. Phases

Execute in order. Each phase ends with a pause.

### P2-0A: Docker Compose infrastructure (do this first)

The developer is installing Docker Desktop. From now on, infrastructure runs in Docker and every run and test uses it.

1. Run `docker --version` and `docker compose version`. If either fails, stop and tell the developer.
2. Create an `infra/` folder with:
   - `docker-compose.yml` (Compose v2 syntax) defining:
     - **postgres** (name `ficcado-postgres`): host port **5433** (the developer's existing PostgreSQL may use 5432, so avoid a clash), named volume, health check. Use the **same major version as the PostgreSQL that holds `ficcado_data`**: ask the developer for that version if the code does not show it. An init script creates the databases `ficcado_website_data`, `ficcado_payment_gateway_data` and the three `*_test` databases above, with a separate login per service (least privilege).
     - **redis-session** (host port **6380**, `maxmemory-policy noeviction`, password from env) and **redis-cache** (host port **6379**, `maxmemory-policy allkeys-lru`, memory limit, password from env).
     - **rabbitmq** with the management UI image (host ports 5672 and 15672), user and password from env, health check.
     - **gateway**: the official NGINX image running the `gateway/` configuration from Part 1, published on host port **8000**, reaching the services that run on the host through `host.docker.internal` (add `extra_hosts: host.docker.internal:host-gateway` for Linux). Upstream hosts and ports come from environment variables (use the image's template and `envsubst` support). `/api/internal/**` stays blocked from outside. Update the gateway config for this and keep all Part 1 behavior.
     - **prometheus** and **grafana** (from the Part 1 monitoring files) under a Compose **profile named `monitoring`**, started only when asked.
   - `.env.example` listing every variable (no real values), and a `.gitignore` entry so `infra/.env` is never committed.
   - `postgres/init/01-create-databases.sh` and an `infra/.gitattributes` forcing LF line endings for `*.sh` (the developer is on Windows).
3. Rules for the Compose file: **pin every image to an explicit version tag (never `latest`)**; bind published ports to `127.0.0.1`; no secrets in the file (use `${VARIABLE}` from `infra/.env`); named volumes; `restart: unless-stopped`; health checks on every service; `depends_on` with health conditions where needed.
4. Update `docs/LOCAL_SETUP.md` (replace any native-install instructions for Redis, RabbitMQ and NGINX): how to create `infra/.env`, start (`docker compose -f infra/docker-compose.yml up -d`), check (`docker compose ps`), stop, view logs, and reset one service, plus the full variable list for each application service (`REDIS_URL`, `REDIS_SESSION_URL`, `RABBITMQ_URL`, database URLs and the test database variables) and the ports table. Explain which parts run in Docker and which run on the host.
5. **Pause here.** Tell the developer to copy `infra/.env.example` to `infra/.env` and choose passwords (simple values are fine for local development only). After they confirm, run `docker compose up -d`, wait until everything is healthy, and record `docker compose ps` output in `docs/PART2_REPORT.md`.
6. Verify connectivity with real commands and record the results: connect to each database, `PING` both Redis instances, open the RabbitMQ management API, and call the gateway health route (it may return an upstream error if the apps are not running yet; say which).
7. Confirm the **session Redis rejects evictions** (`noeviction`) and the **cache Redis evicts** (`allkeys-lru`) by reading the running configuration.

### P2-0: Baseline, discovery and audit (report only)

**No application code changes in this phase.** Only the Docker Compose files from P2-0A and reports may be created.

1. Read: `docs/Ficcadocompleterebuild.md`, the resolved log in `AGENT_QUESTIONS.md`, `docs/PHASE_REPORT.md` (or `PHASE_REPORT.md`), `docs/FICCADO_DATA_MAP.md`, `docs/LOCAL_SETUP.md`, `ci-cd.yaml`.
2. Build and run the full tests of every module. Record the **baseline** (pass, fail, skipped) in `docs/PART2_REPORT.md`.
3. Locate and record the real paths and names of everything marked *(discover)* in this file, including at least:
   - customer sign-up, login, logout and `/me` endpoints and the customer JWT filter
   - how the website currently handles wishlist, login state and session, and what makes users get logged out on refresh or navigation
   - the checkout page and where courier options and delivery charges come from
   - the current state of Ficcado-Payment-Gateway-Data and any Razorpay code
   - the sales `remarks` column and how the CRM sales screen shows it
   - the activity log message builder that produces "Inventory adjusted ... from 2 → 5 — "
   - every place an admin role is checked (`@PreAuthorize`, security config, CRM frontend route guards)
   - all dummy or fake data files and fallbacks in the website, including in `public/`
   - the device-checker route list and the test framework of each project
   - whether `SaleService.createSale` and `InventoryService.deductFromInventory` are `@Transactional` and safe under concurrent calls
4. **UI study (required before any UI work).** Read both frontends and write **`docs/PART2_UI_GUIDE.md`** with **two separate sections, one for the website and one for the CRM frontend**. For each, describe from the actual code:
   - styling approach (for example Tailwind v4 usage, global CSS, tokens and theme variables) and the exact colors, fonts, spacing and radius values in use
   - layout structure (shell, header, navigation, footer or sidebar, page containers, grid and breakpoints)
   - the reusable components that exist (buttons, inputs, forms, modals, cards, badges, tables, toasts, loaders, empty and error states) and how they are used
   - file and folder structure, naming conventions, routing and data-fetching patterns, form validation patterns
   - how existing pages handle loading, empty, error and unauthorized states
   - existing test patterns and tools
   - the differences between the two frontends
   Every statement must cite example files. Do not describe patterns you did not see. All later UI work follows this guide; if a needed pattern does not exist, ask before inventing one.
5. Write **`docs/PART2_AUDIT.md`** (report only). Include:
   - A **microservices compliance checklist** with PASS, FAIL or UNKNOWN and evidence (file and line) for each: database per service; no cross-database access; no shared code between services; communication only through APIs or messages; timeouts, retries and circuit breakers on remote calls; idempotent consumers; stateless services; configuration from environment; health endpoints; correlation ids; logging quality and masking; gateway blocking `/api/internal/**`; CRM frontend only talking to Ficcado-Data.
   - A **code quality and best-practice review**: transaction boundaries, N+1 queries, missing indexes, connection pool and thread settings, caching correctness, exception handling, validation, security headers, test coverage gaps.
   - A **scalability and concurrency review** for roughly 10,000 simultaneous users: bottlenecks, unsafe shared state, race conditions (especially stock deduction and invoice number generation), and session handling.
   - For each finding: id, area, severity, evidence, impact, recommended fix, and a label **[REQ]** (will be fixed by a Part 2 phase, name the phase) or **[OUT]** (outside Part 2, needs approval).
6. **GATE 1: stop.** Do not start P2-1. The developer will review the audit and mark [OUT] findings `APPROVED` or `REJECTED` in the file. Only approved findings are ever implemented (P2-10).

### P2-1: CRM fixes (admin permissions, activity log, sale source)

**1A. Admin permissions (A-3)**
- **Diagnose first.** Reproduce with a test: create a new `ADMIN` through the admin panel flow, log in as that admin, call the admin-panel endpoints, and capture the exact cause of "Access Denied: You do not have sufficient permissions to perform this action." Check both the role checks and the way the role is stored and granted (for example a role-name or prefix mismatch). Write the root cause in `docs/PART2_REPORT.md`.
- Fix so that `ADMIN` is allowed **everywhere `SUPERADMIN` is allowed**: backend authorization rules and CRM frontend route guards, menus and buttons. Make the smallest edit per location.
- Do not change `WAREHOUSE_HANDLER`. Do not add or remove any other permission.
- Log each edit in `docs/FICCADO_DATA_CHANGELOG.md` (file, method, reason) and add a matching note for the CRM frontend files changed.
- **Tests:**
  - A reflection-based test scans every controller method and fails if any authorization expression allows `SUPERADMIN` but not `ADMIN`.
  - MockMvc tests: a freshly created `ADMIN` can call every admin-panel endpoint that `SUPERADMIN` can.
  - `WAREHOUSE_HANDLER` is denied exactly where it was denied before.
  - CRM frontend tests: the admin panel section and its menu items render for `ADMIN`.

**1B. Activity log (B-2)**
- Fix the message builder so no empty placeholder is printed. When the reason or note is empty or blank, omit it **and its separator**. Example: `Inventory adjusted: ETERNITY-BLACK size L from 2 → 5`. When a reason exists, show it after the separator.
- Apply the same fix to any other activity message built with the same empty-placeholder pattern. Change nothing else in the activity log.
- **Tests:** null, empty, blank and non-empty reasons for every message type you touched.

**1C. Sale source mark for CRM sales (B-3, CRM part)**
- Verify the `remarks` column exists on sales and that the CRM sales table displays it. If it does not exist, **stop and ask**. Do not create a column.
- When a sale is created from the CRM, set remarks to `CRM SALE`. If the admin also typed remarks, store `CRM SALE | <admin text>`. Do not change existing sales (no backfill).
- The website source mark is added in P2-7.
- **Tests:** CRM-created sale stores the mark, with and without admin text; an update of the sale does not remove the mark.

### P2-2: Item colors, description and tags (B-1, B-4)

**Backend (Ficcado-Data)**
- Flyway migration (additive only):
  - `items.description` as `TEXT`, nullable, plain text, maximum 2000 characters.
  - new table `item_colors` (`id`, `item_id` foreign key, `color_hex`, `display_order`), unique on (`item_id`, `color_hex`).
  - new table `item_tags` (`id`, `item_id` foreign key, `tag`), unique on (`item_id`, lower-case `tag`).
- Rules: color is exactly `#RRGGBB`, stored uppercase, maximum 12 per item. Tags are free text entered by the admin, trimmed, 2 to 30 characters, maximum 10 per item, no duplicates ignoring case, stored as entered.
- Extend the existing item create and update endpoints and DTOs with **optional** `description`, `colors` and `tags` fields so current CRM behavior is unchanged when they are absent.
- Add the same fields to the **public product DTOs** from Part 1 (`colors`, `description`, `tags`). Description is returned as plain text.
- **Evict the product cache** whenever an item (including colors, description, tags or status) changes.

**CRM frontend**
- In the item form add: color code inputs (add and remove several, hex validation with a clear message), a plain-text description field, and a tags input (type text, add, remove). Show them when editing an existing item. Match the CRM's existing form style.

**Website**
- Product detail page: show **color swatches** (circles filled with the hex color, with an accessible label), the description (escaped, line breaks preserved, never rendered as HTML), and tags.
- Product cards: show tags (for example as small badges) in the existing design style. No filtering by tag.
- Hide any of these blocks cleanly when the item has no value for them.

**Tests**
- Backend: validation (bad hex, too many, bad tag lengths, duplicates), save and update, public DTO content, cache eviction after update, migration applies on an empty and on an existing database.
- CRM frontend: form validation and payload.
- Website: swatches, description and tags render; description with HTML characters is escaped; empty states.
- `device:checker` passes.

### P2-3: Remove dummy data and add the Custom T-shirt notice page

**3A. Remove dummy data (A-4)**
- Find every dummy or fake data file and fallback in the website: sample products, sales, customers or accounts in `public/`, `src/`, fixtures imported by production code, and any "if the API returns nothing, use sample data" logic.
- Delete them and the code that uses them. Brand assets (logos, banners, real design images) are **not** dummy data and stay. If a file is unclear, list it in `AGENT_QUESTIONS.md` and do not delete it.
- Behavior after the change: an empty catalog shows a proper **empty state** message; a backend error shows a proper **error state**. Never show fake products, orders, customers or accounts in any situation. Test fixtures may exist only inside test directories.
- **Tests:** API returns an empty list (empty state shown); API fails (error state shown); a repository-level check that fails if production code imports a fixture or sample-data file.

**3B. Custom T-shirt (A-new): coming-soon page only**
- Add one page for the feature, in the website's existing design. It states clearly that **"Design your own T-shirt"** is **coming soon** and gives a short notice: customers will soon be able to submit their own design, the Ficcado team will print it and deliver the T-shirt. Do not add upload, forms, pricing, ordering or any backend.
- Add a link to it in the existing navigation or footer using the existing link style.
- Add the route to the device-checker list. Match page title and metadata style of other pages.
- **Tests:** the page renders the notice, the link is present and works, no form or upload element exists, `device:checker` passes.

### P2-4: Session management (A-2)

**4A. Diagnose first**
- Reproduce the bug "logged out on refresh or when navigating pages" with an automated test where possible. Record the **actual root cause** in `docs/PART2_REPORT.md` before fixing (look at: cookie set or not through the gateway and Next.js, cookie attributes, `SameSite`, `Secure` on local HTTP, CORS credentials, session restore on page load, token kept only in memory, navigation calling an endpoint that returns 401). Fix the real cause. Do not guess.

**4B. Target design (customers only)**
- **Server-side session in the dedicated session Redis (`REDIS_SESSION_URL`)**, owned by Ficcado-Data: key per session id holding customer id, created time and last activity. The session id is 256 bits from `SecureRandom`, created **at login** (a new one every login, never reused), deleted at logout and on password change.
- **Idle timeout: 600 seconds, sliding.** Every authenticated, user-initiated request refreshes the timer with one atomic Redis operation. Requests sent with header `X-Ficcado-Background: 1` (for example status polling) are validated but do **not** refresh the timer.
- **Cookie:** the customer JWT (contains session id, customer id, audience for customers, signed with the customer signing key, long `exp` of 30 days as a backstop) in an `HttpOnly`, `SameSite=Lax`, `Path=/` **session cookie**, `Secure` when served over HTTPS (configurable for local HTTP). Redis is the authority on whether the session is still valid.
- **Endpoints (Ficcado-Data, new):** `GET /api/customer/session` (remaining seconds, does not refresh), `POST /api/customer/session/touch` (keep-alive), and internal `GET /api/internal/session/validate` for the gateway. Use the existing login and logout endpoints and change them to create and delete the Redis session.
- **Gateway:** NGINX uses `auth_request` against the internal validate endpoint for all customer-protected routes (customer, wishlist and payment routes, except the Razorpay webhook). On success it forwards the customer id in `X-Customer-Id`. NGINX **removes any client-supplied `X-Customer-Id`** first and adds the shared-secret gateway header. Downstream services accept customer identity **only** from that header when the gateway secret is present. Ficcado-Data also validates the cookie itself for its own customer endpoints.
- **Session Redis unavailable:** authenticated endpoints fail closed with HTTP 503 and a clear code (never treat the user as logged in). The website shows a friendly "try again" message and does not loop-logout. Public product browsing keeps working.
- **Payment pause:** when a payment attempt is created (P2-7) the session is marked paused for up to **15 minutes**; the session counts as active while paused. The pause ends when the attempt reaches a final status or after 15 minutes, whichever comes first. If the user leaves during a slow payment, the payment still completes in the background and the user is notified by email.
- **No cross-user leakage:** authenticated responses use `Cache-Control: no-store` and `Vary: Cookie`. No authenticated fetch is cached by Next.js. No per-user state in server module variables.

**4C. Website behavior**
- On page load and on every navigation, restore the logged-in state from the server session (`GET /api/customer/session`). A refresh or page change must **not** log the user out while the session is valid.
- **Idle detection:** user activity (click, key, scroll, touch, pointer move throttled) resets a client timer. At **9 minutes** without activity show a **"Still there?"** prompt in the existing modal style with **"Stay logged in"** (calls the touch endpoint) and **"Log out"**. At 10 minutes, or when the server says the session expired, log the user out, clear client state, and go to the login page with the message "You were logged out due to inactivity."
- **Multiple tabs:** activity in one tab counts for all tabs, and logout in one tab logs out all tabs (use `BroadcastChannel` or a `storage` event).
- The timer is paused while the Razorpay payment window is open or a payment is processing.

**4D. Tests**
- Backend: login creates a session; the session expires after 600 seconds idle (use a short configurable TTL in tests); activity extends it; background header does not extend it; logout and password change delete it; a reused or tampered cookie is rejected; paused session survives and then expires; session Redis down returns 503 and never grants access.
- **Isolation and concurrency:** at least 200 concurrent logins for different customers, each immediately calling the session endpoint and asserting it sees **only its own** customer id; no session id is ever shared; a customer id placed in a request body or header is ignored.
- Gateway check script (documented, runnable with a local NGINX): a forged `X-Customer-Id` is stripped, `/api/internal/**` is blocked, unauthenticated customer routes return 401.
- Frontend: refresh and navigation keep the user logged in; 9-minute prompt; 10-minute logout; "Stay logged in" extends; multi-tab sync; timer paused during payment (use fake timers).
- `device:checker` passes.

### P2-5: Wishlist (A-1, C-1)

**Backend (Ficcado-Website-Data, owns the wishlist)**
- Flyway migration: table `wishlist_items` (`id`, `customer_id`, `item_id`, `created_at`), **unique** on (`customer_id`, `item_id`), index on `customer_id`. **No foreign key to anything in Ficcado-Data** (different database). Store ids only.
- Endpoints (all customer-protected, identity from the gateway session header only): `GET /api/wishlist` (list of item ids with added time), `PUT /api/wishlist/{itemId}` (idempotent add), `DELETE /api/wishlist/{itemId}` (idempotent remove). Maximum 200 items per customer.
- Website-Data does **not** call Ficcado-Data. To show a wishlist, the website gets the ids from Website-Data and the product details from the Ficcado-Data public products endpoint (add an additive **batch lookup by ids**, active items only, if one does not exist). Items that are inactive or deleted are simply not shown.

**Website**
- **Guest clicks the wishlist button:** show a prompt in the existing modal style: "Log in or create an account to save items to your wishlist" with **"Log in"** and **"Sign up"** buttons that go to the existing pages. Remember the item and the page the user came from (store only a numeric item id and a same-site relative path, and validate both on return to prevent open redirects). After login or sign-up, return to that page and **add the item automatically**.
- **Logged-in users:** the database is the only source of truth. Stop using any browser-stored wishlist for logged-in users. Do not migrate old browser-stored data.
- Wishlist page and heart states reflect server data. Handle errors without losing UI state.

**Tests**
- Backend: add, add twice (one row), remove, remove missing, list; **customer A never sees or deletes customer B's items** (including by guessing ids and by sending a forged customer id); cap enforced; request without gateway identity is rejected; concurrent duplicate adds produce one row.
- Frontend: guest prompt and both buttons; automatic add after login; logged-in add and remove call the API; data shown belongs to the signed-in user (switch users in test and confirm the lists differ); inactive items hidden; error states.
- `device:checker` passes.

### P2-6: Checkout details and addresses (C-2)

- Checkout requires a valid customer session. The checkout page **loads the customer's name, phone, email and saved addresses from Ficcado-Data** (new or existing customer endpoints that read the signed-in customer only). Those values are displayed, not editable here.
- The user **selects a saved address**; the selection is used for **that order only**.
- **"Add new" address:** an inline form that saves a new address to the customer's account in Ficcado-Data through an additive customer endpoint (customer-protected, identity from session), then shows it in the list so it can be chosen now and in future orders. The existing address entity has a single `address` text and a default flag: **do not change that schema.** If the checkout needs structured fields, combine them into the single address text in one fixed format and note it in the report. Add the same validation limits the CRM uses for addresses *(discover)*.
- The user selects the courier option using the **existing** courier and delivery charge mechanism *(discover)*. Delivery charge is always computed on the server.
- Wishlist items can be moved into the existing checkout path. Use the existing cart or buy-now mechanism *(discover)*; do not create a new one. If it is unclear how wishlist leads to checkout, stop and ask.
- Add an additive internal quote endpoint in Ficcado-Data used by the payment service: it takes item references, sizes and quantities, and returns **server-computed** unit prices, line totals, subtotal and availability from the database. Never trust client prices.
- **Tests:**
  - Backend: customer endpoints return only the signed-in customer's data; adding an address saves it to the right customer; address limits and validation; another customer's address id cannot be used; quote ignores client-supplied prices and rejects inactive or unknown items.
  - Frontend: stored details are displayed from the API; address selection changes the payload; "Add new" saves, appears, and is selectable; validation errors; unauthenticated users are redirected to login.
  - `device:checker` passes.

### P2-7: Sale only after successful payment (C-3, B-3 website part)

**Rule: a sale exists only when a payment was actually received.** A failed or abandoned payment creates no sale, no stock change and no customer change in Ficcado-Data.

Read what Part 1 Phase 6 built first. Where it differs from the flow below, refactor it to this flow.

**Flow**
1. The website calls `POST /api/payments/orders` (payment service, customer-protected) with item references, sizes, quantities, the chosen address id and the courier option.
2. Payment-Gateway-Data fetches the customer details and chosen address from Ficcado-Data through an internal endpoint, gets the **server-computed quote**, adds the server-computed delivery charge, and creates the **Razorpay order** with that amount (integer paise computed with `BigDecimal`). It stores a **payment attempt** in its own database with a **snapshot** of the order (customer id, address text, lines, totals, courier) and status `CREATED`. It marks the customer session as paused (P2-4).
3. The browser opens the Razorpay window. On success the website sends the Razorpay order id, payment id and signature to `POST /api/payments/verify`. The service **verifies the signature**, moves the attempt to `PROCESSING`, writes an outbox message, and answers `202 Accepted` quickly.
4. A RabbitMQ consumer picks up the message and calls the internal Ficcado-Data endpoint `POST /api/internal/website-orders`. That endpoint, in **one `@Transactional` operation**: finds an existing sale by `transactionId` (idempotency: if found, return it), re-computes the quote, compares the total with the amount actually paid, then calls the existing `SaleService.createSale(sale, null)` so stock, inventory history, customer upsert, sale lines and sales log all happen as today. It sets remarks to **`WEBSITE SALE`**. The sale is built from the **stored** customer name, phone, email and the chosen address, never from client values.
5. On success the attempt becomes `COMPLETED` (with sale id and invoice number) and a success notification is queued. The website shows the final status from `GET /api/payments/{attemptId}/status` (customer can read only their own attempts). Status polling uses the background header.
6. **Razorpay webhooks** (`payment.captured`, `payment.failed`, `refund.processed`) are accepted on one public route. Verify the webhook signature on the **raw body**, store processed event ids to ignore duplicates, and route into the same state machine. The webhook is an additional trigger, never the only one.
7. **Payment failed** (callback or webhook): the attempt becomes `FAILED`, a failure notification is queued, the customer is told clearly on the website, and **nothing** is written to Ficcado-Data.

**State machine** (enforce allowed transitions only; use `@Version`; log and reject illegal transitions)
`CREATED → PROCESSING → COMPLETED`; `CREATED → FAILED`; `PROCESSING → REFUND_PENDING → REFUNDED`; `CREATED → EXPIRED`.

**Failure classification when creating the sale** (needed by P2-8)
- **Business failure** (item not found or inactive, not enough stock, total differs from amount paid): the sale is not created and the payment must be refunded (see P2-8).
- **Transient failure** (timeout, connection error, 5xx): keep the attempt in `PROCESSING` and retry through the queue's bounded retries, then leave it to reconciliation.

**Notifications:** Payment-Gateway-Data publishes `order-status` messages to RabbitMQ. Ficcado-Website-Data consumes them and sends the customer an email (success with invoice number, failure, refund with the request to try placing the order again) and records it in its notifications table. The consumer is idempotent.

**Concurrency safety:** verify `InventoryService.deductFromInventory` is atomic under concurrent calls (test: many parallel sales of the last unit, exactly one succeeds, stock never negative). If it is not safe, you are **pre-approved to fix only that**, using a pessimistic lock or an atomic conditional update, and you must log it in the changelog. If `createSale` is not `@Transactional`, adding it is pre-approved.

**Tests**
- Backend (payment service): quote and amount calculation (paise, rounding); signature verification (valid, invalid, tampered); duplicate verify and duplicate webhook produce one effect; state machine allowed and illegal transitions; failed payment creates no call to Ficcado-Data; outbox message is written in the same transaction as the status change; consumer retries and dead-letter behavior; a customer cannot read another customer's attempt.
- Backend (Ficcado-Data): the website order endpoint creates exactly one sale for one `transactionId` even under concurrent duplicate calls; stock and inventory history are updated; remarks is `WEBSITE SALE`; business failures create nothing and roll back fully (no partial rows, stock unchanged); price or amount mismatch is rejected; identity comes from the internal call, not a client value.
- Backend (Website-Data): notification consumer sends the right email per status, once per message.
- Frontend: processing state and polling; success page; failure message and no order shown; session timer paused during payment; Razorpay mocked.
- `device:checker` passes.

### P2-8: Reconciliation (C-4)

A scheduled job in **Ficcado-Payment-Gateway-Data**.

- **Schedule:** every **10 minutes** (Spring `@Scheduled`), guarded by **ShedLock** (JDBC lock table in the payment database) so only one instance runs at a time.
- **Which attempts:** attempts not in a final status, older than 5 minutes and younger than 48 hours. Process in batches of 100 with a timeout on every Razorpay call and a circuit breaker.
- **For each attempt**, ask Razorpay for the order's payments:
  1. **Payment captured** and the attempt has no sale: queue the sale creation (the same idempotent path as P2-7). If it succeeds, mark `COMPLETED` and notify the customer. This covers orders that were "processing" and completed later.
  2. **Sale creation fails with a business failure**, or transient failures continue for **6 reconciliation runs** (about one hour): **start a refund** of the full captured amount through the Razorpay refund API, mark `REFUND_PENDING`, and notify the customer that the payment will be refunded and asking them to **try placing the order again**. Store the refund id so the refund is **never created twice**.
  3. **All payments failed:** mark `FAILED` and notify the customer.
  4. **No payment and older than 48 hours:** mark `EXPIRED` (no notification).
  5. **Refund processed** (from Razorpay or the webhook): mark `REFUNDED`.
- Razorpay orders are created with **automatic capture** so a successful payment is captured without extra steps. Confirm this setting when asking for credentials (P2-11).
- Every run logs a summary (counts per outcome, duration) and updates Micrometer counters. A failure on one attempt never stops the rest of the batch.
- **Tests:** each branch above with a mocked Razorpay; business and transient failures; refund created once even if the job runs twice or concurrently; lock prevents two simultaneous runs; batch continues after one attempt fails; 48-hour expiry; sale creation retried until success; customer notified exactly once per outcome; the full end-to-end scenario "user paid, browser closed, webhook lost, reconciliation completes the sale".

### P2-9: Load tests, logging check, CI and compliance verification

1. **Load tests:** write **k6** scripts in a `loadtests/` folder (login and session, product listing and detail, wishlist add and list, checkout quote and order creation against the **mocked** Razorpay profile). Use thresholds of p95 under 800 ms and error rate under 1%. Run them at the largest scale this machine allows and record the numbers. **Judge pass or fail from the measured results and state the real limit honestly.** Do not claim a capacity that was not measured. If k6 is not installed, ask the developer to install it.
2. **Logging verification:** produce one example log line per service showing the correlation id, check that secrets and personal data are masked (add a test that scans captured logs for tokens, passwords, OTPs, full emails and phones), and check that one failed payment can be traced end to end by its correlation id.
3. **CI:** update `.github/workflows/ci-cd.yaml` as described in section 6. Keep every existing gate.
4. **Compliance re-check:** update `docs/PART2_AUDIT.md` with a final pass over the microservices checklist (section 7, P2-0) now that Part 2 is implemented, with evidence.

### P2-10: Approved audit fixes only

Implement only the [OUT] findings the developer marked `APPROVED` in `docs/PART2_AUDIT.md`, each with tests, and nothing marked `REJECTED` or left unmarked. If there are none, write "none" in the report.

### P2-11: Handoff (ask the developer for credentials)

1. **Ask the developer for every credential, key, secret and setting the application needs that is still missing, not only Razorpay.**
   - Scan **all** services and both frontends: every `.env.example`, `application.yaml` / `application.properties`, CI workflow secret reference, and every place in code that reads an environment variable.
   - Write the complete list to **`docs/REQUIRED_CREDENTIALS.md`** and send it in your message. For each item give: variable name, service that uses it, what it is for, expected format (never a real value), whether it is already provided or **missing**, and where the developer can get it.
   - The list must cover at least (include only what the code really uses): Razorpay **test-mode** Key Id, Key Secret and webhook secret (keys must start with `rzp_test_`; **refuse live keys**); whether Razorpay payment capture is automatic in the account; SMTP host, port, user and password for emails; the customer JWT signing key and the admin JWT secret; `INTERNAL_API_KEY` and the gateway shared secret; database URLs, users and passwords for all three databases and the test databases; Redis and RabbitMQ connection details; Cloudflare R2 / storage credentials, bucket and public URL; allowed CORS origins; the API base URLs the frontends use; any GitHub Actions secrets the pipeline needs.
   - **Never invent, guess or generate real secrets for the developer, and never commit any.** You may explain how a value can be generated, and the developer decides.
   - Explain how the Razorpay webhook will reach the local machine (Razorpay cannot call `localhost`; a tunnel is needed, otherwise reconciliation is the only path).
   - Confirm the Compose stack from P2-0A is running (`docker compose ps`), and give the exact variable names to fill in each service's `.env`. Include the Compose passwords (PostgreSQL, Redis, RabbitMQ) the developer chose in `infra/.env`.
2. Update `docs/LOCAL_SETUP.md` with every new variable and how to start each component.
3. Write **`docs/MANUAL_TEST_CHECKLIST.md`**, with numbered steps for the developer to test by hand in **both frontends**: every Part 2 feature, including expected results (admin permissions, activity log text, CRM SALE and WEBSITE SALE marks, colors, description and tags, wishlist for guest and logged-in users, session refresh and navigation, 9-minute prompt and 10-minute logout, checkout and "Add new" address, successful payment, failed payment, slow payment with reconciliation, refund, the custom T-shirt notice page, and the empty and error states).
4. Final `docs/PART2_REPORT.md`: per-requirement evidence table, test counts and results for each module, coverage numbers, load test numbers, files changed, dependencies added, open questions.

---

## 8. Definition of done

- [ ] Every requirement in section 3 is implemented exactly as written, with evidence in `docs/PART2_REPORT.md`
- [ ] Nothing outside this file was changed (verified by reviewing the full diff)
- [ ] All new and existing tests pass in every touched module and in CI; no test was skipped, disabled or weakened
- [ ] `device:checker`, brand check, types check, lint and build pass for the website, and lint and build for the CRM frontend
- [ ] Sale is created only after verified successful payment; failed payments create no sale or stock change
- [ ] Reconciliation runs every 10 minutes, is lock-protected and idempotent
- [ ] Customer sessions: 10-minute sliding idle logout, 9-minute prompt, survive refresh and navigation, no cross-user leakage
- [ ] Logs are structured, correlated and free of secrets and personal data
- [ ] `docs/PART2_AUDIT.md`, `docs/PART2_REPORT.md`, `docs/MANUAL_TEST_CHECKLIST.md`, `docs/LOCAL_SETUP.md` and `docs/FICCADO_DATA_CHANGELOG.md` are up to date
- [ ] Credentials requested from the developer; no secrets in the repo
- [ ] Zero occurrences of the wrong brand spelling

---

## 9. Explicitly out of scope (do not build)

- Custom T-shirt upload, design tools, pricing or ordering
- Cash on delivery
- Cart persistence across logout, a maximum session length, "remember me"
- Idle timeout for CRM admins
- Color choice at ordering or stock per color, tag filtering on the website
- Wishlist migration from browser storage
- Dockerfiles for application services, Kubernetes, hosting and deployment of backends
- Automatic refunds outside the rules in P2-8
- Any change not listed in this file
