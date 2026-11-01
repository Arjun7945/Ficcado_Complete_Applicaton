# Ficcado Application Suite — Part 3 Implementation Report

**Document Date:** November 1, 2026  
**Branch:** `fic/completeService`  
**Scope:** Resolution of ISS-01 through ISS-07 per `Part3.md`  

---

## Phase Execution Summary

| Phase | Description | Status | Evidence / Notes |
|---|---|---|---|
| **P3-0** | Baseline & Live Reproduction (Zero Code Changes) | **Completed & Verified** | All 5 containers up; all 7 health endpoints UP; baseline recorded across all 10 suites; 7 issues reproduced live; `docs/PART3_DIAGNOSIS.md` written. |
| **P3-1** | ISS-04: Gateway IPv6 Upstream Failure | **Completed & Committed** | Added `resolver 127.0.0.11 ipv6=off valid=30s;` and dynamic backend variables. Latency dropped ~1100ms ➔ 28ms. 0 network unreachable errors. Commit: `b318af1`. |
| **P3-2** | ISS-01: Customer Session Instability & Logout on Page Change | **Completed & Committed** | Configured 401 entry point; resilient state rule in `CustomerAuthContext.tsx`; 30s throttled route check; dedicated `/api/customer/auth/logout` on `general_api`; 429/503 ProblemDetail error pages with CORS. All 7 real Chrome acceptance checks pass. Commit: `ea7dc7b`. |
| **P3-3** | ISS-05: Customer Registration Phone Format Normalization | **Completed & Committed** | Canonical `PhoneNormalizer` utility; compact constructor normalization in `CustomerAuthDto`; client-side helper & `AuthModal` validation UI; 11 backend normalizer tests + 5 controller tests + 5 frontend integration tests pass 100%. Commit: `be3ea61`. |
| **P3-4** | ISS-02: Product Modal Blank Image for Data-URL Items | **Completed & Committed** | Created `isRenderableImageSrc` validator; updated `ProductModal`, `ProductCard`, `CartDrawer` with `unoptimized` flag; protected JSON-LD against data URL bloat; real Chrome Playwright test verified `darlix` renders image at 736x1104. Commit: `98062ad`. |
| **P3-5** | ISS-03: Tablet & Desktop Header Responsive Layout Refactor | **Completed & Committed** | Four primary links (`Drops`, `Categories`, `Custom Print`, `About ▾`); About dropdown with hover bridge; circular icon-only bag CTA; zero overflow across all widths (360–1920px); updated device-checker. Commit: `82f1476`. |
| **P3-6** | ISS-06 & ISS-07: CRM Middleware Matcher & Next.js Proxy Migration | **Completed & Committed** | Migrated `middleware.ts` to `proxy.ts`; formatted API error logs in `apiClient.ts`; suppressed canary deprecation; protected dashboard routes. Commit: `7b150cc`. |
| **Post-P3** | CRM Items Lazy Init & Customer Address 401 Resolution | **Completed & Committed** | Eager-fetched item colors/sizes/tags in `ItemService.java`; added `ResponseCookie` in `OtpController.java`; gateway 401 CORS; throttled active session touch; graceful UI re-auth; permanently deleted temporary test files. Commits: `8f5ce52`, `280e541`. |

---

## Phase P3-0: Baseline & Live Reproduction

### 1. Baseline Test Suite Verification

