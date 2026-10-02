# Safety Management — Part 2 — Task Specification

## Purpose

This is a follow-up task to `safety_management.md`. It targets code quality,
maintainability, and correctness of control-flow and error-handling patterns
across the entire Java Spring Boot backend (and frontend equivalents where
applicable). As with Part 1, the agent must not jump straight into code
changes — follow the phased process below, in order, and do not skip a phase.

Do not re-declare something as "resolved" based on assumption or a passing
build alone. Every claim of a problem or a fix must be backed by an actual
grep/search or code read across the **entire** codebase, not a sample of it.
If Part 1's report claimed something was "100% resolved," verify that claim
independently in this task rather than trusting it — treat prior reports as
unverified until re-checked.

---

## Phase 1 — Analyze & Understand

1. Read through the entire backend codebase (all Controllers, Services,
   Mappers, Utility/Helper classes, Exception Handlers) and the frontend
   codebase where relevant (utility functions, API handling logic).
2. For each requirement below, restate in your own words what it means for
   THIS specific codebase — name the exact files/classes/methods you expect
   it to touch, based on an actual scan, not assumption.

## Phase 2 — Deep Check (Problem Discovery)

Perform an exhaustive, codebase-wide audit against each of the 5
requirements plus the additional Part 2.5 issue below. For every
requirement, produce a list of concrete findings,
each with:
- File name and class/method.
- The exact problematic code pattern (quote the relevant lines or describe
  precisely).
- Why it is a problem (readability, maintainability, correctness, risk).

Use repo-wide search (grep/pattern search) — do not sample a few files and
generalize. If a pattern search finds 30 matches, all 30 must be reviewed
and listed or grouped with counts — not silently reduced to "a few examples."

If a requirement is already properly satisfied somewhere, state that
explicitly with evidence, rather than inventing a problem to report.

## Phase 3 — Implementation Plan

Before touching code, produce a detailed, ordered plan. For each problem
found in Phase 2, state:
- What will change (file/class/method).
- How it will be refactored (the specific pattern/idiom to be applied).
- Which requirement(s) it resolves.
- Any risk of behavior change — refactors must be behavior-preserving unless
  explicitly noted and approved. Flag anything where a refactor could
  change semantics (e.g. exception swallowing changing, ordering of
  operations in streams, short-circuit behavior).

Present this plan and get confirmation from the user before large-scale
changes, unless the user has already instructed direct execution.

## Phase 4 — Implementation

Execute the plan. Refactors must preserve existing business logic and
behavior unless a bug is being intentionally fixed (in which case, call it
out explicitly as a behavior change, not a "refactor"). Do not mix silent
behavior changes into what is presented as a pure refactor.

## Phase 5 — Final Verification

Re-check each of the 5 requirements against the actual resulting code:
- Run the same repo-wide searches used in Phase 2 again, post-fix, and show
  that the problematic patterns are gone (or reduced to justified,
  documented exceptions).
- Run the full test suite and confirm no regressions. If test coverage is
  insufficient to catch a behavior change from a refactor (e.g. stream
  conversion, exception handling changes), say so explicitly and, where
  reasonable, add tests to cover the changed logic before declaring it
  resolved.
- Do not mark anything "100% resolved" unless it is backed by both a clean
  repo-wide search and a passing test run covering the changed logic.

## Phase 6 — Completion Report

Create a file named `safety_management_part2_completed_report.md`
containing:
- Every issue found in Phase 2 (grouped by requirement), including counts
  (e.g. "14 if-else chains found across 6 classes").
- The solution/action actually taken for each issue.
- The verification result for each issue (Resolved / Partially Resolved /
  Not Resolved, with the actual evidence — search output or test result —
  not just a claim).
- A final conclusion per requirement (1 through 5, plus Part 2.5) stating
  clearly whether it is fully satisfied across the entire codebase, with
  supporting evidence quoted or referenced.
- An overall final conclusion for the entire task, including any known
  remaining gaps or deliberately-not-refactored exceptions (with reasons).

---

## Requirements to Enforce

*(Requirements 1–5 below, plus an additional issue tracked as "Part 2.5")*

### 1. Proper Switch-Case Usage Instead of Large If-Else Chains
- Identify every long/nested if-else chain in the backend (and frontend
  where relevant) that branches on a discrete, finite set of values
  (enums, status codes, type strings, action types, etc.).
- Replace these with `switch` statements/expressions (using modern Java
  switch expressions with arrow syntax and pattern matching where the
  Java version in use supports it — verify the project's Java version
  first before choosing syntax).
- Do not convert if-else chains that are evaluating open-ended boolean
  conditions or ranges (e.g. `if (amount > 1000)`) — switch-case is only
  appropriate for discrete-value branching. Do not force an inappropriate
  conversion just to satisfy this requirement; state clearly where an
  if-else chain is actually the correct construct and leave it as is.

### 2. Proper Lambda/Stream Usage Instead of Boilerplate Loops
- Identify manual `for`/`while` loops and boilerplate imperative logic
  (manual filtering, manual mapping into new lists, manual searching,
  manual counting/aggregation, nested loops for matching) that can be
  expressed more clearly and safely with Java Streams and lambdas
  (`filter`, `map`, `collect`, `reduce`, `anyMatch`, `Optional` chaining,
  etc.).
- Refactor these to stream-based equivalents where it genuinely improves
  readability and correctness.
