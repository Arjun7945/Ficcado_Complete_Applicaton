# Part4WEBSITE.md — Website fixes and refactor (Ficcado)

Brand spelling is always **Ficcado** (double C). Never write any other spelling. `check-brand.mjs` must stay green.

This file covers the website (`website/frontend`), plus the backend and gateway parts that the session and password-reset changes need. It is independent of `Part4CRM.md`; run `Part4CRM.md` first and do not run both at the same time (they share `docs/FICCADO_DATA_CHANGELOG.md` and `docs/AGENT_QUESTIONS.md`).

**Two screenshots come with this file:** `part4_screenshot_signin.png` (sign-in modal) and `part4_screenshot_customprint.png` (Custom Print page). Section 3 describes what they show in text; use the images as well.

**Prerequisite state.** Part 3 (`Part3.md`) has been run. Read `docs/PART3_REPORT.md` first. In the screenshots the header still shows `Bag (₹700)` with a text label and a count badge overlapping the icon, so **Part 3 item P3-5 requirement 4 (icon-only bag, no price, no "Bag" text) looks unfinished**. Check it; if it is not done, finish it exactly as `Part3.md` P3-5 says before anything else here, and report it.

## 0. The issues

| ID | Developer's words (short) | Severity |
|---|---|---|
| WEB-1 | New pages (sign in, profile, wishlist, custom print and others) do not follow the application's colour rules; make it professional everywhere. | High |
| WEB-2 | Sign-in/register modal: colour violations, unprofessional UI (screenshot). | High |
| WEB-3 | Custom Print page: many colour violations (screenshot). | High |
| WEB-4 | Sessions are not working: a logged-in user gets "session expired, please log in" when updating the profile or placing an order. Session must last until logout or **1 hour of inactivity**. | Critical |
| WEB-5 | The About dropdown (About Us, Journal, FAQ, Support): the chosen page must show in the top bar as the dropdown's label. | Medium |
| WEB-6 | Remove OTP/email-OTP from the whole application. Only password login. OTP is used **only** for forgot password: verify OTP, then set new password + re-enter, then ask the user to sign in. No OTP at registration. | High |
| WEB-7 | Email and password are pre-filled in the login/register forms. Strictly forbidden. Use placeholders. | High |
| WEB-8 | "Remove the old DB and start a new." | Medium |

---

## 1. Rules (non-negotiable)

**R1 Scope lock.** Change only what a phase names. Anything else becomes a question `P4W-Q-00N` in `docs/AGENT_QUESTIONS.md`; do not fix it.
**R2 No own decisions.** If this file does not decide something, or a discovery contradicts it: stop that item, write a question with evidence and two options, and wait.
**R3 No guessing names.** Items marked *(discover)* must be located in the real code and cited as `path:line`. Never invent routes, endpoints, env vars, CSS variables or fields.
**R4 Evidence.** "Fixed" means the command you ran, its real output and the files changed. Live evidence (running stack, real browser through the gateway at `http://localhost:8000`) beats unit tests. **Do not add source-text tests** (tests that only read code as text); Part 2 passed 354 tests of that kind and still broke live.
**R5 Diagnose before fixing** WEB-4 and WEB-7 (reproduce live, prove the cause) in P4W-0.
**R6 Never weaken tests.** Do not delete, skip or loosen a test. Tests that cover behavior this file **removes** (OTP login, OTP at registration) are deleted; list each with the reason. Other tests are updated, not removed.
**R7 No new dependencies, no version bumps, no unpinned tools, no schema migrations** except where a phase says so. Reuse the browser tool the repo already uses for the device-checker *(discover)*.
**R8 Part 2/3 security stays.** HttpOnly session cookie `ficcado_customer_session` (no token in `localStorage`/`sessionStorage`/JS), Redis session store with `noeviction` and password, gateway `auth_request`, `X-Customer-Id` set only by the gateway, `/api/internal/**` blocked at the gateway and protected by `INTERNAL_API_KEY`, fail-closed 503 when Redis is down, server-side recomputation of prices, no COD.
**R9 Secrets and personal data.** No real secrets, emails, phones, passwords or tokens in the repo, logs, reports or screenshots. Mask them in reports.
**R10 Website tokens only.** The website and the CRM have different design systems. Use only the website tokens (section 3). Never use CRM tokens here.
**R11 Logging.** Edits to existing Ficcado-Data files go into `docs/FICCADO_DATA_CHANGELOG.md`. Each phase gets a section in `docs/PART4_WEBSITE_REPORT.md`.
**R12 Git.** Branch `fic/completeService`; one commit per phase `P4W-x: <summary>`; no force-push, no `--no-verify`.

