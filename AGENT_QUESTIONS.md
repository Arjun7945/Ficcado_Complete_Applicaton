# AGENT_QUESTIONS.md

This document tracks questions, architectural considerations, and assumptions requiring confirmation as mandated by `docs/Ficcadocompleterebuild.md`.

---

## Open Questions

### Q-001: Brand Check Script & Requirement Document Allowlist
- **Context:**
  `website/scripts/check-brand.mjs` scans `['src', 'public', '../docs']` for forbidden brand misspellings. It flags two occurrences in `docs/Ficcadocompleterebuild.md` where the forbidden spelling was cited explicitly in the prompt instructions:
  - Line 3: `Never write "Ficado" in code...`
  - Line 298: `- [ ] Zero occurrences of "Ficado" anywhere`
- **Options:**
  1. **Option A (Recommended):** Add `../docs/Ficcadocompleterebuild.md` to `ALLOWED_FILES` in `website/scripts/check-brand.mjs`. This matches how other specification/brief documents (`../docs/briefs/AGENT_BRIEF.md`, `../docs/memory.md`, etc.) are already handled in `ALLOWED_FILES`.
  2. **Option B:** Rephrase the prompt document `docs/Ficcadocompleterebuild.md` so it does not contain the literal word (e.g., referring to "single-C misspelling").
- **Recommended Default:** Option A (add `../docs/Ficcadocompleterebuild.md` to `ALLOWED_FILES` in `check-brand.mjs` while ensuring all other code, comments, configs, and UI files have zero occurrences).

---

### Q-002: Root-level `.gitignore`
- **Context:**
  Neither `origin/fic/crm` nor `origin/fic/website` contained a root-level `.gitignore` file (only project subdirectories like `website/`, `crm/ficcado_crm_app/`, and `crm/backend/ficcado_crm_backend/` had local `.gitignore` files).
- **Options:**
  1. **Option A (Recommended):** Add a lightweight root-level `.gitignore` covering OS/editor files (`.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`) without interfering with subprojects.
  2. **Option B:** Rely strictly on per-project `.gitignore` files in each service directory.
- **Recommended Default:** Option A.

---

### Q-003: Website Import Directory Structure
- **Context:**
  The website code on `fic/website` was located under `frontend/ficcado-website-frontend`. In `docs/Ficcadocompleterebuild.md`, the target layout specifies `website/` (imported from `fic/website`).
- **Options:**
  1. **Option A (Adopted):** Placed the Next.js website files directly under `website/` (`website/package.json`, `website/src`, etc.) matching the structure of `crm/ficcado_crm_app/`.
  2. **Option B:** Retain the nested `website/ficcado-website-frontend/` directory.
- **Recommended Default:** Option A keeps a clean root layout consistent with `crm/`, `ficcado_website_data/`, `gateway/`, etc.

---

### Q-004: Ficcado-Data Public / Website Product Read Endpoints (Phase 4 Gap)
- **Context:**
  All existing endpoints in `ItemController` (`/api/items/**`) require Spring Security Admin authentication. The website storefront needs read access to active products, images, and sizes.
- **Options:**
  1. **Option A (Recommended):** Add an additive controller in a new file (e.g. `PublicItemController.java` mapped to `/api/public/items` or `/api/public/products`) that reuses `itemService.getActiveItemsWithSizes()` and permits unauthenticated access in `SecurityConfig.java`.
  2. **Option B:** Expose `/api/items/active` and `/api/items/{id}` directly in `SecurityConfig.java` permitAll list.
- **Recommended Default:** Option A follows the additive architecture rule without modifying existing admin endpoint behavior.

---

### Q-005: Customer Lookup by Email & Customer Authentication in Ficcado-Data (Phase 5 Gap)
- **Context:**
  Customers authenticate using email as primary identifier. The `Customer` table already possesses `email_id` and `password_hash`, but `CustomerRepository` currently only queries by `phoneNumber`.
- **Options:**
  1. **Option A (Recommended):** Add additive repository queries `findByEmailIdIgnoreCase(String email)` and `existsByEmailIdIgnoreCase(String email)` to `CustomerRepository`, and add a dedicated `CustomerAuthService` / `CustomerAuthController` for customer signup and password verification.
  2. **Option B:** Perform in-memory filtering of customers by email.
- **Recommended Default:** Option A (indexed database query).

---

### Q-006: Website Sale Placement Endpoint (Phase 6 Gap)
- **Context:**
  `SaleController.create` is secured with `@PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN')")`.
- **Options:**
  1. **Option A (Recommended):** Provide an additive endpoint (e.g. in `PublicOrderController.java` or `WebsiteOrderController.java`) accepting public/customer order requests, validating items and payment status, and invoking the existing `saleService.createSale(sale, null)`.
- **Recommended Default:** Option A.

---

### Q-007: Ficcado-Data Port Default
- **Context:**
  `crm/backend/ficcado_crm_backend/src/main/resources/application.yaml` has `${PORT:8081}`, but `docs/Ficcadocompleterebuild.md` mandates port **8080**.
- **Options:**
  1. **Option A (Recommended):** Set environment variable `PORT=8080` (and update default in `application.yaml` to 8080).
- **Recommended Default:** Option A.

---

## Resolved Questions / Decisions Log
*(None yet)*
