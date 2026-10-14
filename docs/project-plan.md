# School API project plan

**Status: implemented locally — 2026-10-14. Approved scope completed in the working tree; live database/deployment verification remains environment-dependent.**

The user approved finalizing this plan for a backend-only API intended for a future React frontend. The implementation scope includes Zod validation, registration, login, logout, individual authentication, role-based authorization, record-ownership checks, automated tests, and updated documentation. The implementation now includes those changes. No live deployment or production migration has been performed.

## Goal and scope

Provide a documented, testable PostgreSQL API with registration, login, logout, authentication, and authorization for school users. Administrators manage school records; access for students, teachers, and employees must follow an explicit role and record-ownership policy. Success means another developer can install it, configure a database, run tests, register and authenticate a user, and try the endpoints with the correct permissions.

The implementation uses Express 5, Prisma 7, and PostgreSQL. The intended primary client is a future React frontend, but the current deliverable is the backend and API only. The original code used one deployment-managed administrator bearer token. The implementation replaces that model with individual accounts and database-backed, revocable cookie sessions, alongside the Zod migration. The baseline permission policy below uses least privilege and denies unspecified actions. Building a frontend, payment processing, file hosting, password reset, email verification, and automatic immutable auditing remain outside this phase.

## Milestones and acceptance criteria

| Milestone | Deliverables | Acceptance criteria |
| --- | --- | --- |
| 1. Model the school | [Schema](../prisma/schema.prisma), [relationship diagram](data-model.md), migration | Fourteen models have UUID keys and explicit relations, defaults, unique constraints, and enums |
| 2. Implement persistence and CRUD | Named controllers and separate resource routers | All resources support list/read/create/PUT/PATCH/delete; constraints map to meaningful HTTP results |
| 3. Protect the API | Admin middleware, input allowlists, explicit CORS, rate limits, safe errors, security headers | Anonymous requests cannot read or change resource data; invalid input is rejected before Prisma; private responses are not cached |
| 4. Verify behavior | CRUD, security, and configuration tests; optional real database suite | `npm test` passes without a database; integration suite verifies persistence against a dedicated test database |
| 5. Make it reproducible | README, endpoint examples, `.env.example`, demo seed | A developer can follow the setup guide, create a course, read/update it, and understand errors |
| 6. Prepare HTTPS deployment | Caddy configuration and deployment guide | Production configuration rejects weak credentials, invalid origin/proxy configuration, and insecure requests |
| 7. Replace validation with Zod (implemented) | Shared Zod schemas for resource bodies, route parameters, pagination, and environment configuration; removal of the current validation engine | All 14 resources use Zod; existing validation and security guarantees remain covered by passing tests; obsolete validators and duplicate schema definitions are removed |
| 8. Add account authentication and authorization (implemented) | Registration, login, logout, session persistence/revocation, password hashing, role and ownership middleware | Users authenticate individually; public registration cannot grant privileged roles; logout invalidates the session; unauthorized access to another user's records is denied |
| 9. Deploy and verify | Operator supplies hosting, DNS, secrets, and certificate provisioning | Real HTTPS smoke tests pass; dependency audit findings are reviewed and resolved or explicitly accepted before release |

Milestones 1–8 are implemented in the working tree, including the replacement of administrator-token access with individual accounts. Live deployment and live database integration verification depend on the operator's environment; they are not implied by passing the database-free suite.

## Implementation sequence

Preserve existing resource models and named controllers, adding the session model and migration required for individual accounts. First migrate validation to Zod with regression tests. Then implement account/password handling, persistent sessions and CSRF protection, replace shared-token authentication, and apply the baseline permission policy to every resource. Complete the full HTTP/configuration test suite, update documentation and the diagram, and review deployment settings. Test apps use separate rate-limit stores to prevent interference. Apply reviewed database migrations and verify real HTTPS only in the operator's intended deployment environment.

## Implemented Zod migration

Replace the current handwritten validation with one active Zod schema system. Preserve the documented API behavior and security controls while keeping database queries in the existing controllers.