---

## 2. Decisions already made by the developer (apply exactly)

1. **Session:** logged in until **Logout**, or until **1 hour of inactivity** (sliding window). Not a fixed 1 hour from login.
2. **OTP:** exists **only** in "Forgot password". Registration collects the details and creates the account **without any OTP**. Login is **password only**.
3. **Database:** "remove the old DB and start a new" (see WEB-8 for the safe reading applied here).

Decisions made by the architect for you to follow (the developer can change them later):
- The "Still there?" prompt stays but moves to **5 minutes before expiry** (at 55 minutes). The 10-minute logout and the 9-minute prompt from Part 2 are retired.
- The payment pause (up to 15 minutes) stays as it is.
- The login cookie stays a **session cookie** (no persistent expiry), as decided in Part 3. Closing the whole browser therefore ends the login. This is recorded as a question for the developer (`P4W-Q`), not changed.
- Registration with an email or phone that already exists is **refused with a generic message** (WEB-6), not completed.

---

## 3. Design reference (website tokens, from `docs/PART2_UI_GUIDE.md`; confirm against `globals.css` *(discover)* — if they differ, `globals.css` wins and you report the difference)

- Brand: `--primary #2B62C6`, `--primary-hover #1E4FA8`, `--primary-dark #163888`, `--primary-light #EEF5FD`, `--primary-glow`.
- Accents: `--accent-ice #B4D1EF`, `--accent-orange #FF6B00`, `--accent-red #FF3B30`, `--accent-green #10B981`, `--accent-gold #F59E0B`, `--accent-mint #9FD2C7`.
- Backgrounds: `--bg-page #EDEFF2`, `--bg-app #F7F7FA`, `--bg-surface #FFFFFF`, `--bg-surface-alt #F8FAFC`, `--bg-overlay rgba(0,0,0,.45)`.
- Text: `--text-main #111827`, `--text-secondary #374151`, `--text-muted #6B7280`, `--text-light #9CA3AF`, `--text-inverse #FFFFFF`.
- Borders: `--border-light #E5E7EB`, `--border-medium #D1D5DB`, `--border-focus` = primary.
- Radii: `--radius-xs 8`, `sm 14`, `md 20`, `lg 28`, `xl 36`, `full 9999`. Shared classes: `.btn-primary`, `.btn-secondary` (light `--primary-light` background, brand-blue text), `.card`, `.input-field`.

**Colour rules (apply everywhere):**
1. Every colour comes from a token above. No raw hex, `rgb()`, `hsl()` or default Tailwind palette colours (for example `yellow-500`, `purple-*`, `amber-*`, `emerald-*`, `stone-*`, `orange-*`) in components. **Do not create new tokens** (ask).
2. Primary actions, active tabs and active navigation: `--primary` fill with `--text-inverse` text. Hover: `--primary-hover`. Soft chips, badges and icon circles: `--primary-light` background with `--primary` text/icon (optional `--accent-ice` border). Icon chips on one page all use the **same** treatment.
3. Accents are for **meaning only**: red = error/destructive/wishlist heart, green = success, gold/orange = warning or rating. Never decorative (no gold "Coming Soon" badge, no purple or green icon chips).
4. Text: `--text-main` for headings, `--text-secondary` for body, `--text-muted` for captions and placeholders. **`--text-light` is never used for text that must be read** (it fails contrast on white).
5. No dark fill with dark text, no text or icon in the same or near colour as its background ("hidden" colours). Nothing may be invisible in any state.
6. **Contrast (measured, not judged by eye):** normal text ≥ 4.5:1, large text (≥ 24 px, or ≥ 18.66 px bold) ≥ 3:1, icons and component borders ≥ 3:1, measured on the real rendered colours in every state (default, hover, focus, active/selected, disabled, error).
7. Focus ring uses `--border-focus`/`--primary` on every interactive element. Radii only from the radius tokens.
8. Do not redesign layouts. Fix colour, contrast and consistency. Typography and spacing follow the existing established pages (home, product card, product modal) *(discover)*.

