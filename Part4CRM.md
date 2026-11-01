# Part4CRM.md — CRM fixes (Ficcado)

Brand spelling is always **Ficcado** (double C). Never write any other spelling.

This file covers **two CRM defects** reported by the developer after Part 3. It is independent of `Part4WEBSITE.md`. Run **this file first** (it is small and blocks daily CRM work). Both files edit `docs/FICCADO_DATA_CHANGELOG.md` and `docs/AGENT_QUESTIONS.md`; do not run them at the same time.

**The two defects**

| ID | Developer's words | Severity |
|---|---|---|
| CRM-1 | "`@version` failing in item updates. When an admin updates something and comes back to update again, the version error appears and asks the same admin to reload. After reload the error still occurs. Items can no longer be updated." | Critical |
| CRM-2 | "In the customer section, when an admin tries to update customer info from view/edit profile, the button does nothing, no response, no update option." | High |

---

## 1. Rules (non-negotiable)

**R1 Scope lock.** Change only what a phase names. Anything else goes into `docs/AGENT_QUESTIONS.md` as `P4C-Q-00N`; do not fix it.
**R2 No own decisions.** If this file does not decide something, or a discovery contradicts it: stop that item, write a question with evidence and two options, and wait.
**R3 No guessing names.** Items marked *(discover)* must be found in the real code and cited as `path:line`. Never invent routes, endpoints, fields or properties.
**R4 Evidence.** "Fixed" means the command you ran, its real output, and the files changed. Live evidence (running services, real browser/HTTP) beats unit tests. Do not write "verified" for anything you did not run. **Do not add source-text tests (tests that only read code as text).**
**R5 Diagnose before fixing.** Reproduce each defect live and record the proven root cause before editing code (P4C-0).
**R6 Never weaken tests.** Do not delete, skip or loosen a test. If a test encodes behavior this file changes, update it and list it with the reason.
**R7 No new dependencies, no version bumps, no schema migrations** unless a phase says so. Otherwise ask.
**R8 Keep Part 2 decisions:** optimistic locking applies to `Item` only (AUD-09); the version is never exposed in public DTOs; ADMIN has the same permissions as SUPERADMIN; CRM design tokens stay the CRM's (cream `#F4F0E5`, ink `#22261E`, brand `#2B62C6`, radii 6/10/14 px). **Never use the website's tokens in the CRM.**
**R9 Database safety (important).** Before running **any** CRM backend test, print the effective JDBC URL used by the test profile. **If it is `localhost:5432/ficcado_data` (the real CRM database), stop and ask.** (Part 2 audit AUD-14 found that the CRM test config falls back to it.) Tests must use the Compose test database `ficcado_data_test`. For live diagnosis you may run read-only `SELECT`s on `ficcado_data`; never run `UPDATE`, `DELETE`, `DROP` or DDL by hand.
**R10 Test data.** Do not edit real catalog items or customers to reproduce. **Ask the developer which item and which customer may be edited** (or to create a clearly named test item and test customer), and restore them afterwards.
**R11 Logging.** Every edit to an existing Ficcado-Data file goes into `docs/FICCADO_DATA_CHANGELOG.md`. Each phase gets a section in `docs/PART4_CRM_REPORT.md`.
**R12 Git.** Branch `fic/completeService`; one commit per phase `P4C-x: <summary>`; no force-push, no `--no-verify`.

**Allowed files (everything else: ask).**
- Backend: the item update path (`ItemController`, `ItemService`, item DTOs/mappers, `Item` entity annotations only if proven, `GlobalExceptionHandler`), the cache config used by item/admin lists, the customer update path (`CustomerController`/service/DTOs) *(discover names)*, tests.
- CRM frontend: `app/(app)/dashboard/items/page.tsx`, `app/api/items/**`, the customers page and its API route handlers under `app/api/customers/**`, `lib/apiClient.ts`, `middleware.ts`/`proxy.ts` untouched, tests under `test/`.

---

## 2. Phases

### P4C-0 — Live reproduction (NO code changes)

Start infra and services as in `docs/LOCAL_SETUP.md` (Ficcado-Data 8081, CRM frontend 3001). Record baseline results of the CRM backend and CRM frontend suites (after printing the JDBC URL, R9).

