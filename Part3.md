# Part3.md — Post-Part-2 Fixes (Ficcado)

Brand spelling is always **Ficcado** (double C). Never write any other spelling, anywhere. `check-brand.mjs` must stay green.

This file is the **only** scope of Part 3. It fixes 7 issues found by the developer's manual testing after Part 2 (`issues_found_after_part2.md`, ISS-01 to ISS-07). Part 2 reported everything as PASS and 354/354 tests, yet live login still broke. The reason: many Part 2 tests only read source text or use mocks. **Part 3 is proven on the running stack, not by source-text tests.**

---

## 0. Read this first

1. Read this whole file, then `docs/PART2_REPORT.md`, `docs/PART2_AUDIT.md`, `docs/PART2_UI_GUIDE.md`, `docs/FICCADO_DATA_CHANGELOG.md`, `docs/AGENT_QUESTIONS.md`.
2. The issues report contains **root causes and fixes that are guesses**. Several are wrong or unsafe (section 2). **Do not copy its suggested fixes.** Use the decisions in this file.
3. Work through phases in order. Pause at the gates marked **GATE**. Do not start the next phase before the developer replies at a gate.

---

## 1. Rules (non-negotiable)

**R1 Scope lock.** Change only what a phase names. If you think something else needs changing, write it in `docs/AGENT_QUESTIONS.md` as `P3-Q-00N` and carry on with the rest. Do not fix it.

**R2 No own decisions.** If this file does not say what to do, or two instructions conflict, or a discovery contradicts this file: **stop that item, write a `P3-Q` question with the evidence and 2 options, and wait.** Never choose silently.

**R3 No guessing names.** File names, routes, column names, env vars and function names below marked *(discover)* must be located in the real code first and cited as `path:line` in your report. Never invent a route, endpoint, or property.

**R4 Evidence for every claim.** "Fixed" means: the command you ran, its real output, and the exact files changed. Live evidence (running services, real browser, real HTTP) beats unit tests. Do not write "verified" for anything you did not run.

**R5 Diagnose before fixing.** For ISS-01, ISS-04, ISS-06 you must reproduce the failure live and record the true root cause **before** editing code (P3-0). A fix without a reproduced cause is rejected.

**R6 Never weaken tests.** Do not delete, skip, loosen or rewrite an existing test to make it pass. If an existing test encodes behavior this file changes (for example nav label "Custom T-Shirt"), update that test and list it in the report with the reason.

**R7 No new dependencies**, no version bumps, no `@canary` / unpinned tooling, no schema migrations. If you believe one is needed, ask (R2). Reuse the browser-automation tool the repo already uses (device-checker) *(discover)*.

**R8 Security rules from Part 2 stay.** Customer session = HttpOnly cookie `ficcado_customer_session`, Redis sliding session, fail-closed 503, gateway `auth_request`, `X-Customer-Id` only set by the gateway, `/api/internal/**` blocked. Do not weaken any of it.

**R9 Secrets.** Never put real secrets, passwords or tokens in the repo, logs, reports or screenshots. Mask personal data (emails, phones) in reports.

**R10 Logging of changes.** Every edit to an existing Ficcado-Data file goes into `docs/FICCADO_DATA_CHANGELOG.md` (file, method, reason, test). Every phase ends with a section in `docs/PART3_REPORT.md`.

**R11 Git.** Work on branch `fic/completeService`. One commit per phase, message `P3-x: <short summary>`. No force-push, no `--no-verify`.

---

## 2. Corrections to the issues report (binding)

The report's suggested fixes are **overridden** as follows.

