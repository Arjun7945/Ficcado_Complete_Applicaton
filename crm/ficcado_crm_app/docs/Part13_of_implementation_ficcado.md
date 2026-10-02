# Ficcado — Part 13: Scalability, Security Hardening, Item Images & Reviews
### (For the Antigravity Agent — Senior Engineer Design Spec)

> **Builds on** `part12_migration_ficcado.md` and `Ficcado-Post-Migration-Deep-Audit.md` — this assumes the Spring Boot + PostgreSQL backend and the cookie/CORS/CSRF issues from that audit are already resolved and verified before starting here; several items below (Section 3, 4) extend that work rather than repeat it. Treat this as **Phase 125 onward**.

> **On scale, stated honestly up front:** several items below ask for the system to comfortably handle "thousands to hundreds of thousands of users." The techniques in Section 1 (indexing, keyset pagination, connection pooling, caching, avoiding N+1 queries) are the correct, real foundation for that — but genuinely *proving* the system holds up at hundreds of thousands of concurrent users requires actual load testing against a horizontally-scaled deployment (multiple backend instances behind a load balancer, a managed Postgres with adequate resources), not just adding indexes to a single instance. Build the foundation correctly now; treat the specific number as something to load-test toward, not something a code change alone can promise.

---

## 1. Database Performance & Scalability

