# AGENT_ANSWERS.md

Answers to the open questions in `AGENT_QUESTIONS.md`. Treat these as decisions, not suggestions.

**What to do with this file**
1. Move Q-001 to Q-007 into "Resolved Questions / Decisions Log" in `AGENT_QUESTIONS.md`, with the decision recorded.
2. **Apply the edits to `docs/Ficcadocompleterebuild.md` described under Q-007** (port 8081 and no COD). The developer cannot replace that file, so you edit it.
3. Log every edit to an existing Ficcado-Data file in `docs/FICCADO_DATA_CHANGELOG.md`, and every new file in its "Additive Additions" table. `SecurityConfig.java` will need edits, so it must be logged.
4. Then **start Phase 1**. Write a `PHASE_REPORT.md` summary at the end of the phase and pause.

Brand spelling is always `Ficcado`.

---

## Q-001: Brand check and the requirements document -> **Option A, tightly scoped**
- Add only the exact path `../docs/Ficcadocompleterebuild.md` to `ALLOWED_FILES` in `website/scripts/check-brand.mjs`. Use an exact path, never a wildcard or the whole `../docs` folder.
- Do not weaken the check in any other way. All code, comments, configs, UI text and other docs must still have zero occurrences of the wrong spelling.
- Note: the `fic/website` branch has its own `check-brand.mjs`. Keep the existing `../docs/briefs/...` and `../docs/memory.md` allowances as they are.

## Q-002: Root `.gitignore` -> **Option A**
Add a small root `.gitignore` for OS/editor files only (`.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`). Also ignore `.env`, `.env.local`, `*.env` and `target/` at root level as a safety net, but keep `.env.example` files tracked. Do not change any subproject `.gitignore`.

## Q-003: Website directory -> **Option A (adopted), confirmed**
`website/` directly holds the Next.js app. After the move, verify that these still work: the `package.json` scripts, `../docs` paths in the brand check, the device-checker routes, and any path referenced by tests or CI. Fix any that broke.

## Q-004: Public product read endpoints -> **Option A, with these rules**
- Add a new `PublicItemController` under `/api/public/products` (or `/api/public/items`), reusing the existing `ItemService` methods. Do not change `/api/items/**`.
- **Expose only ACTIVE items.** An inactive item must return 404 on the detail endpoint.
- **Use dedicated response DTOs. Never return the entity.** The public response must **not** include cost price, vendor data, or exact stock counts. It may include name, type, retail price, sizes, images (full and thumbnail URLs, in display order), average rating, review count, and a per-size **in-stock yes/no** (derived from `Inventory`).
- Public reviews: approved reviews only, with no customer phone or email, and the name shortened to first name plus initial.
- `SecurityConfig.java` needs a minimal edit to permit `GET /api/public/products/**` (read-only methods only). The existing permit list only covers `/api/public/reviews/**`, so add a narrow, explicit matcher rather than opening `/api/public/**`. Log this edit in the changelog.
- Rate limiting happens at the NGINX gateway in Phase 3.

## Q-005: Customer lookup and authentication -> **Option A, with these security rules**
These matter more than the endpoint shape.

1. **Repository:** Add `findByEmailIdIgnoreCase` and `existsByEmailIdIgnoreCase` to `CustomerRepository` (additive). No schema changes. Because the email column may not be unique in the database, enforce uniqueness in the service, and handle duplicates safely (if duplicates already exist, report them in `AGENT_QUESTIONS.md` rather than guessing).
2. **Customer tokens must never work as admin tokens.** Customer JWTs need a separate role (`ROLE_CUSTOMER`), a distinct claim or audience, and a **different cookie name** (for example `ficcado_customer_session`). The existing admin filter and admin endpoints must reject customer tokens, and customer endpoints must reject admin tokens. Prefer a separate additive customer filter or a minimal, logged change to the existing one. Reuse the existing revocation mechanism (`RevokedToken`) for logout.
3. **Existing CRM-created customers.** Customers are often created from CRM sales by phone number, with no password and often no verified email. If someone signs up with an email that already exists, **do not let them set a password until the email is verified by OTP.** Otherwise anyone could take over an existing customer's record. Never reveal whether an email is registered in login or OTP responses (use generic messages).
4. **Phone number is required at sign-up.** `phoneNumber` is the unique CRM key, and `createSale` upserts customers by phone. Sign-up must collect it. If the phone already belongs to a different customer record, handle that conflict explicitly and report it rather than overwriting.
5. **OTP and token split between services:**
   - Ficcado-Website-Data generates, emails and verifies the OTP.
   - Ficcado-Data issues the customer JWT and sets `emailVerifiedAt`.
   - Website-Data tells Ficcado-Data about a successful verification only through a **service-to-service internal endpoint** protected by a shared secret (`INTERNAL_API_KEY`, from environment variables, compared in constant time). Put internal endpoints under `/api/internal/**` and make the **NGINX gateway block `/api/internal/**` from the public**. Browsers must never be able to call them.