| ID | Report said | Decision for Part 3 |
|---|---|---|
| ISS-01 | "SameSite=Lax cookie is blocked because ports differ, so store the JWT in `localStorage` and send `Authorization: Bearer`." | **Rejected.** Browsers treat `localhost:3000` and `localhost:8000` as the **same site** (SameSite ignores ports, and cookies are not port-scoped), so this root cause is very likely wrong. Putting the JWT in `localStorage` also exposes it to any XSS and contradicts the Part 2 design (HttpOnly cookie). **No token in `localStorage`/`sessionStorage`/JS memory, no browser-sent `Authorization` header.** Find the real cause (P3-0), fix it there. |
| ISS-01 | Gateway returns 401 | Its own log excerpt shows **403**. These differ. Find out which component produces the 403 (P3-0). |
| ISS-04 | `resolver 127.0.0.11 ipv6=off;` or hard-code `172.17.0.1` | `resolver` does not apply to hostnames inside a static `upstream {}` block. **Hard-coded IPs are rejected.** Use the approach in P3-1. |
| ISS-06 | Add `/sales`, `/items`, `/customers`, `/expenses`, `/vendors`, `/logs` to the matcher | CRM pages live under `app/(app)/dashboard/...`; those top-level paths **may not exist**. **Do not add matchers for routes that do not exist.** Discover the real routes (P3-6). |
| ISS-07 | Run `npx @next/codemod@canary ...` | **Rejected** (unpinned canary tool). Do the rename by hand (P3-6). |
| ISS-02 | Accept `data:image/` | Accepted, with a restricted pattern and extra checks (P3-4). |
| ISS-03 | Header redesign | Accepted exactly as the developer specified (P3-5). |
| ISS-05 | Strip spaces and a leading 0 in the browser | Accepted, but the **canonical format must match what the CRM already stores**, and the backend must normalize too (P3-3). |

---

## 3. Phases

### P3-0 — Baseline and live reproduction (NO code changes)

1. Start infra: `docker compose -f infra/docker-compose.yml up -d`. Start Ficcado-Data (8081), Website-Data (8082), Payment (8083) with `mvnw`, website (3000) and CRM frontend (3001) with `npm`. Confirm every health URL answers. Credentials are in the developer's `infra/.env` and env files; if something is missing, ask. Do not invent values.
2. Record baseline results of all suites (CRM backend, Website-Data, Payment, website FE, CRM FE, device-checker, brand, typecheck, lint, builds) in `docs/PART3_REPORT.md`. Record the real counts, even if they differ from Part 2.
3. **Reproduce each issue live** and capture evidence:
   - **ISS-01 (session).** With a real browser (the tool device-checker uses *(discover)*) and with `curl`, do: register or log in through the gateway (`http://localhost:8000`), then call `GET /api/customer/session`, `GET /api/customer/auth/me`, `GET /api/customer/profile/addresses`, `GET /api/wishlist`. Record the status code of each, which component produced it (gateway `auth_request`, or backend), and the gateway log lines (`$upstream_status`, auth subrequest status). **Test these hypotheses one by one. They are hypotheses, not facts:**
     - **H0** The report's claim (cookie withheld because of ports). Show from the browser's real cookie jar whether the cookie is stored and sent. Confirm or refute.
     - **H1** CORS: login response headers for `Access-Control-Allow-Origin` (exact origin, not `*`) and `Access-Control-Allow-Credentials: true`. Check whether CORS headers are added twice (gateway and backend).
     - **H2** `Set-Cookie` attributes: `Path`, `Domain`, `Secure`, `SameSite`, `Max-Age`/`Expires`, `HttpOnly`. Compare with what the browser actually stored.
     - **H3** Host mismatch: page opened on `localhost` but API URL uses `127.0.0.1` (or the reverse). Check `NEXT_PUBLIC_GATEWAY_URL` and CORS origin lists.
     - **H4** Redis session: after login, does the key `session:cust:{sessionId}` exist on the session Redis (port 6380, use `SCAN`, never `KEYS *` on anything shared) with TTL near 600 s? Does the JWT `sid` claim match it? Check whether the website **login and register endpoints** really call the Part 2 overload `generateCustomerToken(Customer, sessionId)` and create the Redis session. An old call path would produce tokens with no live session.
     - **H5** Gateway secret: is `X-Gateway-Secret` sent by NGINX identical to the value each service expects (8081 and 8082)? Does the validate endpoint (`/api/internal/session/validate`) accept the gateway's `X-Internal-Secret`/key? (Names *(discover)*.)
     - **H6** Frontend state wipe: what exactly does `refreshProfile()` in `CustomerAuthContext.tsx` do on **any** failure (401, 403, 5xx, network error, 503)? Does it call `setCustomer(null)` for all of them?
     - **H7** Does a missing or invalid session produce 401 or 403 at the gateway and at the backend? (Spring Security often returns 403 for anonymous requests unless an entry point is set.)
   - **ISS-02.** Open the item "darlix" (or any item whose images are data URLs). Record the `images`/`img` values' prefixes (first 30 chars only, never the whole string) and the main image element's state.
   - **ISS-03.** Capture the header at widths 360, 390, 768, 820, 1024, 1180, 1280, 1440, 1920. Record `document.documentElement.scrollWidth` vs `innerWidth` and the right edge of each header control. Also state the current breakpoint where `DesktopHeader` replaces the mobile header *(discover)*. Explain **why the existing device-checker (324/324) did not catch the overflow.**
   - **ISS-04.** Inside the gateway container run `getent ahosts host.docker.internal`. Count `Network unreachable` lines in `docker compose logs gateway`. Show how the `upstream` blocks are written *(discover)*.
   - **ISS-05.** Send the registration request with each of the example phones below (through the real gateway) and record the status.
   - **ISS-06.** List the real route tree of `crm/ficcado_crm_app/app` (including the `(app)` group). Find which URL/request produces `API request failed`. Record the `url` and `status` that `lib/apiClient.ts` logs (the log currently prints `{}`; find out why). Check whether `/sales`, `/items`, etc. exist at all.
   - **ISS-07.** Record the exact Next.js version installed (`node_modules/next/package.json`) and the exact deprecation text. Check whether the website frontend prints the same warning.