---

## 4. Phases

### P4W-0 — Diagnosis (NO code changes)

Start infra and services per `docs/LOCAL_SETUP.md`. Record the baseline of every suite (real counts). Then:

**A. WEB-4 session failure — reproduce live and find the exact cause.** Log in through the browser at `http://localhost:3000`, then try: update profile, add an address, and create a payment order (Razorpay test mode; if test keys are not configured, go as far as order creation and report). Record for every failing call: URL, method, status, response body/code, which component produced it (gateway `auth_request`, Ficcado-Data, Website-Data, Payment, or the frontend), and **find the exact source of the text "session expired / please log in"** (frontend string or backend message) with `path:line`. Then test each hypothesis with evidence (they are hypotheses, not facts):
- **SH1** TTL: Redis key `session:cust:{id}` TTL right after login and after a write request (use `SCAN` and `TTL` on the session Redis, port 6380, with its password). Is it 600 s? Is it extended by writes?
- **SH2** Redis persistence: was the session Redis restarted or recreated (including `docker compose down -v`) while the browser kept its cookie? Does the session Redis have append-only/RDB persistence configured? (A restart without persistence deletes every session while the browser still holds the cookie.)
- **SH3** Write requests and `auth_request`: do `POST`/`PUT`/`PATCH`/`DELETE` through the gateway fail the session validation (for example the validation subrequest forwards the request body, or the validate endpoint rejects non-GET)? Compare a GET and a PUT with the same cookie.
- **SH4** Activity not counted: are writes treated as user activity that refresh the window, or only explicit "touch" calls? Is the background header (`X-Ficcado-Background: 1`) sent by writes by mistake?
- **SH5** Token/session mismatch: does the JWT `sid` equal the live Redis session? Does a second login, tab or device (or a password change call) delete the other sessions unexpectedly (`deleteAllSessionsForCustomer`, reverse index `cust:sessions:{customerId}`)?
- **SH6** The frontend maps any 401 (including a downstream service 401 from a wrong or missing `X-Gateway-Secret`) to "session expired".
- **SH7** Different services expect different cookies/headers: profile writes go to Ficcado-Data (8081), orders to Payment (8083), wishlist to Website-Data (8082); test each through the gateway.
- **SH8** Hard-coded timeouts: list every place where 600, 540, `10 * 60`, `9 * 60`, `600_000` or similar session constants exist in the backend, gateway, frontend and tests.

**B. WEB-7 prefill — find the source.** Check whether the values come from the code (initial state, default values, dev seed, `localStorage`/`sessionStorage`/cookie "remember"), from the Part 2/3 auth context, or from the **browser's saved-credential autofill**. Test in a clean browser profile and in the developer's profile (the screenshot shows an email and dots in the password field). Record the evidence and the `autoComplete`/`name`/`id` attributes of the inputs.

**C. WEB-1/2/3 colour baseline.** Write a script `website/frontend/scripts/color-audit.mjs` (Node only, no new dependency) that scans `src/` and lists every colour use that is not a token: hex literals, `rgb()/hsl()`, inline styles, and Tailwind palette classes. Output `docs/PART4_COLOR_AUDIT.md` with a table: file:line, value, component/page, token it should be. Also measure real contrast with the existing browser tool for the sign-in modal (all tabs and states), Custom Print, wishlist, profile, orders, checkout, address forms, idle prompt, guest wishlist modal, order confirmation, About dropdown. Save the table of failing pairs (foreground, background, ratio, state).

**D. WEB-6 OTP inventory.** List every place OTP exists: frontend components/hooks/API client functions, Website-Data endpoints/services/entities/tables/email templates/env vars, Ficcado-Data internal endpoints, gateway routes, rate-limit rules, tests and docs. Mark each **remove**, **keep for password reset**, or **unclear (ask)**.

**E. WEB-5.** List the real routes for About Us, Journal, FAQ and Support *(discover)*; if any does not exist, write a question.

Write `docs/PART4_WEBSITE_DIAGNOSIS.md` (per issue: reproduced yes/no, evidence, **proven cause** or "unproven", minimal fix, files).

**GATE A — stop.** Wait for the developer's approval of the diagnosis.

