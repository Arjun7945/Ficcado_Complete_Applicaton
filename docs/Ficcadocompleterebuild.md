# FiccadoCompleteRebuild.md

> **Brand spelling: always `Ficcado` (double C).** Never write "Ficado" in code, config, docs, comments, UI text, commit messages or file names. The existing brand-check `.mjs` file in the website frontend enforces this; it must pass.

---

## Purpose

Migrate the **Ficcado website** from a spreadsheet-driven setup to a proper **microservices architecture** with real backends and databases.

The Ficcado CRM and its backend (**Ficcado-Data**) are already complete. The website must now show the same product data the CRM manages, read from the same main database through Ficcado-Data, instead of from a spreadsheet.

Execute the phases **strictly in order**. Do not start a phase until the previous one is complete and verified.

---

## 1. Repository, branches and workspace layout

**Repository:** `https://github.com/Arjun7945/Ficcado_Complete_Applicaton.git`

| Branch | Contents |
|---|---|
| `fic/crm` | Completed CRM code (frontend and Ficcado-Data backend) |
| `fic/website` | Existing Ficcado website code (Next.js, spreadsheet-based) |
| `fic/completeService` | **The only branch to work on.** Already created, cloned and checked out. |

**All work happens on `fic/completeService` only.** Never commit to, push to, or modify `fic/crm` or `fic/website`; treat them as read-only sources.

### Known CRM paths (after import into `fic/completeService`)
- **Ficcado-Data backend** (the CRM backend, Spring Boot, main database): `crm/backend/ficcado_crm_backend`
- **Ficcado CRM frontend**: `crm/ficcado_crm_app`

Everywhere this document says "Ficcado-Data" or "CRM backend" it means `crm/backend/ficcado_crm_backend`. Everywhere it says "CRM frontend" it means `crm/ficcado_crm_app`.

### Website
The website code lives on `fic/website`. Its folder name is not given: discover it, then import it into a top-level `website/` folder on `fic/completeService`.

### Target layout on `fic/completeService`
```
crm/
  backend/ficcado_crm_backend/    (Ficcado-Data, imported from fic/crm)
  ficcado_crm_app/                (CRM frontend, imported from fic/crm)
website/                          (imported from fic/website)
ficcado_website_data/             (new, Phase 2)
ficcado_payment_gateway_data/     (new, Phase 6)
gateway/                          (new, Phase 3)
docs/
  Ficcadocompleterebuild.md       (this file)
.github/workflows/ci-cd.yaml
```

### Step 0.0: Import the code (do this before Phase 0)
1. Confirm you are on `fic/completeService` (`git branch --show-current`) and the working tree is clean.
2. Fetch all remote branches (`git fetch origin`).
3. Bring the CRM code in **unchanged**, keeping its `crm/` paths: `git checkout origin/fic/crm -- crm` (if the CRM branch has other root files worth keeping, such as `.gitignore`, ask in `AGENT_QUESTIONS.md`).
4. Bring the website code into `website/`, for example using `git archive origin/fic/website <folder> | tar -x` or a temporary `git worktree`, then move it so it ends up under `website/`. Do not overwrite anything under `crm/`.
5. Resolve any root-level file conflicts (`.gitignore`, `README`, workflows) by merging them sensibly, never by deleting the CRM's content.
6. Verify the CRM files are byte-identical to `fic/crm` (`git diff origin/fic/crm -- crm` must be empty).
7. Commit as a single "Import CRM and website code" commit. Do not push `fic/crm` or `fic/website`.
8. Only then start Phase 0.

---

## 2. Protection rules (read carefully)

| Item | Rule |
|---|---|
| **Ficcado CRM frontend** (`crm/ficcado_crm_app`) | **NEVER modify.** No edits, no formatting changes, no dependency bumps. Read only. |
| **Ficcado-Data database schema** | **NO schema changes.** No new columns, tables or entity field changes. In particular, **do not add a `payment_status` column** to Sales. Existing columns are sufficient. |
| **Ficcado-Data backend code** (`crm/backend/ficcado_crm_backend`) | **Prefer additive changes**: new controllers, endpoints, services and classes in new files. Editing existing methods or calls is allowed **only if truly necessary**, and must follow the rules below. |
| **Everything else** | Full freedom: website frontend, new backends, gateway, infrastructure, CI/CD, monitoring (but no Docker, see section 3). |

