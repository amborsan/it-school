# School API completion implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Checkboxes track work still to do.

**Goal:** Finish the remaining module requirements and prepare an API that the instructor can access and the author can explain.

**Architecture:** Keep the existing Express routes, named controllers, Zod validation, Prisma models, and PostgreSQL database. Complete documentation and verify the existing API before adding functionality. Use the existing Caddy deployment approach with one Node process.

**Tech stack:** Node.js 24.11+, Express 5, Prisma 7, PostgreSQL, Zod, Jest, and Caddy.

**Spec:** [Module requirements](../../../30Sep-module-projekt-en.md), [existing project plan](../../project-plan.md), and the requirement review below.

## Review result on October 19, 2026

Most application requirements are implemented locally. The project is not ready to mark fully complete: there is no live backend URL in the README, real database verification remains outstanding, and the README lacks team names and a short explanation of the technology choices.

Status meanings: **Implemented** means code or documentation exists and was reviewed; **Partial** means a required part remains; **Unverified** means repository files cannot prove completion. These statuses do not claim a production deployment is working.

| Requirement | Status | Evidence and remaining work |
| --- | --- | --- |
| Describe the problem and intended users | Implemented | `README.md` and `docs/project-plan.md` describe the school API and student, teacher, employee, and administrator access. |
| Document at least two related entities | Implemented | `prisma/schema.prisma` has 14 school models plus Session, including Course → Assignment and Student → Enrollment → Course. |
| Include an ERD | Implemented | `docs/data-model.md` contains a Mermaid relationship diagram and relationship limitations. |
| Plan endpoints, methods, requests, responses, and errors | Implemented | `docs/api.md` lists every resource and the shared CRUD contract, creation examples, course walkthrough, and errors. |
| Explain authentication and authorization | Implemented | `docs/api.md`, `docs/security.md`, and `docs/project-plan.md` explain sessions, CSRF, roles, and ownership. |
| Explain technology choices | Partial | The stack is named, but a short rationale for each major choice is missing. Task 1. |
| Plan before implementation | Unverified historically | Planning documents exist; their presence alone cannot establish when they were written. Preserve the existing plan. |
| Use persistent storage and database relations | Implemented; live behavior unverified | PostgreSQL schema, migrations, Prisma queries, and an integration test exist. Tasks 2 and 4 verify real persistence and deployed migrations. |
| Provide useful CRUD endpoints | Implemented | All 14 school resources have list/read/create/PUT/PATCH/delete routes and named controllers. `test/crud.test.js` covers each resource. |
| Use appropriate methods, statuses, and consistent JSON | Implemented | Creation uses 201 and Location, deletion uses empty 204, and errors use `{ "error": "..." }`. |
| Filtering, searching, or pagination where useful | Implemented | Lists support bounded limit/offset pagination; role scopes filter database queries. Extra keyword search is not required. |
| Organize code into clear modules | Implemented | Routes, controllers, validation, authentication, middleware, and configuration have separate responsibilities. |
| Validate and appropriately sanitize input | Implemented | Strict Zod schemas reject unknown fields and invalid UUIDs, dates, numbers, and URLs; text is bounded/trimmed and email normalized. Passwords remain unchanged. |
| Protect private routes and records | Implemented | Session authentication, role permissions, ownership scopes, safe user responses, and CSRF protection are present and tested. |
| Configure CORS deliberately | Implemented | Exact configured origins, credential support, and rejected untrusted origins. |
| Rate limit sensitive endpoints | Implemented | Global, write, and registration/login budgets are configured and tested. |
| Return safe errors | Implemented | Error middleware maps validation/database errors and hides internal exception details. |
| Secure deployed settings and HTTPS | Partial | Production configuration checks and `deploy/Caddyfile` exist; actual TLS, proxy behavior, and cookies need Task 4. |
| Explain inapplicable security controls | Implemented | `docs/security.md` explains JSON text handling, no uploads or URL fetching, and deliberate scope limitations. |
| Automate success, invalid-input, and authorization/error tests | Implemented | Seven suites and 55 tests pass. Most tests replace database delegates; this does not prove PostgreSQL constraints or live deployment. |
| Document install, configuration, local run, and tests | Implemented | README includes `.env.example`, migrations/client generation, administrator bootstrap, curl examples, and test commands. A fresh setup still needs Task 2 verification. |
| Link plan and data diagram from README | Implemented | README Documentation section links both. |
| Deploy an instructor-accessible backend and verify endpoints | Unverified / outstanding | No real deployment URL or deployment verification record is supplied. Tasks 4 and 5. |
| Include deployed URL in README and submission | Missing | Task 5, after deployment succeeds. Placeholder example domains do not satisfy this requirement. |
| Keep credentials and sensitive environment values private | Partially verified | `.env` is ignored and `.env.example` uses placeholders. Remote repository contents and Git history were not verified. Task 5. |
| Include all team members in README | Missing | `package.json` names Ali Borsan, but README has no team section. Confirm whether this is individual work. Task 1. |
| Submit repository link and live URL | Unverified | Local files cannot establish instructor submission or each group member's private repository. Task 5. |
| Send each participant's daily Slack updates | Unverified | Slack history was not accessed. Task 5 is a manual check; do not invent historical updates. |
| Explain the project and personal contribution | Unverified | Task 6 prepares a short demonstration and explanation. |

