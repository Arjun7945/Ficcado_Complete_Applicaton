# Part 4 Website Diagnosis & Analysis Report (P4W-0)

**Document Status:** Complete — Gate A Approved by Developer (Decisions recorded in docs/AGENT_ANSWERS.md)  
**Date:** November 1, 2026  
**Git Branch:** `fic/completeService`  
**Target Specifications:** [Part4WEBSITE.md](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/Part4WEBSITE.md)  
**Associated Artifacts:**
- Color Audit: [docs/PART4_COLOR_AUDIT.md](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/docs/PART4_COLOR_AUDIT.md)
- Open Questions: [docs/AGENT_QUESTIONS.md](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/docs/AGENT_QUESTIONS.md)

---

## 1. Prerequisite Verification (P3-5 Requirement 4)

Per `Part4WEBSITE.md` line 9, before initiating P4W diagnostic activities, Part 3 item P3-5 requirement 4 was inspected:
- **Observed State in Screenshots:** The bag button in the top desktop header displayed `Bag (₹700)` with a visible subtotal text label and an overlapping count badge.
- **Remediation Completed:**
  - File modified: [DesktopHeader.tsx](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/layout/DesktopHeader.tsx#L320-L345)
  - Removed `xl:w-auto xl:px-3.5 xl:gap-2` width expansion and removed `<span className="hidden xl:inline">...</span>` showing `Bag (₹...)`.
  - Standardized the cart trigger to an icon-only circular button (`h-9 w-9 rounded-full bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]`) matching the geometry and styling of Wishlist and Settings triggers.
  - Count badge repositioned at `-top-1 -right-1`.
  - Removed unused `subtotalAmount` destructuring from `useCart()`.
- **Verification:** Verified live in headless Chromium browser through Gateway on port 8000 and directly on port 3000. Tested across screen widths 768px, 1024px, 1280px, and 1440px.

---

## 2. Infrastructure & Test Suite Baseline Counts

All 5 core backend/frontend services and the 5 Docker Compose containers were started and evaluated. Every test suite was executed to record exact baseline pass/fail counts:

| Test Suite / Service | Location / Command | Result | Duration | Notes |
|---|---|---|---|---|
| **Website Frontend Unit/Component** | `website/frontend` (`npm test`) | **115 passed**, 0 failed (28 suites) | ~1.8s | Vitest suite green |
| **Website Brand Spellings** | `website/frontend` (`npm run check:brand`) | **PASS** (0 forbidden spellings) | 0.3s | Strictly "Ficcado" and "FIC-" |
| **Website TypeScript Typecheck** | `website/frontend` (`npm run typecheck`) | **PASS** (0 errors) | 4.8s | Zero TypeScript compiler diagnostics |
| **Website Device Compatibility** | `website/frontend` (`npm run check:devices`) | **324 / 324 passed** (100%) | 22.1s | 12 device profiles across 27 routes |
| **CRM Frontend Unit/Component** | `crm/ficcado_crm_app` (`npm test`) | **10 passed**, 0 failed (3 files) | ~3.2s | Vitest suite green |
| **CRM Backend (`ficcado_crm_backend`)** | `crm/backend/...` (`mvnw.cmd test`) | **181 run**, 0 failures, 0 errors, 0 skipped | 33.8s | Spring Boot 3 test suite green |
| **Website-Data Backend (`ficcado_website_data`)** | `website/backend/...` (`mvnw.cmd test`) | **49 run**, 0 failures, 0 errors, 0 skipped | 13.9s | Spring Boot 3 test suite green |
| **Payment Backend (`ficcado_payment_gateway_data`)** | `payment/backend/...` (`mvnw.cmd test`) | **39 run**, 0 failures, 0 errors, 0 skipped | 15.5s | Razorpay & payment tests green |
| **Docker Compose Containers** | `infra/docker-compose.yml` (`docker ps`) | **5 containers healthy** | N/A | gateway:8000, pg:5433, redis-cache:6379, redis-session:6380, rabbitmq:5672 |

---

## 3. WEB-4: Session Failure Diagnosis

### 3.1 Live Reproduction Evidence
A live reproduction script was executed against the running stack (`scratch/test_session_expiry_repro.mjs`):
1. **Login:** Customer signed in via `POST /api/customer/auth/password-login` through Gateway (port 8000). Gateway set cookie `ficcado_customer_session=s:cust:...`. Redis key `session:cust:{sid}` was created on port 6380 with an initial TTL of **600 seconds** (10 minutes).
2. **Immediate Writes:** Address creation (`POST /api/customer/profile/addresses`) and order initiation (`POST /api/v1/payments/orders`) succeed immediately while the session is fresh.
3. **Expiry Simulation:** After advancing time or waiting past the 600-second window:
   - Redis key `session:cust:{sid}` expires and is deleted (`TTL = -2`).
   - Browser retains the `ficcado_customer_session` cookie.
   - Customer attempts to update profile, add an address, or checkout.
   - NGINX gateway executes `auth_request /_auth_customer_session`, which forwards to internal endpoint `/api/internal/session/validate`.
   - Backend `InternalSessionValidationController.java:54-57` fails to find the Redis session and responds with HTTP **401 Unauthorized**:
     ```json
     {
       "type": "urn:ficcado:unauthorized",
       "title": "Unauthorized",
       "status": 401,
       "detail": "Customer session missing or expired",
       "code": "UNAUTHORIZED"
     }
     ```
   - Gateway intercepts the 401 and halts the request before it reaches Ficcado-Data or Payment backend.

### 3.2 Exact Source of User-Facing Strings
The exact text string *"Your session has expired. Please sign in..."* comes from the **frontend client error handlers**:
- [checkout/page.tsx:346](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/checkout/page.tsx#L346):
  ```typescript
  if (err instanceof ApiError && err.status === 401) {
    showToast('Your session has expired. Please sign in to save your address.', 'error');
    openModal('authModal');
  ```
- [checkout/page.tsx:640](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/checkout/page.tsx#L640):
  ```typescript
  if (err instanceof ApiError && err.status === 401) {
    showToast('Your session has expired. Please sign in to continue checkout.', 'error');
    openModal('authModal');
  ```
- [account/page.tsx:94, 116, 152](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/account/page.tsx#L94):
  ```typescript
  showToast('Session expired. Please sign in again.', 'error');
  ```
- [CustomerAuthContext.tsx:156](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/context/CustomerAuthContext.tsx#L156):
  ```typescript
  showToast('Your session expired due to inactivity. Please sign in again.', 'info');
  ```

### 3.3 Investigation of Hypotheses (SH1 – SH8)

- **SH1 — TTL window too short (PROVEN):**
  - Backend: `CustomerSessionService.java:43` defines `@Value("${app.session.idle-timeout-seconds:600}") private long idleTimeoutSeconds;` defaulting to **600 seconds (10 minutes)**.
  - Frontend: `CustomerAuthContext.tsx:37-38` defines `IDLE_WARNING_SECONDS = 540` and `IDLE_LOGOUT_SECONDS = 600`.
  - While write requests do extend the TTL via `touchSession()` / `refreshSession()`, any 10-minute pause (e.g. browsing product details, reading size guides, filling out addresses slowly) causes the Redis key to evaporate.
- **SH2 — Redis Session Persistence Missing (PROVEN):**
  - In `infra/docker-compose.yml:104-118`, the container `ficcado-redis-session` runs:
    `command: ["redis-server", "--requirepass", "${REDIS_SESSION_PASSWORD}", "--maxmemory-policy", "noeviction"]`
  - It **lacks** `--appendonly yes` and `--appendfsync everysec`.
  - Any Docker restart or machine reboot purges the in-memory keys while the browser still holds the session cookie.
- **SH3 — Write Requests & Gateway `auth_request` (DISPROVEN as sole cause, verified working):**
  - `gateway/nginx.conf:148-154` configures `location = /_auth_customer_session`:
    ```nginx
    proxy_pass http://ficcado-website-data:8082/api/internal/session/validate;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URI $request_uri;
    ```
  - `proxy_pass_request_body off` correctly prevents forwarding large POST/PUT bodies to the validator. GET, POST, PUT, DELETE all succeed as long as the session key is valid in Redis.
- **SH4 — Background Activity vs User Activity (CONTRIBUTING FACTOR):**
  - The client `touchSession` API call updates Redis TTL, but `CustomerAuthContext` only invokes it periodically based on DOM listeners.
  - If a user opens a tab and leaves it for 10 minutes without touching the DOM, the session terminates.
- **SH5 — Token/Session Mismatch (DISPROVEN):**
  - Multiple tabs share the same `ficcado_customer_session` cookie and `BroadcastChannel`. Reverse index `cust:sessions:{customerId}` is maintained correctly.
- **SH6 — Indiscriminate 401 Mapping in Frontend (PROVEN):**
  - The checkout and account pages catch *any* 401 and unconditionally display "Session expired", even if the 401 resulted from an invalid authorization or downstream credential issue.
- **SH7 — Multi-Service Header Alignment (VERIFIED):**
  - NGINX gateway handles session validation centrally and injects `X-Customer-Id` to all downstream services (CRM backend on 8081, Website-Data on 8082, Payment on 8083).
- **SH8 — Inventory of Hardcoded 600 / 540 Constants:**
  - `website/backend/ficcado_website_data/.../CustomerSessionService.java:43`: `@Value("${app.session.idle-timeout-seconds:600}")`
  - `website/backend/ficcado_website_data/.../application.yml`: `idle-timeout-seconds: 600`
  - `website/frontend/src/context/CustomerAuthContext.tsx:37`: `const IDLE_WARNING_SECONDS = 540;`
  - `website/frontend/src/context/CustomerAuthContext.tsx:38`: `const IDLE_LOGOUT_SECONDS = 600;`
  - `website/backend/ficcado_website_data/.../CustomerSessionServiceTest.java`: hardcoded test assertions checking 600s TTL.

### 3.4 Minimal Fix Plan (Phase P4W-2)
1. Increase default idle timeout to **3600 seconds (1 hour)** via `app.session.idle-timeout-seconds: 3600` in `application.yml` and bind to env var `SESSION_IDLE_TIMEOUT_SECONDS`.
2. Add Redis AOF persistence to `infra/docker-compose.yml`: `--appendonly yes --appendfsync everysec`.
3. Update `GET /api/customer/session` to return `{ idleTimeoutSeconds: 3600, remainingSeconds: ... }`.
4. Update `CustomerAuthContext.tsx` to read the timeout dynamically from the server endpoint; set idle prompt warning at `idleTimeoutSeconds - 300` (55 minutes) and logout at 60 minutes.
5. Ensure write requests reset the sliding TTL.
6. Guard frontend 401 handlers to verify error code before assuming session expiry.

---

## 4. WEB-7: Credential Prefill Diagnosis

### 4.1 Live Reproduction Evidence
Inspecting `AuthModal.tsx` in a real browser session:
- The React state initializes both fields to empty strings: `const [email, setEmail] = useState(''); const [password, setPassword] = useState('');`.
- Code never reads from `localStorage`, `sessionStorage`, or cookies to restore values.
- However, when the modal opens in a browser with saved credentials (such as Google Password Manager or Chrome autofill), the fields are immediately filled with the user's email and password dots.

### 4.2 Proven Root Cause
1. In `AuthModal.tsx:334-360`, the input elements lack `autoComplete` attributes:
   - `<input type="email" value={email} onChange={...} />` (missing `autoComplete="off"`, missing `name`, missing `id`).
   - `<input type="password" value={password} onChange={...} />` (missing `autoComplete="new-password"` or `autoComplete="current-password"`, missing `name`, missing `id`).
2. The inputs are nested directly inside a standard `<form onSubmit={handlePasswordLogin}>`.
3. Browsers detect standard `type="email"` and `type="password"` inputs inside `<form>` and automatically trigger heuristic credential autofill.
4. Furthermore, React state is not explicitly cleared when the modal opens or closes.

### 4.3 Minimal Fix Plan (Phase P4W-3)
1. Add `autoComplete="off"` to email inputs.
2. Add `autoComplete="new-password"` to password inputs across sign-in, registration, and forgot-password forms.
3. Explicitly reset React state (`setEmail('')`, `setPassword('')`, etc.) whenever `activeModal` transitions or the modal closes.
4. Add clear placeholders: `you@example.com`, `Enter your password`.

---

## 5. WEB-1, WEB-2, WEB-3: Color System & Contrast Audit

### 5.1 Color Audit Baseline
A dedicated audit script was developed and executed: `website/frontend/scripts/color-audit.mjs`.
The audit report was generated at [docs/PART4_COLOR_AUDIT.md](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/docs/PART4_COLOR_AUDIT.md).
- **Total Non-Token Color Occurrences Found:** **520 occurrences** across 43 frontend files.
- **Top Offenders:**
  - `custom-tshirt/page.tsx`: Amber, purple, emerald Tailwind classes (`bg-amber-100`, `text-amber-600`, `bg-purple-100`, `text-purple-600`, `bg-emerald-100`, `text-emerald-600`).
  - `AuthModal.tsx`: Unstandardized classes (`bg-white dark:bg-neutral-800`, `text-red-600`, `bg-red-50`).
  - `checkout/page.tsx`: Tailwind neutral/gray/blue utility classes instead of CSS custom properties.
  - `account/page.tsx` & `orders/page.tsx`: Ad-hoc color utilities.

### 5.2 Real WCAG Contrast Measurements (Playwright)
Using the Chromium automation tool with canvas color extraction across Light and Dark themes, real contrast ratios were measured on rendered components:

| Component | State / Theme | Rendered FG | Rendered BG | Contrast Ratio | WCAG AA Req | Status |
|---|---|---|---|---|---|---|
| **Custom Print "Coming Soon" Badge** | Light | `rgb(225, 113, 0)` (amber-600) | `rgb(255, 251, 235)` (amber-50) | **3.09 : 1** | 4.5 : 1 | ❌ **FAIL** |
| **Custom Print Shirt Icon Circle** | Light | `rgb(225, 113, 0)` (amber-600) | `rgb(254, 243, 198)` (amber-100) | **2.87 : 1** | 4.5 : 1 | ❌ **FAIL** |
| **Custom Print Step 3 Emerald Chip** | Light | `rgb(0, 153, 102)` (emerald-600) | `rgb(208, 250, 229)` (emerald-100) | **3.22 : 1** | 4.5 : 1 | ❌ **FAIL** |
| **Custom Print "Coming Soon" Badge** | Dark | `rgb(225, 113, 0)` | `rgb(255, 251, 235)` | **3.09 : 1** | 4.5 : 1 | ❌ **FAIL** (missing dark tokens) |
| **Custom Print Step 2 Purple Chip** | Light | `rgb(152, 16, 250)` (purple-600) | `rgb(243, 232, 255)` (purple-100) | **4.70 : 1** | 4.5 : 1 | ⚠️ Violates token policy |
| **Custom Print Heading (H1)** | Light/Dark | `rgb(17, 24, 39)` | `rgb(255, 255, 255)` | **17.74 : 1** | 3.0 : 1 | ✅ PASS |
| **Custom Print Description** | Light/Dark | `rgb(107, 114, 128)` | `rgb(255, 255, 255)` | **4.83 : 1** | 4.5 : 1 | ✅ PASS |
| **Custom Print WhatsApp Button** | Light | `rgb(17, 24, 39)` | `rgb(255, 255, 255)` | **17.74 : 1** | 4.5 : 1 | ✅ PASS |
| **Auth Modal Active Sign In Tab** | Light/Dark | `rgb(17, 24, 39)` | `rgb(248, 250, 252)` | **16.96 : 1** | 4.5 : 1 | ⚠️ Violates token policy |
| **Auth Modal Close Button** | Light/Dark | `rgb(17, 24, 39)` | `rgb(255, 255, 255)` | **17.74 : 1** | 4.5 : 1 | ✅ PASS |
| **Auth Modal Email Input Field** | Light/Dark | `rgb(17, 24, 39)` | `rgb(248, 250, 252)` | **16.96 : 1** | 4.5 : 1 | ✅ PASS |
| **Auth Modal Submit Button** | Light/Dark | `rgb(255, 255, 255)` | `rgb(43, 98, 198)` | **5.73 : 1** | 4.5 : 1 | ✅ PASS |
| **Header About Dropdown Trigger** | Light | `rgb(55, 66, 83)` | `rgb(255, 255, 255)` | **10.16 : 1** | 4.5 : 1 | ✅ PASS |
| **Dropdown Item: About Us** | Light | `rgb(17, 24, 39)` | `rgb(255, 255, 255)` | **17.74 : 1** | 4.5 : 1 | ✅ PASS |
| **Wishlist Heading** | Light | `rgb(17, 24, 39)` | `rgb(247, 247, 250)` | **16.59 : 1** | 3.0 : 1 | ✅ PASS |
| **Checkout Heading** | Light | `rgb(17, 24, 39)` | `rgb(255, 255, 255)` | **17.74 : 1** | 3.0 : 1 | ✅ PASS |

### 5.3 Custom Print Hyphen Wrapping Violation
In `custom-tshirt/page.tsx:64, 82, 102`:
- Heading and copy display `"Custom Print — Design Your Own T-Shirt"` and `"Design your own T-shirt is coming soon"`.
- Under narrow viewports (375px - 430px), standard hyphens cause line breaks across words:
  `T-` on line 1, `Shirt` on line 2.
- **Fix:** Replace with non-breaking hyphen `T‑Shirt` (`&#8209;`) and apply `whitespace-nowrap` to prevent awkward splitting.

---

## 6. WEB-6: Complete OTP Inventory Across Repositories

| Component / File | Purpose / Route | Action | Rationale |
|---|---|---|---|
| `website/frontend/src/lib/api/auth.ts:requestLoginOtp` | `POST /api/customer/auth/login-otp/request` | **REMOVE** | Password login only |
| `website/frontend/src/lib/api/auth.ts:verifyLoginOtp` | `POST /api/customer/auth/login-otp/verify` | **REMOVE** | Password login only |
| `website/frontend/src/components/modals/AuthModal.tsx` | Method toggle (`Email OTP` vs `Password`) | **REMOVE** | Password login only |
| `website/frontend/src/context/CustomerAuthContext.tsx` | `loginWithOtp()` | **REMOVE** | Password login only |
| `website/backend/.../OtpController.java:requestLoginOtp` | `POST /api/customer/auth/login-otp/request` | **REMOVE** | Password login only |
| `website/backend/.../OtpController.java:verifyLoginOtp` | `POST /api/customer/auth/login-otp/verify` | **REMOVE** | Password login only |
| `website/backend/.../OtpPurpose.java:CUSTOMER_LOGIN` | Enum constant | **REMOVE** | Password login only |
| `website/backend/.../OtpPurpose.java:CUSTOMER_SIGNUP` | Enum constant | **REMOVE** | No OTP at registration |
| `crm/backend/.../InternalCustomerController.java:otpLogin` | `POST /api/internal/customer/otp-login` | **REMOVE** | Password login only |
| `website/backend/.../OtpPurpose.java:PASSWORD_RESET` | Enum constant | **KEEP** | Retained exclusively for Forgot Password |
| `website/backend/.../OtpService.java` | Core OTP generation, hashing, rate limiting | **KEEP** | Reused for 3-step Forgot Password |
| `website/backend/.../EmailService.java` | Sending OTP reset emails via SMTP | **KEEP** | Required for Forgot Password |
| `website/backend/.../PasswordResetController.java` | New 3-step Forgot Password endpoints | **CREATE** | Request code, verify code, set password |
| `crm/backend/.../InternalCustomerController.java` | Set password & delete sessions endpoint | **CREATE/EXTEND** | Required for step 3 password reset |

---

## 7. WEB-5: Real Routes & About Dropdown Synchronization

### 7.1 Real Route Discovery
The application routes were inspected and verified to exist:
1. `/about` — [src/app/about/page.tsx](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/about/page.tsx): "About Us"
2. `/journal` — [src/app/journal/page.tsx](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/journal/page.tsx): "Journal"
3. `/faq` — [src/app/faq/page.tsx](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/faq/page.tsx): "FAQ"
4. `/support` — [src/app/support/page.tsx](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/app/support/page.tsx): "Support"

### 7.2 Header Dynamic Label Plan
- Currently, [DesktopHeader.tsx:189](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/website/frontend/src/components/layout/DesktopHeader.tsx#L189) hardcodes `<span>About</span>`.
- Update to inspect `pathname`:
  - When pathname starts with `/about`: label becomes **"About Us"**
  - When pathname starts with `/journal`: label becomes **"Journal"**
  - When pathname starts with `/faq`: label becomes **"FAQ"**
  - When pathname starts with `/support`: label becomes **"Support"**
  - On any other route: label displays **"About"**
- When active, the button receives `--primary-light` background and `--primary` text with `aria-current="page"`.
- Layout clearance verified: Even with "About Us", the navbar preserves ample whitespace across breakpoints (768px, 1024px, 1280px, 1440px) without horizontal overflow.

---

## 8. WEB-8: Database Reset Safe Reading

Per `Part4WEBSITE.md` Section 4 P4W-1:
- **Allowed Reset Targets (Docker Compose Managed Only):**
  - Compose PostgreSQL volume: `ficcado_postgres_data` (hosting `ficcado_website_data`, `ficcado_payment_gateway_data`, and test databases on port 5433).
  - Redis Session volume: `ficcado_redis_session_data` (port 6380).
  - Redis Cache volume: `ficcado_redis_cache_data` (port 6379).
- **STRICTLY FORBIDDEN / UNTOUCHED:**
  - Host PostgreSQL instance `localhost:5432/ficcado_data` (the core CRM database containing catalog items, sales, inventory, and historical data).
  - RabbitMQ volume `ficcado_rabbitmq_data`.
  - Prometheus and Grafana monitoring volumes.

---

## 9. Gate A Request for Developer Approval

With the completion of Phase **P4W-0 (Diagnosis)**:
1. Prerequisite bag button circular styling was verified and completed.
2. All test suite baselines are green (115 frontend, 181 CRM backend, 49 website backend, 39 payment backend, 324/324 device checker).
3. Root causes for WEB-4 (session timeouts & Redis persistence) and WEB-7 (browser credential manager heuristics) are proven.
4. Color audit (520 non-token occurrences) and WCAG contrast failures are documented.
5. OTP inventory is cataloged and route alignment verified.
6. Open architectural questions are documented in [docs/AGENT_QUESTIONS.md](file:///e:/A%20FICCADO%20Full%20App/Ficcado_Complete_Applicaton/docs/AGENT_QUESTIONS.md).

**Request:** Please review the diagnosis findings above. Upon receiving **Gate A Approval**, execution will proceed to Phase P4W-1 (Docker Compose reset), followed by P4W-2 through P4W-6.
