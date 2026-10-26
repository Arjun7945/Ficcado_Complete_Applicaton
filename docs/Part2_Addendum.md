# Part2_Addendum.md

Corrections and clarifications found after reviewing the agent's P2-0A and P2-0 output (`PART2_AUDIT.md`, `PART2_REPORT.md`, `PART2_UI_GUIDE.md`, `FICCADO_DATA_CHANGELOG.md`).

**This addendum takes precedence over `docs/Part2.md` where they differ.** All rules in section 1 of `Part2.md` still apply: scope lock, no guessing, evidence for every claim, tests never weakened, ask when blocked. Items marked **(developer to confirm)** carry a default that you follow unless the developer changes it.

What was good and stays as it is: the Gate 1 pause, the baseline test runs, the Docker Compose stack and its verification, the microservices checklist, the UI guide with file citations.

---

## ADD-1: Complete the audit (report only, do this first)

`docs/PART2_AUDIT.md` is missing review areas that `Part2.md` P2-0 step 5 requires, and two statements in it are wrong. Add an **addendum section** to the audit. No code changes.

1. **Add the missing reviews**, each with file and line evidence:
   - N+1 queries and fetch strategy (for example item lists with sizes and images, sales with line items)
   - caching correctness: what is cached, key names, TTL, what evicts it, and confirmation that no per-user data is cached
   - Tomcat thread and connection settings per backend
   - security headers, CORS and cookie attributes (`HttpOnly`, `Secure`, `SameSite`) on every response that sets or reads a cookie
   - input validation on the public and internal endpoints
   - **test coverage gaps**: run a JaCoCo coverage baseline for the three backends without editing any `pom.xml` (for example by invoking the plugin from the command line). If that is not possible, say `UNKNOWN` and why.
   - which database the **existing tests** use (PostgreSQL or something else such as H2). `Part2.md` requires PostgreSQL.
2. **Correct AUD-11.** The audit says to "add" Redis catalog caching, but Part 1 Phase 4 already added it (`CacheConfig`, 10-minute TTL, `@CacheEvict` on item changes). Rewrite the finding to say the caching exists and must be **verified**, not added.
3. **Correct AUD-04 and the "Session Loss on Refresh" row.** The current text states a cause as fact ("missing Redis store causes cookie loss"). That is a hypothesis. P2-4A requires you to **reproduce the bug and prove the root cause**. Label it a hypothesis.
4. **Confirm the Compose follow-ups** from P2-0A and record them in the report: `infra/.env` is git-ignored and not tracked; both Redis instances actually require their passwords; and who created `infra/.env`.
5. Any new finding becomes **AUD-14 and up** with the same fields and an `[REQ]` or `[OUT]` label. **Do not implement any [OUT] finding** until the developer approves it.

---

## ADD-2: Narrow the public security rule (first task of P2-1)

The changelog shows `SecurityConfig.java` was changed from `.requestMatchers("/api/public/reviews/**")` to `.requestMatchers("/api/public/**").permitAll()`. This contradicts the earlier decision (Q-004): use **narrow, explicit matchers, read-only methods only**. As written, every future endpoint under `/api/public/` becomes public for every HTTP method.

- Replace the blanket rule with explicit matchers: `GET /api/public/products/**`, `GET /api/public/categories/**`, and the original `/api/public/reviews/**` with the **same methods it allowed before**. Nothing else under `/api/public/` is open.
- Make the smallest edit and log it in `docs/FICCADO_DATA_CHANGELOG.md`.
- **Tests:** unauthenticated GET on products and categories works; unauthenticated POST, PUT, PATCH and DELETE on `/api/public/products/**` are rejected; the reviews endpoints behave exactly as before; an invented path such as `/api/public/anything` is not open.

---

## ADD-3: Website order endpoint must reuse existing sale logic (P2-7)

The changelog describes `InternalOrderController` (`POST /api/internal/orders/create-paid-sale`) as doing stock validation, **invoice generation and stock deduction itself**, and the audit places invoice generation in the controller. Earlier decisions (Part 1 rule 6, Q-006) require reusing `SaleService.createSale` and **not reimplementing** stock, inventory-history, customer-upsert or sales-log logic, and Part 2 forbids business logic and transactions in controllers.