4. Write `docs/PART3_DIAGNOSIS.md`: per issue, "reproduced yes/no", evidence, **true root cause**, minimal fix, files to change. If a root cause is not proven by evidence, say "unproven" and do not claim it.

**GATE A — stop here.** Tell the developer P3-0 is done. Wait for approval of `docs/PART3_DIAGNOSIS.md`.

---

### P3-1 — ISS-04: Gateway IPv6 upstream failure

Allowed files: `infra/docker-compose.yml`, `infra/gateway/nginx.conf.template`, `docs/LOCAL_SETUP.md`.

1. Reproduce (P3-0) and confirm the cause is `host.docker.internal` resolving to an IPv6 address that is unreachable.
2. Fix, in this order of preference:
   a. Give the **gateway** service `extra_hosts: ["host.docker.internal:host-gateway"]` so the name resolves to one IPv4 address. Recreate the container (`docker compose up -d --force-recreate gateway`) and verify with `getent ahosts host.docker.internal` that only IPv4 is returned.
   b. Only if (a) does not give IPv4-only on this machine: use a variable-based `proxy_pass` with `resolver 127.0.0.11 ipv6=off valid=30s;`, and prove that request URIs, query strings, `auth_request` and the `/api/internal/**` 403 rule behave exactly as before.
   c. If neither works, stop and ask (R2).
3. Do not hard-code IP addresses. Do not change any other gateway rule.
4. Acceptance (live): start all three backends, send 20 requests to each of `/health/ficcado-data`, `/health/website-data`, `/health/payment-gateway` through port 8000; all 200; `docker compose logs gateway` shows **zero** `Network unreachable` lines for that period. `GET /api/internal/test` still returns 403. Record before and after latency of the same request.
5. Add a short note to `docs/LOCAL_SETUP.md` (symptom, cause, fix). Commit `P3-1`.

---

### P3-2 — ISS-01: Customer session lost after login / on page change (CRITICAL)

Allowed files: those proven by `PART3_DIAGNOSIS.md` among: `website/frontend/src/context/CustomerAuthContext.tsx`, `website/frontend/src/lib/api/client.ts`, `website/frontend/src/lib/api/auth.ts`, `CustomerAuthController.java` and the customer auth/session services in Ficcado-Data, `infra/gateway/nginx.conf.template`, backend CORS config, website env files. Anything else: ask.

Rules for the fix:
- Fix the **proven** root cause only. Do not apply fixes for hypotheses that were refuted.
- **Forbidden:** storing the JWT in `localStorage`/`sessionStorage`/JS memory; sending `Authorization: Bearer` from the browser; changing the cookie to `SameSite=None`; weakening `HttpOnly`; disabling `auth_request`; trusting any client-supplied `X-Customer-Id`.
- Part 2 required a **session (non-persistent) cookie** with the 30-day JWT `exp` only as a backstop. The cookie currently carries a 30-day lifetime. Make it a session cookie (no `Max-Age`/`Expires`) unless the diagnosis shows a reason not to; if so, ask.
- **State rule in `CustomerAuthContext.tsx`:** the client may clear the logged-in customer **only** when the read-only session check returns **401** (expired or invalid session) or the user logs out. On network error, 5xx, 503 `SESSION_STORE_UNAVAILABLE` or a timeout, **keep the current state** and show a non-blocking notice. 403 must be investigated (H7), not treated as "logged out".
- **Status-code rule:** a missing/invalid/expired session must return **401** with the Part 2 ProblemDetail body; 403 is only for "authenticated but not allowed". If the diagnosis shows missing sessions currently produce 403, change that at its source (gateway mapping or backend entry point), with a test.
- The route-change check in `CustomerAuthContext.tsx` (`useEffect` on `pathname`) must be **non-destructive** (state rule above), must use the background header `X-Ficcado-Background: 1` so it does not extend the 10-minute window, and must not fire more than once per 30 seconds.
- Do not change the 600 s window, the 9-minute prompt, the 15-minute payment pause, or the multi-tab sync.