1. Add Zod as a runtime dependency and rebuild `src/validation/school-schema.js` into the active source of request schemas. Remove obsolete definitions and unsupported uniqueness declarations; database uniqueness remains enforced by Prisma and mapped to `409`.
2. Define strict create/PUT schemas and nonempty partial PATCH schemas for all 14 resources. Reject unknown and read-only fields rather than silently stripping them. Preserve required fields, nullable values, enums, text and array bounds, trimming, email normalization, HTTP(S) URL restrictions, and unchanged password hashes.
3. Express UUID parameters, pagination, and startup environment configuration through Zod schemas. Preserve pagination defaults and bounds, repeated-query rejection, required authentication configuration, explicit origins and proxy addresses, production HTTPS configuration requirements, and positive rate-limit settings. Replace administrator-token configuration with the selected account/session configuration as part of milestone 8.
4. Preserve timestamp validation and conversion to `Date`, including rejection of invalid calendar days. Preserve exact decimal strings and the nonnegative `DECIMAL(65,30)` bounds through schema refinements, without rounding money through JavaScript numbers.
5. Add shared validation middleware/helpers that return parsed values to controllers and translate Zod failures into safe `400` JSON responses. Keep configuration failures at startup and preserve authentication before request-body validation. Never expose raw Zod inputs, credentials, or internal exception details.
6. Switch every controller and relevant middleware/configuration module to the schemas, then remove `src/utils/validation.js` and the old controller field-rule objects once no callers remain. Replace the implementation inside the UUID middleware or remove it in favor of shared schema middleware; do not retain a second validation engine.
7. Extend the existing HTTP and configuration tests to cover schema behavior and regressions, run the full suite and Prisma checks, and update the README/API/security documentation to describe the completed migration.

Acceptance requires all existing success, invalid-input, authorization, rate-limit, and error cases to remain covered. In particular, PATCH must not inject defaults into omitted fields, PUT must still require mandatory fields, decimal boundaries must not lose precision, and no route may bypass validation or authorization during the migration.

## Approved account authentication and authorization

Implement registration, login, logout, authentication, and authorization using the endpoint/session contract and baseline permission policy below.

