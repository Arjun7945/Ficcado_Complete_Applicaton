# Ficcado — Post-Migration Deep Audit & Production Hardening
### (For the Antigravity Agent — Senior Engineer / DevOps Review)

> **Context:** Part 12 (Sheets → Spring Boot + PostgreSQL) has been marked complete, but real symptoms indicate it isn't actually production-ready: intermittent 404s and 403s even after a successful login, incomplete cookie/session handling, and leftover Sheets/Netlify-era dead code. This document is a **deep, systematic diagnostic and remediation pass** — not a re-read of the spec, an actual investigation. Approach every section below the way a senior engineer doing a pre-launch review would: assume something is broken until you've personally verified it isn't, not the other way around.

> **Read this first:** the specific symptom combination described — 404s/403s post-login, plus "cookie management not 100% complete" — is a textbook signature of a **cross-origin cookie/CORS/CSRF misconfiguration**, which is exactly what happens when a Spring Boot backend and a Next.js frontend end up on two different origins (different domains and/or ports) and the auth cookie isn't set up correctly for that. Section 1 below should be the **first** place you look, not the last, because it's very likely the root cause behind most of the other symptoms too, not a separate issue.

---

## 1. Authentication & Cookie/Session Deep-Dive (Highest Priority)

Since the frontend and backend are two separate services (possibly on two different domains entirely, per the still-open hosting decision), every one of these needs explicit, verified answers — not assumed:

### 1.1 Cookie Attributes
- **`SameSite`**: for a cookie to be sent on a cross-origin request (frontend domain ≠ backend domain), it must be set with `SameSite=None`. The default (`Lax` or unset) will cause the browser to **silently withhold the cookie** on cross-site requests — no error, no console warning most of the time, just an authenticated request that behaves as if no one is logged in. This alone explains "works right after login, then 403s/404s appear" almost perfectly, since the login response itself is same-origin-ish (direct call) but subsequent page navigations/API calls may not carry the cookie forward correctly.
- **`Secure`**: `SameSite=None` **requires** `Secure=true`, which in turn requires HTTPS. Confirm both are actually true in whatever environment is being tested — local HTTP development is a genuinely different case from production HTTPS and needs to be handled explicitly (e.g., a documented local-dev exception), not silently broken.
- **`HttpOnly`**: confirm this is still set (it should be — this is what makes the cookie inaccessible to JavaScript/XSS, and was part of the original design intent).
- **Domain/Path**: confirm the cookie's `Domain` attribute is correct for wherever the backend actually issues it from, and isn't accidentally scoped in a way that prevents it being sent back.

### 1.2 CORS Configuration — the Other Half of the Same Problem
Cookie attributes alone aren't enough — CORS has to explicitly allow credentialed requests too:
- Backend must respond with `Access-Control-Allow-Credentials: true`.
- Backend's `Access-Control-Allow-Origin` **cannot be `*`** when credentials are allowed — it must echo back a specific, explicit origin (this is exactly what the `CORS_ALLOWED_ORIGINS` environment variable from the earlier planning was for — confirm the Spring Security CORS config is actually using it correctly, not falling back to a wildcard anywhere).
- **Every frontend call must explicitly request credentials.** This is the single most commonly missed piece with a generated OpenAPI client specifically: the generated client's default runtime configuration typically does **not** include credentials unless explicitly configured (`credentials: 'include'` for fetch-based generators, `withCredentials: true` for axios-based ones). Check the generated client's base configuration object directly — if this was never set, every single call silently drops the cookie, regardless of how correct the cookie itself is.
- Confirm CORS preflight (`OPTIONS`) requests are explicitly permitted in Spring Security's filter chain — a common mistake is securing all endpoints correctly for `GET`/`POST`/etc. but leaving `OPTIONS` unhandled, which makes the browser's own preflight check fail before the real request is ever sent, surfacing as a confusing CORS/network error rather than an obvious 403.