### Checks performed

- `npm test`: **7 suites passed, 55 tests passed**. The sandbox initially blocked HTTP listeners with `listen EPERM`; the permitted rerun with loopback access passed.
- `DATABASE_URL=postgresql://example:example@localhost:5432/school npm run db:validate -- --config prisma7.config.ts`: **schema valid**. The placeholder URL avoids using real credentials; schema validation does not connect to PostgreSQL.
- Node.js was `v24.21.0`, satisfying the documented version floor.
- `package-lock.json` exists and its root dependencies/devDependencies match `package.json`; a clean installation was not performed.
- `.env` has a database URL, but `TEST_DATABASE_URL` is empty. No database values were printed and no migrations, seeds, or integration writes were performed.
- `docs/security.md` records dependency findings from October 14. Those are historical results, not a fresh audit; Task 3 checks the current state.

## Global constraints

- Keep code simple, in a junior developer style, easy to understand and present.
- Keep the current routes and named controllers. Use clear variable names, ordinary functions, and direct Prisma queries.
- Reuse existing validation, session, authorization, and test helpers. Preserve security controls while keeping changes small.
- Add no frontend, payment processor, upload system, or new architecture to satisfy this backend assignment.
- Use a dedicated test database for integration tests. Do not seed production.
- Store secrets in the local environment or hosting secret settings; never in this plan, README, or source control.
- The submission deadline is **Monday, October 19, 2026 at 23:59 Europe/Berlin**. Prioritize a working deployment and submission over optional enhancements.

## Review focus

1. A fresh installation must generate the Prisma client and apply both migrations before authentication is used. Verify in Task 2.
2. In-memory database fixtures cannot prove foreign-key enforcement or real transaction behavior. Verify related records in Task 2.
3. Production cookies and HTTPS forwarding can behave differently from local HTTP. Verify real headers, login, and logout in Task 4.
4. A process restart must preserve school data and sessions in PostgreSQL. Verify in Task 4.
5. Documentation can accidentally mix example domains, stale audit counts, or private credentials with release facts. Review in Tasks 3 and 5.

## Task 1: Complete the project explanation

**Files:** Modify `README.md` and `docs/project-plan.md`.

**Interfaces:** Uses the existing API contract; changes documentation only.

- [ ] Add a Team section. Use Ali Borsan as the known author and confirm any other participants before claiming the list is complete.
- [ ] Add a short technology rationale to `docs/project-plan.md`: Express for HTTP routes/middleware, PostgreSQL for related persistent records, Prisma for database queries/migrations, Zod for input checks, Jest for automated tests, and Caddy for HTTPS. Link it from README.
- [ ] Explain the core flow in plain language: administrator creates a course and enrollment; teacher adds assignments; student submits work; teacher records scores.
- [ ] Verify every relative documentation link opens and the setup instructions still match `package.json`. Keep the original assignment document unchanged.

**Done when:** Another student can identify the users, stack choices, team, and core flow without reading application code.

## Task 2: Verify real storage and a fresh setup

**Files:** Modify `test/supabase.test.js` only for the related-record coverage below; record verification in `docs/project-plan.md`. Reuse `test/helpers/http.js`.

**Interfaces:** Existing `serve(prisma)` returns `{ base, close }`; `browser(base)` supplies `bootstrap()` and `request(path, method, body)`. Extend the existing administrator course test without adding a second authentication mechanism.

- [ ] Provision or select a disposable PostgreSQL test database, separate from production. Configure its URL privately as `TEST_DATABASE_URL`.
- [ ] Follow README from a clean checkout: `npm ci`, copy/configure `.env`, run client generation, apply migrations, bootstrap the administrator, start the API, and try the documented login/course walkthrough. Use development credentials and a disposable database.
- [ ] Extend the existing integration test: POST an assignment using the created course ID; assert 201, the returned `courseId`, and that `prisma.assignment.findUnique()` reads the same persisted relationship.
- [ ] Add an invalid-reference case with a random nonexistent course UUID; assert assignment creation returns 409 and no assignment was persisted.
- [ ] Confirm the new assertions fail when their expected relationship/status is deliberately wrong, then restore correct assertions. Make any actual product fix only if the real database test exposes a defect.
- [ ] Delete the assignment before the course during normal teardown and in `finally`. Keep cleanup restricted to unique records created by this test so failed assertions do not leave test data behind.
- [ ] With the dedicated database selected, generate the client and apply reviewed migrations to that database, then run `npm run test:integration` and `npm test`. Never rely on the integration suite to migrate automatically.
- [ ] Record the date and actual results without database URLs or passwords.