1. Add `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, and `GET /auth/me`, with strict Zod request schemas and safe response schemas. Registration and login must work without the old administrator token, while logout and identity lookup require an authenticated session.
2. Accept passwords over HTTPS and hash them on the server using asynchronous scrypt with a random salt and documented, reviewed cost settings. Validate passwords with Zod without trimming or silently changing them. Never accept client-supplied `passwordHash` through the account-management API or return passwords/hashes. Update existing user-write endpoints and development seeds to fit the account model.
3. Default public registration to an unprivileged student account; reject submitted privileged roles. Create the required student profile transactionally. Establish a controlled first-administrator bootstrap and administrator-only role management, without public administrator registration or self-promotion.
4. Use an opaque, cryptographically random session credential in an `HttpOnly` cookie, with only its hash stored in PostgreSQL alongside the user and expiry. Use a fixed 24-hour session lifetime, issue a fresh credential on login, and delete/revoke the active session on logout. Clear the cookie with matching attributes and reject expired/revoked sessions and sessions belonging to deleted users. Default to host-only cookies with `Path=/`, `SameSite=Lax`, and `Secure` in production. Target same-site frontend/API hosting; genuinely cross-site deployment requires an explicit secure-cookie configuration and browser compatibility review. Add CSRF protection for state-changing requests, including login and registration, and credentialed CORS restricted to configured frontend origins.
5. Separate authentication (resolve the current user) from authorization (check permitted actions). Implement the baseline role policy below, deny unspecified access, and check record ownership or course membership where required. Apply those constraints to list queries as well as individual record operations. Students must not change grades, payment status, roles, or another user's records.
6. Remove the shared administrator-token access path when individual authentication is enabled. Fetch current account status and permissions from trusted server data; do not trust client-supplied role headers or body fields. Ensure role changes and account deletion affect subsequent authenticated requests.
7. Rate-limit registration and login, use generic failed-login responses, and preserve safe errors, HTTPS enforcement, password-hash redaction, and input bounds. Document any remaining account lifecycle exclusions, such as password reset or email verification, rather than implying they exist.
8. Add tests for registration/login success, invalid input, duplicate emails, incorrect passwords, privilege escalation attempts, unauthenticated requests (`401`), insufficient permissions (`403`), cross-user record access, expiry, and logout followed by credential replay. Update the schema, migrations, data-model diagram, API examples, configuration, and deployment documentation.

The README, API reference and security guide now describe the implemented cookie/CSRF and role/ownership model. The old administrator bearer token is no longer accepted.

### Endpoint and session contract

| Endpoint | Successful behavior |
| --- | --- |
| `GET /auth/csrf` | Provide the CSRF bootstrap needed before registration/login and document how clients submit the token |
| `POST /auth/register` | Validate email/password/profile input, create a student account and profile transactionally, return `201` with public user fields; the client then logs in |
| `POST /auth/login` | Verify credentials, reject deleted accounts, create a fresh persistent session, set the session cookie, and return `200` with public user fields |
| `GET /auth/me` | Return `200` with the authenticated user's public identity and current role, or `401` for an invalid/missing session |
| `POST /auth/logout` | Invalidate the authenticated session, clear its cookie, and return `204`; subsequent replay must fail |

Use generic `401` login failures, `400` for invalid inputs, `409` for duplicate registration email, `403` for disallowed actions or failed CSRF checks, and `429` for exhausted request budgets. Authorization must use the current database role and account status. Initial administrator creation uses a controlled server-side bootstrap command, never a public role parameter. Administrative password/role changes must revoke affected sessions.

### Baseline permission policy

| Role | Allowed scope |
| --- | --- |
| Anonymous | Discovery, CSRF bootstrap, registration, and login only |
| `STUDENT` | Read/update own allowed contact/profile fields; read courses and coursework for own enrollments, own grades/payments/enrollments, and events; create/read/update own submissions and reviews within enrolled courses. Cannot set scores, change foreign-key ownership, manage enrollments, or modify payment status |
| `TEACHER` | Own allowed profile/contact fields; read assigned courses and their enrolled students' necessary academic identity; manage assignments/materials and academic scores/grades within assigned courses; read related submissions/reviews and events. No access to employee salary, payments, role administration, or unrelated student records |
| `EMPLOYEE` | Own allowed profile/contact fields, including read-only access to own employment details, and read events. No employment/salary changes or broader administrative permissions by default |
| `ADMIN` | Manage all existing resources and account roles through validated administrator routes; password/session secrets remain excluded from responses |

For every allowed operation, explicitly define writable fields and scope queries to the authenticated identity or assigned/enrolled course. Non-admin profile updates must not change roles, deletion state, password hashes, profile ownership, employment fields, or academic/financial values. Return only necessary student fields to teachers. All permissions not listed above are denied, including audit-log access for non-administrators. Document this conservative employee baseline so future office workflows require deliberate permission changes.

## Backend-only React integration contract

Do not create a React application, frontend routes, forms, or other UI in this phase. Deliver JSON endpoints, documented authentication/session behavior, explicit development and production frontend-origin configuration, and examples showing how a future React client calls the API. Document `credentials: "include"`, the CSRF-token acquisition/submission flow, and handling of `401` and `403` responses. Verify the full register/login/current-user/logout flow with automated HTTP tests and curl or an API client; a React app must not be required to run or test the backend.

Session design references: [Express session and cookie options](https://expressjs.com/en/resources/middleware/session/), [Express CORS configuration](https://expressjs.com/en/resources/middleware/cors/), and [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

## Validation and risks

The default suite covers success and invalid input across all models, authorization failures, password-hash redaction, generic errors, CORS, rate-limit behavior, and trusted HTTPS forwarding. The optional Supabase suite verifies actual course persistence and cleanup. The diagram and API field definitions must be reviewed whenever the Prisma schema or controller allowlists change.

Individual account sessions now replace the shared administrator token. In-memory rate limits still require one Node process or a shared limiter store. Foreign-key constraints can prevent hard deletion. Seed data is for development only. Audit records are editable. Existing dependency audit findings are listed in [security.md](security.md#dependency-audit) and must be reviewed before production release. Cookie behavior must be checked against actual frontend/API hosting when deployment is known.

## Local verification record

The default suite passes 55 tests across seven suites, covering the original admin CRUD and the account/authorization/security regressions. Prisma validation and client generation pass. The session migration is supplied in the repository and has not been applied to the user's database. `TEST_DATABASE_URL` is not configured, so real PostgreSQL integration verification and live HTTPS/browser checks remain outstanding deployment tasks. Existing dependency findings remain documented in the security guide.