**CRM-1 — reproduce through the real CRM UI and with HTTP, then answer each hypothesis with evidence. These are hypotheses, not facts:**
- **CH1 Stale version in the PUT response.** After a successful `PUT /api/items/{id}`, what `version` does the response carry, and what is `items.version` in the database (`SELECT id, version FROM items WHERE id = ?`) after commit? If the response is built before flush/commit, the browser keeps the old number and the next save is stale.
- **CH2 More than one version bump per save.** Does one edit increase `items.version` by 1, or by 2 or more (item save plus separate saves of images, sizes, colors or tags, or separate transactions)? If the number moves by more than 1 while the response shows 1, the next save fails.
- **CH3 Stale list after "Reload".** Is the admin items list served from a cache (Spring cache or Redis) or from a cached Next.js route handler/fetch, so "Reload Item" returns the old version again? Check the response headers and the cache annotations on the admin list/detail methods and whether `ItemService` update evicts them. (Part 2 added eviction for the **public** products cache; check the admin one.)
- **CH4 Frontend does not take the new version.** After a save, does `items/page.tsx` replace the version held in its state (and in the open edit form) with the new one, or keep the version captured when the modal first opened? What exactly does "Reload Item" do (re-fetch one item, or only close the modal and re-fetch the list)?
- **CH5 Type mismatch.** Is `version` sent as a string or number, and how is it compared in `ItemService` (for example `!=` on boxed `Long` objects instead of `.equals`/`longValue`)?
- **CH6 Version overwritten by mapping.** Does the DTO-to-entity mapping copy a null or old `version` onto the entity, so that Hibernate throws `ObjectOptimisticLockingFailureException` even with no other editor?
- **CH7 Other writers bump the same row.** Do non-edit operations (stock changes, sales, image uploads, cascade from colors/tags) increment `items.version`? List every code path that does.
- **CH8 Wrong mapping of the exception.** Are `ObjectOptimisticLockingFailureException` and the manual version check both mapped to the same 409 even when the cause is not a real concurrent edit?

Record, for the same item, the sequence: GET → PUT (v) → response version → DB version → GET → PUT again, with status codes. Reproduce the "second edit fails" and the "still fails after Reload" cases separately.

**CRM-2 — reproduce in the real CRM UI** (customers section, view/edit profile). Record for the button: is it rendered, is it `disabled` (why: form validity, dirty check, missing state), does it have an `onClick`/`onSubmit`, is it covered by another element (z-index, overlay), is the click captured by the browser (DevTools event listener), what network call (if any) is made, what status it returns, and is the error swallowed. Test these hypotheses:
- **CC1** Button disabled by form state (required field empty, validation rule that rejects existing data such as a phone or email format, "dirty" flag never set).
- **CC2** No handler: button is `type="button"` without `onClick`, or inside a `<form>` with no `onSubmit`, or the handler is not connected.
- **CC3** Missing proxy route: the CRM Next.js route handler has no `PUT`/`PATCH` for `/api/customers/{id}` (405) or forwards to the wrong URL.
- **CC4** Backend refuses: endpoint missing, wrong method, or role check denies ADMIN (Part 2 changed roles); the `@PreAuthorize` and the Next.js guard must both allow ADMIN and SUPERADMIN.
- **CC5** Backend validation rejects the payload (for example phone or email pattern, uniqueness) and the UI shows nothing.
- **CC6** Modal layering: another overlay intercepts clicks, or the "update" section is hidden behind a condition (role, mode toggle, viewport).

Write `docs/PART4_CRM_DIAGNOSIS.md`: per defect, "reproduced yes/no", evidence, **proven root cause** (say "unproven" if not proven), minimal fix, files. 

**GATE A — stop.** Wait for the developer to approve the diagnosis.

### P4C-1 — Fix CRM-1 (item version loop)

Fix the **proven** cause(s) only. Required behavior, whatever the cause:
1. One admin saving the same item twice in a row, **without reloading**, succeeds both times.
2. After every successful `PUT`, the response contains the **committed** version (for example build the response after `saveAndFlush`, or read the version after flush). The frontend replaces the version in its list state and in the open form with that value.
3. One edit increases the version by exactly 1. If other writers bump it (CH7), exclude them from versioning **only if the diagnosis proves it** (for example `@OptimisticLock(excluded = true)` on the offending non-edit fields/collections) and ask first (R2) because this changes the entity.
4. "Reload Item" fetches that single item fresh (no cache; send `Cache-Control: no-store` / dynamic route handler where the diagnosis shows caching), reopens the edit form with the fresh data and fresh version, and the next save succeeds. The admin item list/detail must never serve a stale version; if a cache is kept for performance, eviction must run on every item update and the version must be read from the database.
5. A **genuine** stale save (two browser sessions editing the same item) still returns 409 `ITEM_VERSION_CONFLICT` with the existing message. Do not remove or weaken optimistic locking. `version` stays out of public DTOs.
6. Backward compatibility stays: a request without `version` still updates (Part 2 decision) unless the developer decides otherwise (ask; do not change).

