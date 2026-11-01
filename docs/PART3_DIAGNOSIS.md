# Part 3 Diagnosis Report (P3-0)

**Document Date:** November 1, 2026  
**Environment:** Live Running Stack (Infrastructure in Docker Compose, 3 Spring Boot Backends, 2 Next.js Frontends)  
**Execution Context:** Phase P3-0 Baseline & Live Issue Reproduction (Zero Code Changes)  

---

## 1. Baseline Test Suite Verification

All baseline suites were executed against the active repository and running stack. Real counts recorded below:

| Component / Suite | Command | Total | Pass | Fail | Skip | Notes |
|---|---|:---:|:---:|:---:|:---:|---|
| **Ficcado-Data (CRM Backend)** | `.\mvnw.cmd test` | 159 | 159 | 0 | 0 | Build Success (Time: 28.8s) |
| **Ficcado-Website-Data** | `.\mvnw.cmd test` | 49 | 49 | 0 | 0 | Build Success (Time: 12.8s) |
| **Ficcado-Payment-Gateway-Data** | `.\mvnw.cmd test` | 39 | 39 | 0 | 0 | Build Success (Time: 14.3s) |
| **Website Frontend Unit/Integ** | `npm test` | 105 | 105 | 0 | 0 | 23 suites passed cleanly |
| **Website Brand Check** | `npm run check:brand` | 1 | 1 | 0 | 0 | Clean (Ficcado double C strictly enforced) |
| **Website Device Matrix** | `npm run check:devices` | 324 | 324 | 0 | 0 | 27 routes × 12 device profiles (SSR checks) |
| **Website TypeScript** | `npm run typecheck` | - | PASS | 0 | - | 0 errors |
| **Website Lint** | `npm run lint` | - | PASS | 0 | - | 0 errors |
| **Website Production Build** | `npm run build` | 37 | 37 | 0 | - | All 37 routes compiled cleanly |
| **CRM Frontend Unit Tests** | `npm test` (vitest) | 5 | 5 | 0 | 0 | 2 test files passed |
| **CRM Frontend TypeScript** | `npx tsc --noEmit` | - | PASS | 0 | - | 0 errors |
| **CRM ESLint Ratchet (AUD-10)** | `npm run lint:ratchet`| - | PASS | 0 | - | 259 errors, 32 warnings (below 260/35 cap) |
| **CRM Production Build** | `npm run build` | 28 | 28 | 0 | - | 28 routes compiled (1 deprecation warning) |
| **Infrastructure Stack** | `docker compose ps` | 5 | 5 | 0 | 0 | All 5 containers healthy |
| **Health Endpoints** | Gateway + 3 Actuators | 7 | 7 | 0 | 0 | All return status UP |

---

## 2. Live Reproduction & Root Cause Analysis

### ISS-04: Gateway IPv6 Upstream Failure (`Network unreachable`)
- **Reproduced:** **YES**
- **Live Evidence:**
  1. `docker exec ficcado-gateway getent ahosts host.docker.internal` returned:
     ```
     192.168.65.254 STREAM host.docker.internal
     192.168.65.254 DGRAM  host.docker.internal
     fdc4:f303:9324::254 STREAM host.docker.internal
     fdc4:f303:9324::254 DGRAM  host.docker.internal
     ```
  2. Gateway container `/etc/hosts` contains both lines injected by Docker Desktop:
     ```
     192.168.65.254 host.docker.internal
     fdc4:f303:9324::254 host.docker.internal
     ```
  3. `docker compose logs gateway` logged 8 instances of:
     `connect() to [fdc4:f303:9324::254]:8081 failed (101: Network unreachable) while connecting to upstream`
- **True Root Cause:**
  NGINX resolves `host.docker.internal` via the container's glibc `getaddrinfo()`. RFC 6724 default rule sorts IPv6 addresses first. Because the Docker bridge network on Windows does not route IPv6 unique-local packets to the host, NGINX attempts connection to `[fdc4:f303:9324::254]` first, encounters immediate network unreachability (error 101), introduces a 1–2 second delay, and then falls back to IPv4.
- **Minimal Fix:**
  In `infra/gateway/nginx.conf.template`, configure variable-based proxying with NGINX dynamic resolver `resolver 127.0.0.11 ipv6=off valid=30s;` or container-level IPv4 precedence, ensuring NGINX never queries or connects via IPv6.