---

### P4W-1 — WEB-8: reset the local Compose databases and Redis

Developer instruction: "remove the old DB and start a new." **Safe reading applied:** reset only what Docker Compose owns. List what will be deleted before you do it:
- Compose Postgres volume (`ficcado_postgres_data`): databases `ficcado_website_data`, `ficcado_payment_gateway_data` and the three `*_test` databases.
- Redis volumes `ficcado_redis_session_data` and `ficcado_redis_cache_data` (all sessions and cache).
- Do **not** delete the RabbitMQ, Prometheus or Grafana volumes unless the developer asks.

Do: `docker compose -f infra/docker-compose.yml down` then remove only the volumes listed, then `up -d`, then start the services so Flyway recreates the schemas. Confirm all migrations apply on empty databases and every health check passes.

**Never touch the host database `ficcado_data`** (the CRM database; it holds items, sales, customers and their history). It is not part of this reset. If the developer also wants customer accounts removed from `ficcado_data`, that is a separate decision with data-loss risk to sales history: write it as a question (`P4W-Q`) and do nothing.

Commit `P4W-1`.

---

### P4W-2 — WEB-4: session lasts until logout or 1 hour of inactivity

Fix the **proven** cause(s) from P4W-0 and implement the following design (design items apply even if the diagnosis finds another cause too):

1. **One configurable setting** for the idle window: backend property `app.session.idle-timeout-seconds` (environment variable `SESSION_IDLE_TIMEOUT_SECONDS` *(confirm naming against existing property conventions)*), default **3600**. Remove every hard-coded 600/540 constant found in SH8 in the backend and tests; no frontend constant for the window.
2. **Sliding refresh:** every **user-initiated** request (anything without `X-Ficcado-Background: 1`, including all `POST`/`PUT`/`PATCH`/`DELETE`) resets the Redis TTL to the full window. Background polling and read-only checks do not. A request that arrives while the session exists must never fail with "session expired".
3. **Server tells the client the numbers.** `GET /api/customer/session` returns the idle timeout and the remaining seconds (extend the existing response additively; keep existing fields). The frontend computes the prompt and the logout from these values: prompt at (timeout − 300 s), logout at timeout. Keep the existing multi-tab `BroadcastChannel` behavior.
4. **Persistence of the session store.** Configure the **session** Redis in `infra/docker-compose.yml` with append-only persistence (`--appendonly yes`, `--appendfsync everysec`) on its existing named volume, keeping `--requirepass` and `noeviction`. Do not change the cache Redis. Document in `docs/LOCAL_SETUP.md` that `docker compose down -v` deletes sessions and that a plain restart keeps them.
5. **Expired means 401.** A missing/expired/invalid session returns **401** with the Part 2 ProblemDetail (code for expired session), never 403, never a generic error. Only that 401 makes the frontend log the user out. The frontend shows "session expired, please sign in" **only** for that code; any other failure (4xx from another cause, 5xx, network, 503) shows its own message and keeps the user logged in.
6. **Logout** deletes the Redis session and the cookie; the same cookie afterwards gets 401. Password change/reset deletes all of that customer's sessions (existing behavior). Nothing else may delete other sessions (SH5).
7. Writes through the gateway must pass `auth_request` (SH3). If the cause is the validation subrequest forwarding the body, fix it in the gateway template with the standard `auth_request` practice and prove it with a `PUT`.
8. Do not change: cookie name, HttpOnly, session-cookie (non-persistent) behavior, fail-closed 503, the 15-minute payment pause, `X-Customer-Id` handling.

Tests (real; PostgreSQL/Redis from Compose, no H2, no mocks for Redis): TTL equals the configured value after login; a write request resets it; a background request does not; expiry returns 401 with the expiry code; `EXPIRE` to 5 s then a write returns 401; logout then write returns 401; configurable value honored (a test with a shortened setting); concurrency test for 200 logins still passes; Redis restart keeps sessions (live).

Live acceptance in a real browser through the gateway: log in; update profile (success); add address (success); create a payment order (success); `EXPIRE` the key to 1800 s, do a write, confirm TTL is back to ~3600; restart the session Redis container and confirm the session survives and a write still succeeds; `EXPIRE` to 5 s, wait, perform an action: client shows the logged-out state and the login message; open two tabs and log out in one: the other logs out.

