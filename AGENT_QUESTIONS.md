# AGENT_QUESTIONS.md

This document tracks questions, architectural considerations, and assumptions requiring confirmation as mandated by `docs/Ficcadocompleterebuild.md`.

---

## Open Questions

*(All current questions resolved. New questions will be listed here as phases progress.)*

---

## Resolved Questions / Decisions Log

### [RESOLVED] Q-001: Brand Check Script & Requirement Document Allowlist
- **Decision:** **Option A (tightly scoped)**
- **Details:**
  - Added only the exact relative path `'../docs/Ficcadocompleterebuild.md'` to `ALLOWED_FILES` in `website/scripts/check-brand.mjs`. Never use wildcards or allow the entire folder.
  - Zero tolerance for incorrect brand spellings elsewhere across all code, configs, comments, UI text, and documentation.
  - Retained historical allowances (`../docs/briefs/...`, `../docs/memory.md`).

---

### [RESOLVED] Q-002: Root-level `.gitignore`
- **Decision:** **Option A**
- **Details:**
  - Small root `.gitignore` covering OS/editor files (`.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`).
  - Added `.env`, `.env.local`, `*.env`, and `target/` at root level as a safety net.
  - Kept `.env.example` tracked.
  - No changes to subproject `.gitignore` files.

---

### [RESOLVED] Q-003: Website Import Directory Structure
- **Decision:** **Option A (Adopted & Confirmed)**
- **Details:**
  - Next.js website files are placed directly under top-level `website/` (`website/package.json`, `website/src`, etc.).
  - Verified `package.json` scripts, `../docs` paths in brand check, device-checker routes, and test runners function correctly.

---

### [RESOLVED] Q-004: Ficcado-Data Public / Website Product Read Endpoints
- **Decision:** **Option A with strict rules**
- **Details:**
  - Add `PublicItemController` under `/api/public/products` (or `/api/public/items`), reusing existing `ItemService` methods.
  - Do NOT modify `/api/items/**` admin endpoints.
  - Expose ONLY `ACTIVE` items (inactive items return HTTP 404).
  - Use dedicated response DTOs (never return entities). No cost price, vendor data, or exact quantities. Expose retail price, sizes, images in order, ratings, review counts, and boolean in-stock flags derived from `Inventory`.
  - Public reviews: approved only, no phone/email, customer name formatted as first name + initial.
  - Minimal logged edit to `SecurityConfig.java` to permit `GET /api/public/products/**`.

---

### [RESOLVED] Q-005: Customer Lookup by Email & Customer Authentication in Ficcado-Data
- **Decision:** **Option A with strict security rules**
- **Details:**
  - Add `findByEmailIdIgnoreCase` and `existsByEmailIdIgnoreCase` to `CustomerRepository` (additive, no schema changes). Enforce email uniqueness at service level.
  - Customer JWTs must never work as Admin tokens. Use `ROLE_CUSTOMER`, distinct claims/audience, and a separate cookie name (e.g. `ficcado_customer_session`). Admin endpoints reject customer tokens; customer endpoints reject admin tokens.
  - Existing CRM-created customers without passwords: do NOT allow password setting until email is verified via OTP. Never reveal email registration existence in login/OTP responses.
  - Phone number is mandatory at sign-up (CRM unique identifier).
  - OTP split: Ficcado-Website-Data generates, emails, and verifies OTP. Ficcado-Data sets `emailVerifiedAt` and issues JWT via an internal endpoint (`/api/internal/**`) protected by `INTERNAL_API_KEY` (blocked from public access by NGINX gateway).
  - Password rules: BCrypt, minimum length and strength check, lockout/throttling on failures.
  - Customer endpoints derive customer identity strictly from JWT.

---

### [RESOLVED] Q-006: Website Order Placement Endpoint
- **Decision:** **Option A (Phase 6, Internal Server-Side Creation)**
- **Details:**
  - Order endpoint does NOT trust client-supplied prices, totals, payment status, or transaction IDs. Server recalculates prices and totals from catalog `Item` data.
  - Online payments only (Razorpay): sale created ONLY after payment is verified by Ficcado-Payment-Gateway-Data. Payment gateway calls `/api/internal/**` on Ficcado-Data using a shared secret. Abandoned payments never reduce stock. Reuses existing `saleService.createSale(sale, null)`.
  - Idempotency via transactionId lookup to prevent duplicate sales or stock deductions on retries/webhooks.
  - Out of stock after payment triggers refund flow.
  - Reuse existing invoice-number generation.
  - Attach sales to customer account using stored account data.
  - **No Cash on Delivery (COD)**: Website is online payment (Razorpay) only.
  - Implementation deferred to **Phase 6**.

---

### [RESOLVED] Q-007: Ficcado-Data Port Alignment
- **Decision:** **Port 8081 (Retained, decided by developer)**
- **Details:**
  - Ficcado-Data and CRM stay on port **8081** (default in `application.yaml`). Port 8080 is NOT used by this project.
  - Port assignments:
    - Ficcado-Data: `8081`
    - Ficcado-Website-Data: `8082`
    - Ficcado-Payment-Gateway-Data: `8083`
    - NGINX Gateway: `8000`
    - Website: `3000`
  - Updated `docs/Ficcadocompleterebuild.md` to reflect port 8081 and online payment only (no COD).
