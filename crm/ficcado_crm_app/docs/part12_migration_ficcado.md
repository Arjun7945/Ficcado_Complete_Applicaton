# Ficcado — Part 12 Migration: Google Sheets → Spring Boot + PostgreSQL
### (For the Antigravity Agent)

> **This is an architecture migration, not a feature phase.** Every prior document — the functional spec, base Implementation Spec, Parts 2–11, `mobile_mode_feature.md`, `Quick_dash_refactor.md`, `NEWDESIGN.md` (superseding `DESIGN.md`) — remains the **source of truth for what the data model and business rules must be**. Nothing about the application's **behavior, screens, validations, or business rules changes** — only the storage and data-access layer changes, from Google Sheets to a real backend. Treat this as **Phase 111 onward**.

---

## 0. Scope & Ground Rules

- **New stack**: Spring Boot (Java) + Spring Data JPA + PostgreSQL for the backend; REST APIs exposed via `springdoc-openapi`; a generated TypeScript client (via the OpenAPI Generator CLI) consumed by the existing Next.js frontend.
- **Existing scaffold**: a Spring Initializr project already exists at the developer's local path, with Spring Web, PostgreSQL Driver, Spring Boot Actuator, Spring Boot DevTools, Lombok, and Spring Data JPA already added. **Build on this scaffold — do not regenerate it.**
- **"Without changing any schemas" means**: every field, every validation rule, every business calculation, every status enum, and every workflow already specified across Parts 1–11 must be preserved exactly in meaning — the *physical* representation moves from spreadsheet columns to database columns/tables, and *some* fields that were forced into flat spreadsheet cells (comma-separated lists, duplicated lookups) should now become proper relational structures (Section 1.1 explains exactly where and why). This is a storage/access-layer migration with light, deliberate normalization — not a silent redesign of what the app does.
- **Full removal requirement**: every line of code tied to the Google Sheets/Drive integration must be deleted — not commented out, not left dead. This includes (full list in Section 6) the Sheet Configuration SDK, the Setup Wizard's spreadsheet/tab flow, the Sheet Configuration Admin Control Centre screen (`part8_of_implementation_ficcado.md`), the Schema Sync Panel (`part11_of_implementation_ficcado.md`, Section B2.2 — now obsolete, see Section 2), all Google service-account credential handling, and the Sheets-specific performance workarounds from `part7_of_implementation_ficcado.md` (batching/backoff/the `gviz` search idea) that a real database makes unnecessary.

---

## 1. Entity/Schema Derivation — Source of Truth

Every "sheet" defined across Parts 1–11 becomes a proper JPA `@Entity` / PostgreSQL table. Compile the complete field list for each from the actual prior documents (functional spec Section 3, and every schema table added in Parts 2, 3, 5, 8, 9) — the list below is the confirmed target entity set; use it as a checklist, and cross-check against the prior documents' schema tables directly rather than re-deriving from memory:

`admins`, `items`, `inventory`, `warehouse_allocations`, `sales`, `sale_line_items`, `customers`, `customer_addresses`, `replacements`, `return_refunds`, `damaged_products`, `expenses`, `vendors`, `vendor_payments`, `activity_logs`, `sales_logs`, `inventory_history`, `keep_notes`.

**Not migrated** — `sheet_config`/`app_meta` (the bootstrap spreadsheet-pointer concept) has no equivalent in this architecture and should not be recreated as a table; see Section 2 for what replaces it.

### 1.1 Deliberate Normalization — Where This Migration Should Improve on the Sheets-Era Design
Several fields were only ever comma-separated text **because Sheets had no relational capability** — that workaround should not be copied into Postgres, which is built for exactly this:

| Sheets-era field (comma-separated text) | Becomes (proper relational structure) |
|---|---|
| Customer's `Invoice Numbers` list (Part 3, Section 1.1) | Derived via a query (`sales` rows where `customer_id` matches) — not a stored column at all |
| Customer's multiple saved addresses (Part 9, Section A2) | `customer_addresses` child table, FK to `customers` |
| Sales' item list (item/size/qty/price per line) | `sale_line_items` child table, FK to `sales` |
| Replacement's old/new item lists (Part 2, Section 2.4) | `replacement_old_items` / `replacement_new_items` child tables, FK to `replacements` |
| Return/Refund's `New Final Items Selected/Sizes/Number/Prices Each` (Part 4, Section B2.G) | **Not stored at all** — this was always "the original sale's line items minus whichever ones were returned"; in a real relational schema this is a derived query (original `sale_line_items` minus `return_refund_items`), not data that needs to be maintained in parallel and can drift out of sync |
| Vendor's `Contact Number(s)` (Part 9, Section A2) | `vendor_contact_numbers` child table, FK to `vendors` |
| Warehouse handler name | Proper FK from `warehouse_allocations.handler_admin_id` → `admins.id` (Part 2/Part 9 already established handlers *are* admins — this just makes that relationship a real foreign key instead of a matched string) |

Apply the same reasoning anywhere else a Sheets-era field is discovered to be a comma-separated workaround during implementation — normalize it, don't copy it verbatim.