- **Files to Change:**
  - `infra/gateway/nginx.conf.template`
  - `docs/LOCAL_SETUP.md`

---

### ISS-01: Customer Session Instability & Logout on Page Navigation
- **Reproduced:** **YES**
- **Live Evidence & Hypotheses Evaluation:**
  - **H0 (Report claim: Cookie blocked across ports):** **REFUTED.**
    In a real Chrome browser instance via Playwright, cross-origin `fetch()` from `http://localhost:3000` to `http://localhost:8000/api/customer/profile/addresses` with `credentials: 'include'` transmitted `Cookie: ficcado_customer_session=...` and returned `HTTP 200 OK`. The browser cookie jar confirmed the cookie is stored with `Domain: localhost`, `Path: /`, `HttpOnly: true`, `SameSite: Lax`. Ports do NOT partition `SameSite` cookies on `localhost`.
  - **H1 (CORS headers):** **VERIFIED CLEAN.**
    Gateway returns `Access-Control-Allow-Origin: http://localhost:3000` and `Access-Control-Allow-Credentials: true`. No duplicate headers.
  - **H2 (Cookie attributes):**
    `ficcado_customer_session` is issued with `Path=/; HttpOnly; SameSite=Lax`. In the browser, it stored as a session cookie (`expires: -1`).
  - **H3 (Host mismatch):**
    Both storefront and gateway configured on `localhost`.
  - **H4 (Redis session existence & token):** **VERIFIED.**
    After login, `session:cust:{sessionId}` exists in Redis on port 6380 with 568s TTL (~600s sliding window). The JWT `sid` claim matches the Redis key.
  - **H5 (Gateway secret):** **VERIFIED.**
    Gateway forwards `X-Gateway-Secret: ficcado-gateway-internal-secret-2026`, matching both backend configurations.
  - **H6 (Destructive State Wipe on Route Navigation):** **PROVEN TRUE ROOT CAUSE (Client side).**
    In `website/frontend/src/context/CustomerAuthContext.tsx` lines 146–148, `useEffect(() => { refreshProfile(); }, [pathname, refreshProfile]);` runs on EVERY route change.
    Inside `refreshProfile()` (lines 74–89):
    ```tsx
    const refreshProfile = useCallback(async () => {
      try {
        const sessionStatus = await checkCustomerSession();
        if (sessionStatus.active) {
          const profile = await getCurrentCustomer();
          setCustomer(profile);
          lastActivityRef.current = Date.now();
        } else {
          setCustomer(null);
        }
      } catch {
        setCustomer(null);
      } finally {
        setIsLoading(false);
      }
    }, []);
    ```
    In `website/frontend/src/lib/api/auth.ts` lines 136–146, `getCurrentCustomer()` sets a tight `{ timeoutMs: 3000 }` on `/api/customer/auth/me`.
    When upstream latency spikes (due to ISS-04 or concurrent navigation fetches), or if any non-401 error occurs, `getCurrentCustomer()` returns `null` or throws. `refreshProfile()` immediately executes `setCustomer(null);`, wiping the customer state from React memory even though the server session in Redis is 100% valid!
  - **H7 (Missing/invalid session returns 403 instead of 401):** **PROVEN TRUE ROOT CAUSE (Server side).**
    In `crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/security/SecurityConfig.java` line 78:
    `.requestMatchers("/api/customer/**").hasAuthority("ROLE_CUSTOMER")`
    Because Spring Security is configured without a dedicated `AuthenticationEntryPoint` for customer endpoints, any unauthenticated or failed request to `/api/customer/**` falls into `AccessDeniedHandler`, which produces **`HTTP 403 Forbidden`** instead of **`HTTP 401 Unauthorized`**.
    Live test evidence: `curl.exe -i http://localhost:8081/api/customer/profile/addresses` returned `HTTP/1.1 403 Forbidden`.
- **True Root Cause:**
  1. `CustomerAuthContext.tsx` unconditionally clears state (`setCustomer(null)`) on route navigation whenever `refreshProfile` encounters a timeout, network hiccup, 5xx, or non-401 response, rather than only on explicit 401 session invalidation.
  2. Route navigation fires an un-throttled session check on every page change without debouncing.
  3. Spring Security on `ficcado_crm_backend` responds with HTTP 403 Forbidden for missing/unauthenticated customer requests rather than RFC 9457 HTTP 401 ProblemDetail.