### Rules when touching existing Ficcado-Data code
1. Try an additive solution first. Only edit existing code if no additive option works.
2. Changes must be **minimal and backward compatible**. The CRM must keep working exactly as before.
3. Never change the signature or behavior of an existing endpoint that the CRM uses.
4. Log every edit to existing files in `docs/FICCADO_DATA_CHANGELOG.md` (file, method, reason, why additive was not possible).
5. Run the full existing Ficcado-Data test suite before and after. Nothing may regress.
6. Existing logic for sale creation, stock reduction and inventory updates **must be reused, not reimplemented**.

---

## 3. Target architecture

### Frontends
- **Ficcado-website** (Next.js)
- **Ficcado-crm** (unchanged)

### Backends and databases (all Spring Boot, Java, PostgreSQL)
1. **Ficcado-Data** (existing): main backend and database, shared by the CRM and the website. Holds products, customers, credentials, sales, inventory and more.
2. **Ficcado-Website-Data** (new): holds enquiries, complaints, support emails and notifications. Generates and sends OTP emails.
3. **Ficcado-Payment-Gateway-Data** (new): Razorpay integration. Stores transaction ID, order ID, amounts, customer ID, address IDs and details, and payment details. After a payment, only the resulting status is pushed to Ficcado-Data through its existing sale methods.

### Routing
- **CRM frontend** talks only to Ficcado-Data (unchanged).
- **Website frontend** talks to all three backends, **through the NGINX reverse proxy**.
- **NGINX** acts as the gateway: it receives requests from the website and routes them to the correct backend.

### Infrastructure
- **NGINX**: reverse proxy and gateway
- **RabbitMQ**: message queue between services
- **Redis**: caching
- **JWT**: authentication
- **GitHub Actions**: CI/CD (`ci-cd.yaml`)
- **Prometheus and Grafana**: monitoring
- **Docker, Docker Compose, Kubernetes**: **NOT part of this build.** Containerization is a final pre-deployment step that will be handled later. Docker is not installed on the developer machine. Do not create Dockerfiles, Compose files or Kubernetes manifests, and do not ask about them.

---

## 3A. Fixed local development decisions (do NOT ask about these)

The project is in the **development stage and runs locally**. These are decided:

| Item | Decision |
|---|---|
| Language / backend | **Java + Spring Boot** only |
| Build tool | **Maven only** (no Gradle, ever) |
| Website frontend | **Next.js** only (no other frameworks) |
| Database | **PostgreSQL only**, for all three backends (no H2, MySQL or others, not even for tests, unless an existing Ficcado-Data test setup already uses something else) |
| Ficcado-Data port | **8081** (unchanged, existing default in application.yaml; do not change it) |
| Ficcado-Website-Data port | **8082** |
| Ficcado-Payment-Gateway-Data port | **8083** |
| Databases | Each service has its **own separate PostgreSQL database** (`ficcado_data` is the existing one, plus `ficcado_website_data` and `ficcado_payment_gateway_data`) |
| Running | Directly on the local machine (`mvn spring-boot:run`, `npm run dev`). **No Docker.** |

Payment mode: online (Razorpay) only. No cash on delivery.

Defaults to use without asking: Next.js on `3000`, NGINX gateway on `8000`, PostgreSQL on `5432`, Redis on `6379`, RabbitMQ on `5672`. Put every port, URL and credential in environment variables or `application.properties`, never hard-coded, so they can change later. Read Ficcado-Data's existing DB settings from its own config rather than asking.

---

## 4. Website access rules for Ficcado-Data

Enforce these at the **backend API/gateway level**, not only in the frontend. The website must use a dedicated scope or role. Never give it broad access.

### Read-only
`Item`, `ItemImage`, `ItemSize`, and all other product-related entities needed to display products (details, images, sizes, and so on). Identify the full set from the code.

### Create / write
- **Customer** and **CustomerAddress**: create only, for the sign-up flow.
- `Sales`, `SalesLineItem`, `SalesLog`, `InventoryHistory`
- `Replacement`, `ReplacementNewItem`, `ReplacementOldItem`
- `ReturnRefund`, `ReturnRefundItem`
- `Review`, `ReviewToken`, `RevokedToken`
- Other related entities as found in the code.

### Important
- **Do not reimplement business logic.** The existing sale-creation controller method already creates the sale, reduces stock, and updates inventory. Find the correct controller or service methods and call them with the correct parameters.
- A newly created sale is **returned to the website** in the response.
- A logged-in customer must only be able to read or modify **their own** data (customer record, addresses, orders).
- Any entity not listed above defaults to **no access** for the website until justified in `AGENT_QUESTIONS.md`.

---

## 5. Agent communication rule

