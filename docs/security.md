# Security and deployment

## Identity and passwords

The API authenticates individual database users using opaque session cookies. `ADMIN_API_TOKEN` and bearer/role headers grant no access. Public registration creates only `STUDENT`, with a student profile in the same transaction. Strict Zod schemas reject roles, hashes and unexpected properties. Initial administrator creation is a controlled server command (`npm run admin:bootstrap`); it refuses to run when an administrator already exists. Only an authenticated administrator can manage subsequent roles and passwords.

Passwords are 12–128 characters and remain byte-for-byte unchanged (no trimming). Asynchronous Node scrypt uses a fresh random 16-byte salt, a 64-byte output, and fixed cost N=131072, r=8, p=1 (128 MiB working memory, 256 MiB maxmem allowance). Derivations use the worker pool; rate limits constrain expensive registration/login requests. Limit application concurrency/resources appropriately; a distributed attacker still requires infrastructure protection. Stored hashes include a versioned parameter format and are compared with timing-safe equality. Unknown or malformed stored hashes still perform a dummy derivation. Login failures for unknown, incorrect, and deleted users are generic.

The old demo hashes are incompatible with login. Re-seed **development** data or have an administrator reset the affected password using user PATCH. Do not automatically trust legacy client-provided hashes. User writes now accept `password`, never `passwordHash`; administrators can reset passwords, but non-admin contact/profile updates cannot. Passwords and hashes are excluded from responses; auth responses use an explicit output allowlist.

## Sessions and logout

Login generates a random 32-byte credential. Only its SHA-256 hash is stored in PostgreSQL's `sessions` table, with user ID and fixed 24-hour expiry. Login replaces any session presented by that client with a fresh credential. Session cookies are host-only, `Path=/`, `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Production cookies use `__Host-` names to prevent domain/path overrides; local HTTP development uses unprefixed names.

Each authenticated request loads current account role/status from the database; permissions never come from the client. Expired sessions and deleted users are rejected even before cleanup. Logout deletes the current session and clears both auth cookies with matching attributes; credential replay then fails. Administrator password/role/deletion-state changes revoke all target-user sessions in the same serializable transaction as the user update. Hard deletion cascades to sessions if school relation constraints permit deletion.

`npm run sessions:cleanup` deletes expired session rows. Run it periodically through your deployment scheduler; it is not required for expiry enforcement. Login/credential-management and authorized non-admin creation use serializable transactions. A database serialization conflict returns 409 so the client can retry; the server does not silently retry a partially failed request.

## CSRF and browser integration

`GET /auth/csrf` generates a signed double-submit token, returns it in JSON, and sets an HttpOnly CSRF cookie. The signature binds a random nonce and timestamp to the current session credential (or an anonymous context before login) using required `CSRF_SECRET`. Writes must send the same token in `X-CSRF-Token`, match the cookie, have a valid signature, and be younger than 24 hours. Forging both cookie and header without the signing secret fails. Login rotates the token and binds it to the new session; pre-login tokens no longer authorize authenticated writes.