6. **Password rules:** BCrypt (same encoder as existing code), minimum length and strength check, and lockout or throttling after repeated failures.
7. **Own-data enforcement:** Every customer endpoint derives the customer identity from the JWT, never from a request parameter or body.

## Q-006: Website order placement -> **Option A, but not callable directly from the browser with payment fields**
- **Never trust client-supplied prices, totals, payment status, transaction ID or customer identity.** The order endpoint takes only item names (or IDs), sizes, quantities, delivery address and coupon-free inputs. It **recomputes unit prices, subtotal, delivery charge and grand total on the server** from the `Item` table (reusing existing delivery and totals logic from the CRM if it exists; check first).
- **Online payments (Phase 6): create the sale only after the payment is verified.** The Ficcado-Payment-Gateway-Data service verifies the Razorpay signature, then calls an internal Ficcado-Data endpoint (`/api/internal/**`, shared-secret protected, blocked at the gateway) to create the sale as PAID with the Razorpay payment ID as `transactionId`. This way abandoned payments never reduce stock. Call the existing `saleService.createSale(sale, null)`; do not reimplement stock deduction.
- **Idempotency:** Creating the same `transactionId` twice (duplicate webhook or retry) must return the existing sale, not create a second one or deduct stock twice. Implement through an additive repository lookup, plus a unique constraint on the payment-gateway side.
- **Out of stock after payment:** If the sale cannot be created because stock ran out, mark the payment record for refund and report it. Do not leave a paid order with no sale record.
- **Invoice number:** Reuse the existing invoice-number generation. Do not invent a new format. If it only exists in the CRM request path, extract nothing; instead reuse the same service method or report the gap.
- **Linking orders to the account:** `createSale` upserts customers by phone, not email. For logged-in customers, build the sale from the account's **stored** name, phone and email (not client-supplied values), so orders stay attached to the right customer. "My orders" is an additive query by the customer's email (and phone) taken from the JWT.
- Public order tracking, if needed, must require authentication or an unguessable token.
- **No cash on delivery.** The developer confirmed there is no COD option. Online payment (Razorpay) is the only payment mode on the website. Do not build or offer COD anywhere (backend, frontend or tests), and reject any website order with a non-online payment mode.
- This endpoint is built in **Phase 6**, not earlier.

## Q-007: Ficcado-Data port -> **Keep 8081 (decided by the developer)**
- **Ficcado-Data and the CRM stay on port 8081. Do not change the port anywhere**: not in `application.yaml`, not in the CRM frontend, not in any CRM config. Ignore the earlier instruction to move it to 8080.
- New services keep their ports, which do not clash with 8081:

| Service | Port |
|---|---|
| Ficcado-Data (existing, CRM backend) | **8081** |
| Ficcado-Website-Data (new) | **8082** |
| Ficcado-Payment-Gateway-Data (new) | **8083** |
| NGINX gateway | 8000 |
| Next.js website | 3000 |

- Port 8080 is not used by this project.
- Update every place that assumed 8080 for Ficcado-Data: the NGINX upstream (`localhost:8081`), website and service environment variables, `.env.example` files, `docs/LOCAL_SETUP.md`, and tests.
- **You must make the following edits to `docs/Ficcadocompleterebuild.md` yourself.** The developer cannot replace that file, so it is your job to keep it correct:
  1. In section **3A (Fixed local development decisions)**, change the row `Ficcado-Data port | **8080**` to `Ficcado-Data port | **8081** (unchanged, existing default in application.yaml; do not change it)`.
  2. In **Phase 3, step 1**, change the Ficcado-Data upstream from `localhost:8080` to `localhost:8081`.
  3. Search the whole file for any other `8080` and fix it, so no 8080 reference to Ficcado-Data remains.
  4. Add this line under section 3A: `Payment mode: online (Razorpay) only. No cash on delivery.`
  5. Do not make any other change to that file. Record the edit in `PHASE_REPORT.md`.
  This file's instructions override any older text in `docs/Ficcadocompleterebuild.md` that conflicts with them.

---

## Additional notes from the Phase 0 files

- **Reviews:** `ReviewSubmissionController` already exposes public review validation and submission with single-use tokens. Reuse it for the website and do not duplicate it.
- **Sizes and stock:** Show "out of stock" per size from `Inventory` through the public DTO only.
- **Test baseline:** Before the first change to Ficcado-Data, run its existing test suite once and record the result in `PHASE_REPORT.md`, so later regressions can be told apart from existing failures.
- **Maven wrapper:** The report mentions `mvnw.cmd`. The tooling is Maven only, so use the wrapper (`mvnw` on Linux/macOS, `mvnw.cmd` on Windows) and make CI use `./mvnw`.

## Decision for you: Phase 1

Proceed to **Phase 1** now (remove spreadsheet logic from the website and build the typed API client). Phase 1 does not depend on any open item.