- **Minimal Fix:**
  1. In `CustomerAuthContext.tsx`, implement the resilient state rule: clear customer state ONLY upon HTTP 401 or explicit logout. On network errors, timeouts, 5xx, or 503 `SESSION_STORE_UNAVAILABLE`, retain customer in state and display non-blocking notice.
  2. Throttle route-change checks to at most once per 30 seconds with `X-Ficcado-Background: 1`.
  3. In `SecurityConfig.java`, add custom `AuthenticationEntryPoint` mapping unauthenticated `/api/customer/**` requests to HTTP 401 ProblemDetail.
- **Files to Change:**
  - `website/frontend/src/context/CustomerAuthContext.tsx`
  - `website/frontend/src/lib/api/auth.ts`
  - `crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/security/SecurityConfig.java`

---

### ISS-02: Product Modal Blank Image for Data-URL Items (e.g., "darlix")
- **Reproduced:** **YES**
- **Live Evidence:**
  1. Queried `GET http://localhost:8000/api/public/products`:
     Item `darlix` (id: 2) has:
     - `img`: `data:image/jpeg;base64,/9j/4AA...` (length: 297,699 characters).
     - `images[0]`: `data:image/jpeg;base64,/9j/4AA...` (length: 297,699 characters).
     - `images[1]`: `data:image/jpeg;base64,/9j/4AA...` (length: 143,415 characters).
     - Total payload size: 1,389,717 bytes.
  2. Rendered in real Chrome browser via Playwright:
     - Card on homepage renders correctly (shows image).
     - Clicking "darlix" card opens `ProductModal`.
     - Modal image rendered as: `/_next/image?url=%2Fimages%2Fplaceholder.webp`.
     - Solid light-gray rectangle displayed instead of item image.
- **True Root Cause:**
  In `website/frontend/src/components/modals/ProductModal.tsx` lines 58 & 61:
  `product.images.every((img) => img.startsWith('/') || img.startsWith('http'))`
  `product.img && (product.img.startsWith('/') || product.img.startsWith('http'))`
  The guard strictly requires URLs starting with `/` or `http`. A base64 image URL starts with `data:image/jpeg;base64,`. The condition evaluates to `false`, discarding the image array and falling back to `getItemImages('darlix')`. Because custom database items are not in `item-images.json`, it returns `[PLACEHOLDER_IMAGE]` (`/images/placeholder.webp`).
- **Minimal Fix:**
  1. Create helper `isRenderableImageSrc(src)` allowing `/`, `http://`, `https://`, and `^data:image/(png|jpe?g|webp|gif|avif);base64,` (strictly rejecting `data:image/svg+xml`).
  2. Use helper in `ProductModal.tsx` and all storefront components that use the `/` or `http` check.
  3. Bypass color swatch substring matching for base64 data URLs.
- **Files to Change:**
  - `website/frontend/src/lib/imageSource.ts` (new helper)
  - `website/frontend/src/components/modals/ProductModal.tsx`
  - Storefront cards / cart / wishlist using the same pattern.

---

### ISS-03: Tablet & Desktop Header Viewport Overflow
- **Reproduced:** **YES**
- **Live Evidence:**
  Executed automated viewport width audit in headless Chrome across all 9 specified widths:
  - **360px:** Header hidden (`display: none`), `scrollWidth = 360px` (Clean).
  - **390px:** Header hidden (`display: none`), `scrollWidth = 390px` (Clean).
  - **768px:** `innerWidth = 768px`, `scrollWidth = 1179px` ➔ **OVERFLOW by 411px!**
    8 controls clipped outside screen: SUPPORT link (right=835px), Search input (right=913px), Sign In (right=964px), Wishlist (right=1008px), Settings (right=1052px), Bag button (right=1135px), Hamburger Menu (right=1179px).
  - **820px:** `innerWidth = 820px`, `scrollWidth = 1179px` ➔ **OVERFLOW by 359px!**
  - **1024px:** `innerWidth = 1024px`, `scrollWidth = 1356px` ➔ **OVERFLOW by 332px!**
  - **1180px:** `innerWidth = 1180px`, `scrollWidth = 1356px` ➔ **OVERFLOW by 176px!**
  - **1280px:** `innerWidth = 1280px`, `scrollWidth = 1356px` ➔ **OVERFLOW by 76px!**
  - **1440px:** Clean (margin = 4px).
  - **1920px:** Clean (margin = 244px).
  - **Breakpoint Discovery:** `DesktopHeader.tsx` line 50 uses `className="hidden md:block ..."`. The desktop header activates at `md` (768px).
  - **Why Device-Checker Passed:** `device-checker.mjs` lines 240–300 uses Node `http.request` to check SSR markup for text strings (`name="viewport"`, `id="app-shell"`, `id="bottom-nav"`). It never calculates CSS layout, computes DOM bounding rects, or checks `scrollWidth > innerWidth`.
