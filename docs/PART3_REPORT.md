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
| **P3-2** | ISS-01: Customer Session Instability & Logout on Page Change | **Completed & Verified** | Configured 401 entry point; resilient state rule in `CustomerAuthContext.tsx`; 30s throttled route check; dedicated `/api/customer/auth/logout` on `general_api`; 429/503 ProblemDetail error pages with CORS. All 7 real Chrome acceptance checks pass. |
| **P3-3** | ISS-05: Customer Registration Phone Format Normalization | *Next Up* | |
| **P3-4** | ISS-02: Product Modal Blank Image for Data-URL Items | *Pending* | |
| **P3-5** | ISS-03: Tablet & Desktop Header Responsive Layout Refactor | *Pending* | |
| **P3-6** | ISS-06 & ISS-07: CRM Middleware Matcher & Next.js Proxy Migration | *Pending* | |
| **P3-7** | Live End-to-End Proof, Regression & Documentation | *Pending* | |

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