Update `docs/PART2_AUDIT.md`/`docs/PART2_REPORT.md` session sections (10-minute rule replaced by the 1-hour sliding rule). Log edits in the changelog. Commit `P4W-2`.

---

### P4W-3 — WEB-6, WEB-7 and WEB-2: rebuild the sign-in modal (one phase, one file set)

These three change the same component (`AuthModal.tsx` and its API client); do them together.

**A. Remove OTP from login and registration (WEB-6)**
- Remove the "Method: Email OTP | Password" switch and every OTP step from sign-in and from registration in the frontend (components, hooks, API client, types, copy, tests).
- Remove the backend endpoints and code paths that log a customer in by OTP or verify OTP during registration (Website-Data and Ficcado-Data, plus any gateway route/rate-limit rule only they used). Keep the OTP generation/verification service **only** for the password-reset flow. Use the inventory from P4W-0 (items marked "unclear" are asked, not guessed). Delete only the tests of removed behavior (R6) and list them.
- Registration collects: the fields the form has today *(discover)* — name, email, phone, password. It creates the account **immediately, with no OTP and no email verification step**; then follows the existing post-registration behavior *(discover)*. New accounts have `emailVerifiedAt` empty.
- Because nothing is verified at registration, **remove the word "verified"** from the checkout account card and from any other place that claims the email or phone is verified (call it "Account details"). *(Part 2 P2-6 added "verified account card".)*
- Existing email or phone: registration is **refused** with one generic message that does not say which field matched, for example "We could not create an account with these details. If you already have an account, sign in or use Forgot password." No account is created or modified. Rate-limit this endpoint (reuse the existing limiter *(discover)*).
- Phone normalization from `Part3.md` P3-3 stays.

**B. Forgot-password flow (OTP kept here only)**
Three steps in the same modal (names of endpoints *(discover and reuse the existing OTP endpoints where they exist)*; Website-Data owns the OTP, Ficcado-Data owns the password):
1. **Request:** user enters email → response is always the same generic success ("If an account exists, we sent a code") whether or not the email exists. The code is emailed only if an account exists.
2. **Verify:** user enters the 6-digit code → on success the server returns a **single-use reset token** (random, stored hashed, bound to that email, valid 10 minutes). Wrong/expired/used codes return one generic error.
3. **New password:** user enters **new password** and **re-enters it**; both must match (checked in the browser and on the server); same password rules as registration *(discover)*. On submit Website-Data calls the Ficcado-Data **internal** endpoint (shared secret, blocked at the gateway) which stores the BCrypt hash, sets `emailVerifiedAt`, and **deletes all sessions of that customer**. The token and the code are consumed. The modal then shows "Password updated. Please sign in." and opens the sign-in view with **empty** fields.
Security rules: OTP is 6 digits, expires at the **existing** TTL *(discover; if none exists use 10 minutes)*, max 5 wrong attempts then the code is invalidated, resend cooldown 60 seconds, at most 5 requests per hour per email and per IP, codes and tokens stored hashed, constant-time comparison, no email addresses or codes in logs (masking converters already exist), no email or code in URLs. The reset works for CRM-created customers who have an email but no password (that is how they claim the account; the code proves they own the email). Customers with **no email** cannot use it; write a question (`P4W-Q`), do not invent a path.
Tests (real): request for unknown email gives the identical response and timing class; wrong code; expired code; reused code; 5-attempt lockout; token for another email rejected; token reuse rejected; mismatch of the two passwords rejected on the server; weak password rejected; success deletes all sessions of that customer; old password no longer works; new password works; no OTP-based login endpoint remains (returns 404).

**C. No prefilled email or password (WEB-7)**
- Initial values of every auth field (sign in, register, forgot password steps) are empty strings. Values are never read from or written to `localStorage`, `sessionStorage` or cookies. State is cleared when the modal opens and when it closes, and after logout.
- Show **placeholders** only: for example email `you@example.com`, password `Enter your password`, phone `10-digit mobile number`, name `Full name`. Placeholder colour `--text-muted`.
- Use `autoComplete` values that stop automatic filling (email `off`, password fields `new-password`) per the P4W-0 finding. Test in a clean profile **and** in the developer's profile. If the browser's own saved-credential feature still fills the fields despite correct attributes, **report it with evidence and ask**; do not add hacks (random field names, read-only tricks) without approval.