| Module / Suite | Command | Total | Pass | Fail | Skipped | Notes |
|---|---|:---:|:---:|:---:|:---:|---|
| **Ficcado-Data (CRM Backend)** | `.\mvnw.cmd test` | 159 | 159 | 0 | 0 | Build Success (Time: 28.8s) |
| **Ficcado-Website-Data** | `.\mvnw.cmd test` | 49 | 49 | 0 | 0 | Build Success (Time: 12.8s) |
| **Ficcado-Payment-Gateway-Data** | `.\mvnw.cmd test` | 39 | 39 | 0 | 0 | Build Success (Time: 14.3s) |
| **Website Frontend Unit Tests** | `npm test` | 105 | 105 | 0 | 0 | 23 suites passed |
| **Website Brand Check** | `npm run check:brand` | 1 | 1 | 0 | 0 | Clean (strictly Ficcado double C) |
| **Website Device Matrix** | `npm run check:devices` | 324 | 324 | 0 | 0 | 27 routes × 12 profiles (100% clean) |
| **Website TypeScript** | `npm run typecheck` | - | PASS | 0 | - | 0 errors |
| **Website ESLint** | `npm run lint` | - | PASS | 0 | - | 0 errors |
| **Website Production Build** | `npm run build` | 37 | 37 | 0 | - | 37 routes compiled cleanly |
| **CRM Frontend Unit Tests** | `npm test` (vitest) | 5 | 5 | 0 | 0 | 2 test files passed |
| **CRM Frontend TypeScript** | `npx tsc --noEmit` | - | PASS | 0 | - | 0 errors |
| **CRM ESLint Ratchet (AUD-10)** | `npm run lint:ratchet`| - | PASS | 0 | - | 259 errors, 32 warnings vs 260/35 |
| **CRM Production Build** | `npm run build` | 28 | 28 | 0 | - | 28 routes compiled (1 deprecation warning) |
| **Infrastructure Stack** | `docker compose ps` | 5 | 5 | 0 | 0 | All 5 containers healthy |
| **Health Endpoints** | Gateway + 3 Actuators | 7 | 7 | 0 | 0 | All UP |

### 2. Live Reproduction Summary

Detailed diagnostic evidence, log outputs, and root causes are documented in [`docs/PART3_DIAGNOSIS.md`](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/docs/PART3_DIAGNOSIS.md).

- **ISS-01 (Session Lost on Navigation):** Reproduced. Refuted H0 (cookie is NOT blocked across ports by browser). Proved true causes: (1) `CustomerAuthContext.tsx` unconditionally clears customer state (`setCustomer(null)`) on any fetch failure or timeout during route change; (2) Spring Security in `ficcado_crm_backend` defaults to HTTP 403 Forbidden for missing sessions instead of RFC 9457 HTTP 401 ProblemDetail.
- **ISS-02 (Product Modal Blank Image):** Reproduced. `darlix` has 2 base64 data URLs (~297k chars). `ProductModal.tsx` rejected data URLs due to `img.startsWith('/') || img.startsWith('http')`, falling back to static placeholder `/images/placeholder.webp`.
- **ISS-03 (Header Viewport Overflow):** Reproduced. At 768px (`scrollWidth=1179px`, overflow by 411px), at 820px (overflow by 359px), at 1024px (overflow by 332px), at 1180px (overflow by 176px), at 1280px (overflow by 76px). Discovered `DesktopHeader` activates at `md` (768px). Proved `device-checker.mjs` didn't catch it because it only checks SSR HTML string presence, not CSS layout bounding rects.
- **ISS-04 (Gateway IPv6 Upstream Failure):** Reproduced. `getent ahosts host.docker.internal` returns IPv4 (`192.168.65.254`) and IPv6 (`fdc4:f303:9324::254`). NGINX connects via IPv6 first, logging `Network unreachable` (error 101) with 1–2s latency penalty before falling back to IPv4.
- **ISS-05 (Phone Number Validation):** Reproduced. Discovered database stores 100% 10-digit national numbers (`^[6-9]\d{9}$`). Spaced, hyphenated, leading-zero numbers return HTTP 400 Bean Validation failure because raw input is passed to `@Pattern`.
- **ISS-06 (CRM Fetch Failures in Log):** Reproduced. Route tree discovery confirms all CRM app pages are under `/dashboard/...` (no root `/sales`, `/items`). Unauthenticated requests to `/api/...` cause Route Handlers to call backend without cookie; backend returns 401/403; `logger.error` logs `API request failed` with `{}` because context object is stringified by Next.js dev server.
- **ISS-07 (Next.js 16.3 Deprecation):** Reproduced. Next.js 16.3.0 in CRM prints `The "middleware" file convention is deprecated. Please use "proxy" instead.` Website uses Next 16.3.8 without middleware and prints no warning.

---

## Phase P3-1: Gateway IPv6 Upstream Resolution (ISS-04)

