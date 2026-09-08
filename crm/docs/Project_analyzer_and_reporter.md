# Project Analyzer and Reporter — Master Instruction Document

> **Purpose**: This document is a reusable master instruction file. Provide it to an AI coding agent inside any Java / Spring Boot + PostgreSQL/MySQL + Next.js project. The agent must follow every section sequentially, performing an exhaustive, evidence-based, production-grade analysis of the entire application.

> **Target Audience for the Analysis**: Senior/Principal Software Engineers, Security Engineers, Architects, DevOps Engineers, and Production Readiness Reviewers.

---

## Role Assignment

You are acting simultaneously as a **Principal/Senior Software Engineer, Software Architect, Security Engineer, DevOps Engineer, and Production Readiness Reviewer** with **15+ years of industry experience** building, reviewing, scaling, securing, and maintaining production-grade applications.

Your expertise spans:

- Java, Spring Boot, Spring JPA / Hibernate
- PostgreSQL / MySQL
- REST API design and security
- Next.js, React, TypeScript / JavaScript
- Web application architecture (frontend + backend + database)
- Authentication and authorization
- Application security and API security
- Performance and scalability engineering
- DevOps and production infrastructure
- Monitoring, observability, and incident diagnosis
- SOLID principles, design patterns, Clean Architecture
- 12-Factor / 16-Factor application principles
- Secure coding practices
- Production reliability engineering

---

## Motivation — Why This Analysis Exists

Applications developed using **AI-assisted / vibe coding** frequently introduce:

- Extremely large blocks of logic when the same functionality could be implemented in a few lines
- Overcomplicated business logic and unnecessary abstractions
- Excessive boilerplate, duplicate logic, and overlapping responsibilities
- Poor separation of concerns and poor folder/file organization
- Incorrect architectural decisions and violations of SOLID principles
- Incorrect or unnecessary design patterns
- Poor database practices (missing indexes, N+1 queries, unbounded queries)
- Security vulnerabilities (unprotected endpoints, IDOR, broken access control, credential exposure)
- Poor authentication and authorization (treating them as the same, missing endpoint-level checks)
- Poor session management
- Poor scalability and poor performance
- Lack of monitoring and observability
- Difficult-to-maintain and difficult-to-modify code
- Unnecessary dependencies/libraries, unused code, unused imports, dead code
- Production reliability issues

This analysis must identify every one of these problems with **evidence**, not assumptions.

---

## CRITICAL RULE: Do NOT Perform a Superficial Review

The analysis must **not** be a generic checklist review.

**Do NOT simply say:**

- "Authentication looks good."
- "Code follows SOLID."
- "Database is scalable."
- "Security appears fine."
- "The application should handle production."

**Every conclusion must be based on actual inspection of the project's source code.**

The agent must inspect the actual implementation and determine:

| Question | Meaning |
|---|---|
| What exists? | What is actually implemented in the codebase |
| What does not exist? | What is missing entirely |
| What is implemented incorrectly? | What exists but has bugs, vulnerabilities, or design flaws |
| What is partially implemented? | What is started but incomplete |
| What is unnecessarily complicated? | What uses 100 lines when 10 would suffice |
| What is duplicated? | What is repeated across multiple locations |
| What is insecure? | What can be exploited |
| What will fail under production load? | What will break with real traffic |
| What will become difficult to maintain? | What will slow down future development |
| What will become a bottleneck? | What will degrade performance as usage grows |
| What can crash? | What has unhandled failure modes |
| What can cause data corruption? | What risks data integrity |
| What can expose sensitive data? | What leaks credentials, tokens, or PII |
| What can allow unauthorized access? | What bypasses authentication or authorization |
| What can create security vulnerabilities? | What opens attack surfaces |
| What can create future technical debt? | What will compound maintenance costs |

**Do NOT assume something is implemented correctly merely because the relevant file, class, or function exists.**

---

## Execution Phases

The analysis is divided into the following mandatory sequential phases:

```
Phase 1 → Complete Project Discovery
Phase 2 → Full Application Analysis (end-to-end flow tracing)
Phase 3 → Generate project_architecture_and_overall_report.md
Phase 4 → Deep Backend Analysis → Generate issue_found_on_backend.md
Phase 5 → Deep Frontend Analysis → Generate issue_found_on_frontend.md
Phase 6 → Backend + Frontend Integration Analysis (append to both reports)
Phase 7 → Double Verification (second independent review pass)
Phase 8 → Generate overall_exp.md (executive production readiness report)
```

---

# Phase 1 — Complete Project Discovery

Before analyzing any issues, you must first understand the complete project.

## 1.1 File Inventory

Identify and count:

- Total number of files in the project
- Total number of backend files
- Total number of frontend files
- Configuration files (application.yml, application.properties, next.config.js, etc.)
- Environment files (.env, .env.local, .env.production, etc.)
- Database-related files (migrations, seeds, schema definitions)
- API definitions (controllers, route handlers)
- Controllers
- Services
- Repositories / DAOs
- Entities / Models
- DTOs / Request objects / Response objects
- Utilities / Helpers
- Components (React/Next.js)
- Pages / Routes
- Hooks (custom React hooks)
- Middleware (backend and frontend)
- Authentication-related files
- Authorization-related files
- Security configuration files
- Deployment configuration (Dockerfile, docker-compose, Kubernetes manifests)
- CI/CD configuration (.github/workflows, Jenkinsfile, etc.)
- Infrastructure configuration
- Monitoring / Logging configuration
- Tests (unit, integration, e2e)
- Documentation files
- API Contract / OpenAPI / Swagger specifications (openapi.json, openapi.yaml, swagger-config, code-gen configurations)
- Scripts (build, deploy, utility)
- Package / dependency definitions (pom.xml, build.gradle, package.json)

**Do NOT arbitrarily exclude files without explaining why.**

## 1.2 Relationship Mapping

The agent must understand the **relationship between files and modules** rather than analyzing every file in isolation.

Map:

- Which controllers call which services
- Which services call which repositories
- Which entities map to which database tables
- Which frontend components call which API endpoints
- Which middleware intercepts which routes
- Which configuration files affect which components
- How authentication/authorization flows connect across layers
- How OpenAPI specifications map to backend controllers, DTO schemas, and frontend API client / TypeScript models
- Whether OpenAPI is utilized as the authoritative Single Source of Truth (SSOT) across backend and frontend layers

## 1.3 Commented Code Inspection

**Do NOT ignore commented-out code or commented lines.**

Commented code may contain:

- Important architectural context or previous implementations
- TODOs, FIXMEs, or HACKs indicating known technical debt
- Security concerns or vulnerability notes
- Business logic that was abandoned but may affect understanding
- Debug code left in production files

Document significant commented code and assess whether it should be removed, restored, or addressed.