Acceptance, **all live in a real browser through the gateway** (script it with the existing browser tool *(discover)*; commit it as an end-to-end script, see P3-7):
1. Log in. Navigate across 5 different routes (home, a category, wishlist, checkout, profile or orders *(discover real routes)*). Still logged in; no 401/403 on customer calls; wishlist and addresses calls return 200.
2. Reload the page on each route: still logged in.
3. Open a second tab: logged in. Log out in tab 2: tab 1 becomes logged out.
4. Force expiry: set the Redis key TTL to 5 seconds with `EXPIRE`, wait, perform a user action: the client shows logged-out and the login message.
5. Stop Redis session container: customer calls return 503 `SESSION_STORE_UNAVAILABLE`, the **UI stays logged in** with a notice; start it again: recovers.
6. Cookie check from the browser cookie jar: name `ficcado_customer_session`, `HttpOnly` true, no persistent expiry; JWT not present in any web storage (assert `localStorage`/`sessionStorage` contain no token).
7. Forged-header test through the gateway: a request with a fake `X-Customer-Id` and no cookie gets 401 and never reaches the backend as that customer.
8. All existing session tests still pass (`CustomerSessionServiceTest`, `CustomerSessionConcurrencyTest`, session suites).

Update `docs/PART2_AUDIT.md` section 3.3 and the P2-4A part of `docs/PART2_REPORT.md` with the **proven** root cause (they currently say "Hypothesis"/untested). Commit `P3-2`.

---

### P3-3 — ISS-05: Phone number format at registration

Allowed files: `website/frontend/src/components/modals/AuthModal.tsx`, `CustomerAuthDto.java` and the customer registration/profile service, plus a small shared phone helper file you create on each side. Log edits in the changelog.

1. **Discover the canonical phone format the CRM already uses** (CRM sale form validation, `Customer.phoneNumber` handling in `SaleService`/`createSale`, and a *count-only* query of how many stored phones are 10-digit, `+91`-prefixed, or other; do not print any number). `phoneNumber` is the CRM's unique key, and `createSale` upserts customers by phone. If the website stores a different format, one person becomes two customers.
   - If all existing phones share one format: **that is the canonical format.**
   - If formats are mixed: **stop and ask** (R2).
2. Normalization rule (apply in this order), producing the 10-digit national number, then converting to the canonical format found in step 1:
   - remove spaces, hyphens, dots and parentheses;
   - if it starts with `+91` and has 13 characters, or starts with `91` and has 12 digits, remove that prefix;
   - if it starts with `0` and has 11 digits, remove the `0`;
   - the result must match `^[6-9]\d{9}$`.