**Indexing — non-negotiable, and a commonly-missed detail:** Postgres does **not** automatically index foreign key columns (only primary keys get an automatic index). Explicitly add B-tree indexes to:
- Every foreign key column across every entity (`sales.customer_id`, `sale_line_items.sale_id`, `warehouse_allocations.handler_admin_id`, `vendor_payments.vendor_id`, etc.).
- Every column used in frequent lookups or filters: `sales.invoice_number`, `customers.phone`, `customers.email`, `activity_logs.created_at` / `sales_logs.created_at` / `inventory_history.created_at` (for date-range queries and the Dashboard's Today/Last-7-Days/This-Month views).
- Composite indexes for genuinely common multi-column queries discovered during testing (e.g., `(item_id, size)` on `inventory` if that combination is looked up constantly).

**Pagination — use the right strategy for the right table size:** standard `OFFSET`-based pagination (Spring Data's default `Pageable`) gets slower as the offset grows, because the database still has to scan past every skipped row. For the genuinely large, fast-growing tables — `sales_logs`, `activity_logs`, `inventory_history`, and `sales` once volume is real — implement **keyset/cursor-based pagination** instead (`WHERE id > :lastSeenId ORDER BY id LIMIT :pageSize`), which stays fast regardless of how deep into the table you page. Smaller, bounded tables (`items`, `vendors`, `admins`) can keep simple offset pagination — this isn't a blanket rule, apply it where table size actually justifies it.

**N+1 query prevention:** with JPA/Hibernate, a lazy-loaded relationship fetched inside a loop (e.g., loading a list of `sales` and then separately querying `sale_line_items` for each one) silently produces one query per row instead of one query total — a classic, easy-to-miss performance killer. Use `JOIN FETCH` or `@EntityGraph` for any list endpoint that also needs child-entity data, or better, use DTO projections that fetch exactly what's needed in one query. Audit every list endpoint (Sales, Replacement, Return/Refund, Payment Transactions) specifically for this.

**Connection pooling:** tune HikariCP's pool size deliberately — don't leave it at an untested default or guess a large number "to be safe" (an oversized pool can overwhelm Postgres itself). Start conservative (e.g., 10–20 connections) and adjust based on actual load-test results, not assumption.

**Caching layer:** for read-heavy, slower-changing data (Dashboard aggregates, Profitability calculations, the Sales Log preview widget), add a caching layer with **Redis** rather than Spring's default in-memory cache — since "hundreds of thousands of users" implies eventually running multiple backend instances behind a load balancer, and an in-memory-only cache isn't shared/consistent across separate instances. Keep cache TTLs short enough that data still feels current.

**Observability requirement:** enable query logging/statistics (Hibernate statistics, or a proper APM tool) during load testing specifically to **find** real N+1s and slow queries — don't rely on guessing which queries are slow. Spring Boot Actuator (already a project dependency) plus Micrometer is a reasonable starting point for exposing these metrics.

**Load testing requirement:** before claiming the system "handles" any specific concurrency figure, run an actual load test (k6, JMeter, or Gatling) simulating realistic concurrent sessions against a real deployment, and report the actual results (requests/sec, p95/p99 latency, error rate) rather than asserting readiness from code review alone.

---

## 2. Frontend Performance & Next.js Optimization

- Confirm the project is on the **latest stable Next.js** with the App Router, React Server Components, and Suspense-based streaming used deliberately — server-side data fetching (Server Components / Route Handlers) preferred over client-side `useEffect` fetch chains, which cause cascading loading spinners instead of one clean server-rendered response.
- Use `next/image` for every image in the application (directly relevant to Sections 6–7 below) for automatic resizing/optimization/lazy-loading, and `next/font` for font loading.
- Code-split heavy, page-specific dependencies (PDF generation, chart libraries) with dynamic imports so they don't bloat every page's initial bundle.
- Reconfirm the client-side caching strategy already established since the base Implementation Spec (SWR/React Query pattern) is still correctly applied, with proper cache invalidation after mutations (e.g., creating a sale invalidates the Sales list's cached query) — don't let stale cached data linger after a write.
- Consider optimistic UI updates for common, low-risk actions (e.g., a status change) so the interface feels immediate, with correct rollback if the request actually fails.

---

## 3. Secure Cookie Management — Explicit, Required Baseline

Building on the fixes already required in `Ficcado-Post-Migration-Deep-Audit.md`, this is the **permanent standard**, not a one-time fix:
- `HttpOnly`: always true.
- `Secure`: always true in any HTTPS environment (which should be every real deployment) — never optional.
- `SameSite`: `None` for genuine cross-origin frontend/backend deployments (requires `Secure`), `Lax` acceptable only for same-site local development.
- **Expiration**: distinguish two cases explicitly.
  - **Admin/CRM sessions** (internal tool, small user base): a moderate, explicit expiry — e.g., matching a workday (~8–12 hours) — is a reasonable, pragmatic default; require re-login after that rather than an indefinitely-lived session.
  - **Future customer-facing sessions** (Section 5's e-commerce prep): expect different expectations (customers want to stay logged in across visits) — flag that this will likely need a proper short-lived-access-token + rotating-refresh-token pattern later, rather than one long-lived cookie; don't build this now, just don't design Section 5's schema in a way that would block it later.
- **Data size**: keep the JWT payload minimal — user ID, role/authority, and expiry only. Never embed large objects or full profile data in the token itself.

---

## 4. Secure Session Management (JWT) — Preventing Hijacking, Ensuring Isolation

- **Real server-side logout invalidation, not just clearing the cookie client-side.** A JWT is stateless by design — deleting the cookie in the browser does nothing to invalidate the token if it was captured elsewhere before expiry. Implement one of: (a) a short-lived access token plus a revocable refresh token stored server-side (a `refresh_tokens` table, deleted on logout), or (b) a lightweight server-side denylist of explicitly revoked tokens (a small table or Redis set, checked in the JWT validation filter on every request). Pick (b) for now given the smaller scale and simpler implementation, with (a) as the natural evolution once the customer-facing site (Section 5) needs proper refresh-token rotation anyway.
- **Session isolation**: confirm multiple simultaneous logins for the same admin (e.g., desktop browser + phone) behave correctly and independently — logging out on one device should not silently affect the other's session, unless that's a deliberate policy decision (flag this as a decision point, not an assumption).
- **Token rotation on sensitive actions**: re-issue a fresh token after a password/credential change, so an old, possibly-compromised token stops working immediately rather than remaining valid until its original expiry.
- Confirm HTTPS is enforced everywhere (no HTTP fallback) as the baseline defense against network-level token interception — this is what makes `Secure` cookies and the whole model meaningful in the first place.

---

## 5. Customer Data — Schema Preparation for a Future E-Commerce Website

**Scope check, stated explicitly: this is schema/data preparation only — do not build the actual customer registration/login flow or public website now.** That's future scope. The job here is to extend the `customers` table so it's *ready* without disrupting anything currently working.

- Add `password_hash` (nullable — existing CRM-created customer records won't have one until a customer actually registers later).
- Add `email_verified_at` / `phone_verified_at` (nullable timestamps, for a future verification flow).
- Add unique constraints/indexes on `email` and `phone` — **decide with the client which is the primary login identifier** (email, phone, or either), since that affects how duplicate-account conflicts get handled; don't assume this unilaterally.
- Use the same password hashing already established for admins (bcrypt) for consistency, rather than introducing a second hashing library without a specific reason to.
- This is purely additive (new nullable columns, new indexes) — apply via a normal Flyway migration, no disruption to existing customer records or any currently-working CRM flow.

---

## 6. Item Image Management

This revives the architecture already designed once before in `Image-Storage-Feature.md` (written for the pre-migration Sheets-based app, never implemented) — re-target the same design at the new Spring Boot + PostgreSQL stack rather than redesigning from scratch:

- **New entity**: `item_images` (id, `item_id` FK, `image_url`, `thumbnail_url`, `caption` nullable, `display_order`, `uploaded_at`, `uploaded_by` FK to `admins`).
- **Storage backend**: Cloudflare R2 (the original recommendation still holds — it's independent of whether the app's own database is Sheets or Postgres, and its no-bandwidth-cost free tier is still the right fit). Re-implement the **generic Media Storage Service** concept from that document in Spring Boot (a service class calling R2's S3-compatible API via the AWS SDK for Java, configured with R2's endpoint) rather than the old Node/Netlify Functions approach — keep it context-parameterized (`items/{itemId}/...` now, `posts/{postId}/...` if the future photo-feed idea ever gets built) so it isn't Items-specific code.
- **Upload behavior**: generate both a capped full-resolution version and a small thumbnail per upload (R2 doesn't auto-thumbnail), with the same file-type/size/per-item-count validation limits as originally specified.
- **Items Management UI**: multi-image upload, reorderable thumbnail strip, per-image delete (removing both the R2 files and the `item_images` row), position-1 image treated as the item's cover.
- Use `next/image` on the frontend for all of this, per Section 2.

---

## 7. Visualizing Item Images Across CRM Sections

Show the item's cover (position-1) thumbnail next to its name **everywhere an item is referenced**, not only on the Items page itself:
- Sales view/edit (Purchased Items list)
- Replacement view (old items list and new items list)
- Return/Refund view (Purchased Items Summary and the item-selection list)
- Inventory, Warehouse allocation, and Damaged Products lists (same reasoning applies consistently, even though not explicitly named in the request)

**Fallback requirement**: an item with no uploaded images must show a clear, on-brand placeholder graphic (matching `NEWDESIGN.md`'s palette) — never a broken-image icon or blank space. Use `next/image` with lazy loading for these thumbnails, especially in long lists, so they don't slow down initial page load.

---

## 8. Customer Product Review Management

**A real dependency worth flagging plainly**: customers submitting reviews requires *some* public-facing surface, and the CRM itself is admin-only — there is no customer login/portal yet (Section 5 is schema-prep only, not a live feature). Rather than blocking this entirely on the full future e-commerce site being built, use a **tokenized, expiring public link** sent to the customer after their order reaches `Order Delivered Successfully` (Part 1/Part 5's Delivery Status) — a "review this item" link (e.g., emailed via the existing Gmail confirmation infrastructure) containing a signed, time-limited token identifying the specific order and item, leading to a minimal, no-login-required public review-submission page.

- **New entity**: `reviews` (id, `item_id` FK, `sale_line_item_id` FK, `customer_id` FK, `star_rating` 1–5, `comment` nullable text — not required by the client's spec, added as a low-cost forward-compatible column, no UI needed for it yet — `submitted_at`).
- **Uniqueness**: one review per `sale_line_item_id` — a customer can review the *same item* again if they buy it in a separate order, but can't submit multiple reviews against the same purchased line item.
- **Aggregate update**: on each review submission, update the item's `average_rating` and `review_count` (denormalized columns on `items`, for fast display) **within the same database transaction** as the review insert — application-layer logic, not a hidden database trigger, consistent with this project's general preference for explicit, readable service-layer logic over implicit database magic.
- **Display**: show `average_rating`/`review_count` on the Items Management list in the CRM, so admins can see product feedback without needing a separate reviews screen (a dedicated reviews detail view can be a later addition if wanted, not required now).

---

## Phase Checklist

### Phase 125 — Database Performance
- [ ] Add all missing FK/lookup indexes; implement keyset pagination for the large/growing tables; fix any N+1 query patterns found; tune connection pool size based on load-test results; add the Redis caching layer for Dashboard/Profitability reads.
- [ ] Run and report actual load-test results (throughput, latency, error rate) rather than asserting readiness.

### Phase 126 — Frontend Performance
- [ ] Confirm Next.js App Router/RSC usage, `next/image`/`next/font` adoption, code-splitting for heavy libraries, and correct cache invalidation on mutations.

### Phase 127 — Cookie & Session Hardening
- [ ] Apply Section 3's explicit cookie baseline everywhere, with the admin-vs-future-customer expiry distinction documented.
- [ ] Implement real server-side logout invalidation (Section 4) and confirm session isolation behavior across multiple simultaneous logins.

### Phase 128 — Customer Schema Prep
- [ ] Add the Section 5 columns/constraints via a Flyway migration; confirm no disruption to existing customer records; get the email-vs-phone primary-identifier decision from the client before finalizing the unique-constraint design.

### Phase 129 — Item Images
- [ ] Build the `item_images` entity, the Spring Boot Media Storage Service (R2-backed), and the Items Management multi-image UI.

### Phase 130 — Item Image Visualization
- [ ] Add the cover-thumbnail display to every location listed in Section 7, including the on-brand placeholder fallback.

### Phase 131 — Product Reviews
- [ ] Build the `reviews` entity, the tokenized public review-link mechanism (token generation, expiry, the minimal public submission page), the uniqueness constraint, and the same-transaction aggregate update logic.
- [ ] Wire the review-link email into the existing Gmail confirmation flow, sent when Delivery Status reaches `Order Delivered Successfully`.

### Phase 132 — Audit
- [ ] Confirm every new index actually gets used by the query planner (`EXPLAIN ANALYZE` on the relevant queries) rather than assuming an index helps just because it exists.
- [ ] Manually verify the tokenized review link: submit a review, confirm the item's aggregate rating/count updates correctly, and confirm a second attempt with the same link is rejected (already used/expired).
- [ ] Manually verify item thumbnails render correctly (including the placeholder fallback) across every location in Section 7.
- [ ] Update `AGENT_PROGRESS.md` with a "PART 13 COMPLETE" entry, including the actual load-test results from Phase 125.

---

## Definition of Done

- Every foreign key and frequently-queried column has a real index, verified via `EXPLAIN ANALYZE`, not assumed.
- The large, growing log/list tables use keyset pagination, not degrading `OFFSET` pagination.
- No N+1 query pattern remains on any list endpoint.
- Cookie and JWT session handling matches Sections 3–4 exactly, including real server-side logout invalidation.
- The `customers` table is extended and ready for future account creation, without any current CRM functionality being disrupted.
- Items support multiple images, displayed consistently (with a placeholder fallback) everywhere an item appears across the CRM.
- Customers can submit a star rating via a tokenized link without needing a full account, and the item's aggregate rating updates correctly and atomically.
- A real load test was run and its actual results are documented — this phase's scalability claims are backed by evidence, not assertion.