**Done when:** The fresh setup works, the existing integration test verifies course CRUD and a related assignment in real PostgreSQL, invalid foreign keys are rejected, and cleanup succeeds.

## Task 3: Recheck dependencies before release

**Files:** Modify `package.json`, `package-lock.json`, and `docs/security.md` only as findings require.

**Interfaces:** Preserve the current application API and matching Prisma client/adapter/tooling versions.

- [ ] Run `npm audit` and `npm audit --omit=dev`; record current severity counts and affected dependency paths. If registry access fails, record that the audit remains unverified.
- [ ] Assess the reported paths. Prefer compatible patched versions; avoid `npm audit fix --force` or unexplained overrides.
- [ ] If dependencies change, regenerate Prisma, run schema validation, `npm test`, and the real database integration suite. Confirm the lockfile matches.
- [ ] Replace the historical audit summary with the current date, results, changes, and any remaining findings with an explicit risk assessment.

**Done when:** Current findings are understood and documented, and any updates pass relevant checks. This plan does not assume the old advisory counts are still current.

## Task 4: Deploy and verify the existing API

**Files:** Configure `deploy/Caddyfile` for the selected hostname; update `docs/security.md` if actual deployment differs. Add a short deployment verification record to `docs/project-plan.md`.

**Interfaces:** Use `src/main.js`, the existing production environment settings, and `npm run db:deploy`. Keep the Node port private behind Caddy and use one process because rate-limit storage is in memory.

- [ ] Select the server, real API hostname, production database, and frontend origin if one exists. Set secrets privately and use verified database TLS. Provision DNS, ports 80/443, Caddy, and process supervision using the existing deployment guide.
- [ ] Install dependencies, generate the client, back up any existing production database, review/apply migrations with `npm run db:deploy`, and bootstrap the first administrator privately. Do not run the demo seed.
- [ ] Run Caddy with the actual hostname and exact proxy trust settings. Validate its configuration and start the application under supervision.
- [ ] Verify HTTP redirects to HTTPS; HTTPS `GET /` returns 200 and HSTS; anonymous `GET /auth/me` returns 401; CSRF cookies have Secure/HttpOnly/SameSite settings; administrator login succeeds.
- [ ] Create/read/update/delete a uniquely named temporary course through authenticated HTTPS requests. Verify invalid input returns 400, forbidden origins return 403, and a student cannot perform administrator writes. Delete only the smoke-test records.
- [ ] Create a temporary course and log in, restart only the Node process, and confirm the course and unexpired session still work. Then delete the temporary course, log out, and confirm the old session returns 401.
- [ ] If using a browser client, test cookies and allowed-origin requests from its actual origin. Record the hostname, date, statuses, and results without credentials, tokens, or cookie files.

**Done when:** The real HTTPS service is publicly reachable, persistence survives restart, and the documented authentication and CRUD flows work there.

## Task 5: Finish the submission

**Files:** Modify `README.md`; review the intended remote repository and submission manually.

**Interfaces:** Consumes the verified HTTPS URL from Task 4 and the confirmed participant list from Task 1.

- [ ] Add the actual verified backend URL near the top of README. Include the repository link in the submission and verify documentation from the remote repository.
- [ ] Check tracked files and available Git history for credentials, `.env`, database URLs containing passwords, private keys, and session/cookie artifacts. Replace accidentally exposed credentials and remove sensitive files appropriately before sharing.
- [ ] Confirm every team member has the required private repository if this is group work.
- [ ] The participant submits the GitHub link and live API URL to the instructor before 23:59 Europe/Berlin on October 19, 2026. Record submission only after it happens.
- [ ] Each participant verifies their daily Slack updates. Missing historical updates cannot be recreated as evidence of having sent them on time; explain gaps honestly. Do not send messages automatically as part of this code plan.

**Done when:** README contains team names and the working URL, the repository is ready to share, and the instructor has received the required links.

## Task 6: Prepare a short technical demonstration

**Files:** No application changes required; use the existing README, API reference, and ERD.

**Interfaces:** Uses the verified deployment and existing documented endpoints.

- [ ] Practice explaining the request flow: route → authentication/authorization → validation → controller → Prisma → PostgreSQL → JSON response. Note that middleware order differs for public auth endpoints and protected resources.
- [ ] Present Course → Assignment and Student → Enrollment → Course on the diagram.
- [ ] Demonstrate login, course CRUD, one invalid request, and one denied request with a temporary account or test record; clean up afterward.
- [ ] Explain password hashing, session cookies, CSRF, role scopes, CORS, rate limits, safe errors, and HTTPS in plain language. Distinguish tests using database fixtures from real database tests.
- [ ] State your own contribution and the known limitations without claiming features that are not implemented.

**Done when:** Each participant can demonstrate and explain the parts they submit.

## Optional improvements after the required work

These are not explicitly required by the module and should not delay submission: keyword search, frontend screens, password reset/email verification, automatic immutable audit logs, payment processing, and stricter school business rules such as preventing duplicate enrollments or checking all administrator-supplied cross-record references. The existing API documentation already describes several of these limitations.