- Whenever a decision is unclear, or an assumption could affect architecture, security or data, **write the question to `AGENT_QUESTIONS.md`** in the main folder. Include context, options and your recommended default.
- At the **end of every phase**, write a short summary to `PHASE_REPORT.md`, list any open questions in `AGENT_QUESTIONS.md`, and **pause for confirmation** before starting the next phase.
- Never guess on payment, authentication or data-access decisions.

---

## 6. Phases

### Phase 0: Discovery (no code changes, after Step 0.0 import)
1. Map the workspace: folders, build tools, Spring Boot versions, Next.js version, Java version.
2. In Ficcado-Data, list all entities, repositories, services and controllers. Produce `docs/FICCADO_DATA_MAP.md` covering:
   - Which entities are product-related and which controller methods read them
   - The sale-creation method, its parameters and what it updates
   - Customer creation, customer lookup, password storage and verification
   - Existing JWT, security and CORS configuration
3. In the website frontend, find every spreadsheet-related file, import, env variable, API call and package.
4. Locate the existing device-checker and brand-check `.mjs` files in the website frontend and read what they enforce.
5. Report gaps (for example, a missing endpoint the website will need) in `AGENT_QUESTIONS.md`.

### Phase 1: Remove all spreadsheet logic from the website
1. Delete all spreadsheet connections, logic, helper files, env variables, API routes and unused dependencies (for example Google Sheets packages) from the website frontend.
2. Replace the data layer with a clean **API client layer** (for example `lib/api/`) with typed functions such as `getItems`, `getItemById` and so on. Initially stub them against the planned endpoints.
3. Make sure the site builds. Temporary empty or mock states are acceptable only until Phase 3.
4. Search the whole website repo to confirm no spreadsheet references remain.

### Phase 2: Build Ficcado-Website-Data backend
New Spring Boot service with its own PostgreSQL database `ficcado_website_data`.

Scope (keep it minimal):
- Tables and APIs for: **enquiries**, **complaints** (different types), **support emails**, **notifications**.
- **OTP service**: generate, store (hashed, with expiry and attempt limits), email, and verify OTPs. Use SMTP configuration through environment variables.
- Standard layers: entity, repository, service, controller, DTOs, validation, global exception handling.
- Runs on port **8082**. Unit and integration tests. Actuator and Prometheus metrics. No Dockerfile.
- Do **not** store customer credentials here. Credentials live in Ficcado-Data.

### Phase 3: NGINX reverse proxy / gateway
1. Create the NGINX config in a new `gateway/` folder, written so it works with a plain local NGINX install (no Docker). Upstreams: Ficcado-Data `localhost:8081`, Ficcado-Website-Data `localhost:8082`, Ficcado-Payment-Gateway-Data `localhost:8083`.
2. Route by path prefix to Ficcado-Data, Ficcado-Website-Data and (later) Ficcado-Payment-Gateway-Data.
3. Handle CORS, request size limits, gzip, security headers and rate limiting (especially for OTP and login routes).
4. Do **not** create Docker Compose. Instead write `docs/LOCAL_SETUP.md` explaining how to run each service, the gateway, Redis and RabbitMQ locally, with the ports above. If Redis or RabbitMQ is not running locally, make the code degrade gracefully (for example, cache disabled) and note it in `AGENT_QUESTIONS.md` rather than blocking.
5. Add health checks for each service.

### Phase 4: Connect the website to Ficcado-Data (products)
1. Add any **new** read-only endpoints needed in Ficcado-Data (additive, following the protection rules in section 2). Reuse existing service methods wherever they exist.
2. Update the website to display, from Ficcado-Data: products, product details, images, sizes, and all data previously taken from the spreadsheet.
3. Add Redis caching for product reads where useful, with sensible TTLs and invalidation.
4. Verify product listing, detail pages, images and any filters or search match what the CRM manages.
5. **Complete and verify this phase fully before moving on.** Everything about Ficcado-Data to website connectivity must be done and confirmed here first.

### Phase 5: Authentication (sign-up, login, OTP, JWT)
Customers identify themselves by **email**, which is the primary identity key.

**Flow**
1. User enters email.
2. User picks one option:
   - **Verify via email (OTP)**: OTP generated and emailed by Ficcado-Website-Data, then verified. On success, issue JWT.
   - **Enter password**: verified against credentials in Ficcado-Data. On success, issue JWT.
3. There is **no auto-login from an email link**.
4. **Sign-up**: creates the Customer (and address if provided) in **Ficcado-Data** by calling or adding a creation endpoint there. Credentials and customer details are stored in Ficcado-Data.