- Do not force a stream conversion where it would reduce readability,
  where the loop has complex side effects/early-return control flow that
  doesn't map cleanly to streams, or where performance would be
  meaningfully worse for the actual data sizes involved. State clearly
  where a loop was intentionally left as-is and why.

### 3. Proper Try-Catch Implementation — Every Catch Handles Its Exception Properly
- Audit every single `try-catch` block in the backend (and any in the
  frontend, e.g. `try/catch` around `fetch`/`async` calls).
- For each one, verify:
  - No empty catch blocks.
  - No catch blocks that only log and silently continue when the error
    should actually propagate or fail the operation.
  - No overly broad `catch (Exception e)` where a more specific exception
    type is available and appropriate.
  - No exceptions caught and then re-thrown as a generic/unrelated
    exception type that loses the original cause (must preserve the
    original exception as the `cause` when wrapping/rethrowing).
  - Every catch block does something meaningful: log with context, wrap
    and rethrow with a meaningful custom exception, return a proper error
    response, or clean up a resource (with `finally` or try-with-resources
    where applicable).
- Flag and fix each violation individually — do not batch-fix without
  reviewing what each specific catch block is actually supposed to do.

### 4. Proper Global Exception Handlers and Proper `throws` Declarations
- Verify there is a single, consistent global exception handling strategy
  (e.g. `@RestControllerAdvice` / `@ExceptionHandler`) that covers all
  custom and common exception types thrown across the application, and
  returns consistent, structured error responses (reusing/aligning with
  the RFC 9457-style error format already used elsewhere in the app, if
  applicable, per Part 1's work).
- Ensure no controller/service is manually building its own ad-hoc error
  response structure that bypasses the global handler inconsistently.
- Verify that checked exceptions are declared via `throws` correctly on
  method signatures where they are not caught locally, rather than being
  silently swallowed or wrapped incorrectly.
- Ensure custom exception classes (if any) are meaningful, specific, and
  actually distinguishable in the global handler (not one giant generic
  `AppException` catching everything indiscriminately, unless that is a
  deliberate, justified design choice — state the reasoning if so).

### Part 2.5 — Proper Import Usage Instead of Inline Fully-Qualified Package References
- Identify every place in the codebase where a class is referenced using its
  fully-qualified package path inline inside a method or code block (e.g.
  `java.util.List<String> list = new java.util.ArrayList<>();` or
  `com.aps.ficcado_crm_backend.dto.SaleDto dto = ...`)
  instead of a proper `import` statement at the top of the file.
- This applies across the entire backend (Controllers, Services, Mappers,
  DTOs, Exception Handlers, Config classes, Utility classes) and any
  frontend equivalents (e.g. inline `require()`-style deep paths used
  instead of a clean import at the top of the file, where applicable).
- Search the entire codebase for this pattern — do not sample a few files.
  A fully-qualified reference used inline is usually a sign of an IDE
  auto-complete shortcut that was never cleaned up, or a deliberate
  workaround for a class-name collision. Both cases must be reviewed:
  - If it is an unnecessary shortcut: replace it with a proper top-level
    `import` statement, and use the simple class name in the code body.
  - If it is intentionally avoiding a name collision (e.g. two different
    `Customer` classes from different packages used in the same file):
    keep the fully-qualified reference only for the colliding class, add a
    clear reason (comment or note in the report), and import the
    non-colliding classes normally. Do not blindly force an import if it
    would cause an actual compilation conflict.
- Verify after the fix that all imports are actually used (no unused
  imports left behind) and that wildcard imports (`import
  com.aps....*;`) are not introduced as a lazy fix — imports must be
  explicit, one class per import line, following standard Java
  conventions.

### 5. Production-Quality Standard Throughout
- Beyond the specific patterns above, verify general production-readiness
  markers across the codebase touched by this task:
  - No leftover debug code (`System.out.println`, `console.log` used for
    debugging, commented-out dead code blocks).
  - No TODO/FIXME comments left unresolved without at least being
    reviewed and consciously deferred with a reason noted.
  - Consistent code style/formatting in the refactored areas.
  - No newly introduced code duplication as a side effect of refactors.
  - Refactored code must compile cleanly and pass the full existing test
    suite with zero regressions.

---

## Ground Rules for the Agent

- This task builds on Part 1. Do not assume Part 1's "Fully Satisfied"
  claims are accurate — if this task's exhaustive search finds evidence
  contradicting a Part 1 claim (e.g. a swallowed exception still present,
  a fake success message pattern still present elsewhere), report it
  honestly as a gap in Part 1, not as out of scope.
- Every fix must be evidence-based and verifiable — reference actual
  files, actual before/after code, and actual search/test output.
- Refactors are about clarity, correctness, and maintainability — never
  refactor purely for the sake of "using a modern feature" if it makes the
  code harder to read or changes behavior unintentionally.
- Do not mark anything as "done" or "100% resolved" unless verified by
  re-reading the resulting code and re-running the relevant search/tests.
- If a requirement genuinely cannot be fully satisfied everywhere (e.g. a
  legitimate reason a loop must stay a loop, or an if-else must stay
  if-else), say so explicitly with reasoning instead of forcing an
  inappropriate change or silently ignoring the case.
- Ask the user for clarification only when a decision genuinely requires
  it (e.g. target Java version affecting switch-expression syntax
  availability) — otherwise proceed with sensible, standard defaults and
  state the assumption made.