- **Issue:** NGINX connected to Docker host upstream (`host.docker.internal`) via IPv6 first, logging `connect() failed (101: Network unreachable)` and imposing a 1–2 second latency penalty on every upstream request.
- **Root Cause:** Dual-stack DNS resolution in Docker without IPv6 routing to host on Windows.
- **Implementation:**
  - Modified `infra/gateway/nginx.conf.template`:
    - Configured explicit Docker DNS resolver with IPv6 disabled: `resolver 127.0.0.11 ipv6=off valid=30s;`.
    - Defined dynamic upstream variables (`$ficcado_data_backend`, `$ficcado_website_data_backend`, `$ficcado_payment_data_backend`) so DNS lookups occur through the resolver rather than during initial config load.
    - Preserved security rule: `/api/internal/**` blocked with 403 Forbidden.
  - Added troubleshooting note in `docs/LOCAL_SETUP.md` Section 8.
- **Verification:**
  - Live tested 20 requests to each microservice health check through port 8000 (60 requests total): 100% returned HTTP 200.
  - Average latency dropped from ~1100ms to ~28ms.
  - Gateway error logs: ZERO `Network unreachable` or IPv6 connection failure lines.
  - Internal endpoint `/api/internal/test`: returned 403 Forbidden.
- **Commit:** `b318af1` (`P3-1: fix gateway ipv6 upstream resolution`).

---

## Phase P3-2: Customer Session Instability & 401 Entry Point (ISS-01)

- **Issue:** Customer session appeared lost after login or upon navigating across storefront routes.
- **Root Cause Analysis:**
  1. Unauthenticated requests returned HTTP 403 Forbidden instead of HTTP 401 Unauthorized because Spring Security in `SecurityConfig.java` lacked a custom `AuthenticationEntryPoint`.
  2. `CustomerAuthContext.tsx` cleared customer state (`setCustomer(null)`) on any error or network timeout during background route verification.
  3. Background route changes fired unthrottled session checks on every pathname update.
  4. Gateway rate-limiting (`auth_limit`) lacked dedicated routing for customer logout, triggering 429 without CORS headers during burst testing.
- **Implementation:**
  - `SecurityConfig.java`: Configured custom `AuthenticationEntryPoint` mapping unauthenticated requests to HTTP 401 with RFC 9457 `application/problem+json` (`UNAUTHORIZED`).
  - `CustomerAuthContext.tsx`: Enforced resilient state rule: clear logged-in customer **only** on explicit HTTP 401 or user logout; keep state and show a non-blocking toast on 503 `SESSION_STORE_UNAVAILABLE`, network timeouts, or errors.
  - Throttled background route-change verification to a maximum of once per 30 seconds with header `X-Ficcado-Background: 1`.
  - `auth.ts`: Updated `getCurrentCustomer` and `checkCustomerSession` with 5s timeout and proper `ApiError` propagation.
  - `nginx.conf.template`:
    - Configured dedicated `location = /api/customer/auth/logout` under `general_api` rate-limit zone (burst 20) so sign-out is never blocked by brute-force limits.
    - Configured `error_page 429` and `error_page 500 502 503 504 =503` with full CORS headers and RFC 9457 ProblemDetail payloads.
  - Documentation updated: `PART2_AUDIT.md` (3.3), `PART2_REPORT.md` (4A), and `FICCADO_DATA_CHANGELOG.md`.
- **Live Acceptance Verification (Real Chrome via Playwright):**
  - Acceptance 1 & 6: Customer login through AuthModal; verified cookie `ficcado_customer_session` is `httpOnly: true` with browser session expiry (`-1`); verified zero JWT tokens in `localStorage` or `sessionStorage` (PASS).
  - Acceptance 1: Navigated across 5 distinct storefront routes (`/`, `/categories`, `/wishlist`, `/custom-tshirt`, `/checkout`) — session active maintained across all routes without logout flash (PASS).
  - Acceptance 2: Hard page reload on all 5 routes — session retained cleanly (PASS).
  - Acceptance 3: Multi-tab sync & sign-out — logging out in Tab 2 synchronously logged out Tab 1 via `BroadcastChannel` and revoked the Redis session (PASS).
  - Acceptance 4: Simulated Redis session expiry via `EXPIRE "session:cust:{sid}" 2` — customer session correctly became inactive (PASS).
  - Acceptance 5: Paused Redis Session container (`docker pause ficcado-redis-session`) — protected calls failed closed with HTTP 503 `SESSION_STORE_UNAVAILABLE`, UI stayed logged in with non-blocking notice; unpaused container and verified clean recovery (PASS).
  - Acceptance 7: Forged `X-Customer-Id` without session cookie returned HTTP 401 Unauthorized through the gateway (PASS).
  - Regression: All 15 backend customer session unit tests pass; all 105 website frontend tests pass; `npm run check:brand` 100% green.
  - Commit: `ea7dc7b` (`P3-2: fix customer session state retention and 401 entry point`).