### 1.3 CSRF — Likely Culprit, Given Cookie-Based Auth
Spring Security **enables CSRF protection by default** for state-changing requests (`POST`/`PUT`/`PATCH`/`DELETE`). This protection assumes a traditional server-rendered form flow and often actively conflicts with a cookie-based JWT session used by a separate SPA/frontend. Explicitly verify: is CSRF protection disabled (appropriate here, since the JWT itself — not a session — is the actual auth mechanism, and it's not vulnerable to CSRF the way a plain session cookie is), or is it left on and silently blocking every non-GET request with a 403? This is a very likely explanation for at least some of the reported 403s.

### 1.4 Where Does the Backend Actually Read the Token From?
Confirm there is **no mismatch** between how the token is issued and how it's validated — e.g., the login response sets a cookie, but the Spring Security JWT filter is checking for an `Authorization: Bearer` header instead of reading the cookie. This class of bug produces exactly the symptom described: login appears to succeed (the cookie gets set), but every subsequent request fails auth (because nothing is actually reading that cookie on the way in).

### 1.5 Manual Verification Protocol (Do This, Don't Just Read Code)
1. Open a fresh incognito/private browser window (no stale cookies/cache).
2. Open DevTools → Network tab, and keep it open through the entire flow below.
3. Log in. Inspect the login response's `Set-Cookie` header directly — confirm `SameSite`, `Secure`, `HttpOnly`, and `Domain` are all exactly what's expected.
4. Navigate to a protected page. Inspect the *request* headers of the resulting API call(s) — confirm the cookie is actually present in the `Cookie` request header. If it's missing here, the problem is confirmed to be on the "is the cookie being sent" side (Sections 1.1–1.2), not a backend authorization logic bug.
5. Check for a preceding `OPTIONS` preflight request on any `POST`/`PUT`/`DELETE` call — confirm it returns a successful response with the correct `Access-Control-Allow-*` headers, before the real request fires.
6. Deliberately test an **expired** token and a **wrong-role** token (e.g., a regular admin hitting a Superadmin-only endpoint) — confirm these correctly produce 401/403 as intended, rather than either wrongly succeeding or wrongly failing on *everything* indiscriminately.

---

## 2. 404 Root Cause Checklist

Given the cookie/auth investigation above may explain some 404-shaped symptoms (a misrouted auth failure can sometimes surface as a 404 depending on how the frontend/router handles it), separately verify genuine routing/endpoint gaps:

- **Map every endpoint implied by Part 12, Section 2** (and the full CRUD set for every entity in Section 1's list) against the **actual live OpenAPI spec** (`/v3/api-docs`) — confirm nothing was left unimplemented. Don't assume the spec matches the plan; read the live spec directly.
- **Confirm the generated TypeScript client was regenerated from the current backend**, not a stale copy from an earlier point in development — a client generated before some endpoints were added will simply have no method for them, and any hand-written call trying to hit those paths will 404.
- **Grep the entire frontend codebase for any remaining raw `fetch()`/`axios` calls** to API paths that bypass the generated client entirely — these are exactly where a stale or mistyped path (or a leftover call to an old Netlify Function route) would silently 404 without anyone noticing during a normal read-through.
- **Confirm path consistency** between Spring controller `@RequestMapping`/`@GetMapping` paths and what the generated client actually calls — trailing slashes, path variable placement, and pluralization mismatches are a classic, easy-to-miss source of 404s that "look like" they should work.

---

## 3. OpenAPI Client Freshness & Integration Audit

- Confirm client (re)generation is wired into the actual build process (a script/step that runs automatically, e.g. on backend changes or as part of CI), **not a one-time manual run that's already stale**.
- Confirm the generated client's base URL is read from an environment variable, never hardcoded to a specific host — this ties directly into the still-open hosting decision from Part 12, Section 5.
- Confirm the credentials configuration from Section 1.2 above is set in the client's shared instantiation point (one place), not something each call site has to remember to add individually — if it's per-call-site today, that's itself a bug waiting to happen the next time someone adds a new API call.

---

## 4. Dead Code Purge — Sheets/Netlify Remnants

Building on Part 12's Section 6 checklist, do an actual repository-wide search (not a memory-based check) for:
- Any remaining Google Sheets API imports/dependencies in either the frontend or backend.
- Any remaining references to the old Sheet Configuration module registry, `getModuleSheet()`, or the Sheet Configuration Admin Control Centre screen/route.
- Any remaining Netlify Functions directory/files that were serving the old Sheets-backed endpoints (these should be entirely deleted, not just unlinked from navigation).
- Any environment variables still referenced in code but tied to the old Google service-account/spreadsheet-ID bootstrap flow.
- Any leftover Schema Sync Panel UI or backend code (Part 11, Section B2.2 — explicitly superseded by Flyway in Part 12).

For each category found: remove entirely, and note it in `AGENT_PROGRESS.md` — a "found and removed" entry is exactly as valuable as a "confirmed clean" one; log both.

---

## 5. General Production-Readiness Re-Check

Re-apply the still-relevant sections of `Ficcado-Production-Readiness-Audit-Protocol.md` against the **new** backend specifically — the CRUD correctness matrix (Section 4 of that document), data integrity/no-data-loss checks (Section 3), and the "one shared function" consistency audit (Section 5) all need re-verification now that the underlying implementation is entirely different from what that protocol was originally written against.

---

## Phase Checklist

### Phase 120 — Cookie/Auth Deep-Dive
- [ ] Complete Section 1.1–1.4's checks, with actual evidence (screenshots or logged findings of headers/cookies), not just a "looks fine" assertion.
- [ ] Run the manual verification protocol (Section 1.5) end-to-end and document what was found at each step.
- [ ] Fix every issue found; re-run the protocol afterward to confirm the fix actually holds.

### Phase 121 — 404 Resolution
- [ ] Complete Section 2's checklist; fix every genuine routing/endpoint gap found.

### Phase 122 — OpenAPI Client Audit
- [ ] Complete Section 3's checklist; wire client regeneration into the build pipeline if it isn't already.

### Phase 123 — Dead Code Purge
- [ ] Complete Section 4's repository-wide search and removal; log every finding.

### Phase 124 — Full Re-Audit
- [ ] Re-run the relevant sections of `Ficcado-Production-Readiness-Audit-Protocol.md` against the new backend.
- [ ] Update `AGENT_PROGRESS.md` with a "POST-MIGRATION DEEP AUDIT COMPLETE" entry, explicitly listing what was found and fixed in each phase above — not just a pass/fail summary.

---

## Definition of Done

- A fresh login, followed by navigating to every major section of the app, produces zero unexpected 401/403/404s — verified by actually clicking through, not by code review alone.
- The auth cookie's `SameSite`/`Secure`/`HttpOnly`/`Domain` attributes are confirmed correct for the real deployed origins (whichever hosting choice was actually made), and CORS is confirmed to allow credentialed requests from exactly those origins — no wildcard origin anywhere credentials are involved.
- CSRF handling is a deliberate, explained decision (on or off), not an unexamined default.
- The generated OpenAPI client is confirmed current, uses environment-driven configuration, and is the **only** way the frontend talks to the backend — no bypassing raw fetch calls remain.
- Zero remaining references to Google Sheets, the old Sheet Configuration system, or Netlify Functions serving the old architecture exist anywhere in either codebase.
- Every finding from this audit — fixed or already-clean — is logged in `AGENT_PROGRESS.md`, giving a real, checkable record of production readiness rather than a verbal assurance.