- **True Root Cause:**
  Header has 7 separate top-level links (`DROPS`, `CATEGORIES`, `CUSTOM T-SHIRT`, `JOURNAL`, `ABOUT`, `FAQ`, `SUPPORT`), a search input, and a verbose Bag button with price text (`Bag (₹500)`), requiring ~1250px minimum width. On viewports 768px–1280px, it horizontally overflows the document.
- **Minimal Fix:**
  1. Consolidate `About Us`, `Journal`, `FAQ`, and `Support` into an **About ▾** dropdown menu.
  2. Reduce primary navigation row to: `Drops`, `Categories`, `Custom Print`, `About ▾`.
  3. Rename "Custom T-Shirt" to "Custom Print" (preserving `/custom-tshirt` URL).
  4. Make Shopping Bag button an icon-only circular button with badge count (matching Wishlist and Settings buttons).
  5. Extend `device-checker.mjs` with bounding rect / scrollWidth assertion so layout overflow fails automatically.
- **Files to Change:**
  - `website/frontend/src/components/layout/DesktopHeader.tsx`
  - `website/frontend/src/components/modals/MobileNavDrawer.tsx`
  - `website/frontend/src/components/layout/DesktopFooter.tsx`
  - `website/frontend/src/app/custom-tshirt/page.tsx`
  - `website/frontend/src/components/layout/RouteTitleSync.tsx`
  - `website/frontend/scripts/device-checker.mjs`

---

### ISS-05: Registration Phone Number Format Rejection
- **Reproduced:** **YES**
- **Live Evidence:**
  1. CRM Database format discovery:
     Count query on `customers` table in `ficcado_data`:
     - `10-digit-national`: **4 (100%)**
     - `+91-prefixed`: **0 (0%)**
     - `other`: **0 (0%)**
     `CustomerService.java` and `SaleService.java` strictly index and lookup customers by 10-digit national number.
  2. Live registration test through backend:
     - `+91 98765 43210` ➔ HTTP 400 (`phone: Valid 10-digit Indian mobile number is required`)
     - `98765-43210` ➔ HTTP 400 (`phone: Valid 10-digit Indian mobile number is required`)
     - `09876543210` ➔ HTTP 400 (`phone: Valid 10-digit Indian mobile number is required`)
     - `(98765) 43210` ➔ HTTP 400 (`phone: Valid 10-digit Indian mobile number is required`)
     - `9876543210` ➔ Valid 10-digit (Passes regex validation)
     - `+919876543210` ➔ Valid regex (Passes regex validation)
     - `12345` ➔ HTTP 400 (Invalid)
     - `5987654321` ➔ HTTP 400 (Invalid)
- **True Root Cause:**
  `CustomerAuthDto.java` enforces `@Pattern(regexp = "^(\\+91)?[6-9]\\d{9}$")` without accepting spaces, hyphens, parentheses, or leading zero. `AuthModal.tsx` sends raw `regPhone.trim()` without normalization.
- **Minimal Fix:**
  1. Implement shared normalization rule on frontend before sending: strip whitespace, hyphens, dots, parentheses, leading `0`, and leading `+91`/`91`, yielding canonical 10 digits matching `^[6-9]\d{9}$`.
  2. Implement same normalization on backend in `CustomerRegistrationRequest` / DTO before validation.
- **Files to Change:**
  - `website/frontend/src/components/modals/AuthModal.tsx`
  - `website/frontend/src/lib/phone.ts` (shared normalizer)
  - `crm/backend/ficcado_crm_backend/src/main/java/com/aps/ficcado_crm_backend/dto/CustomerAuthDto.java`

---

