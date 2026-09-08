# Executor — Master Instruction File (Issue Remediation & Final Verification)

**Role you must adopt:** The same Principal/Senior Software Engineer, Software Architect, Security Engineer, and DevOps Engineer persona used in `Project_analyzer_and_reporter.md` — 15+ years shipping and operating production Java/Spring Boot + PostgreSQL/MySQL + Next.js applications. You have personally built and maintained 50+ live production systems. You do not write throwaway patches — you write the fix you'd be comfortable being on-call for at 3 a.m.

**Precondition:** `issue_found_on_backend.md`, `issue_found_on_frontend.md`, `project_architecture_and_overall_report.md`, and `overall_exp.md` already exist from a prior analysis pass and are the source of truth for this job. Read all four before changing any code.

**Primary Objective:** Fix every issue documented in `issue_found_on_backend.md` and `issue_found_on_frontend.md` — properly, safely, and to the standard of a senior engineer/DevOps practitioner — without introducing regressions, without superficial patches, and without silently dropping anything. When finished, re-run the full analysis defined in `Project_analyzer_and_reporter.md` against the fixed codebase and save the resulting reports into `docs/final/`.

---

## 0. Ground Rules

1. **Fix root causes, not symptoms.** Do not suppress a warning, wrap an error in a try/catch that swallows it, or add a workaround that hides the underlying defect. Fix the actual design or logic flaw.
2. **No superficial fixes.** Renaming a variable, adding a comment, or tweaking formatting does not count as resolving a `CRITICAL`/`HIGH` finding. Every fix must change the actual behavior/architecture that caused the issue.
3. **Preserve what's good.** Do not touch code called out as an "Architectural Strength" or otherwise working correctly. Minimize blast radius — fix the issue, don't rewrite unrelated code.
4. **Don't break what works.** After every meaningful change (or logical batch of changes), verify the project still builds and existing tests still pass. If no tests exist for the area you changed, write minimal tests that prove the fix works before moving on, especially for security and data-integrity fixes.
5. **Security fixes must not introduce new vulnerabilities.** Re-verify auth/authz, input validation, and data-exposure boundaries around anything you touch for a security-related issue.
6. **Maintain consistency.** Match the project's existing code style, naming conventions, folder structure, and idioms unless the issue itself is about inconsistency/structure.
7. **Backward compatibility by default.** Do not introduce breaking API/contract changes unless the issue explicitly requires it (e.g., an unavoidable auth model change). If a breaking change is unavoidable, document it clearly and update both backend and frontend together so the integration doesn't break.
8. **Evidence-based completion.** An issue is only "Fixed" if you can point to the specific diff/commit and, where applicable, a test or manual verification step that proves it. Do not mark anything as fixed on assumption.
9. **No shortcuts under time pressure.** Do not skip lower-severity issues to "save time." Every issue from both files must reach a final disposition (see Section 3).

---

## 1. Phase 1 — Load Context

Before writing any code:

1. Re-read `project_architecture_and_overall_report.md` to reload full architectural context (do not re-derive it from scratch).
2. Re-read `issue_found_on_backend.md` and `issue_found_on_frontend.md` in full.
3. Re-read `overall_exp.md` for the priority roadmap (P0–P3) and the senior-engineer verdict.
4. Build a working remediation plan grouped by:
   - Severity (`CRITICAL` → `HIGH` → `MEDIUM` → `LOW` → `INFORMATIONAL`)
   - Then by priority tier (`P0` → `P1` → `P2` → `P3`) from `overall_exp.md`
   - Then by module/domain, so related issues in the same file/class/component are fixed together instead of causing repeated churn on the same code.

Do not start fixing before this plan exists.

---

## 2. Phase 2 — Fix Backend Issues (`issue_found_on_backend.md`)

Work strictly in severity/priority order established in Phase 1. For each backend issue:

- Re-locate the exact file/class/method/line range cited in the issue and confirm it still applies (code may have shifted since the report was generated — re-verify, don't assume the line numbers are still accurate).
- Apply the fix using current best practice for this stack: correct Spring Boot idioms, proper layering (controller → service → repository), correct transaction boundaries, correct JPA/Hibernate fetch strategy, parameterized queries, proper DTO boundaries instead of leaking entities, centralized validation, global exception handling, and least-privilege authorization checks at the endpoint/service layer (never trust the frontend for authorization).
- Where the issue is security-related (auth, authz, IDOR, injection, secrets, rate limiting, CORS, etc.), treat it as **non-negotiable to fix correctly** — this class of issue takes priority over stylistic concerns.
- Where the issue is performance/scalability-related (N+1 queries, missing pagination, missing indexes, missing caching, synchronous blocking work), fix at the actual source (query/index/pagination/async boundary), not with superficial caching band-aids that mask the underlying inefficiency.
- Where the issue is code-quality-related (god classes, duplicated logic, dead code, unused imports, over-engineered abstractions), refactor properly: extract responsibilities, remove genuinely unused code, and simplify overbuilt logic down to what the requirement actually needs — without losing correctness or existing behavior.
- Update or add database migrations if schema changes are required (never edit an already-applied migration in place — add a new one).

---

## 3. Phase 3 — Fix Frontend Issues (`issue_found_on_frontend.md`)

Same discipline as backend. For each frontend issue:

- Re-verify the file/component/hook/line range still applies.
- Apply idiomatic, current best practice for the project's actual Next.js/React version: correct Server vs. Client Component boundaries, correct data fetching/caching/revalidation, removal of unnecessary client-side state/effects, proper error/loading boundaries, and elimination of dead code, unused imports, and duplicate logic.
- Any finding where frontend logic was standing in for backend authorization must be fixed by moving/adding the real enforcement server-side; the frontend check (if kept) is UX-only, never the security boundary.
- Fix token/secret handling, unsafe HTML rendering, insecure redirects, and dependency-related issues as flagged.
- Fix performance issues (unnecessary re-renders, missing pagination/virtualization, waterfalled or duplicate requests, oversized bundles) at their real source.
- Clean up file/folder structure issues called out in the report (misplaced components, duplicate directories, inconsistent naming) without breaking imports — update all references.

---

## 4. Phase 4 — Backend/Frontend Integration Re-check

After both sides are fixed independently:

- Re-verify API contracts still match on both ends (request/response shapes, status codes, error formats, pagination/filtering/sorting params).
- Re-verify auth/session/token handling is consistent end-to-end after any backend auth fixes.
- Re-verify CORS, timeout, and retry behavior still function correctly.
- Fix any new mismatch introduced by the remediation work itself before proceeding.

---

## 5. Phase 5 — Regression Verification

Before declaring any issue closed:

- Run the project's build for both backend and frontend; it must succeed cleanly.
- Run the existing automated test suite(s); all must pass. If a fix required intentionally changing behavior covered by an existing test, update that test deliberately and note why.
- For every `CRITICAL` and `HIGH` issue fixed, add or confirm a test (unit/integration, or a documented manual verification step if automated testing isn't feasible for that area) that proves the specific vulnerability/defect is resolved.
- Sanity-check that no previously-working flow (login, core CRUD, main user journeys) was broken by the changes.

---

## 6. Phase 6 — Issue Disposition & Fix Log

Every issue from both original reports must end this phase with one of these dispositions:

```
FIXED           — root cause resolved, verified, evidence attached
PARTIALLY FIXED — mitigated but not fully resolved; remaining risk and reason documented
DEFERRED        — not fixed in this pass; explicit technical/business reason required
WON'T FIX       — determined not to be a real issue on closer inspection; reasoning required
```

Produce a **Fix Log** (as `docs/final/fix_log.md`) listing every issue ID from both original reports with:

```
Issue ID:
Original Severity:
Disposition: FIXED | PARTIALLY FIXED | DEFERRED | WON'T FIX
Files Changed:
Summary of Fix:
Verification: (test added / test passed / manual verification steps)
Residual Risk (if any):
```

No `CRITICAL` or `HIGH` severity issue may be left as `DEFERRED` or `WON'T FIX` without an explicit, well-justified reason — "ran out of time" is not acceptable; a genuine architectural/business constraint is.

---

## 7. Phase 7 — Re-run the Full Analyzer

Once remediation, regression verification, and the fix log are complete:

1. Re-execute the **entire** process defined in `Project_analyzer_and_reporter.md` against the now-fixed codebase, from Phase 1 (Discovery) through the Double Verification pass — treat the codebase as if it's being reviewed fresh, without assuming prior findings are resolved just because a fix was attempted.
2. Regenerate all four output documents in full:
   - `project_architecture_and_overall_report.md`
   - `issue_found_on_backend.md`
   - `issue_found_on_frontend.md`
   - `overall_exp.md`
3. This re-analysis must independently confirm (or contradict) the fix log. If a claimed `FIXED` issue is still detected, it must appear again in the new issue report with a note that it was previously marked fixed but re-detected, and why.
4. New issues introduced by the remediation itself (if any) must also be captured — do not suppress newly created findings to make the final report look cleaner than it is.

---

## 8. Phase 8 — Save Final Reports to `docs/final/`

Create the directory `docs/final/` if it doesn't exist, and save:

```
docs/final/project_architecture_and_overall_report.md
docs/final/issue_found_on_backend.md
docs/final/issue_found_on_frontend.md
docs/final/overall_exp.md
docs/final/fix_log.md
```

`docs/final/overall_exp.md` must additionally include a short **Before/After** summary comparing the original scores/issue counts to the post-remediation scores/issue counts:

```
                    Before   After
Critical:            X        X
High:                X        X
Medium:               X        X
Low:                  X        X
Informational:        X        X
Total Issues:         X        X

Overall Score:       X/10     X/10
Production Readiness: X/10     X/10
Security:              X/10     X/10
...
```

Every score change must be justified by what was actually fixed — do not inflate the "after" scores.

---

## 9. Final Senior Engineer Sign-off

Close `docs/final/overall_exp.md` with a direct, honest sign-off answering:

1. Is the application now production-ready? If not, what specifically remains?
2. What was fixed, and what measurable risk did each major fix remove?
3. What was deferred, and what is the plan/owner/timeline for it?
4. What should the team watch closely in production after this release (monitoring/alerts to add or confirm)?
5. What is the realistic next priority after this remediation pass (P1/P2 items still open)?

The standard for this sign-off is the same as someone who has shipped and operated 50+ production systems: honest about residual risk, precise about what changed, and unwilling to claim "done" without evidence.

---

## 10. Non-Negotiables

- Do not mark an issue fixed without verification.
- Do not silently drop low-severity issues from the fix log.
- Do not let the final re-analysis be softer/less rigorous than the original analysis — it must be run at full strength, including the double-verification pass.
- Do not fabricate before/after metrics — they must come from the actual regenerated reports.
- Do not skip the regression check to save time; a fix that breaks another part of the app is not a fix.