CSRF is required for registration and login as well as protected mutations. A React client uses `credentials: "include"`, holds the returned CSRF token in memory, and sends it in the header on writes. It does not read HttpOnly cookies. After reload it fetches `/auth/csrf` and `/auth/me`. This follows the principles in [OWASP's CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

The supported deployment is **same-site** frontend/API hosting, such as `school.example.com` and `api.example.com`, both HTTPS. Different-origin ports on `localhost` support development. Unrelated domains may require cross-site cookies and can encounter browser third-party-cookie restrictions; this phase deliberately does not enable `SameSite=None`. Revisit that design if genuinely cross-site hosting is required.

## Authorization and private data

Authentication establishes identity; resource authorization independently checks role, operation, fields and record scope. Unspecified access is denied. The exact [permission matrix and field allowlists](api.md#permissions-and-non-admin-writes) are part of the API contract:

- Students access their own records and coursework for ACTIVE/COMPLETED enrollments. They cannot set grades, scores, enrollment state, roles, payment state or ownership keys.
- Teachers manage coursework/scores within assigned courses and receive only necessary academic student identity fields, not birth dates, addresses, salaries or payment records.
- Employees read their own employment details and events and edit only their own user contact fields. There is no implicit office-administrator privilege.
- Administrators have validated CRUD access to all school resources, with no password/hash/session-secret disclosure.

List filters are applied in Prisma before pagination. Read/update/delete queries combine the requested UUID **and** the access scope; neither may overwrite the other. Foreign records return 404 to avoid exposing existence. Non-admin creates verify related ownership/enrollment/course in the same serializable transaction as insertion. Non-admin edits use PATCH and cannot reassign foreign-key ownership. Public roles in a request never bypass these checks.

## Zod validation and safe errors

`src/validation/` contains the active Zod schemas. Strict objects reject nested Prisma operations, unknown/generated fields and empty updates. Schemas preserve nullable fields and mandatory POST/PUT values; PATCH does not inject defaults. UUIDs, pagination, integer/enum/boolean values, ISO calendar timestamps and environment variables are validated. Text is bounded to 4,000 characters, unsafe controls are rejected, surrounding whitespace is trimmed except for passwords, and emails are normalized. Prerequisites have at most 100 nonblank strings.

Monetary values preserve exact decimal strings. Nonnegative `DECIMAL(65,30)` bounds are checked without rounding through JavaScript Number (35 integer and 30 fractional places, trailing zeros ignored). Negative amounts, invalid exponent forms, overflow or values needing rounding are rejected. HTTP(S) file URLs cannot contain credentials; URLs are stored, never fetched by the server. Prisma parameterizes database queries; no controller builds raw SQL from input. JSON bodies are capped at 10kb.

The API serves JSON and treats free text as data. It does not strip HTML out of stored text: consuming interfaces must render text or apply appropriate output encoding. There is no HTML template rendering, file upload or URL download endpoint.

Client errors contain safe messages and, for Zod failures, field paths only. Raw Zod issues/inputs, passwords, stack traces, SQL and connection URLs are not returned. Known Prisma errors map to 400/404/409; unknown failures return generic 500. Unexpected request logs use a fixed event rather than dumping exception objects. Authentication public user output is explicitly allowlisted and user resource responses defensively remove password fields.

## CORS, headers and limits

`CORS_ORIGINS` contains exact origins without trailing slashes, paths or wildcards. Empty means no cross-origin browser access. Production origins require HTTPS. Allowed requests include credentialed CORS and `Content-Type`/`X-CSRF-Token`; response headers expose Location and retry/rate-limit information. Unlisted origins get 403 without an allow-origin header. Requests without Origin (curl/server clients) still require their cookies and CSRF tokens. CORS is not authentication.

Helmet sets security headers, Express identification is disabled, every response uses `Cache-Control: no-store`, and production sends one-year HSTS. Proxy trust is limited to explicit IPs/CIDRs; trust-all flags and `/0` are rejected. Production rejects HTTP before processing sensitive input.

Default per-client-IP/per-process budgets, with a common 15-minute window:

| Setting | Default | Counted requests |
| --- | --- | --- |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Window duration in milliseconds |
| `API_RATE_LIMIT` | 300 | All requests admitted by HTTPS/origin policy, including discovery/preflights |
| `WRITE_RATE_LIMIT` | 60 | Authenticated school-resource writes |
| `AUTH_RATE_LIMIT` | 10 | Registration and login attempts, including malformed/CSRF-failed/successful attempts |

429 responses include `Retry-After`; allowed browser clients retain CORS headers on throttled responses. IPv6 keys are grouped by /56. In-memory stores require one Node process: multiple workers/instances need a shared store or gateway limiter. Budgets reset on process restart; clients sharing an IP share budgets. Correct forwarded-client-IP configuration is essential.

## HTTPS deployment

The [Caddyfile](../deploy/Caddyfile) targets a same-host Node listener and explicitly overwrites forwarded IP/protocol headers. [Caddy automatically obtains/renews certificates and redirects HTTP](https://caddyserver.com/docs/automatic-https) when the real domain and infrastructure are configured. No live hosting or certificate has been provisioned by this code change.

1. Install Node 24.11+ and Caddy, point DNS A/AAAA records to the server and allow inbound 80/443. Keep Node's port private and run the app as an unprivileged supervised service.
2. Install with `npm ci`; supply a PostgreSQL URL using a least-privilege runtime user and verified TLS (`sslmode=verify-full` with provider CA settings where needed). Do not disable certificate verification. Use separate migration credentials if required.
3. Generate a new random `CSRF_SECRET` and configure the service environment:

   ```dotenv
   NODE_ENV=production
   HOST=127.0.0.1
   PORT=3000
   CSRF_SECRET=<independent random 32-byte value encoded as hex>
   CORS_ORIGINS=https://school.example.com
   TRUSTED_PROXIES=127.0.0.1,::1
   ```

   Supply `DATABASE_URL` separately. Keep frontend/API same-site. Do not use test secrets or demo accounts in production. Rotating CSRF_SECRET invalidates outstanding CSRF tokens; clients can bootstrap new ones.

4. Generate the client and apply reviewed migrations to the intended database:

   ```bash
   npm run db:generate -- --config prisma7.config.ts
   npm run db:deploy
   npm run admin:bootstrap
   npm start
   ```

   Supply bootstrap email/password using the environment as documented in the README, then remove the bootstrap password. Do not seed production. SIGINT/SIGTERM close the server and disconnect Prisma.

5. Replace `api.example.com` in the Caddyfile with your real hostname. Validate and run it (or install the file into your Caddy service and reload):

   ```bash
   caddy validate --config deploy/Caddyfile --adapter caddyfile
   caddy run --config deploy/Caddyfile --adapter caddyfile
   ```

   Keep Caddy's certificate storage persistent and writable. Configure supervision for both services. Schedule `npm run sessions:cleanup` periodically.

6. Verify on the actual hostname: HTTP discovery redirects; HTTPS discovery returns 200/HSTS; anonymous `/auth/me` returns 401; CSRF bootstrap sets `__Host-` Secure/HttpOnly/Lax cookies; administrator login succeeds; authenticated CRUD observes permissions; logout and replay return 204 then 401. Test from the intended browser origin as well as curl. Never send credentials over HTTP.

Only trust actual proxy peers; a different topology requires its actual addresses and forwarding rules. See [Express proxy trust](https://expressjs.com/en/guide/behind-proxies/). The app rejects insecure requests rather than redirecting credentials itself. Caddy/TLS configuration and the real database must be verified in the operator's environment.

## Deliberate exclusions and limitations

Password reset, email verification, MFA, end-user password-change workflows, public staff signup and a frontend are outside this phase. Administrators can reset user passwords. Student registration does not prove ownership of an email address, so production identity requirements need review before opening enrollment. There is no payment processing, upload handler or remote URL fetching. Add dedicated security controls before introducing those capabilities.

Audit logs remain administrator-managed CRUD, not an immutable automatic audit trail. Related school records can prevent hard deletion. Session cleanup is an operator command, not an automatically installed scheduler. Database-integrity relationships not enforced by the Prisma schema remain an administrative responsibility (for example, administrators can explicitly create mismatched academic references); teacher-created grade references are checked for matching courses.

## Dependency audit

On 2026-10-14, installation reported **23 findings (19 moderate, 4 high)**. Prisma tooling pins affected `deepmerge-ts` and `mysql2`; Jest has an affected `sprintf-js` chain. The four high findings also appear with `--omit=dev` because Prisma is an optional peer of the client. PostgreSQL request handlers do not use the affected MySQL/configuration paths, but those packages remain installed.

No unverified major overrides or forced downgrade of Prisma/Jest were applied. Recheck upstream patches and assess these unresolved findings before production release:

```bash
npm audit
npm audit --omit=dev
```

Advisories: [deepmerge-ts](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [MySQL authentication](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), [MySQL decompression](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3), [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). A passing test suite is not a clean dependency audit or live deployment verification.