### ISS-06: CRM Backoffice Server-Side Fetch Failures (`API request failed`)
- **Reproduced:** **YES**
- **Live Evidence:**
  1. Route tree discovery: All dashboard pages are under `app/(app)/dashboard/...`. Root-level `/sales`, `/items`, `/customers`, etc., DO NOT EXIST.
  2. Unauthenticated request to `http://localhost:3001/api/sales`:
     - Returned `HTTP/1.1 500 Internal Server Error` with `{"error":"HTTP 403 "}`.
     - `next-development.log` recorded:
       `{"source":"Server","level":"ERROR","message":"[2026-11-01T05:52:30.314Z] [ERROR] \"API request failed\" {}"}`.
  3. `crm/ficcado_crm_app/middleware.ts` has `matcher: ['/dashboard/:path*', '/login']`. It completely omits `/api/:path*`.
  4. In `lib/logger.ts`, `console.error(prefix, message, context)` passes `context` as a second argument, which Next.js JSON-stringifies as `{}` in `next-development.log`.
- **True Root Cause:**
  Next.js CRM Route Handlers under `/api/...` proxy requests to the backend (`localhost:8081`) via `apiFetch`. When accessed without a session, the backend returns 401/403. `apiClient.ts` logs `API request failed` with `{}` because `logger.ts` emits context as an object.
- **Minimal Fix:**
  1. Expand middleware route matcher to guard authenticated CRM routes that actually exist (`/dashboard/:path*`).
  2. In `lib/apiClient.ts` / `lib/logger.ts`, format error log message with URL and HTTP status directly into the string so `next-development.log` prints the true URL and status instead of `{}`.
  3. Ensure Route Handlers under `/api/...` return clean HTTP 401 JSON instead of uncaught 500 exceptions when unauthenticated.
- **Files to Change:**
  - `crm/ficcado_crm_app/middleware.ts` (or `proxy.ts` in ISS-07)
  - `crm/ficcado_crm_app/lib/apiClient.ts`

---

### ISS-07: Next.js 16.3 Deprecation Warning (`middleware` -> `proxy`)
- **Reproduced:** **YES**
- **Live Evidence:**
  1. Installed version in `crm/ficcado_crm_app/node_modules/next/package.json`: `16.3.0`.
  2. Installed version in `website/frontend/node_modules/next/package.json`: `16.3.8`.
  3. Warning observed in CRM server dev log and build:
     ```
     ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
     To migrate automatically, run: npx @next/codemod@canary middleware-to-proxy .
     ```
  4. Website frontend has NO middleware file, and prints ZERO deprecation warnings.
- **True Root Cause:**
  Next.js 16.3+ in `crm/ficcado_crm_app` deprecates `middleware.ts` in favor of `proxy.ts`.
- **Minimal Fix:**
  Per developer decision in `Part3.md`, rename `crm/ficcado_crm_app/middleware.ts` to `proxy.ts` and rename exported function from `middleware` to `proxy`, without using canary codemods or changing dependency versions.
- **Files to Change:**
  - `crm/ficcado_crm_app/middleware.ts` ➔ `crm/ficcado_crm_app/proxy.ts`
  - Associated Vitest tests.

---

## 3. Summary of Files to Modify in Upcoming Phases

| Phase | Issue | Permitted Target Files |
|---|---|---|
| **P3-1** | ISS-04 | `infra/gateway/nginx.conf.template`, `infra/docker-compose.yml`, `docs/LOCAL_SETUP.md` |
| **P3-2** | ISS-01 | `CustomerAuthContext.tsx`, `client.ts`, `auth.ts`, `SecurityConfig.java` |
| **P3-3** | ISS-05 | `AuthModal.tsx`, `CustomerAuthDto.java`, `website/frontend/src/lib/phone.ts` |
| **P3-4** | ISS-02 | `website/frontend/src/lib/imageSource.ts`, `ProductModal.tsx` |
| **P3-5** | ISS-03 | `DesktopHeader.tsx`, `MobileNavDrawer.tsx`, `DesktopFooter.tsx`, `custom-tshirt/page.tsx`, `RouteTitleSync.tsx`, `device-checker.mjs` |
| **P3-6** | ISS-06 & 07 | `crm/ficcado_crm_app/middleware.ts` (renamed to `proxy.ts`), `crm/ficcado_crm_app/lib/apiClient.ts` |
| **P3-7** | Verification | End-to-end Playwright script, `docs/PART3_REPORT.md`, `docs/MANUAL_TEST_CHECKLIST.md` |

---
*Report generated and validated with live evidence against active containers and services.*