Tests (real, PostgreSQL test DB `ficcado_data_test`, R9): same admin two sequential updates; response version equals DB version after commit; exactly +1 per update; stale version returns 409; after fetching fresh data the update succeeds; admin list/detail not stale after an update (cache case); the exception handler maps only genuine conflicts. Frontend (Vitest): after a successful save the next save sends the new version; 409 shows the banner, Reload fetches fresh data and the next save succeeds.

Live acceptance (real CRM UI, the agreed test item): edit → save → edit again → save (no reload) ×3 all succeed; open the same item in two browsers, save in A, save in B → B shows the conflict banner; Reload in B → edit → save succeeds; confirm colors, tags, description, images and sizes are intact after each save.

Log edits in the changelog. Commit `P4C-1`.

### P4C-2 — Fix CRM-2 (customer view/edit profile)

Fix the **proven** cause only, then make sure the complete flow works:
1. The edit form shows an **Update/Save** button that is visible, enabled when the form is valid and changed, shows a loading state while saving, and is disabled only while saving.
2. Editable fields are **only the ones the current form already shows** *(discover)*. Do not add fields. Admins never see or set a password.
3. On success: a visible confirmation (use the CRM's existing toast/message pattern *(discover)*), the modal/view shows the new values, and the customers list refreshes. On failure: a clear inline message from the backend (field errors for validation, 409 for duplicates), never silent.
4. The phone number is the CRM's unique key and sales upsert by phone. If the form lets admins change the phone or email: enforce uniqueness (case-insensitive for email) with a 409 and a clear message; **never merge or overwrite another customer**. If the diagnosis shows the form currently blocks phone edits on purpose, keep that.
5. ADMIN and SUPERADMIN can update; all other roles keep whatever they have today (do not change).
6. Use the CRM tokens and the existing button/input styles only (R8).

Tests: backend `PUT` customer update (success, validation error, duplicate phone/email 409, unauthorized role, unknown id 404) on the test DB; Vitest component test (button visible, enabled/disabled logic, submit calls the API, success and error states). Live acceptance: edit name and address of the agreed test customer, save, reload the page, values persisted; try a duplicate phone, see the message; check the sales history of that customer is unchanged.

Log edits in the changelog. Commit `P4C-2`.

### P4C-3 — Regression and docs

1. Run every suite again: CRM backend, CRM frontend (Vitest), CRM build (28 routes), and the website/Website-Data/Payment suites for regression. Zero skipped, zero failing. Record the **real** counts.
2. Add two entries to `docs/MANUAL_TEST_CHECKLIST.md` (CRM-1 and CRM-2) using routes that really exist.
3. Complete `docs/PART4_CRM_REPORT.md`: per defect before/after evidence, files changed, tests added, open questions.
4. Confirm `git diff` touches only allowed files; list exceptions.

**GATE B — stop.** Report completion and list open `P4C-Q` questions.

---

## 3. Definition of Done

- CRM-1 and CRM-2 each have reproduced evidence, proven cause, fix, live acceptance proof and tests.
- Items can be edited repeatedly without reload; real conflicts still return 409; "Reload" truly refreshes.
- Customer edit works end to end with clear success and error feedback; no duplicate or merged customers.
- No test ran against `ficcado_data`; no manual write to the real CRM database.
- All suites green, zero skipped; changelog and reports updated; no out-of-scope file changed.

## 4. Question format (`docs/AGENT_QUESTIONS.md`)

```
### P4C-Q-00N: <title>
- Phase / defect:
- What I found (evidence, file:line):
- Why this file does not decide it:
- Option A:
- Option B:
- My recommendation (optional):
- Status: OPEN
```
Never mark a question resolved yourself; the developer answers in `AGENT_ANSWERS.md`.