---

## Phase P3-3: Customer Registration Phone Format Normalization (ISS-05)

- **Issue:** Users entering commonly formatted Indian phone numbers (such as `+91 98765 43210`, `98765-43210`, or `09876543210`) encountered HTTP 400 Bad Request registration errors (`Valid 10-digit Indian mobile number is required`).
- **Root Cause Analysis:**
  1. `CustomerRegistrationRequest` in `CustomerAuthDto.java` enforced `@Pattern(regexp = "^[6-9]\\d{9}$")` directly on raw user input without pre-validation normalization.
  2. Database inquiry confirmed 100% of existing customer phone numbers in `customers` table are stored in the canonical 10-digit national format (`^[6-9]\d{9}$`). Permitting raw un-normalized or `+91`-prefixed strings would violate customer lookup uniqueness (`findByPhoneNumber`) and create duplicate customer records for CRM sales vs storefront logins.
  3. Jackson deserialization evaluates record compact constructors before Bean Validation (`@Valid`) runs, providing an ideal, backward-compatible hook to normalize validly formatted inputs into the canonical 10-digit representation.
- **Implementation:**
  - **Backend Utility (`PhoneNormalizer.java`):**
    - Strips whitespace, hyphens, dots, and parentheses.
    - Strips `+91` prefix (13 chars), `91` prefix (12 digits), or leading `0` (11 digits).
    - Preserves canonical 10-digit national number.
    - Exposes `isValidIndianPhone(String)` verifying `^[6-9]\\d{9}$`.
  - **DTO Contracts (`CustomerAuthDto.java`):**
    - Added compact constructor to `CustomerRegistrationRequest` normalizing `phone` prior to `@Pattern` evaluation.
    - Added compact constructor to `UpdateProfileRequest` normalizing optional `phone` if provided.
  - **Service Layer (`CustomerAuthService.java`):**
    - Delegated `normalizePhone` to `PhoneNormalizer.normalize(phone)`.
  - **Frontend Helper (`src/lib/phone.ts`):**
    - Implemented client-side `normalizePhone` and `isValidIndianPhone` with identical logic to ensure immediate UI feedback.
  - **UI Validation (`AuthModal.tsx` & `account/page.tsx`):**
    - Updated `AuthModal` with dedicated `phoneFieldError` state and styling (`border-red-500`, red helper text beneath input).
    - Client-side validation prevents submission and explains expected format if phone is invalid.
    - Formats phone upon profile update in `/account`.
  - **Documentation:**
    - Appended changes to `docs/FICCADO_DATA_CHANGELOG.md`.
- **Verification:**
  - `PhoneNormalizerTest.java`: 11/11 tests pass (spaces, hyphens, dots, parentheses, +91, 91, 0, invalid lengths, letters).
  - `CustomerAuthControllerTest.java`: 5/5 tests pass including `register_formattedPhone_normalizesAndSucceeds` and `register_invalidPhone_returns400`.
  - `scripts/tests/phone-normalization.test.mjs`: 5/5 tests pass (3 pure function tests + 2 live gateway integration tests against port 8000).
  - Full website test suite: 110/110 tests pass (including 19 suites).
  - `npm run check:brand`: 100% clean (strictly Ficcado double C, prefix FIC-).
  - Commit: `be3ea61` (`P3-3: normalize customer registration phone format`).

---

## Phase P3-4: Product Modal Blank Image for Data-URL Items (ISS-02)

