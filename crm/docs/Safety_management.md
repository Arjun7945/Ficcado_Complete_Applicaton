# Safety Management — Task Specification

## Purpose

This document defines a set of application-wide quality and safety requirements
for a Java Spring Boot backend + frontend application. The agent executing this
task must not jump straight into code changes. Follow the phased process below,
in order, and do not skip a phase.

---

## Phase 1 — Analyze & Understand

Before writing or changing any code:

1. Read through the entire codebase (backend + frontend) to understand the
   current architecture: project structure, layers (Controller / Service /
   Repository), existing logging setup (if any), existing validation (if any),
   existing DTO/Mapper usage (if any), and how the frontend communicates
   success/failure to the user.
2. Explicitly restate, in your own words, what each requirement below means
   for THIS specific codebase (not generically). Identify the exact files,
   modules, and layers each requirement touches.
3. Do not assume anything is already correct — verify by reading the actual
   code, not by inference from file/folder names.

## Phase 2 — Deep Check (Problem Discovery)

Perform a thorough audit against each of the 7 requirements listed below.
For every requirement, produce a list of concrete, specific problems found
(file name, class/method, line reference where possible, and a short
description of why it is a problem). Do not generalize — every finding must
be traceable to actual code.

If a requirement is already fully satisfied somewhere, state that explicitly
instead of inventing a problem.

## Phase 3 — Implementation Plan

Based on the Phase 2 findings, produce a detailed, ordered implementation
plan before touching code. For each problem found, the plan must state:

- What will be changed (file/class/method).
- How it will be changed (approach, pattern, or structure to be used).
- Which requirement(s) below it resolves.
- Any risk, side effect, or dependency on another change.

Present this plan and confirm it with the user before proceeding to
implementation, unless the user has already instructed you to proceed
directly.

## Phase 4 — Implementation

Execute the plan step by step, based on the user's confirmation/updates.
Do not silently deviate from the agreed plan — if a deviation is necessary,
call it out explicitly and explain why.

## Phase 5 — Final Verification

After implementation, go back through each of the 7 requirements one by one
and verify — by re-reading the actual resulting code, not by assumption —
whether it is now 100% resolved. Be honest: if something is only partially
resolved, state that clearly rather than marking it as done.

## Phase 6 — Completion Report

Create a file named `safety_management_completed_report.md` containing:

- Every issue found in Phase 2 (grouped by requirement).
- The solution/action actually taken for each issue.
- The verification result for each issue (Resolved / Partially Resolved /
  Not Resolved, with reasoning).
- A final conclusion per requirement (1 through 7) stating clearly whether
  it is fully satisfied across the codebase.
- An overall final conclusion for the entire task.

---

## Requirements to Enforce

### 1. Proper Logging in the Java Spring Boot Backend
- Every layer of the backend (Controller, Service, Repository/DAO, exception
  handlers) must have proper logger implementation (e.g. SLF4J with Logback).
- Log meaningful events: entry/exit of key operations, success confirmations,
  caught exceptions, and error conditions — with enough context (identifiers,
  operation name) to debug issues without exposing sensitive data.
- No empty catch blocks. No swallowed exceptions without logging.
- Use appropriate log levels (DEBUG/INFO/WARN/ERROR) correctly and
  consistently — not everything as INFO or everything as ERROR.

### 2. Proper Validation — Backend and Frontend
- Backend: use proper validation annotations/mechanisms (e.g. Bean Validation
  `@Valid`, `@NotNull`, `@Size`, custom validators, global exception handling
  for validation errors) on all incoming requests (DTOs), not just some.
- Frontend: validate all user inputs before submission (required fields,
  formats, ranges, etc.), and also correctly handle validation errors
  returned from the backend.
- Validation must be consistent — the same field should not be validated
  differently or unvalidated on one side.

### 3. Success/Failure Messages Only Appear When They Actually Happen
- The UI must never show a success message unless the corresponding backend
  operation actually succeeded.
- The UI must never show a failure message unless an actual failure occurred.
- No hardcoded/optimistic "Success!" messages fired before or regardless of
  the actual API response.

### 4. No Fake Messages
- Remove any placeholder, dummy, or hardcoded messages that do not reflect
  real system state.
- Every message the user sees must originate from real backend/frontend
  logic tied to the real outcome of the action.

### 5. Log Management in the Frontend Too
- Implement structured logging on the frontend as well (e.g. a consistent
  logging utility/service) to capture errors, failed API calls, and key
  user actions — not just `console.log` scattered arbitrarily.
- Ensure frontend logs are consistent in format and useful for debugging.

### 6. User-Friendly, Meaningful Validation & Status Messages
- Every success and failure message shown to the user must be clear,
  meaningful, and understandable to a non-technical end user/customer.
- No raw stack traces, technical exception messages, or generic
  "Something went wrong" messages where a specific, helpful message is
  possible.
- Messages should tell the user what happened and, where relevant, what
  they can do next.

### 7. Proper DTO and Mapper Structure in the Backend
- All backend-to-frontend and API communication must go through dedicated
  DTO classes — no leaking of JPA entities directly to the API layer.
- Mapping between Entities and DTOs must be handled through a dedicated
  Mapper layer (e.g. MapStruct or manual mapper classes) — not scattered
  inline mapping logic inside controllers/services.
- DTOs and Mappers must be organized into their own clearly named,
  dedicated package/folder structure (e.g. `dto/`, `mapper/`), consistently
  applied across the entire backend — not just in some modules.

---

## Ground Rules for the Agent

- Be evidence-based: every claim of a problem or a fix must reference real
  code, not assumptions.
- Do not mark anything as "done" unless it has been verified by reading the
  resulting code.
- Prefer clarity and honesty over appearing complete — partial resolution
  must be reported as partial.
- Ask the user for clarification only when a requirement genuinely cannot be
  resolved without a decision (e.g. choice of logging library, choice of
  mapper library) — otherwise proceed with sensible, standard defaults and
  state the assumption made.