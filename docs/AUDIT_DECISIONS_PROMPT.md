# GATE 1 decisions and next tasks

GATE 1 is released. The decisions below are final. Work from `docs/Part2.md` as before. All rules in section 1 of `Part2.md` still apply (scope lock, no guessing, evidence for every claim, tests never weakened, ask when blocked).

## What to do now, in order

0. **Read `docs/Part2_Addendum.md` first.** It contains corrections after the review of your P2-0 output and **takes precedence over `Part2.md` where they differ**.
1. **Record** the five decisions below in `docs/PART2_AUDIT.md` (status, the scope notes, and where each will be implemented).
2. **Do ADD-1 from the addendum** (complete the audit, report only).
3. **Start Phase P2-1** with **ADD-2** (narrow the public security rule) as its first task, then admin permissions fix, activity log separator fix and CRM sale source mark. Continue through the phases in the order in `Part2.md`, pausing at the end of each phase as `Part2.md` requires.
4. **Implement the approved audit items at the points given below.** This overrides the placement in P2-10. P2-10 then only confirms that every approved item was implemented and tested, and lists any that were not.

| Audit item | Decision | Implement at |
|---|---|---|
| AUD-09 | **APPROVED, narrowed to the `Item` entity only** | inside P2-2, right after colors, description and tags |
| AUD-10 | **REJECTED** (CI handling only, no CRM source changes) | P2-9 (CI update) |
| AUD-11 | **APPROVED, scoped** | after P2-8 and before the load tests in P2-9 |
| AUD-12 | **APPROVED, scoped** | after P2-8 and before the load tests in P2-9 |
| AUD-13 | **APPROVED** | at the start of P2-4, before any new authentication code |

For every item: write the tests listed, log edits to existing Ficcado-Data files in `docs/FICCADO_DATA_CHANGELOG.md`, put evidence in `docs/PART2_REPORT.md`, and change nothing beyond the scope stated here. If something here conflicts with what you find in the code, stop and write the question to `AGENT_QUESTIONS.md`.

---

## AUD-09: Optimistic locking for `Item` only (APPROVED, narrowed)

**Problem:** If two admins edit the same item in the CRM at the same time, the second save silently overwrites the first admin's changes (price, status, description, colors, tags, sizes). Stock is not affected because it lives in `Inventory`, not in `Item`.

**Scope: the `Item` entity only.** Do **not** add `@Version` to `Sale`, `PaymentTransaction` or any other entity.
- Payment record locking is already required in P2-7 (state machine with `@Version` on the new payment attempt).
- `Sale`: no `@Version`. A pessimistic row lock may be used inside the existing sale status-changing methods **only if** a test you write proves a real race. Log any such edit in the changelog. Otherwise leave `Sale` alone.

**Implementation**
1. Flyway migration (additive): add `version BIGINT NOT NULL DEFAULT 0` to the `items` table only. Existing rows get 0.
2. Add `@Version` to the `Item` entity.
3. The item response DTOs used by the CRM include `version`. The item **update** request DTO accepts an **optional** `version`.
4. In the item update service method (inside the existing `@Transactional`):
   - If `version` is supplied and differs from the current one, reject with **HTTP 409** and the error code `ITEM_VERSION_CONFLICT`, with a clear message.
   - If `version` is **not** supplied, behave exactly as today (backward compatible).
   - Colors, description, tags and sizes are updated in the same transaction as the version check.
   - Also map the framework's optimistic-lock exception (two overlapping transactions) to the same 409 response.
5. **Never expose `version` in the public or website DTOs.**
6. CRM frontend item edit form (the form is already being changed in P2-2): keep the `version` from the loaded item, send it on save, and on a 409 show the message **"This item was changed by another admin. Reload to see the latest version."** with a reload action. Follow the CRM patterns in `docs/PART2_UI_GUIDE.md` for modals or toasts.
7. Other code paths that save an `Item` (for example the status toggle) keep working without sending a version.

**Tests**
- Migration applies to an empty database and to one with existing items (`version` = 0).
- Stale save (load item, another save succeeds, then save with the old version) returns 409 and changes nothing.
- Two threads saving the same item at once: exactly one succeeds and the other gets 409 (no lost update).
- Update without `version` works as before.
- Public DTOs do not contain `version`.
- All existing item tests still pass.
- CRM frontend tests: the form sends the version; a 409 shows the message and the reload action.

---

## AUD-10: CRM lint errors (REJECTED, CI handling only)

**Do not modify any CRM frontend source file to fix the 278 lint errors.**

