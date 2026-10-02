# Ficcado — Part 13.5: Shared Enums for Every CRM Dropdown (No Converter/Parser Layer)
### (For the Antigravity Agent — Senior Engineer Design Spec)

> **Builds on** `part12_migration_ficcado.md` (the OpenAPI generation pipeline this document depends on) and `part13_of_implementation_ficcado.md` (marked complete). Treat this as **Phase 133 onward**.

---

## 0. The Problem, Stated Plainly

The backend already defines proper Java enumerations for status/category fields. The frontend has dropdowns representing the same values. Instead of the frontend simply **using the backend's own enum values directly** (which is exactly what the OpenAPI code-generation pipeline from Part 12 exists to provide), a separate layer of custom converter/parser files was built to translate between an independently-typed frontend string and the backend's enum — e.g., a dropdown emitting `"In Transit"` on one side, and a parser file trying to match that string to `IN_TRANSIT` on the other.

**This is the exact problem, and it's not a minor style preference:** two independently-maintained vocabularies for the same concept will eventually drift out of sync — someone adds a new backend enum value, forgets to update the converter, and a dropdown selection either silently fails, sends the wrong value, or throws a runtime error the user sees as "the code failed." The fix is architectural, not a patch: **there should only ever be one definition of each enum, in the backend, and the frontend should consume it directly through the already-established OpenAPI generation pipeline.** No converter, no parser, no second hand-maintained list of the same values, anywhere.

---

## 1. Known Dropdown/Enum Inventory — Starting Checklist, Not Exhaustive

Compiled from every prior document as a concrete starting point. **The agent must also independently audit the actual codebase** for any dropdown not listed here (anything built since these documents were written, or anything missed) — this list is a floor, not a ceiling:

| Enum | Values (approximate, verify against the actual current spec/code) |
|---|---|
| Item Current Status | In Stock, Out of Stock |
| Sale Status | Purchase Satisfied and Order Completed, Return/Refund on Specific Item(s), Return/Refund on all Items, Replacement Completed and Purchase Satisfied |
| Delivery Status | Packed and Ready for Shipment, In Transit, Order Delivered Successfully, Order Missing, Order Failed to Deliver and Returning Back, Specific Item(s) Returning, All Items Returning Back |
| Payment Status | Paid, Not Paid, Credit |
| Mode of Payment / Refund Mode | Cash, UPI, Card, Bank Transfer |
| Replacement Status | Replacement Approved, Replacement Dispatched, Replacement Received, Satisfied/Completed Order |
| Item Verification Status | Good — Accepted for Return, Damaged — Cannot Accept Return, Not Received — In Transit |
| Item Disposition Path | Return to Inventory/Warehouse Stock, Send to Damaged Products Log |
| Refund Status | Approved, Completed, (and whatever pending/other states already exist in code) |
| Reason for Return/Refund | Wrong Size / Fit, Damaged or Defective Product, Wrong Product Received, Product Doesn't Match Description / Photos, Not Satisfied with Quality, OTHER |
| Expense Category | Vendor Sourcing/Travel, Printing, Marketing/Promotion, Packing, Other |
| Vendor Type | Courier Partner, Designer, Printing, Marketing, Other |
| Admin Role | Admin, Superadmin |
| Profitability Period Type | Today, Last 7 Days, This Month, Custom, Daily, Weekly, Monthly |

**Not in scope for this document** — dropdowns whose options come from **live data**, not a fixed set of code-defined values (e.g., "which admin/handler" for Fulfilment Source or Restock Destination, "which item" for a sale line, "which vendor" for a payment). Those are correctly driven by a database query and an ID, and don't have the same-vocabulary problem this document addresses — don't force them into enums.

---

## 2. Backend: One Proper Enum Per Concept

- Every value in Section 1's table (and anything else the audit finds) must be a real Java `enum` type — never a plain `String` field validated by scattered manual checks, and never a magic-string constant repeated in multiple places.
- Store enums in the database as `@Enumerated(EnumType.STRING)`, **not** the default `EnumType.ORDINAL`. This is a common, easy-to-miss Hibernate mistake — ordinal storage saves the enum's *position number*, which silently corrupts existing data if anyone ever reorders or inserts a new value in the middle of the enum definition later. String storage is safe, readable directly in the database, and the only acceptable choice here.
- Use these enum types **directly as the field type in the REST DTOs** — not converted to a plain `String` in the DTO layer. This is the detail that makes everything else work: a DTO field typed as the actual enum is what causes `springdoc-openapi` to describe it as a proper `enum` schema (a finite, named list of allowed values) in the generated OpenAPI spec, rather than a generic, unconstrained string.