**D. Colours and layout of the modal (WEB-2).** Screenshot `part4_screenshot_signin.png` shows: the active "Sign In" tab as a near-black pill whose text is unreadable; a black close button whose icon is invisible; and a mixed-style "Method" row. Required:
- Sign In / Register segmented control: container `--bg-surface-alt` with `--border-light`; **active tab `--primary` fill with `--text-inverse` text**; inactive tab transparent with `--text-secondary` text, hover `--primary-light`.
- Close button: `--bg-surface-alt` circle, `--border-light` border, `--text-secondary` icon (≥ 3:1), hover `--primary-light`, visible focus ring.
- Inputs `.input-field` with an icon in `--text-muted`; labels `--text-main`; error text `--accent-red`; success text `--accent-green`; links ("Forgot password?") `--primary`, underlined on hover/focus.
- Submit buttons `.btn-primary`. Overlay `--bg-overlay`. Heading uses the same heading style as other modals *(discover)*.
- All three views (sign in, register, forgot password with its 3 steps) use the same components and spacing. Measure contrast for every state (R4).

Tests: Vitest/component tests for fields empty on open, placeholders present, no OTP option rendered, register shows the generic refusal, forgot flow steps and password-match error; contrast check script (P4W-5) passes for the modal; live: register a new customer without OTP, sign in, sign out, run the full forgot-password flow with a real email (SMTP credentials come from the developer; if `MAIL_ENABLED` is off or SMTP is not configured, stop and ask, do not fake), sign in with the new password.

Commit `P4W-3`.

---

### P4W-4 — WEB-5: About dropdown shows the chosen page

1. The dropdown trigger label is **"About" when the current page is not one of its items**, and becomes **the chosen item's name** when it is: "About Us", "Journal", "FAQ", "Support" (use the item labels exactly as in the menu).
2. The label comes from the **current URL** (not from click state), so it stays correct after reload, back/forward and deep links. Sub-pages (for example a journal article under the Journal route) keep the "Journal" label.
3. When one of its pages is active the trigger gets the **same active style as the other active top links** (`--primary-light` background, `--primary` text) and `aria-current="page"` on the trigger; the selected entry in the open menu has the same active style and `aria-current="page"`.
4. Behavior from `Part3.md` P3-5 stays (click/tap/keyboard, Escape, outside click, closes on selection).
5. **No header overflow:** the longer label ("About Us") must not push controls out of the viewport at 768, 820, 1024, 1180, 1280, 1440, 1920 px; run the P3-5 overflow checks. If it overflows at any width, stop and ask (do not remove other controls).

Tests: for each of the four routes, the label and the active style (real browser); label returns to "About" on other pages; reload keeps it. Commit `P4W-4`.

---

### P4W-5 — WEB-1 and WEB-3: colour system across the website and the Custom Print page

**A. Custom Print page (`/custom-tshirt`).** The screenshot `part4_screenshot_customprint.png` shows: a tan/brown "COMING SOON" badge with yellow text; a tan circle with a yellow T-shirt icon; three step cards whose icon chips are three different colours (light blue, purple, teal/grey); a heading and body text where "T-Shirt" breaks across lines as "T-" / "Shirt" and "T-" / "shirt". Required:
- "Coming soon" badge: `--primary-light` background, `--primary` text, `--accent-ice` border.
- Top icon circle and all three step icon chips: **identical**, `--primary-light` circle with `--primary` icon.
- Step titles `--text-main`, step text `--text-secondary`, card `.card` with `--border-light`.
- Buttons: "Explore Live Wear Drops" `.btn-primary`; "Chat with Team on WhatsApp" `.btn-secondary` (no WhatsApp green; it is not a token).
- Fix the broken hyphen wrapping everywhere on the page by using a non-breaking hyphen in "T‑Shirt"/"T‑shirt" (or `white-space: nowrap` on that word). Do not change any other copy. Keep the URL `/custom-tshirt`. The page still has no form, upload, price or checkout.

