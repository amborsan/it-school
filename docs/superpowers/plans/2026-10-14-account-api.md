# Account API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the approved backend-only React API with Zod and account authorization.
**Architecture:** Preserve named controllers and routes. Shared Zod schemas validate inputs, cookie sessions identify current users, and resource policies constrain Prisma reads and mutations.
**Tech Stack:** Express 5, Zod, Prisma 7/PostgreSQL, asynchronous Node scrypt, session-bound signed CSRF tokens.
**Spec:** [Approved project plan](../../project-plan.md).

## Global constraints

Node >=24.11; no frontend. All 14 resources retained. Session lifetime 24 hours, only hashes persisted, HttpOnly host-only Lax cookies, Secure in production. Strict request schemas; exact DECIMAL(65,30); no secret inputs in errors. No live deployment or migration without an intended environment.

## Review focus

Expired/deleted/changed-role accounts; cross-user list and mutation access; teacher privacy; login/register CSRF and logout replay; PATCH defaults and plaintext passwords. Each must have HTTP regression coverage.

## Tasks

### 1. Zod validation
Files: `src/validation/{school-schema,config-schema}.js`, shared validation middleware, all controllers and UUID middleware/config. Delete `src/utils/validation.js` after migration.
Interfaces: `parseBody(model,method,body)`, `parsePagination(query)`, `IdSchema`, `RegisterSchema`, `LoginSchema`, `readSecurityConfig(env)`.
- [x] Write strict-body, partial-update, decimal/date/password/config regression tests; observe failures.
- [x] Implement schemas and migrate controllers; verify validation behavior.

### 2. Account lifecycle
Files: `src/auth/{passwords,cookies,csrf}.js`, authentication middleware, auth controller/router, Prisma session migration, bootstrap/seed/cleanup scripts.
Interfaces: `hashPassword`, `verifyPassword`, `requireUser`, `requireCsrf`; `/auth/{csrf,register,login,logout,me}`.
- [x] Write HTTP account/CSRF/expiry/logout-replay tests; observe failures.
- [x] Implement salted async scrypt (N=131072,r=8,p=1), 32-byte sessions and signed session-bound CSRF; transactional registration and credential changes.
- [x] Verify behavior, generate Prisma client, provide first-admin bootstrap and cleanup commands.

### 3. Resource authorization
Files: `src/middleware/authorize-resource.js`, controllers/routes, authorization tests.
Interface: `req.access.where`/`select` and `req.validatedBody`; protected reads/updates/deletes include scope in database query.
- [x] Write HTTP role/ownership/projection/foreign-course tests; observe failures.
- [x] Apply deny-by-default policies and field allowlists, including creation-reference checks.
- [x] Verify admin CRUD and all positive/negative access classes.

### 4. Documentation and verification
Files: README, API/security/model/project-plan docs, env example, integration test.
- [x] Document cookie/CSRF lifecycle, exact permissions, migration/bootstrap and React examples.
- [x] Run full suite, Prisma validate/generate, syntax and documentation links.
- [x] Final follow-up review and final checks.

## Execution ledger

User explicitly requested implementation of the approved scope; execute inline. No Git repository exists, so worktree and commit operations are unavailable. Files are edited in the authorized workspace.
Pre-flight: schemas feed authorization and controllers; authenticated resource parsing follows session authentication; public auth routes have independent limits/CSRF.
Ruling: non-admin edits use PATCH; PUT remains admin-only because required ownership keys conflict with immutable ownership.
Ruling: student coursework membership requires ACTIVE or COMPLETED enrollment; own enrollment/payment records remain readable.
Ruling: use same-site Lax cookies as approved; cross-site deployment is a documented follow-up.

Task 1: complete — Zod schemas/config active; handwritten utility removed; strict PATCH/password/calendar/decimal regressions pass.
Task 2: complete — cookie auth/CSRF, hashed sessions, registration transaction, bootstrap and cleanup commands implemented; auth/bootstrap tests pass.
Task 3: complete — scoped queries and field policies pass all10 authorization tests. Review identified separate create checks/inserts; fixed with deferred checks and insert in one Serializable transaction, verified RED409 → GREEN201.
Task 4: documentation updated; final review/checks in progress. Current full suite: 53 passing tests. Prisma validate/generate passed; TEST_DATABASE_URL absent, so no real integration or live migration/deployment.

Final review: no remaining important defects after atomic creation fix. Full suite: 55 tests passing across 7 suites; syntax and documentation links pass; Prisma schema/client pass; migration matches generated PostgreSQL DDL. Real database/HTTPS remain unverified without an intended environment.