---

## 3. Verify the OpenAPI Spec Actually Reflects This

Don't assume — check the live `/v3/api-docs` output directly and confirm each enum from Section 1 appears as a proper `enum` array of string values on its corresponding DTO field, not as a bare `"type": "string"` with no constraint. If any enum doesn't show up correctly, the DTO field typing (Section 2) is the place to fix it, not the frontend.

---

## 4. Frontend: Use the Generated Enums Directly — No Independent Value Lists

- Regenerate the TypeScript client (per Part 12's established pipeline). Each backend enum should now produce a matching generated TypeScript enum or string-literal union type.
- Every dropdown in the application must use the **generated type** for: its option values, its bound form-state type, and the payload sent in the API request. No dropdown should have its own hand-typed list of option strings that happens to currently match the backend — "happens to match" is exactly the fragile state this document exists to eliminate.
- **Display labels are fine and expected — this is not the forbidden converter.** Showing a human-friendly label ("In Transit") while the underlying value bound to the form is the real enum identifier (`IN_TRANSIT`) is completely normal UI practice, not a parsing layer, as long as the label lookup is a simple static map colocated with the enum import — not logic that infers, guesses, or transforms a value. Recommended pattern: define the label map with a TypeScript exhaustiveness check (e.g., typed as `Record<DeliveryStatus, string>`) so that if a new value is ever added to the backend enum and the client regenerated, **the frontend fails to compile** until someone adds its label — catching a missed update at build time, not as a runtime failure a real user hits.

---

## 5. Remove the Existing Converter/Parser Layer Entirely

- Delete every existing "converter"/"parser" file built for this purpose — full removal, not commented out or left unreferenced. This is the same dead-code discipline already established throughout this project (`Ficcado-Production-Readiness-Audit-Protocol.md`, Section 1).
- Search the frontend codebase for any dropdown with a hand-typed option list duplicating a backend enum's values, and replace it with the generated type per Section 4.
- Confirm no code path still does a manual string-to-string translation between a "frontend value" and a "backend value" for any of the concepts in Section 1's table.

---

## Phase Checklist

### Phase 133 — Enum Inventory Audit
- [ ] Confirm/extend Section 1's list against the actual current codebase; identify every dropdown not already covered.

### Phase 134 — Backend Enum Standardization
- [ ] Convert every identified field to a proper Java `enum`, stored as `EnumType.STRING`, used directly (not stringified) in the corresponding DTOs.

### Phase 135 — OpenAPI Verification
- [ ] Confirm every enum appears correctly in the live `/v3/api-docs` spec.

### Phase 136 — Frontend Migration
- [ ] Regenerate the TypeScript client; migrate every dropdown to use the generated enum types directly, with the exhaustiveness-checked label-map pattern for display text.

### Phase 137 — Dead Code Removal
- [ ] Delete every converter/parser file and hand-typed duplicate option list found; confirm nothing remains.

### Phase 138 — Audit
- [ ] For at least three of the enums in Section 1 (e.g., Delivery Status, Item Verification Status, Reason for Return/Refund), manually test selecting every value in the frontend dropdown and confirm it round-trips correctly through the API with no manual translation involved.
- [ ] Confirm adding a hypothetical new enum value on the backend and regenerating the client produces a frontend compile error at the label map, not a silent runtime gap (verify the exhaustiveness check actually works as intended).
- [ ] Update `AGENT_PROGRESS.md` with a "PART 13.5 COMPLETE" entry.

---

## Definition of Done

- Every fixed-vocabulary dropdown in the CRM is backed by exactly one enum definition, in the backend, with no independent frontend copy of its values.
- No converter, parser, or manual string-translation file exists anywhere in the codebase for these values.
- Every such enum is stored as `EnumType.STRING` in the database.
- The frontend's display labels are a simple, exhaustiveness-checked lookup keyed directly off the generated enum type — never inferred or parsed.
- A new backend enum value surfaces as a frontend compile error (missing label) rather than a silent runtime mismatch, once the client is regenerated.