3. Apply the **same rule in both places**: in `AuthModal.tsx` before sending, and on the backend **before validation** (for example in the DTO's compact constructor or a request-binding step) *(discover the cleanest existing place)*, so a formatted number sent directly to the API is also accepted. Keep the strict validation message for numbers that are still invalid after normalization.
4. Apply the same normalization anywhere else a phone enters the system for website customers (profile update, checkout address/phone fields). *(discover by searching for `phone`.)* Do not touch CRM-admin entry forms.
5. Frontend: when the backend returns a 400 with field errors, show the field message under the phone input, not a generic failure.
6. Keep the Q-005 rules: if the phone already belongs to a different customer record, report the conflict explicitly; never overwrite; never reveal whether an email is registered.
7. Tests (real, not source-text): valid inputs `+91 98765 43210`, `98765-43210`, `09876543210`, `(98765) 43210`, `9876543210`, `+919876543210` all give the **same** stored value; invalid `12345`, `5987654321`, `+91 98765 4321`, `98765abcde` return 400 with the field message. Same phone typed in two formats must map to **one** customer. Run one live registration through the gateway with a spaced number.

Commit `P3-3`.

---

### P3-4 — ISS-02: Product modal blank image for items with data-URL images

Allowed files: `website/frontend/src/components/modals/ProductModal.tsx`, `src/lib/itemImages.ts`, `src/lib/colors.ts`, a new `website/frontend/src/lib/imageSource.ts`, and any other website component proven (by search) to use the same image guard.

1. Create one helper `isRenderableImageSrc(src)` that returns true for: starts with `/`, starts with `https://` or `http://`, or matches `^data:image/(png|jpe?g|webp|gif|avif);base64,`. **`data:image/svg+xml` and any other `data:` type must return false.** Use it in `ProductModal.tsx`. Search the website for the same pattern (`startsWith('/')` with `startsWith('http')`) in cart, wishlist, checkout, search and cards, and use the helper in each place that has this bug. List every place you changed.
2. Colour swatch filtering by URL keyword (`img.toLowerCase().includes(colorKeyword)`) must **not** apply to data URLs. If filtering leaves zero images, show the full image array (never an empty result, never the placeholder when real images exist).
3. Check how the image is rendered. If `next/image` is used, a data URL needs `unoptimized` (or a plain `<img>`); confirm it renders. Check `next.config` image settings and any Content-Security-Policy `img-src` header from Part 2 (ADD-1) allows `data:`. If CSP blocks it, the fix is to allow `data:` for `img-src` only, and nothing else.
4. Do not change the CRM or `/api/public/**` responses and do not convert stored images.
5. Tests: component/unit tests with fixtures of (a) a data-URL image, (b) an `/images/...` path, (c) an `https` URL, (d) a mixed array, (e) an svg data URL (rejected), (f) data URL plus selected colour. Live check in the browser: open the real "darlix" item (or another data-URL item): main image `naturalWidth > 0`, thumbnails render, zoom works.
6. **Report only, do not fix:** record the size of the `GET /api/public/products` response and the length class of stored images (for example "≈300 K characters each"). Write this as `P3-Q-00N`: images stored as data URLs in the database make list responses very large; the planned fix is Cloudflare R2 (credentials pending). The developer decides.

Commit `P3-4`.

---

### P3-5 — ISS-03: Tablet/desktop header overflow

Allowed files: `DesktopHeader.tsx`, `MobileNavDrawer.tsx`, `DesktopFooter.tsx`, the Custom-Print page and its metadata, `RouteTitleSync.tsx`, `scripts/device-checker.mjs`, related tests.

Required result (exactly what the developer asked for):
1. **Primary links, in this order:** `Drops`, `Categories`, `Custom Print`, `About ▾`.
2. **About dropdown** contains: `About Us`, `Journal`, `FAQ`, `Support`. Use the existing routes *(discover each; if one does not exist, ask)*. The four links are removed from the top row.
3. **Rename** "Custom T-Shirt" to **"Custom Print"** in: header, footer, mobile drawer (including its "Soon" badge), page `<title>`/metadata and main heading, `RouteTitleSync`, device-checker route name, and tests. **Keep the URL `/custom-tshirt` unchanged** (not renamed; renaming needs a redirect and is the developer's call). Record this as a note in `AGENT_QUESTIONS.md`. Keep the page body copy unchanged except where it labels the page itself. The page still has no form, upload, price or checkout.
4. **Bag button is icon-only:** a circular button with a count badge, the same visual geometry as the Wishlist and Settings buttons. **No "Bag" text, no price, no "₹".** `aria-label` like "Open bag, 3 items". The badge is hidden when the count is 0.
5. **Dropdown behavior:** opens on click/tap and on keyboard (Enter/Space), closes on Escape, outside click, selecting a link and route change; `aria-haspopup`, `aria-expanded`, focus returns to the trigger on Escape; also opens on hover on devices that support hover, but **must work on touch with no hover**. Follow `docs/PART2_UI_GUIDE.md` tokens and the existing header styling. Do not invent new colours or fonts.
6. Search box, Sign In, Wishlist, Settings and the mobile drawer behavior stay as they are, except the renames above.

Acceptance:
- At widths 360, 390, 768, 820, 1024, 1180, 1280, 1440, 1920: `document.documentElement.scrollWidth <= window.innerWidth`, and **every header control's bounding box lies fully inside the viewport** (left ≥ 0, right ≤ innerWidth), and the bag and the menu button (where shown) are visible and clickable.
- **Extend `scripts/device-checker.mjs`** (or add a test in the same tool) with these two assertions so overflow can never pass unnoticed again. Show that the new check **fails on the old header** (run it before your change, record the failure) and passes after.
- If, after the specified changes, any tested width still overflows: **do not remove or move anything else.** Stop, report the measurements, and ask.
- Keyboard test and a screenshot at 768 and 1024 attached to the report.
- Brand check, typecheck, lint, build, all website tests and the 324+ device checks pass.

Commit `P3-5`.

---

### P3-6 — ISS-06 and ISS-07: CRM middleware

Allowed CRM frontend files: **only** `crm/ficcado_crm_app/middleware.ts` (or its renamed form), its test, and, only if the diagnosis proves it, the logger call in `lib/apiClient.ts` so that `API request failed` logs the `url` and `status` instead of `{}`. Nothing else in the CRM frontend may change.

**ISS-06**
1. Use the route tree from P3-0. The matcher must cover **exactly the routes that exist and need a login**. Do not add routes that do not exist.
2. Determine from the P3-0 evidence what really triggers the log lines (a server component fetch without a cookie, a prefetch, a stale tab, an expired token). Fix that cause. If the cause is an expired/missing session on an already-matched route, report it and ask; do not guess.
3. Unauthenticated access to any protected CRM route redirects to `/login`. Add a `redirect` query only if the existing login page already reads it *(discover)*, and only for same-site relative paths (starts with a single `/`, no `//`, no scheme). Do not edit the login page.
4. The root `/` behaves as it does today for logged-in users.
5. Tests (Vitest): unauthenticated request to each protected route redirects to `/login`; authenticated request passes; `/login` behavior unchanged; an unmatched static asset is untouched. Live: open each protected CRM route in a private window; no `API request failed` errors appear in `next-development.log` for the unauthenticated visit.

**ISS-07**
1. Read the migration note in the **installed** Next.js version's own docs/changelog under `node_modules/next` (version recorded in P3-0). If the installed version supports the `proxy` file convention, do the rename by hand: `middleware.ts` becomes `proxy.ts` and the exported function becomes `proxy`, keeping the same logic and matcher. If it does not, stop and ask.
2. Do not run any codemod, do not change Next.js or any dependency version.
3. Acceptance: the deprecation warning no longer appears in a fresh dev start; `npm run build` passes (28 routes); the ISS-06 tests still pass against the renamed file; protected-route behavior is identical.
4. If the **website** also prints this warning, report it as a `P3-Q` question; do not change it.

Commit `P3-6`.

---

### P3-7 — Live end-to-end proof, regression, docs

1. Commit an end-to-end script (location *(discover, next to the device-checker or in `loadtests/`)*) using the repo's existing browser tool, covering: login and 5-route navigation, reload, two-tab logout, TTL expiry, register with a spaced phone, product modal with a data-URL image, header measurements at the widths in P3-5. It must run against the **real stack** through the gateway, not mocks. Add it to `docs/LOCAL_SETUP.md` with the exact command. (Do not add it to CI unless the developer asks.)
2. Run every suite and the end-to-end script again. Zero skipped, zero failing. Record real counts.
3. Update `docs/MANUAL_TEST_CHECKLIST.md` with one step-by-step test per issue (ISS-01 to ISS-07), using **routes that really exist**.
4. Update `docs/PART2_UI_GUIDE.md` with the header (About dropdown, icon-only bag, Custom Print) and the image-source rule.
5. Complete `docs/PART3_REPORT.md`: per issue, before/after evidence, files changed, tests added, open `P3-Q` questions.
6. Confirm `git diff` touches only files allowed by this file. List any exception.

**GATE B — stop.** Tell the developer Part 3 is complete and list open questions.

---

## 4. Definition of Done

- ISS-01..ISS-07 each have: reproduced evidence (P3-0), proven cause, fix, live acceptance proof, tests.
- No token in web storage; cookie is HttpOnly session cookie; no gateway or Redis security rule weakened.
- Gateway log shows no `Network unreachable`; `/api/internal/**` still 403.
- Phone numbers in any accepted format map to one canonical stored value matching the CRM.
- Data-URL images render in the modal; svg data URLs are rejected.
- No header overflow at any listed width; device-checker now detects overflow.
- CRM protected routes redirect unauthenticated users; no deprecation warning; CRM build passes.
- All suites pass with zero skipped; brand check clean; every existing-file edit logged in the changelog.
- No out-of-scope file changed; all unresolved items are in `docs/AGENT_QUESTIONS.md` as `P3-Q-00N`.

## 5. Question format (`docs/AGENT_QUESTIONS.md`)

```
### P3-Q-00N: <title>
- Phase / issue:
- What I found (evidence, file:line):
- Why this file does not decide it:
- Option A:
- Option B:
- My recommendation (optional):
- Status: OPEN
```
Never mark a question resolved yourself; the developer answers in `AGENT_ANSWERS.md`.