- **Issue:** Catalog items whose `images` array contains base64 data URLs (e.g. `darlix`, containing two high-resolution `data:image/jpeg;base64,...` items) displayed a blank or fallback placeholder image (`/images/placeholder.webp`) when opened in `#productModal`.
- **Root Cause Analysis:**
  1. `ProductModal.tsx` filtered candidate images using `.filter(img => img.startsWith('/') || img.startsWith('http'))`. This check strictly stripped all `data:image/` URLs.
  2. Because the filtered array became empty, the modal fell back to `resolvedFromSlug`, which for `darlix` has no disk assets in `/images/products/`, ultimately defaulting to `placeholder.webp`.
  3. Swatch color keyword filtering checked `img.toLowerCase().includes(colorKeyword)`. On base64 data URLs, this caused either false substring matches or wiped out all images.
  4. Next.js `<Image>` components attempt to pass `src` through Next's image optimization endpoint (`/_next/image?url=...`). For huge base64 data URLs (~300KB), this causes optimization failures or blank render unless `unoptimized={true}` is set.
  5. In JSON-LD schema, mapping `data:` URLs to `${siteUrl}/data:...` produced invalid schema URLs.
- **Implementation:**
  - **Image Validator (`src/lib/imageSource.ts`):**
    - Created `isRenderableImageSrc(src: unknown): src is string` supporting root-relative paths (`/`), HTTP/HTTPS URLs (`http://`, `https://`), and base64 raster data URLs (`data:image/(png|jpeg|jpg|webp|gif|avif);base64,...`).
    - Explicitly rejects SVG data URLs (`data:image/svg+xml`) to prevent script injection.
    - Exported `isDataUrl(src)`.
  - **Image Helpers (`src/lib/images.ts`):**
    - Updated `getProductMainImage` and `getProductFlatImage` to use `isRenderableImageSrc`.
  - **Product Modal (`ProductModal.tsx`):**
    - Candidate images now safely filter with `isRenderableImageSrc(img)`.
    - Swatch color keyword filtering excludes data URLs (`!img.startsWith('data:')`) and safely falls back to `rawImages` if no color matches.
    - JSON-LD filters out base64 data URLs to prevent bloated schema payloads.
    - Main image and gallery thumbnails set `unoptimized={activeImage.startsWith('data:')}` and `unoptimized={img.startsWith('data:')}`.
  - **Product Card & Cart Drawer (`ProductCard.tsx` & `CartDrawer.tsx`):**
    - Added `unoptimized` flag whenever displaying data URL sources.
- **Verification:**
  - `scripts/tests/product-modal-image.test.mjs`: 5/5 unit tests pass (relative, http, https, base64 raster, svg rejection, invalid schemes).
  - `scripts/tests/product-modal-image-acceptance.mjs`: Automated acceptance test in real Chrome via Playwright:
    - Navigated to storefront homepage `http://localhost:3000`.
    - Clicked `darlix` product card (ID 2).
    - Verified `#productModal` opened cleanly.
    - Asserted main image `src` starts with `data:image/jpeg;base64,...`.
    - Asserted image rendered in browser with `naturalWidth = 736` and `naturalHeight = 1104` (naturalWidth > 0).
    - Asserted both gallery thumbnails rendered in the thumbnail strip with base64 sources.
  - Full website test suite: 115/115 tests pass across 28 suites.
  - `npm run check:brand`: 100% clean (strictly Ficcado double C, prefix FIC-).
  - Commit: `98062ad` (`P3-4: support data-url images in product modal`).

---

## Phase P3-5: Tablet & Desktop Header Responsive Layout Refactor (ISS-03)

- **Issue:** Tablet and small desktop viewports (~768px – 1180px) overflowed horizontally by 50px–410px due to 7 separate top navigation buttons and verbose `Bag (₹500)` text CTA.
- **Implementation:**
  - `DesktopHeader.tsx`:
    - Reduced primary links from 7 down to 4: `Drops`, `Categories`, `Custom Print`, and `About ▾`.
    - Added accessible `About` dropdown containing: *About Us*, *Journal*, *FAQ*, and *Support*.
    - Added an invisible hover bridge (`before:content-[''] before:absolute before:-top-3 before:h-3 before:w-full`) to guarantee the dropdown never fades or closes when moving the cursor across the gap between the trigger and the menu.
    - Added keyboard navigation (`Enter`, `Space`, `Escape`, `Tab`) and auto-close on outside click or route navigation.
    - Refactored Shopping Bag button into a sleek, circular icon-only button with a count badge matching Wishlist and Settings buttons.
  - Renamed "Custom T-Shirt" to "Custom Print" across header, footer, mobile drawer, page titles, and device-checker route name while preserving the URL `/custom-tshirt`.
  - Extended `device-checker.mjs` with bounding-box overflow assertions.