In the CI update (P2-9):
- Run the CRM lint step **non-blocking** (the 278 existing errors must not fail the pipeline).
- Add a **ratchet**: record today's error count as a baseline in a file outside the CRM folder (for example `.github/lint-baseline/crm.json`). The CRM lint step **fails if the error count is higher than the baseline**. If the count is lower, print a notice to update the baseline (do not auto-update it).
- Use ESLint's JSON output to count errors, or ESLint's bulk suppression feature if the installed ESLint version supports it. State which one you used.
- The **website** lint stays fully blocking.
- Write the baseline count and the reason in `docs/PART2_REPORT.md`.

**Tests:** a short CI script test or documented dry run showing the ratchet passes at the baseline and fails when an error is added.

---

## AUD-11: Connection pool and capacity tuning (APPROVED, scoped)

**In scope**
1. For **all three backends**, set explicit, environment-driven values (with documented defaults and a short reason for each in the report) for: HikariCP `maximumPoolSize`, `minimumIdle`, `connectionTimeout`, `idleTimeout`, `maxLifetime`, `leakDetectionThreshold` (development only); and Tomcat max threads, accept count and connection timeout. Make sure the total possible connections across all services stays below PostgreSQL's `max_connections`, and note the numbers.
2. Expose Hikari pool metrics through Micrometer to Prometheus (active, idle, pending, timeouts).
3. **Verify** the existing product caching: hits and misses work, entries have a TTL, and entries are evicted when an item changes (P2-2 requires eviction). Add cache hit and miss counters. **Do not add a new cache layer** unless the audit shows a hot public read path with no caching, and then only for public product reads using the existing cache Redis.
4. Use the load test results (P2-9) to report pool wait times and whether the pool saturates.
5. **PgBouncer:** write guidance only in `docs/SCALING_NOTES.md` (when it is needed, how it would fit, what to change). **Do not add PgBouncer to the Compose file or any config.**

**Out of scope:** enabling new frameworks or features, changing business logic, new infrastructure containers.

**Tests:** configuration binding tests (environment variables override the defaults), a test that the pool metrics are exposed, a cache hit, miss and eviction test.

---

## AUD-12: Indexes (APPROVED, scoped)

**In scope**
- One Flyway migration in Ficcado-Data using `CREATE INDEX IF NOT EXISTS` (plain, no extra options) for exactly these columns, after confirming in the schema that no index already exists on them:
  - `sale_line_items.sale_id`
  - `sales.customer_id`
  - `inventory_history.item_id`
- Any **additional** index is allowed **only** if you show the real query that needs it and an `EXPLAIN` result in the report. Otherwise do not add it.
- Use a clear naming convention (for example `idx_<table>_<column>`).
- No column changes, no data changes, and do not drop or alter existing indexes.
- Note in the report that for very large production tables a concurrent index build should be considered, but do not implement that.
- New tables created in Part 2 (wishlist, payment attempts, outbox, notifications and so on) must have indexes for their lookup columns **in their own migrations** (this is part of those phases, not new scope here).

**Verification:** run `EXPLAIN` before and after on 2 or 3 representative queries using the **test database** with seeded data. **Never run tests or experiments against the real `ficcado_data` database.** Record results in the report. Tests: the migration applies cleanly on an empty database and on a populated one, and is safe to run twice.

---

## AUD-13: Mask personal data and secrets in logs (APPROVED)

**Scope:** logging only. No business logic changes.
1. In **each backend** implement one central masking mechanism (for example a Logback converter or pattern). Each service gets its own copy with the same behavior; do not share code between services. It masks:
   - emails (`ab***@gmail.com`)
   - phone numbers (`******1234`)
   - `Authorization` and `Cookie` header values, JWT-shaped tokens, session ids
   - passwords, OTPs, and Razorpay keys, secrets and signatures when they appear in key and value text
2. Find and fix code that logs raw personal data or secrets, including entity `toString()` output, logged DTOs, and request or response logging that prints headers or bodies. Do not log request bodies for auth, payment or customer endpoints.
3. Check the website's server-side code (API routes and server actions) for `console.log` and similar calls that print personal data or secrets, and fix those too.
4. Use precompiled patterns so logging performance is not noticeably affected.

**Tests**
- Unit tests for every mask pattern (valid, edge and no-match cases).
- A test per backend that exercises login, customer sign-up, OTP and sale creation, captures the logs, and fails if any raw email, phone number, token, password, OTP or Razorpay secret appears.
- The same capture test is reused in P2-9 (logging verification).

---

## Reporting after each item

In `docs/PART2_REPORT.md` add, per item: files changed, migrations added, tests added with names, test results (zero skipped), and anything you could not do. Then pause as `Part2.md` requires.

**Start now: read the addendum, do ADD-1, then begin Phase P2-1 with ADD-2.**