In P2-7:
1. First **verify and record** in the report whether the controller calls `SaleService.createSale` or duplicates its logic.
2. If it duplicates logic, **refactor**: a thin controller, and a `@Service` method (one `@Transactional` operation) that calls the existing `createSale(sale, null)`. Remove the duplicated stock deduction. Stock, inventory history, customer upsert and sales log must all be written by the existing code path.
3. **Invoice numbers:** do **not** invent a format and do **not** add a database sequence or Redis counter. **AUD-02's proposed sequence is not approved.** Find how the CRM sale path obtains its invoice number and reuse it. If the current `FIC-INV-<timestamp>` format for website orders was created in Part 1, do not change the format; instead remove the race by handling the unique-constraint violation with a retry in a new transaction (no schema change). If you believe a sequence is required, write the question and stop.
4. Everything else in P2-7 stands (idempotency by `transactionId`, remarks `WEBSITE SALE`, atomic stock fix pre-approved as AUD-01).

---

## ADD-4: Courier options and delivery charges (P2-6, P2-7) (developer to confirm)

The audit shows couriers are hard-coded in the website (`couriers.ts`: Standard ₹0, Priority ₹99) and Part 2 requires the delivery charge to be computed on the server.

- **Default decision:** keep exactly those two options and prices, but move the source of truth to **server-side configuration** (environment or `application.yaml` properties, not a database table) in Ficcado-Data. An additive **public read endpoint** returns the configured options to the website. The quote and order endpoints compute the delivery charge **only** from this configuration and ignore any client-supplied charge.
- **Do not** build a courier-rates table, an admin screen for rates, or any other courier feature. The audit's wording "backend courier rates" means only this configuration.
- If the developer says the two options or prices are not the real ones, use the values they give.
- Tests: charge comes from configuration; a tampered client charge is ignored; an unknown courier id is rejected.

---

## ADD-5: Remove simulated payment code (P2-7)

The audit and report show the checkout still contains **simulated payment ids (`pay_sim_...`) and simulated signatures**. Production code must not contain simulated payments (this follows the no-dummy-data rule).

- Remove every simulated payment path from production website code and from any backend code that accepts such values.
- Tests may mock Razorpay only inside test code.
- Add a test that fails if a `pay_sim_` value or simulation flag exists in production sources, or if the payment verify endpoint accepts an unsigned or simulated payload.

---

## ADD-6: CRM frontend test framework (developer to confirm)

The UI guide shows the CRM frontend has **no test framework** (ESLint and build only), but Part 2 requires CRM frontend tests (admin menu for `ADMIN` in P2-1, item form validation and the 409 message in P2-2 and AUD-09).

- **Default decision:** you may add **Vitest, React Testing Library and jsdom as `devDependencies` only** in `crm/ficcado_crm_app`, plus a `test` script and config file. This is the only allowed exception to the dependency rule in `Part2.md` section 1, and **only for the tests Part 2 lists**.
- Do not change any CRM source file for the sake of the tests. Add the CRM `npm test` step to the pipeline.
- List the packages, versions and reason in the "Dependencies Added" log of `docs/PART2_REPORT.md`.

---

## ADD-7: P2-1A scope reminder (admin permissions)

The UI guide only lists `AppSidebar.tsx`. The CRM frontend also checks roles in `middleware.ts` and possibly inside individual pages. P2-1A must cover **every** role check: backend (`AdminController`, `SecurityConfig`, any `@PreAuthorize`), `middleware.ts`, `AppSidebar.tsx`, and page-level checks. Start with the diagnosis test from `Part2.md` (create a new `ADMIN`, log in, call the admin-panel endpoints) and record the real root cause.

---

## ADD-8: UI guide updates

Extend `docs/PART2_UI_GUIDE.md` when you reach each phase (before building the UI), keeping the website and CRM sections separate and citing files:
- **P2-4:** the "Still there?" prompt must follow the **website's** modal pattern (`ModalContext` and the pattern used by `AuthModal.tsx`), not the CRM's `SessionTimeoutModal.tsx`. The CRM modal is for admin sessions, which are out of scope and must not be touched.
- **P2-5:** the guest wishlist prompt: reuse the website's existing modal and `AuthModal` flow where it fits, with `ToastContext` for feedback.
- **P2-6 and P2-7:** the checkout address list, "Add new" form, payment processing, success and failure states, following the website's `.card`, `.input-field` and button classes and its loading, empty and error patterns.
- **P2-2 and AUD-09 (CRM):** the item form's color, description and tag inputs and the "changed by another admin" message must use the CRM's existing form, `ErrorMessage` and badge patterns.

---

## Order of work

1. ADD-1 (audit completion, report only), then update the report.
2. Phase P2-1, with **ADD-2 as its first task**, then 1A (with ADD-7), 1B and 1C.
3. Continue through the phases in order. ADD-3, ADD-4 and ADD-5 apply in P2-6 and P2-7. ADD-6 applies from the first CRM frontend test. ADD-8 applies at each phase named.
4. The approved audit items follow the placement table in the audit decisions prompt.

Pause at the end of each phase as `Part2.md` requires.