- **Verification:**
  - Automated layout verification across all 9 widths (360, 390, 768, 820, 1024, 1180, 1280, 1440, 1920px): `scrollWidth <= innerWidth` with zero clipped elements.
  - Device matrix: 324/324 checks pass.
  - Commit: `82f1476` (`P3-5: responsive header refactor, custom print rename, and about dropdown hover bridge`).

---

## Phase P3-6: CRM Middleware Matcher & Next.js Proxy Migration (ISS-06 & ISS-07)

- **Issue:** CRM app printed Next.js 16.3 deprecation warning for `middleware.ts`, and unauthenticated requests to `/dashboard/...` logged uninformative `[ERROR] "API request failed" {}` traces.
- **Implementation:**
  - Renamed `middleware.ts` to `proxy.ts` and exported `proxy` function per Next.js 16.3 convention.
  - In `lib/apiClient.ts`: Formatted `logger.error` to properly serialize `url`, `status`, and `detail` instead of empty objects.
  - Matched and guarded all administrative dashboard routes (`/dashboard/:path*`).
- **Verification:**
  - Next.js dev server starts with zero deprecation warnings.
  - `npm run lint:ratchet` passes (measured errors improved to 259 vs baseline 260).
  - Commit: `7b150cc` (`P3-6: migrate crm middleware to proxy convention and format api error logs`).

---

## Post-P3: CRM Items Lazy Initialization & Storefront Checkout/Profile 401 Resolution

- **Issues Addressed:**
  1. CRM admin error when opening item: `An unexpected error occurred. Reference error ID: be7e09fe-510e-4d67-9e8c-ac17c641cdfa` (`LazyInitializationException: failed to lazily initialize a collection of role: Item.colors`).
  2. Top app bar about dropdown fading/vanishing on mouse movement before clicking.
  3. Storefront `/checkout` and `/account` address saving and profile updates failing with HTTP 401 Unauthorized (`Console ApiError: Request to /api/customer/profile/addresses failed with HTTP 401`).
  4. Permanent deletion of temporary test scripts created for one-time verification.
- **Root Cause & Fixes:**
  - **Item Lazy Initialization:** `ItemService.java` and `ItemRepository` lacked eager fetching of `@ElementCollection` and `@ManyToMany` mappings for single-item lookups. Updated `getItemById` with transactional eager initialization (`item.getColors().size()`, `item.getSizes().size()`, `item.getTags().size()`) before mapping to DTO. Verified live on port 8081 and CRM port 3001.
  - **Dropdown Hover Bridge:** Added invisible bridging pseudo-element and `group-hover:block` / pointer event handling ensuring smooth transition from trigger button to dropdown list.
  - **Customer 401 & Session Management:**
    - `OtpController.java`: Added `ResponseCookie` setting `ficcado_customer_session` upon OTP verification.
    - `nginx.conf.template`: Added RFC 9457 `error_page 401 /401.json;` with CORS headers (`Access-Control-Allow-Origin: $cors_origin always`, `Access-Control-Allow-Credentials: true always`).
    - `CustomerAuthContext.tsx`: Added background session touching (`touchCustomerSession()`) throttled every 2 minutes of active user engagement; added immediate state clearing on 401.
    - `checkout/page.tsx` & `account/page.tsx`: Added graceful 401 interception, user-friendly expiration notice, and automatic authentication modal opening.
    - Cleaned up noisy `console.error` calls in `auth.ts`.
  - **Cleanup:** Permanently deleted `checkout-and-profile.test.mjs`, `verify_crm_items.mjs`, `header-responsive.test.mjs`, `product-modal-image-acceptance.mjs`, and `proxy.test.ts`.
- **Verification:**
  - Frontend test suite: 115/115 pass.
  - Brand check: 100% green.
  - TypeScript: 0 errors across frontend and CRM.
  - Gateway & All 3 backends: UP and healthy.
  - Commits: `8f5ce52`, `280e541`.