### 1.2 Fields That Stay As-Is
Everything else — every status enum (Sale Status, Delivery Status, Payment Status, Refund Status, Item Verification Status, every Replacement/Return progression state), every audit field (Created/Updated At/By — now FK'd to `admins.id` plus a timestamp, rather than a plain text name), every calculated figure's *definition* (Total Amount, COGS, Net Revenue, Net Profit, Gross Profit, Discounts Provided — Part 8's formulas) — must be preserved exactly as already specified.

---

## 2. Backend Architecture

- **Layers**: `entity` (JPA models), `repository` (Spring Data JPA interfaces), `service` (business logic — this is where every rule from Parts 1–11 gets re-implemented: inventory deduction on sale, the Fulfilment Source dual-deduction logic, Replacement/Return disposition handling, the Return/Refund Close Ticket validation gate including Part 5's all-items-specific tightening, Profitability's formulas, the Sales Log narrative-message generation, etc.), `controller` (REST endpoints), `dto` (request/response objects — never expose JPA entities directly over REST).
- **REST API shape**: resource-oriented endpoints per entity (`/api/sales`, `/api/inventory`, `/api/warehouse-allocations`, etc.) with standard CRUD, plus explicit action endpoints for every established workflow action, e.g.:
  - `POST /api/sales/{id}/replace-request`, `POST /api/sales/{id}/refund-request`
  - `POST /api/replacements/{id}/save-progress`, `POST /api/replacements/{id}/complete`
  - `POST /api/return-refunds/{id}/save-progress`, `POST /api/return-refunds/{id}/close-ticket`
  - `GET /api/profitability?period=monthly&month=2026-08` (and `daily`/`weekly`/custom range variants, per Part 8 Section B7.1)
  - `GET /api/sales/search?invoice=...&customer=...` (replacing Part 7's Sheets-specific search-index approach with a real indexed SQL `WHERE`/full-text query)
- **OpenAPI generation**: add `springdoc-openapi-starter-webmvc-ui` to auto-generate the OpenAPI 3 spec from the controllers/DTOs (available at `/v3/api-docs`). Use the OpenAPI Generator CLI against that spec to produce a typed TypeScript client (`typescript-fetch` or `typescript-axios` generator) that the Next.js app imports — this is what "connect with frontend nextjs app" means concretely, and it should be regenerated as part of the build process whenever the backend's API shape changes, not manually hand-copied.
- **Authentication**: re-implement the existing bcrypt + JWT + httpOnly-cookie session model (Implementation Spec Phase 0) using Spring Security, backed by the real `admins` table.
  - **Important simplification the migration enables**: the elaborate "self-claimed Superadmin," "minimize required env vars," and multi-step Setup Wizard design from Part 1 existed specifically to solve a *Google Sheets* problem — no durable storage existed until a spreadsheet was reachable. **That problem doesn't exist with a real database.** A Postgres database is trivially seedable at deploy time via a Flyway migration (e.g., seed one Superadmin row with credentials from environment variables). Recommend simplifying the onboarding flow accordingly — flag this to the client as an opportunity rather than silently keeping the old ceremony out of inertia, though the "Claim This Installation" UX can be kept if there's a product reason to prefer it (e.g., not wanting real credentials in an env var at all).
- **Schema migrations**: use **Flyway** (Spring Boot's default, well-integrated migration tool) for all schema changes going forward — versioned SQL migration scripts, applied automatically on startup, with full history. This **replaces Part 11's Schema Sync Panel entirely** (Section B2.2's "append missing columns to a live spreadsheet" concept has no purpose once Flyway exists — Flyway does this job far more robustly, with real rollback and history). Remove the Schema Sync Panel from the application; Part 11's Deploy Panel concept (Section B2.1) can be reconsidered for the backend's own deploys, but note it was originally scoped to Netlify specifically, which cannot host a persistent Spring Boot process (Section 5).

---

## 3. One-Time Data Migration (ETL)

Since the application already has real data sitting in Google Sheets, write a **separate, one-time migration utility** (not part of the ongoing application) that:
1. Reads every existing row from every Google Sheet, using the existing (soon-to-be-removed) Sheets API integration one final time.
2. Inserts corresponding rows into the new Postgres tables, applying the normalization from Section 1.1 (e.g., splitting a comma-separated address list into proper `customer_addresses` rows) as it migrates.
3. Preserves relationships correctly (e.g., resolve a Warehouse row's handler name to the correct `admins.id`, not a copied string).
4. Is run once, verified against the source data (spot-check row counts and a sample of records field-by-field), and then **archived out of the codebase** — it is a migration tool, not a feature, and should not linger as part of the running application after use.

---

## 4. Frontend Changes (Next.js)

- Replace every call currently going through the Sheet Configuration SDK / `getModuleSheet()` pattern with calls to the generated OpenAPI TypeScript client hitting the new Spring Boot API.
- **Remove entirely**: the Sheet Configuration screen (`part8_of_implementation_ficcado.md`), all Google service-account credential UI, the Setup Wizard's spreadsheet-registration steps, and Part 11's Schema Sync Panel UI.
- **Do not change**: anything specified in `NEWDESIGN.md`, `mobile_mode_feature.md`, or `Quick_dash_refactor.md` — every screen's layout, validation behavior, and business logic stays exactly as already specified. This migration changes what happens *underneath* a button click, never what the button does or looks like.

---

## 5. Open Infrastructure Decisions — Flag These to the Client, Don't Assume

Two things this document cannot resolve on its own, because they're real hosting/cost decisions, not implementation details:

1. **Where does the Spring Boot backend run?** Netlify hosts static sites and short-lived serverless functions — it **cannot** run a persistent Java/Spring Boot process. This needs a real application host: Render, Railway, Fly.io, a VPS, or a cloud provider's app-hosting service (AWS/GCP/Azure). Each has different free-tier characteristics (several offer a free tier, but typically with cold-start sleep after inactivity or limited monthly hours — not the same "genuinely free" story the Netlify Functions + Sheets architecture had).
2. **Where does PostgreSQL run?** Managed Postgres options with real free tiers exist (e.g., Supabase, Neon, Railway's Postgres add-on, Render's managed Postgres) — pick one based on actual expected data volume and whether its free tier's connection/storage limits are realistic for Ficcado's usage.

Given how central "stay on free tiers" has been throughout this entire project, **flag honestly** that this migration introduces the first genuinely open cost question the project has faced — the old architecture (Sheets + Netlify Functions) was free by design in a way a persistent backend + managed database usually isn't at any real scale. Don't pick a host unilaterally; present the tradeoffs to the client the same way prior infrastructure decisions in this project were presented (R2 vs. Cloudinary, Click-to-Chat vs. WhatsApp Business API) and let them decide before deploying.

Also required regardless of hosting choice: proper **CORS configuration** between the Next.js frontend's domain and wherever the Spring Boot backend ends up hosted.

---

## 6. Dead Code Removal — Master Checklist

Delete entirely, no remnants:
- [ ] The Sheet Configuration SDK / `getModuleSheet(moduleKey)` resolver and everything built on it.
- [ ] The Setup Wizard's spreadsheet-ID/tab-registration steps and UI.
- [ ] The Sheet Configuration Admin Control Centre screen (`part8_of_implementation_ficcado.md`, Part A) and its "Update and Regenerate" flow.
- [ ] The Schema Sync Panel (`part11_of_implementation_ficcado.md`, Section B2.2) — fully replaced by Flyway.
- [ ] All Google service-account credential handling, the `developer-control-config-fic` bootstrap-sheet concept, and the two originally-irreducible env vars tied to it.
- [ ] The Google Sheets/Drive API client library dependency itself.
- [ ] Part 7's Sheets-specific performance workarounds: the search-index/`gviz` query approach (replaced by real SQL indexes and `WHERE`/full-text search), the batching/backoff logic built specifically around Sheets API rate limits (a real database doesn't have this problem the same way), and any remaining trace of the archival/rollover feature (already cancelled, but confirm nothing was left behind — note that if data volume ever calls for it again, Postgres table partitioning is the real answer now, not spreadsheet archive tabs).

---

## Phase Checklist

### Phase 111 — Entity Layer
- [ ] Define every JPA `@Entity` from Section 1's list, cross-checked field-by-field against the actual prior documents' schema tables, applying the Section 1.1 normalizations.

### Phase 112 — Repository & Service Layer
- [ ] Build Spring Data JPA repositories for every entity.
- [ ] Re-implement every business rule from Parts 1–11 in the service layer — inventory/warehouse deduction logic, disposition handling, Close Ticket validation gates, Profitability calculations, Sales Log message generation, and every other established workflow.

### Phase 113 — REST API & OpenAPI
- [ ] Build controllers/DTOs for every endpoint implied by the application's existing feature set (Section 2's examples plus every other established action).
- [ ] Wire up `springdoc-openapi` and confirm the generated spec is complete and accurate.
- [ ] Generate the TypeScript client via OpenAPI Generator and wire it into the Next.js build process.

### Phase 114 — Authentication
- [ ] Implement Spring Security-based auth against the `admins` table, matching the existing bcrypt/JWT/httpOnly-cookie model.
- [ ] Decide (with the client) whether to simplify the onboarding/Superadmin-claim flow per Section 2's noted opportunity, or preserve the existing UX.

### Phase 115 — Data Migration
- [ ] Build and run the one-time ETL utility (Section 3); verify migrated data against the source Sheets; archive the utility out of the ongoing codebase afterward.

### Phase 116 — Frontend Integration
- [ ] Replace every Sheets-backed data call in the Next.js app with the generated OpenAPI client.
- [ ] Remove the Sheet Configuration screen and Schema Sync Panel UI entirely.
- [ ] Confirm no visual/behavioral change occurred anywhere — every screen should look and behave identically to before, per `NEWDESIGN.md`.

### Phase 117 — Dead Code Removal
- [ ] Complete every item in Section 6's checklist.

### Phase 118 — Infrastructure Decision & Deployment
- [ ] Present the Section 5 hosting options and cost tradeoffs to the client; do not deploy to a chosen host unilaterally.
- [ ] Configure CORS once a backend host is chosen.
- [ ] Update Part 11's Deploy Panel concept to reflect the now-two-service deployment story (frontend + backend), or scope it down if the client prefers to defer that rework.

### Phase 119 — Audit
- [ ] Re-run the relevant sections of `Ficcado-Production-Readiness-Audit-Protocol.md` against the new backend — dead code, CRUD correctness matrix, data integrity, performance — since this migration touches nearly everything that protocol was written to check.
- [ ] Confirm every business rule produces identical results to the pre-migration app on a matched set of test scenarios (a sale, a replacement, a return, a profitability calculation) — same inputs, same outputs, different plumbing underneath.
- [ ] Update `AGENT_PROGRESS.md` with a "PART 12 MIGRATION COMPLETE" entry.

---

## Definition of Done

- Every entity in Section 1's list exists as a proper JPA entity/Postgres table, with the Section 1.1 normalizations applied — no comma-separated workaround fields survived the migration.
- Every business rule and calculation from Parts 1–11 produces identical results to the pre-migration application.
- The Next.js frontend's screens, layouts, and behavior are visually and functionally unchanged — this was a backend migration, not a redesign.
- No Google Sheets/Drive API code, dependency, credential, or configuration screen remains anywhere in the codebase.
- The one-time data migration utility successfully moved all existing production data and was then removed from the ongoing codebase.
- Hosting decisions for the backend and database were presented to and confirmed by the client, not assumed.