**Requirements**
- Passwords hashed (use the existing Ficcado-Data scheme; check it first).
- JWT with short-lived access tokens and refresh handling; logout and revocation through the existing `RevokedToken` mechanism where possible.
- Every protected endpoint validates the JWT and enforces ownership (a user only sees their own data).
- Rate limit and lock out repeated failed logins or OTP attempts.
- Frontend pages: login, sign-up, OTP entry, protected routes and session handling.
- Tests for the OTP flow, password flow, expired or invalid tokens, and ownership enforcement.

### Phase 6: Payment gateway (Razorpay), LAST
Only start after Phases 1 to 5 are complete and confirmed.

**Backend: Ficcado-Payment-Gateway-Data** (new Spring Boot service, PostgreSQL database `ficcado_payment_gateway_data`)
- Create Razorpay orders, verify payment signatures, and handle Razorpay webhooks (verify webhook signatures, make handling idempotent).
- Store: transaction ID, Razorpay order ID, amount, currency, status, customer ID, address ID(s) and details, payment method, timestamps, and raw gateway response references.
- Razorpay keys only through environment variables. Never commit secrets.
- After a verified payment, update the status in **Ficcado-Data using its existing sale and payment-related methods**. Do not add schema columns. Use RabbitMQ for reliable, retryable delivery of this update.
- Handle failure, timeout, duplicate webhook, and partial failure paths.

**Frontend**
- Checkout pages, payment flow, success and failure pages, connected through the gateway.

**Verification (must be tested)**
- A new sale is created in Ficcado-Data and returned to the website.
- Item stock and inventory history are updated correctly through the existing logic.
- Payment status in Ficcado-Data matches the Payment-Gateway-Data record.
- Failed or abandoned payments do not corrupt stock.
- Duplicate webhooks do not create duplicate updates.

---

## 7. CI/CD: `ci-cd.yaml` (GitHub Actions)

The pipeline must run and **all checks must pass** before deploying:

1. **All tests on all 3 backends** (Ficcado-Data, Ficcado-Website-Data, Ficcado-Payment-Gateway-Data)
2. **Dependency checks**
3. **Frontend tests** (website and CRM)
4. **Device checker** (existing `.mjs` file in the website frontend)
5. **Brand check** (existing `.mjs` file in the website frontend) and **types check**
6. **Maven clean, install, package** for the backends
7. **Frontend `npm run build` and lint** for the website and CRM frontends

Only when everything above passes does the pipeline proceed to deploy the frontend to **Vercel**.

Notes:
- The CRM frontend and Ficcado-Data are included in CI as **checks only**. Do not modify the CRM frontend to make its checks pass. Report failures in `AGENT_QUESTIONS.md`.
- Use separate jobs per service with caching, and `needs:` so deploy depends on all of them.
- Secrets through GitHub Actions secrets only.

---

## 8. Monitoring and observability
- Expose Actuator and Prometheus metrics on each backend.
- Provide a Prometheus config and Grafana dashboards (request rate, errors, latency, queue depth, payment success rate, OTP sends).
- Structured logging with correlation IDs passed through the gateway.

---

## 9. Hosting (deferred)
Not decided yet. Candidates: **Render or Cloudflare** for backends, **Vercel** for the website frontend. Do **not** implement deployment of backends. Keep configuration environment-variable-driven so hosting can be chosen later. Docker images, containers and Kubernetes are a **final pre-deployment stage** that will be discussed with the developer after all code is complete and working locally. At the end, ask in `AGENT_QUESTIONS.md` for hosting decisions.

---

## 10. General engineering standards
- Java, Spring Boot, **Maven only**, PostgreSQL, Next.js, RabbitMQ, Redis. Do not introduce other stacks or build tools.
- Configuration through environment variables, with `.env.example` files. No secrets in the repo.
- Input validation and consistent error responses on all endpoints.
- Tests for every new service and endpoint.
- Small, well-described commits per task. Update docs as you go.

---

## 11. Definition of done (this part)
- [ ] No spreadsheet code remains in the website
- [ ] Ficcado-Website-Data service built and tested
- [ ] NGINX gateway working locally and `docs/LOCAL_SETUP.md` written
- [ ] Website shows all product data from Ficcado-Data
- [ ] Sign-up, OTP login, password login and JWT working with ownership enforcement
- [ ] Payment gateway service and checkout working, with sale and stock verified
- [ ] `ci-cd.yaml` passes all gates
- [ ] Monitoring in place
- [ ] CRM frontend untouched, no schema changes, `FICCADO_DATA_CHANGELOG.md` complete
- [ ] `AGENT_QUESTIONS.md` and `PHASE_REPORT.md` up to date
- [ ] Zero occurrences of "Ficado" anywhere

---

## 12. Part 2
Future requirements, add-ons or refactoring will be provided as **Part 2** and must not be assumed now.