---

# Phase 2 — Full Application Analysis

Understand the application **from end to end**.

## 2.1 Primary Flow Tracing

Trace the complete request lifecycle:

```
Frontend (user action)
   ↓
API Request (HTTP method, URL, headers, body)
   ↓
Authentication (token validation, session check)
   ↓
Authorization (role/permission check)
   ↓
Controller (request handling, input validation)
   ↓
Service (business logic execution)
   ↓
Repository (database query execution)
   ↓
Database (data retrieval/mutation)
   ↓
Response (DTO transformation, serialization)
   ↓
Frontend (response handling, state update, UI render)
```

## 2.2 Secondary Flow Identification

Also identify and trace:

- Login flow (complete lifecycle)
- Registration flow
- Logout flow (session/token invalidation)
- Session handling (creation, validation, expiration, refresh)
- Token handling (generation, validation, refresh, expiration, storage)
- Password handling (hashing, storage, reset, change)
- User/customer CRUD operations
- Admin operations and admin-specific flows
- File uploads (validation, storage, retrieval, access control)
- External API calls (third-party integrations)
- Background jobs / async processing
- Notifications (email, push, in-app)
- Payments (if applicable)
- Database transactions (boundaries, isolation levels, rollback behavior)
- Error handling (global handler, per-layer handling, client vs server errors)
- Logging (what is logged, what is not, sensitive data in logs)
- Monitoring (health checks, metrics, alerting)
- Caching (what is cached, invalidation strategy, TTL)
- Rate limiting (which endpoints, what limits, what happens when exceeded)

## 2.3 Actual vs. Intended Architecture

Understand the **actual architecture** as implemented in the code, not merely the architecture the developer intended or documented.

If the code diverges from the documented or conventional architecture, note the divergence and its implications.

## 2.4 OpenAPI Contract & Single Source of Truth (SSOT) Analysis

Determine whether the project employs **OpenAPI (Swagger 3 / OAS 3.x) as an authoritative Single Source of Truth (SSOT)** for all API communication across the technology stack:

- **Specification Source & Generation Strategy**:
  - Is OpenAPI code-first (generated from controllers/annotations via libraries such as Springdoc WebMVC) or design-first (hand-crafted YAML/JSON spec driving code generation)?
  - Is the specification live and accessible at runtime (e.g., `/v3/api-docs` and interactive Swagger UI at `/swagger-ui.html`)?
  - Is there an automated CI/CD or build-time export mechanism (e.g., an integration test, Maven/Gradle plugin) that generates a static, resolved `openapi.json` / `openapi.yaml` into shared documentation folders?
- **Controller & Endpoint Coverage**:
  - Are all controllers and REST endpoints annotated with `@Tag`, `@Operation`, and appropriate status descriptions?
  - Are path variables, query parameters, headers, and request bodies explicitly typed with schemas and descriptions?
  - Are all possible response codes documented (200, 201, 204, 400, 401, 403, 404, 409, 500)?
- **Schema & DTO Fidelity**:
  - Do OpenAPI schemas accurately reflect all request and response DTO records/classes?
  - Are data types, nullability, formats (`int64`, `int32`, `date-time`, `decimal`), and validation constraints correctly exposed in schemas?
- **Enum Synchronization**:
  - Are system state machines and enums (e.g., order status, delivery status, payment status, user roles) exposed as strict OpenAPI `enum` schemas rather than untyped strings?
  - Does the frontend synchronize or match these enums with compile-time exhaustiveness checking?
- **Security Schemes**:
  - Are authentication schemes properly declared in `components.securitySchemes` (e.g., `cookieAuth` for session cookies, `bearerAuth` for JWT Bearer tokens, OAuth2, API keys)?
  - Are security requirements bound globally or per-endpoint, including clear distinction for unauthenticated public endpoints?
- **Multi-Environment Configuration**:
  - Does the OpenAPI spec specify server definitions for development (`localhost`), staging, and production environments?
- **Frontend Alignment & Drift Prevention**:
  - Does the frontend consume the OpenAPI specification to generate or validate TypeScript types, API client methods, and request payloads?
  - Are there any manual, out-of-sync `any` types or divergent API endpoints called in the frontend that do not exist in the OpenAPI spec?

---

# Phase 3 — Generate `project_architecture_and_overall_report.md`

After completely understanding the application, create the file:

**`project_architecture_and_overall_report.md`**

This file serves as a **persistent context/reference document** so that the AI (or future agents) do not repeatedly consume enormous amounts of tokens rediscovering the application's architecture.

The report must include the following sections:

---

## 3.1 Application Overview

- What the application does
- Its primary purpose and business domain
- Major business functionality / features
- Major user types (e.g., admin, customer, vendor, guest)
- Major modules / bounded contexts
- Major workflows

---

## 3.2 Technology Stack

### Backend

| Aspect | Detail |
|---|---|
| Java version | |
| Spring Boot version | |
| Spring modules used | (Web, Security, Data JPA, Mail, etc.) |
| ORM | Spring JPA / Hibernate |
| Database | PostgreSQL / MySQL (specify version if determinable) |
| Authentication mechanism | (JWT, session, OAuth2, etc.) |
| Authorization mechanism | (role-based, permission-based, etc.) |
| Security framework | (Spring Security configuration) |
| API architecture | (REST, GraphQL, etc.) |
| API Contract & Documentation | (OpenAPI 3 / Swagger, springdoc-openapi, schema export mechanism, etc.) |
| External integrations | (payment, email, storage, etc.) |
| Caching | (if present — Redis, Caffeine, etc.) |
| Messaging / background processing | (if present — RabbitMQ, Kafka, @Async, etc.) |

### Frontend

| Aspect | Detail |
|---|---|
| Next.js version | |
| React version | |
| TypeScript / JavaScript | |
| State management | (Context, Redux, Zustand, etc.) |
| Data fetching | (fetch, axios, SWR, React Query, etc.) |
| Routing | (App Router, Pages Router) |
| UI framework | (Material UI, shadcn/ui, Chakra, etc.) |
| Styling solution | (CSS Modules, Tailwind, styled-components, etc.) |
| Authentication handling | (how tokens/sessions are managed client-side) |
| API communication | (base URL config, interceptors, error handling) |
| API Contract & Typing | (OpenAPI TypeScript types, generated API client, typed fetch wrappers) |
| Other major dependencies | |

---

## 3.3 Architecture

Explain the actual architecture for each layer:

- **Backend architecture**: Layered (Controller → Service → Repository)? Hexagonal? Domain-driven? Monolithic?
- **Frontend architecture**: Component structure, page organization, data flow patterns
- **Database architecture**: Schema design philosophy, normalization level, relationship patterns
- **API architecture**: RESTful conventions, versioning, resource naming, request/response patterns
- **API Contract & SSOT architecture**: OpenAPI 3 / Swagger Single Source of Truth role, code-first vs design-first, automated CI/CD spec export pipeline, frontend type generation, interactive Swagger UI
- **Authentication architecture**: Token lifecycle, session management, middleware/filter chain
- **Authorization architecture**: Role hierarchy, permission enforcement, endpoint protection
- **Deployment architecture**: Containerization, orchestration, environment strategy
- **External service architecture**: Third-party integrations, failure handling, circuit breaking

---

## 3.4 Folder Structure

Document the purpose and responsibility of every major directory and its key files.

Example format:

```
backend/
├── src/main/java/com/example/app/
│   ├── controller/     → REST API endpoints
│   ├── service/        → Business logic
│   ├── repository/     → Database access (Spring Data JPA)
│   ├── entity/         → JPA entities (database table mappings)
│   ├── dto/            → Data transfer objects
│   ├── config/         → Spring configuration classes
│   ├── security/       → Authentication & authorization
│   └── util/           → Helper/utility classes

frontend/
├── app/                → Next.js App Router pages & layouts
├── components/         → Reusable React components
├── hooks/              → Custom React hooks
├── lib/                → Utility functions & API clients
├── styles/             → CSS/styling files
└── public/             → Static assets
```

(Adapt to the actual project structure.)

---

## 3.5 Data Flow

Explain how data moves through the complete system, from user interaction to database and back.

---

## 3.6 Authentication Flow

Explain the complete authentication lifecycle:

- How users authenticate (login mechanism)
- How tokens/sessions are generated
- How tokens/sessions are stored (backend and frontend)
- How tokens/sessions are validated on each request
- How tokens/sessions expire and refresh
- How logout works (token/session invalidation)

---

## 3.7 Authorization Flow

Explain role/permission enforcement:

- How roles are assigned
- How permissions are checked at the endpoint level
- How authorization is enforced in the service layer
- Whether frontend authorization is backed by server-side enforcement
- Whether resource-level authorization exists (users can only access their own data)

---

## 3.8 Database Design

Document:

- Major tables/entities and their purposes
- Relationships (one-to-one, one-to-many, many-to-many)
- Foreign keys and referential integrity
- Indexes (existing and missing)
- Constraints (unique, not-null, check)
- Transaction boundaries and isolation levels
- Query patterns (JPQL, native queries, Spring Data derived queries)
- Potential database bottlenecks identified during discovery

---

## 3.9 Important Dependencies

Document important third-party libraries and why they are used. Flag any that appear unnecessary, redundant, or risky.

---

## 3.10 Deployment / DevOps

Document:

- Build process (Maven/Gradle, npm/yarn)
- Deployment process (manual, automated, CI/CD)
- Environment configuration (how dev/staging/production differ)
- Docker/containerization (Dockerfiles, docker-compose)
- CI/CD pipelines
- Secrets management
- Logging configuration
- Monitoring and health checks
- Production-specific configuration

---

## 3.11 Architectural Strengths

Document what is already implemented well and should be preserved. Do not only criticize — acknowledge good work.

---

## 3.12 Architectural Concerns

Document major architectural concerns discovered during the initial understanding phase (these will be expanded in the issue reports).

---

# Phase 4 — Deep Backend Analysis

After the architecture report is created, perform a **deep backend analysis**.

Use `project_architecture_and_overall_report.md` as your reference context to avoid redundant rediscovery.

Analyze the backend from the perspective of a senior software engineer, architect, security engineer, performance engineer, and DevOps engineer.

---

## 4.1 Backend Code Quality

Identify every instance of:

| Category | What to Look For |
|---|---|
| **Complexity** | Overly complicated methods, huge methods (>50 lines), huge classes, excessive nesting (>3 levels), methods doing too many things |
| **Unnecessary Abstractions** | Interfaces with single implementations used for no reason, unnecessary inheritance hierarchies, factories/builders that add no value |
| **Duplication** | Duplicate logic across services, repeated validation logic, repeated transformation/mapping logic, copy-pasted code |
| **Dead Code** | Unused methods, unused variables, unused imports, unused classes, unreachable code, commented-out code that serves no purpose |
| **Separation of Concerns** | Business logic inside controllers, database logic in wrong layers, UI concerns in backend, mixed responsibilities in single classes |
| **God Objects** | God classes, God services, God controllers (classes doing everything) |
| **Naming** | Poor/misleading method names, poor variable names, inconsistent naming conventions |
| **Exception Handling** | Inconsistent exception handling, swallowed exceptions, generic catch-all blocks, missing error context |

**Pay special attention to the common AI/vibe-coding mistake of creating 50–100 lines of logic for functionality that could reasonably be implemented in 5–15 clear lines.**

Do NOT criticize code merely because it is long. Determine whether the complexity is actually justified by the business requirements.

---

## 4.2 SOLID Principles

Verify compliance with each principle:

| Principle | Verification |
|---|---|
| **Single Responsibility (SRP)** | Does each class/method have one reason to change? |
| **Open/Closed (OCP)** | Can behavior be extended without modifying existing code? |
| **Liskov Substitution (LSP)** | Do subtypes honor the contracts of their base types? |
| **Interface Segregation (ISP)** | Are interfaces focused and minimal, or are implementations forced to implement unnecessary methods? |
| **Dependency Inversion (DIP)** | Do high-level modules depend on abstractions rather than concrete implementations? |

**For every violation**, document:

```
File:
Class:
Method:
Line Number/Range:
Violated Principle:
Why It Is a Violation:
Risk:
Recommended Fix:
```

---

## 4.3 Design Patterns

Evaluate:

- Are existing design patterns correctly implemented?
- Are design patterns being used unnecessarily (over-engineering)?
- Is a pattern creating unnecessary complexity where a simpler solution would suffice?
- Is dependency injection correctly used?
- Are factories/builders/strategies/observers/etc. justified by actual requirements?

**Do NOT recommend a design pattern simply because one can technically be applied.**

**Prefer the simplest maintainable solution.**

---

## 4.4 Architecture Principles

Evaluate the backend against:

- Clean Architecture principles (dependency direction, layer boundaries)
- Separation of concerns (each layer has a clear responsibility)
- Layered architecture (controller → service → repository)
- Domain boundaries (are domain concepts properly isolated?)
- 12-Factor / 16-Factor application principles
- Production architecture best practices

**Do NOT force a principle where it does not apply.** Explain deviations and whether they are actually problematic.

---

## 4.5 API Security

Thoroughly inspect **every** API endpoint.

### Check for:

- Unprotected endpoints (missing authentication)
- Missing authorization (authenticated but can access anything)
- IDOR (Insecure Direct Object Reference) vulnerabilities
- Broken access control (user A accessing user B's data)
- Privilege escalation (regular user accessing admin functions)
- User/customer/admin boundary violations
- Sensitive data exposure (returning passwords, tokens, internal IDs unnecessarily)
- Excessive data exposure (returning entire entities instead of DTOs)
- Missing input validation
- Missing input sanitization
- SQL injection possibilities (string concatenation in queries)
- JPQL/HQL injection
- Unsafe dynamic queries
- Mass assignment (accepting and binding all request fields to entities)
- Improper error exposure (stack traces, internal paths, SQL errors sent to clients)
- Sensitive information in logs (passwords, tokens, credit card numbers)
- Weak token validation
- Incorrect token expiration (tokens that never expire)
- Improper session handling
- Missing CSRF protection (for cookie-based auth)
- CORS misconfiguration (wildcard origins, credentials allowed with wildcard)
- Missing security headers (Content-Security-Policy, X-Frame-Options, etc.)
- Insecure file uploads (no type validation, no size limits, path traversal)
- SSRF possibilities (server-side request forgery)
- Unsafe redirects (open redirect vulnerabilities)
- Missing rate limiting on sensitive endpoints

### Malicious User Scenarios

Specifically determine whether a malicious user could:

- Access another user's data by modifying IDs in requests
- Access customer/admin data through API manipulation
- Access admin functionality without admin role
- Access database information through unprotected or debug endpoints
- Modify or delete records they do not own
- Bypass authentication entirely
- Bypass authorization checks
- Abuse APIs (brute force, enumeration, scraping)
- Enumerate users or resources through predictable patterns

---

## 4.6 Authentication & Authorization

Thoroughly evaluate:

### Authentication

- Login mechanism (correctness, security)
- Registration (validation, duplicate handling)
- Password storage (hashing algorithm — bcrypt/scrypt/argon2, salt, work factor)
- Password reset (token generation, expiration, single-use)
- Token generation (JWT claims, signing algorithm, secret strength)
- Token validation (signature verification, expiration check, issuer validation)
- Token expiration (access token TTL, refresh token TTL)
- Refresh token implementation (rotation, revocation)
- Session lifecycle (creation, validation, expiration, cleanup)
- Logout (token blacklisting, session invalidation, refresh token revocation)

### Authorization

- Role management (how roles are stored, assigned, checked)
- Permission management (granularity, enforcement points)
- Admin access (how admin-only endpoints are protected)
- Customer access (how customer data isolation is enforced)
- Endpoint-level authorization (every endpoint checked individually)
- Resource-level authorization (users can only access their own resources)

**Verify that authentication and authorization are NOT treated as the same thing.**

An authenticated user should NOT automatically be authorized to access all resources.

---

## 4.7 User / Customer / Admin Data Security

Verify:

- Credentials are never stored insecurely
- Passwords are never stored in plaintext or reversible encryption
- Secrets are not hardcoded in source code
- API keys are not committed to version control
- Tokens are not unnecessarily exposed to the frontend
- Sensitive information is not returned in API responses unnecessarily
- Sensitive information is not logged (passwords, tokens, full credit card numbers)
- Environment variables are handled correctly (not committed, not exposed)
- Production secrets are managed appropriately (vault, environment variables, not in config files)
- User/customer/admin information is properly protected at every layer
- Database credentials cannot be accessed through APIs or debug endpoints
- Internal configuration cannot be exposed through endpoints (actuator, debug endpoints)

---

## 4.8 Rate Limiting and Abuse Protection

Determine whether the application can protect itself from:

- Brute-force attacks (login, password reset)
- Login abuse (credential stuffing, account lockout bypass)
- API abuse (excessive requests, data scraping)
- Bot attacks (automated registration, spam)
- Request flooding (DoS at application level)
- Resource exhaustion (large file uploads, expensive queries)

**Check whether appropriate rate limiting exists for sensitive endpoints** (login, registration, password reset, API-intensive operations).

---

## 4.9 Scalability and Concurrent Users

Evaluate whether the application can reasonably handle:

| Scale | Users |
|---|---|
| Low | 100 concurrent users |
| Medium | 1,000 concurrent users |
| High | 10,000 concurrent users |

**Do NOT simply claim that it can or cannot.** Identify actual bottlenecks:

- Database queries (N+1, unbounded, unindexed, full table scans)
- Connection pools (size, exhaustion under load)
- Thread pools (blocking operations consuming threads)
- Blocking operations (synchronous I/O, external API calls on request thread)
- Memory usage (large object graphs loaded into memory, no pagination)
- CPU-intensive operations (complex calculations on request thread)
- N+1 queries (lazy loading in loops)
- Large payloads (returning entire tables/collections without filtering)
- Synchronous processing (work that should be async)
- External API calls (timeout handling, circuit breaking)
- Missing caching (repeated identical queries/computations)
- Excessive database calls (multiple queries that could be one)
- Poor transaction boundaries (long-running transactions holding locks)
- Poor pagination (loading all records, filtering in memory)
- Inefficient algorithms (O(n²) where O(n) is possible)
- Unbounded queries (no LIMIT, no pagination)
- Large object graphs (eager loading entire entity trees)

**Explain what is likely to happen as traffic increases.**

---

## 4.10 Database Analysis

Inspect:

### Schema & Structure
- Tables, columns, data types
- Relationships (one-to-one, one-to-many, many-to-many, join tables)
- Foreign keys and referential integrity
- Constraints (unique, not-null, check, default values)
- Indexes (existing indexes, missing indexes, over-indexing)

### Query Analysis
- JPQL / HQL queries (efficiency, correctness)
- Native queries (SQL injection risk, efficiency)
- Spring Data derived queries (correctness, performance)
- N+1 query problems (lazy loading in loops)
- Duplicate queries (same query executed multiple times per request)
- Unbounded queries (no LIMIT, no WHERE clause on large tables)
- Full table scans (queries without indexes on filter/sort columns)
- Inefficient joins (Cartesian products, missing join conditions)
- Loading entire tables into memory

### ORM Configuration
- Lazy vs. eager loading (correct strategy per relationship)
- Cascade settings (unintended cascades, orphan removal)
- Fetch strategies (join fetch, batch fetch, subselect)

### Transaction Management
- Transaction boundaries (too broad, too narrow, missing)
- Isolation levels (appropriate for the operation)
- Locking strategy (optimistic vs. pessimistic, deadlock risk)

### Operational
- Connection pooling (configuration, sizing)
- Pagination (database-level vs. memory-level)
- Sorting (deterministic, indexed columns)
- Filtering (indexed columns, efficient WHERE clauses)

---

## 4.11 Pagination

Verify **all endpoints** that can return potentially large datasets.

Check:

- Does pagination exist?
- Is pagination implemented correctly (database-level, not in-memory)?
- Is page size bounded (max page size enforced)?
- Is sorting deterministic (includes unique column like ID)?
- Is filtering efficient (uses indexed columns)?
- Is the frontend receiving unnecessarily huge datasets?

**Identify every endpoint where missing pagination could become a production problem.**

---

## 4.12 Performance

Identify:

- Slow algorithms (O(n²) or worse where unnecessary)
- Unnecessary loops and nested loops
- Repeated database calls (N+1, multiple queries per request)
- Repeated external API calls
- Excessive object creation
- Excessive serialization/deserialization
- Large response payloads
- Blocking operations on request threads
- Synchronous operations that should be asynchronous
- Missing caching where appropriate
- Incorrect caching (stale data, cache stampede, unbounded cache)
- Memory-heavy operations (loading large datasets into memory)

---

## 4.13 Error Handling

Verify:

- Consistent exception handling across all layers
- Global exception handler exists (e.g., `@ControllerAdvice`)
- Correct HTTP status codes (400 vs 404 vs 409 vs 500, etc.)
- Meaningful error responses (structured error body, error codes)
- No sensitive error details exposed to clients (no stack traces, no SQL errors, no internal paths)
- Proper logging of exceptions (with context, not swallowed)
- Correct distinction between client errors (4xx) and server errors (5xx)

---

## 4.14 Logging and Observability

Determine whether the application has sufficient:

- Structured logging (consistent format, parseable)
- Error logging (all exceptions logged with context)
- Request logging (method, URL, response status, duration — where appropriate)
- Correlation/request IDs (trace a single request across all log entries)
- Health checks (Spring Actuator health endpoint, database check, external service check)
- Metrics (request count, response time, error rate, JVM stats)
- Monitoring (integration with monitoring tools)
- Alerting capability (can operators be notified of failures?)
- Audit logging (who did what, when — for sensitive operations)

**Identify production scenarios where a failure could occur but the developer/operator would have difficulty identifying the cause because of missing monitoring or observability.**

---

## 4.15 Configuration and Environment Management

Check:

- Environment variables (used correctly, not hardcoded)
- Configuration files (application.yml/properties, profiles for dev/staging/prod)
- Secrets (not in source code, not in config files committed to VCS)
- Database configuration (connection strings, pool sizes, timeouts)
- API keys (externalized, not hardcoded)
- Production/development separation (different profiles/configs)
- Hardcoded configuration (URLs, ports, credentials, feature flags)
- Unsafe defaults (debug mode enabled, permissive CORS, H2 console enabled)
- CORS configuration (appropriate for production)
- Logging configuration (appropriate log levels per environment)
- Security configuration (appropriate for production)

---

## 4.16 DevOps / Production Readiness

Evaluate:

- Docker (Dockerfile best practices, image size, multi-stage builds, non-root user)
- docker-compose (service dependencies, volumes, networks, health checks)
- Build process (reproducible, automated, dependency management)
- CI/CD (pipeline exists, tests run, builds verified before deploy)
- Environment management (how environments are separated and configured)
- Health checks (application health, dependency health)
- Graceful shutdown (in-flight requests handled, connections closed properly)
- Restart behavior (what happens on crash, auto-restart configuration)
- Resource limits (memory limits, CPU limits for containers)
- Database migrations (managed migrations, rollback capability)
- Logging (centralized, structured, appropriate volume)
- Monitoring (metrics exported, dashboards, alerts)
- Configuration management (externalized config, no hardcoded values)
- Secret management (vault, environment variables, CI/CD secrets)

---

## 4.17 OpenAPI / API Documentation & Contract Quality

Evaluate the completeness, accuracy, and maintainability of the backend API contract:

- **Annotation Coverage & Clarity**:
  - Are all controllers annotated with descriptive `@Tag` groupings?
  - Does every endpoint have an `@Operation` with clear summary and description?
  - Are HTTP path variables, query parameters, headers, and request bodies explicitly documented?
  - Are all possible response status codes (200, 201, 204, 400, 401, 403, 404, 409, 500) and error structures explicitly documented?
  - Are there any endpoints returning untyped `ResponseEntity<?>` or `Object` without explicit `@ApiResponse` schema annotations?
- **Schema & DTO Fidelity**:
  - Do schemas accurately reflect request and response DTO records/classes?
  - Are data types, nullability, formats (`int64`, `int32`, `date-time`, `decimal`), and validation constraints correctly exposed in schemas?
- **Enum Synchronization**:
  - Are system state machines and enums (e.g., order status, delivery status, payment status, user roles) exposed as strict OpenAPI `enum` schemas rather than untyped strings?
- **Security Scheme Binding**:
  - Are authentication schemes properly declared in `components.securitySchemes` (e.g., `cookieAuth` for session cookies, `bearerAuth` for JWT Bearer tokens, OAuth2, API keys)?
  - Are security requirements bound globally or per-endpoint, including clear distinction for unauthenticated public endpoints?
- **Multi-Environment Configuration**:
  - Does the OpenAPI spec specify server definitions for development (`localhost`), staging, and production environments?
- **Runtime Accessibility & Testing**:
  - Is Swagger UI accessible at runtime (e.g., `/swagger-ui.html` or `/docs`), and does it allow interactive testing with credentials?
  - Is the raw OpenAPI specification served at `/v3/api-docs`?
- **Automated Export & CI/CD Drift Prevention**:
  - Is there an automated CI/CD or build-time export mechanism (e.g., an integration test, Maven/Gradle plugin) that generates a static, resolved `openapi.json` / `openapi.yaml` into shared documentation folders?
  - Does the build verify that the exported spec matches the live backend code to prevent contract drift?

---

# Phase 5 — Deep Frontend Analysis

After completing the backend analysis, independently perform a **deep frontend analysis**.

---

## 5.1 Frontend Code Quality

Identify:

- Overcomplicated components (doing too many things)
- Huge components (>200 lines of JSX/logic)
- Huge hooks (custom hooks with excessive responsibilities)
- Duplicate logic (same logic repeated across components/hooks)
- Repeated API logic (same API call pattern duplicated)
- Repeated UI logic (same UI pattern duplicated without abstraction)
- Excessive boilerplate
- Dead code (unused components, functions, variables, imports)
- Unnecessary state (`useState` for values that can be derived or are constants)
- Unnecessary effects (`useEffect` for synchronous derived values or event handlers)
- Incorrect effects (missing dependencies, stale closures, infinite loops)
- Unnecessary re-renders (missing memoization where expensive, prop drilling causing cascading renders)
- Poor component boundaries (components that are too granular or too monolithic)
- Poor separation of concerns (UI, data fetching, business logic all in one component)
- Tight coupling (components that can't be used or tested independently)
- Difficult-to-understand logic (complex nested ternaries, deeply nested callbacks)

**Again, specifically detect cases where AI/vibe coding generated excessive logic for simple functionality.**

---

## 5.2 Next.js Architecture

Evaluate (based on the Next.js version present in the project):

- **App Router usage**: Is the App Router used correctly? Are layouts, loading states, and error boundaries implemented?
- **Server Components vs. Client Components**: Are components correctly designated? Is `"use client"` used only when necessary?
- **Server Actions**: Are Server Actions used where appropriate (form submissions, mutations)?
- **Routing**: Is the routing structure clean and follows conventions?
- **Layouts**: Are shared layouts used to avoid re-rendering common UI?
- **Loading states**: Are `loading.tsx` files used for Suspense boundaries?
- **Error boundaries**: Are `error.tsx` files used to catch and display errors gracefully?
- **Middleware**: Is Next.js middleware used correctly for auth, redirects, etc.?
- **Data fetching**: Is data fetched on the server where possible? Is client-side fetching minimized?
- **Caching**: Is Next.js caching (fetch cache, route cache) configured correctly?
- **Revalidation**: Is ISR/revalidation configured for dynamic content?
- **Rendering strategy**: Is SSR/SSG/ISR chosen appropriately per page?
- **API communication**: Are API routes used correctly? Is the backend called appropriately?
- **Authentication**: Is auth checked on the server (middleware/server components), not just the client?
- **SEO**: Are metadata, titles, and descriptions implemented?
- **Image optimization**: Is `next/image` used? Are images optimized?
- **Performance**: Are dynamic imports used for code splitting? Is the bundle size reasonable?

**Identify incorrect or unnecessary use of client-side logic where server-side would be better.**

---

## 5.3 Frontend Dependencies

Check:

- Unused libraries (installed but never imported)
- Duplicate libraries (multiple libraries for the same purpose, e.g., axios + fetch wrapper)
- Libraries used for functionality that could easily be implemented without them
- Outdated dependencies (major versions behind, known vulnerabilities)
- Unnecessary dependencies (adding complexity for minimal benefit)
- Excessive dependency size (large libraries used for a single function)
- Redundant packages
- Packages that introduce unnecessary security or maintenance risks

**Recommend removal where appropriate. Do NOT recommend removing a dependency merely because it is small or uncommon. Determine whether it is actually needed.**

---

## 5.4 Frontend Security

Check for:

- Token exposure (tokens stored insecurely, exposed in URLs, sent to wrong origins)
- Credential exposure (passwords or secrets in client-side code)
- Sensitive data in localStorage where inappropriate (should be httpOnly cookies)
- XSS (cross-site scripting) via `dangerouslySetInnerHTML` or unsanitized user input
- Unsafe HTML rendering
- Insecure redirects (user-controlled redirect URLs without validation)
- Authorization bypass (hiding UI elements but not enforcing on backend)
- Client-only authorization (frontend checks without corresponding backend checks)
- Sensitive information in client bundles (API keys, secrets in `NEXT_PUBLIC_` variables)
- Public environment variables containing secrets
- Unsafe API calls (sending credentials to third-party domains)
- Missing server-side authorization (relying solely on frontend role checks)
- CSRF concerns (for cookie-based authentication)
- CORS-related issues
- Dependency security issues (known CVEs in npm packages)

**CRITICAL: Never treat frontend authorization as a replacement for backend authorization.**

---

## 5.5 Frontend Performance

Analyze:

- Unnecessary re-renders (components re-rendering when their data hasn't changed)
- Large client bundles (excessive JavaScript shipped to the browser)
- Excessive client components (components marked `"use client"` that could be server components)
- Unnecessary JavaScript (logic that could run on the server)
- Poor image handling (unoptimized images, missing lazy loading, wrong formats)
- Large API responses (receiving more data than needed)
- Missing pagination (loading all records at once)
- Unnecessary API requests (duplicate fetches, fetching on every render)
- Duplicate API requests (same data fetched in multiple components)
- Waterfall requests (sequential requests that could be parallel)
- Poor caching (no client-side cache, no SWR/React Query, or incorrect cache configuration)
- Inefficient state management (unnecessary global state, state that should be local)
- Large lists without virtualization (rendering thousands of DOM nodes)

---

## 5.6 Frontend File / Folder Structure

Verify the project has a clean, understandable, and maintainable structure.

Identify:

- Misplaced components (component in wrong directory)
- Misplaced utilities (utility in component directory, etc.)
- Duplicate directories (two directories serving the same purpose)
- Duplicate components (same component implemented twice)
- Unclear naming (cryptic file/folder names)
- Inconsistent naming (mixed conventions — camelCase, PascalCase, kebab-case)
- Excessive nesting (deeply nested folder structures)
- Poor domain separation (unrelated features in same directory)
- Mixed responsibilities (UI, data, and logic in same folder without structure)

The structure should make it easy for developers to: understand the application, locate functionality, modify functionality, debug problems, add features, remove features, and maintain the application long-term.

---

# Phase 6 — Backend + Frontend Integration Analysis

After independently analyzing both sides, evaluate their integration.

Check:

- **OpenAPI & API contract conformity**: Is OpenAPI (OAS 3.x) implemented and maintained as the authoritative Single Source of Truth (SSOT)? Do frontend endpoints, request bodies, query parameters, and response shapes strictly mirror the backend OpenAPI specification?
- **Request/response models & Type safety**: Are frontend TypeScript interfaces derived from or strictly validated against OpenAPI schemas, or do components rely on untyped `any` fallbacks and unverified ad-hoc interfaces?
- **Enum synchronization**: Are frontend enums and display maps 100% synchronized with backend OpenAPI enum definitions, backed by compile-time exhaustiveness checking?
- **API client architecture**: Does frontend API communication route through a structured, typed API client reflecting OpenAPI paths, response types, and security headers/cookies?
- **Error handling**: Does the frontend correctly handle all backend error responses (RFC 9457 ProblemDetail or structured errors)?
- **Authentication**: Is the token/session flow consistent between frontend and backend?
- **Authorization**: Are frontend role checks backed by backend enforcement?
- **Token/session handling**: Is token refresh handled correctly end-to-end?
- **Pagination**: Does the frontend correctly request and display paginated data?
- **Filtering/sorting**: Do filter and sort parameters match backend query capabilities?
- **Validation**: Is validation performed on both sides (frontend for UX, backend for security)?
- **CORS**: Is CORS configured correctly for the frontend origin?
- **Timeout handling**: Does the frontend handle backend timeouts gracefully?
- **Retry behavior**: Are failed requests retried appropriately (idempotent only)?
- **API versioning**: Is versioning used to prevent breaking changes?
- **Data consistency**: Are there race conditions or stale data issues?

**Identify mismatches between frontend expectations and backend behavior.**

Append integration issues to the appropriate report (`issue_found_on_backend.md` or `issue_found_on_frontend.md` depending on which side should fix the issue).

---

# Phase 7 — Double Verification

After completing the entire analysis:

**Perform a second independent review of the project.**

The second review must specifically attempt to **discover issues that were missed** during the first review.

Re-check:

- Backend (code quality, architecture, patterns)
- Frontend (components, hooks, Next.js patterns)
- Database (schema, queries, indexes, transactions)
- Authentication & Authorization (every endpoint)
- Security (every attack vector)
- Scalability (every bottleneck)
- Performance (every inefficiency)
- Dependencies (unused, redundant, vulnerable)
- File structure (organization, naming)
- SOLID principles (every violation)
- Design patterns (misuse, over-engineering)
- 12/16-Factor principles (compliance)
- Error handling (consistency, completeness)
- Logging & Monitoring (coverage, gaps)
- Production readiness (deployment, health, graceful shutdown)
- API security (every endpoint re-verified)
- Data protection (credentials, tokens, PII)
- Pagination (every list endpoint)
- Indexing (every query's execution path)
- Rate limiting (sensitive endpoints)
- Session management (lifecycle, invalidation)
- User/customer/admin access (isolation, boundaries)
- DevOps (Docker, CI/CD, config management)
- OpenAPI contract & API documentation (schema completeness, drift, export pipeline)

**Do NOT simply repeat the first review.** The second review must act as a **quality-control pass intended to catch omissions.**

At the end of both `issue_found_on_backend.md` and `issue_found_on_frontend.md`, add a verification section:

```markdown
---

## Verification

- **First review completed**: Yes
- **Second review completed**: Yes
- **Additional issues discovered during second review**: [count]
- **Final issue count**: [count]
- **Confirmation**: The codebase was rechecked for missed issues. [Statement about completeness]
```

**Do NOT claim "no other issues" unless the second review genuinely supports that conclusion.**

---

# Output File: `issue_found_on_backend.md`

Create the file `issue_found_on_backend.md`.

Every identified backend issue must be documented individually.

## Issue Format

For **every issue**, include as much of the following as applicable:

```markdown
### Issue BE-[NNN]: [Short Title]

| Field | Detail |
|---|---|
| **Severity** | CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL |
| **Category** | [Code Quality / SOLID / Security / Performance / Database / Auth / Config / DevOps / etc.] |
| **File** | `path/to/file.java` |
| **Class** | `ClassName` |
| **Method** | `methodName()` |
| **Line Number / Range** | L42–L67 |

**Problem**: [What is wrong]

**What is happening**: [Describe the current behavior]

**Why it is wrong**: [Explain why this is incorrect/risky]

**Broken Principle / Pattern**: [SOLID principle, design pattern, security principle, etc.]

**Risks**:
- **Production Risk**: [What could happen in production]
- **Security Risk**: [How this could be exploited]
- **Performance Risk**: [How this affects performance]
- **Scalability Risk**: [How this affects scaling]
- **Maintainability Risk**: [How this affects future development]

**What could happen in production**: [Concrete failure scenario]

**Recommended Fix**: [Specific, actionable fix]

**Priority**: P0 / P1 / P2 / P3
```

## Severity Levels

| Severity | Definition |
|---|---|
| **CRITICAL** | Security breach, data exposure, authentication bypass, data corruption, application crash |
| **HIGH** | Significant performance degradation, authorization bypass, major architectural flaw, production instability |
| **MEDIUM** | Code quality issues that affect maintainability, moderate performance concerns, incomplete implementations |
| **LOW** | Minor code quality improvements, naming conventions, minor refactoring opportunities |
| **INFORMATIONAL** | Observations, suggestions, and best-practice recommendations |

**Prioritize all issues from highest to lowest risk.**

**Do NOT skip low-priority issues merely because higher-priority issues exist.**

---

# Output File: `issue_found_on_frontend.md`

Create the file `issue_found_on_frontend.md`.

Use the **same detailed structure** as the backend report, with frontend-specific fields:

```markdown
### Issue FE-[NNN]: [Short Title]

| Field | Detail |
|---|---|
| **Severity** | CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL |
| **Category** | [Code Quality / Security / Performance / Next.js / Dependencies / Structure / etc.] |
| **File** | `path/to/file.tsx` |
| **Component/Hook/Function** | `ComponentName` / `useHookName` / `functionName` |
| **Line Number / Range** | L42–L67 |

**Problem**: [What is wrong]

**What is happening**: [Describe the current behavior]

**Why it is wrong**: [Explain why this is incorrect/risky]

**Broken Principle / Pattern**: [React pattern, Next.js convention, security principle, etc.]

**Risks**:
- **Security Risk**: [How this could be exploited]
- **Performance Risk**: [How this affects performance]
- **Scalability Risk**: [How this affects scaling]
- **Maintainability Risk**: [How this affects future development]

**What could happen in production**: [Concrete failure scenario]

**Recommended Fix**: [Specific, actionable fix]

**Priority**: P0 / P1 / P2 / P3
```

---

# Production Failure Analysis

For issues that could cause production failures, explain the **failure chain** — not just the symptom.

**Example:**

```
1,000 concurrent users
   ↓
Hit endpoint GET /api/products (no pagination)
   ↓
Service calls repository.findAll()
   ↓
Loads 50,000 products into memory
   ↓
JVM heap pressure increases
   ↓
GC pauses increase, response time degrades
   ↓
More requests queue up (thread pool exhaustion)
   ↓
Database connection pool exhausted
   ↓
New requests get ConnectionTimeoutException
   ↓
Frontend shows errors, users retry (amplifying load)
   ↓
Application becomes unresponsive
   ↓
Requires restart
```

**Do NOT simply say:** "This could cause performance issues."

**Explain HOW and WHY the failure would occur.**

---

# Security Attack Scenarios

Where relevant, explain **realistic attack scenarios:**

**Example:**

```
Attacker creates normal user account
   ↓
Inspects API call: GET /api/orders/42
   ↓
Changes ID: GET /api/orders/43
   ↓
Backend does not verify order ownership
   ↓
Returns another customer's order (IDOR)
   ↓
Attacker iterates IDs to harvest all customer data
   ↓
Full customer data breach
```

**The goal is to make the developer understand real-world consequences, not abstract risk categories.**

---

# Issue Counting

Every issue must be **counted individually**.

Do NOT combine unrelated issues into a single issue merely to reduce the issue count.

If five separate endpoints have the same security vulnerability, identify each affected endpoint/file separately when the fix or impact is independently relevant.

At the end of each issue report, provide totals:

```markdown
---

## Issue Summary

| Severity | Count |
|---|---|
| CRITICAL | X |
| HIGH | X |
| MEDIUM | X |
| LOW | X |
| INFORMATIONAL | X |
| **Total** | **X** |
```

**Ensure the counts match the actual entries in the report.**

---

# Evidence-Based Analysis Rules

## Do NOT Invent Problems

The analysis must be evidence-based.

**Do NOT report:**

- Hypothetical problems without evidence in the code
- Generic best-practice violations that do not apply to this project
- Issues based purely on personal/stylistic preference
- Architecture preferences presented as security vulnerabilities
- Performance claims without identifying the actual cause in code

**Clearly distinguish between:**

| Category | Definition |
|---|---|
| **Confirmed Issue** | The code demonstrably has this problem |
| **Likely Risk** | The code structure strongly suggests this will be a problem |
| **Potential Risk** | The code could have this problem under certain conditions |
| **Recommendation** | A suggested improvement, not a defect |
| **Architectural Preference** | A different approach that might be better, but the current approach is not wrong |

## Do NOT Ignore Positive Implementation

The reports must NOT contain only criticism.

**Identify and document:**

- Good architecture decisions
- Good security implementation
- Good database practices
- Good code organization
- Good abstractions and reusable components
- Good performance optimizations
- Good authentication/authorization implementation
- Good monitoring/observability
- Good DevOps practices

**Clearly identify things that are already implemented correctly and should NOT be unnecessarily changed.**

---

# Output File: `overall_exp.md`

Finally, create `overall_exp.md` — the **executive-level production readiness report**.

## Overall Rating

```markdown
| Dimension | Score | Justification |
|---|---|---|
| Overall Score | X/10 | [Brief reasoning] |
| Production Readiness | X/10 | [Brief reasoning] |
| Security | X/10 | [Brief reasoning] |
| Backend Architecture | X/10 | [Brief reasoning] |
| Frontend Architecture | X/10 | [Brief reasoning] |
| Database | X/10 | [Brief reasoning] |
| Performance | X/10 | [Brief reasoning] |
| Scalability | X/10 | [Brief reasoning] |
| Maintainability | X/10 | [Brief reasoning] |
| DevOps / Deployment | X/10 | [Brief reasoning] |
| Observability | X/10 | [Brief reasoning] |
| API Contract & SSOT | X/10 | [Brief reasoning] |
```

**Do NOT assign scores arbitrarily. Explain the reasoning behind every score.**

## Overall Production Assessment

Explain:

- What the application does well
- What is currently weak
- What could fail in production
- What could crash under load
- What could become slow
- What could become a bottleneck
- What could become a security vulnerability
- What could become difficult to maintain
- What could become difficult to debug
- What could become difficult to scale

## Live Production Behavior Assessment

Explain how the application is likely to behave under varying traffic:

### Low Traffic (10–100 users)

- Expected behavior, latency, resource usage
- Issues likely to surface even at low scale

### Medium Traffic (500–1,000 users)

- Expected bottlenecks and performance degradation
- Database pressure, connection pool usage
- API latency changes

### High Traffic (5,000–10,000 users)

- Expected failures and breaking points
- Memory and CPU pressure
- Connection pool exhaustion scenarios
- Request timeout scenarios
- Failure propagation patterns

**Do NOT pretend to have performed an actual load test.** This must be a **code/architecture-based assessment**, not a fabricated benchmark.

## Future Failure Prediction

Identify likely future problems if the current implementation continues to grow:

- Increasing technical debt
- Increasing complexity
- Increasing database size
- Increasing user count
- Increasing API traffic
- Increasing frontend bundle size
- Increasing maintenance difficulty
- Increasing deployment complexity
- Increasing security exposure
- Increasing debugging difficulty

**Explain which problems are likely to appear first and why.**

## Recommended Priority Roadmap

### P0 — Immediate (Must fix before production)

Issues that could cause:

- Security breaches or data exposure
- Authentication or authorization bypass
- Critical production failures or crashes
- Data corruption or data loss
- Severe instability

### P1 — High Priority (Fix within first sprint)

Issues that significantly affect:

- Performance under expected load
- Scalability for growth
- Reliability and error handling
- Maintainability for ongoing development

### P2 — Medium Priority (Fix before significant growth)

Issues that should be addressed before the application scales significantly.

### P3 — Low Priority (Ongoing improvement)

Cleanup, refactoring, optimization, code quality improvements.

## Final Senior Engineer Verdict

Conclude with a direct, honest professional assessment.

Answer:

1. **Is this application production-ready?**
2. **If not, why?**
3. **What must be fixed before production?**
4. **What can safely remain as-is?**
5. **What will become a problem when traffic increases?**
6. **What are the largest security risks?**
7. **What are the largest performance risks?**
8. **What are the largest maintainability risks?**
9. **What are the largest architectural risks?**
10. **What should the development team prioritize first?**

The assessment must reflect the standards of a **senior/principal engineer with 15+ years of Java, Spring Boot, PostgreSQL/MySQL, Next.js, web application, security, scalability, and DevOps experience.**

---

# Core Philosophy

Throughout the entire analysis, follow these principles:

| Principle | Meaning |
|---|---|
| **Simplicity over unnecessary complexity** | If something can be implemented cleanly in 10 lines instead of 100, investigate why 100 lines exist |
| **Reuse over duplication** | Identify repeated logic and determine whether it should be centralized |
| **Security by default** | Assume every endpoint, input, session, token, and data boundary must be intentionally secured |
| **Least privilege** | Users, services, APIs, database accounts, and administrators should only have the access they require |
| **Maintainability** | Future developers must be able to understand and safely modify the application |
| **Scalability** | Evaluate based on what happens when the application grows from hundreds to thousands of users |
| **Observability** | A production failure must be diagnosable |
| **Evidence-based analysis** | Never invent issues or claim testing that did not happen |
| **Production mindset** | Do not evaluate the application merely on whether it works locally |

Evaluate the application based on:

```
Security + Reliability + Performance + Scalability + Maintainability + Observability + Operational Readiness
```

---

# Required Output Files

At the end of the complete analysis, the following files **must** exist:

| File | Purpose |
|---|---|
| `Project_analyzer_and_reporter.md` | This file — reusable master instruction document |
| `project_architecture_and_overall_report.md` | Complete architecture and context report |
| `issue_found_on_backend.md` | All backend issues with full detail |
| `issue_found_on_frontend.md` | All frontend issues with full detail |
| `overall_exp.md` | Executive production readiness assessment |

---

# Final Reminders

> **Do NOT skip issues simply because the project is large.**

> **Do NOT stop after finding the obvious problems.**

> **Do NOT prioritize convenience over completeness.**

> **Analyze the entire application, verify the findings twice, count every issue, and provide a realistic assessment of what will happen when the application reaches real production traffic.**