**B. Colour audit and fix for the whole website.** Using `docs/PART4_COLOR_AUDIT.md` from P4W-0: fix **every** non-token colour and every contrast failure on **all** pages and components (sign-in modal, register, forgot password, profile pages, orders, wishlist page and heart buttons, guest wishlist modal, idle prompt modal, checkout, address forms, order confirmation, empty/error states, header, footer, mobile drawer, About dropdown, product cards/modal, Custom Print). Follow the colour rules in section 3 and reuse the established components (`.btn-primary`, `.btn-secondary`, `.card`, `.input-field`). Pages and components older than Part 2 are the visual reference; change them only where the audit finds a violation, and list each change.
- Where a state has no existing pattern (for example an error banner), look for an existing pattern in an established page first *(discover)*; if none exists, use `--accent-red` text and a 1 px `--accent-red` border on `--bg-surface`, success the same with `--accent-green`; ask if unsure.
- Do not add tokens, gradients or shadows that do not already exist.

**C. Keep it from coming back.**
- Commit `website/frontend/scripts/color-audit.mjs` as an npm script `npm run check:colors` that **fails** when a component uses a non-token colour (allow-list: the token definition file itself and brand artwork files, each listed explicitly). Add it to the website test run. Do not add it to CI unless the developer asks.
- Commit `website/frontend/scripts/contrast-check.mjs` (`npm run check:contrast`), which opens the pages listed above in the repo's existing browser tool, drives each state, computes contrast from the real computed colours, and **fails** below the thresholds in section 3 rule 6. Show that it **fails on the old Custom Print badge/icons and the old sign-in tab/close button** (run it before your fix and record the output) and passes after.
- Update `docs/PART2_UI_GUIDE.md` with the colour rules (section 3) and the per-component treatments above.

Brand check, typecheck, lint, build, all website tests and the device checker must pass. Commit `P4W-5`.

---

### P4W-6 — Live end-to-end proof, regression, docs

1. Extend the Part 3 end-to-end script (or add one next to it) to cover, through the real stack and gateway: register without OTP; refusal for an existing email (generic message); sign in; no field prefilled and placeholders present; profile update, address add and payment-order creation succeed; TTL ~3600 and reset after a write; Redis restart keeps the session; expiry gives the login message; About label for the four routes; forgot-password flow end to end; Custom Print and sign-in modal contrast check.
2. Run every suite again (CRM backend, Website-Data, Payment, website, CRM frontend, device checker, brand, typecheck, lint, builds). Zero skipped, zero failing. Record real counts.
3. Update `docs/MANUAL_TEST_CHECKLIST.md` with one step-by-step test per issue (WEB-1 to WEB-8), with routes that really exist.
4. Update `docs/LOCAL_SETUP.md` (session setting and its environment variable, Redis persistence, forgot-password email needs SMTP, `down -v` warning).
5. Complete `docs/PART4_WEBSITE_REPORT.md`: per issue before/after evidence, files changed, tests added, open `P4W-Q` questions.
6. Confirm `git diff` touches only files this file allows; list exceptions.

**GATE B — stop.** Report completion and list open questions.

---

## 5. Definition of Done

- WEB-1..WEB-8: reproduced or inventoried evidence, proven cause where applicable, fix, live acceptance proof, tests.
- A logged-in customer stays logged in until Logout or 1 hour of inactivity; profile update, address add and ordering never fail with "session expired" while the session is alive; the window is configured in one place; sessions survive a Redis restart.
- No OTP anywhere except the forgot-password flow; registration needs no OTP; forgot password verifies by OTP, then new password twice, then asks to sign in; all sessions of that customer are deleted on reset.
- No prefilled email or password; placeholders everywhere.
- About dropdown shows the chosen page; no header overflow.
- No non-token colour in the website; every measured contrast meets the thresholds; `check:colors` and `check:contrast` exist and pass.
- `ficcado_data` (CRM database) untouched by the reset.
- All suites green, zero skipped; changelog and report updated; no out-of-scope file changed; open items are in `docs/AGENT_QUESTIONS.md`.

## 6. Question format (`docs/AGENT_QUESTIONS.md`)

```
### P4W-Q-00N: <title>
- Phase / issue:
- What I found (evidence, file:line):
- Why this file does not decide it:
- Option A:
- Option B:
- My recommendation (optional):
- Status: OPEN
```
Never mark a question resolved yourself; the developer answers in `AGENT_ANSWERS.md`.