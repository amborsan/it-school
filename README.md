# School API

Backend-only Express 5 / Prisma 7 / PostgreSQL API for a future React frontend. It provides the 14 school resources, strict Zod input validation, student registration, password login, database-backed cookie sessions, CSRF protection, and role/record authorization. No React app is required to run or test it.

## Install and configure

Requirements: Node.js **24.11+**, npm, and PostgreSQL (including Supabase). Run commands from the project root:

```bash
npm ci
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

For an existing installation, edit your existing `.env` rather than replacing it. Set `DATABASE_URL` and paste the generated random value into `CSRF_SECRET`. This is a signing secret, not a login credential. The old `ADMIN_API_TOKEN` is no longer used. Local defaults are `NODE_ENV=development`, `HOST=127.0.0.1`, `PORT=3000`, `CORS_ORIGINS=http://localhost:5173`, and empty `TRUSTED_PROXIES`.

```bash
npm run db:validate -- --config prisma7.config.ts
npm run db:generate -- --config prisma7.config.ts
npm run db:migrate -- --config prisma7.config.ts
npm run dev
```

The new session migration must be applied before authentication can work. Existing school data is retained. Use `npm start` without file watching. The custom Prisma configuration filename requires `--config prisma7.config.ts` for CLI commands, except scripts that already include it.

Existing password hashes must use the new server-generated scrypt format to work with login; legacy or externally supplied hashes are not accepted. Provision the initial administrator below, then use administrator user PATCH requests with a new `password` to reset existing accounts. Never send `passwordHash` to the API.

## Create the first administrator

Run this once against your intended development database, after migration. Supply the password through an environment variable rather than a command-line argument:

```bash
export BOOTSTRAP_ADMIN_EMAIL=admin@example.com
read -r -s -p 'Initial admin password (12–128 characters): ' BOOTSTRAP_ADMIN_PASSWORD
echo
export BOOTSTRAP_ADMIN_PASSWORD
npm run admin:bootstrap
unset BOOTSTRAP_ADMIN_PASSWORD
```

The command refuses to create another initial administrator if any administrator exists. It hashes the password and creates the first admin in a serializable transaction. Subsequent role management requires a logged-in administrator. Public registration always creates a student account and its student profile.

## Try registration, login and logout

Use an API client with a cookie jar, or curl. Bootstrap CSRF before sending any write, including registration/login. Copy the returned `csrfToken` into the shell variable; the token is tied to its cookie jar.

```bash
curl -c /tmp/school-cookies.txt http://localhost:3000/auth/csrf
read -r -p 'Paste csrfToken: ' CSRF_TOKEN
curl -b /tmp/school-cookies.txt -c /tmp/school-cookies.txt \
  -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"email":"student@example.com","password":"ExamplePassword123!","fullName":"Example Student"}'
curl -b /tmp/school-cookies.txt -c /tmp/school-cookies.txt \
  -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"email":"student@example.com","password":"ExamplePassword123!"}'
curl -b /tmp/school-cookies.txt http://localhost:3000/auth/me
```

Login returns `{ "user": {...}, "csrfToken": "..." }`, rotates the session and CSRF cookies, and sets a fixed 24-hour session lifetime. Copy the **new** `csrfToken` before authenticated writes:

```bash
read -r -p 'Paste the new csrfToken from login: ' CSRF_TOKEN
curl -b /tmp/school-cookies.txt -c /tmp/school-cookies.txt \
  -X POST http://localhost:3000/auth/logout -H "X-CSRF-Token: $CSRF_TOKEN"
```

Logout returns 204, deletes the session, and clears cookies. Replaying the old session fails. Delete `/tmp/school-cookies.txt` when finished. These are development-only example credentials; use your own password for real accounts. Log in with the bootstrapped admin to create courses and manage all school records. New students see no courses until an administrator enrolls them with status `ACTIVE` or `COMPLETED`.

## Documentation

- [Postman testing guide](POSTMAN-TESTING.md): copyable requests for all CRUD operations, relationships, permissions, and cleanup.
- [API reference](docs/api.md): all resources, auth endpoints, request/response examples, writable fields, errors and pagination.
- [Security and HTTPS deployment](docs/security.md): cookies, CSRF, password storage, permissions, CORS, rate limits, proxy configuration, audit limitations.
- [Project plan](docs/project-plan.md) and [implementation checklist](docs/superpowers/plans/2026-10-14-account-api.md).
- [Requirements review and remaining work](docs/superpowers/plans/2026-10-19-project-completion.md): current evidence and the plan for completing the module requirements.
- [Database tables and relationship diagrams](docs/data-model.md), [project structure and request flow](docs/project-structure.md), and [Prisma schema](prisma/schema.prisma).
- [Module requirements](30Sep-module-projekt-en.md).

## Tests

```bash
npm test
```

The default suite needs no database or `.env`. Tests send real HTTP requests through isolated Express apps, use real Zod/crypto/cookies/CSRF/policies, and replace only database delegates with controlled in-memory fixtures. They cover all models' admin CRUD, invalid inputs, precision/calendar bounds, config, auth lifecycle, cookie replay/expiry, cross-user access, teacher privacy, role changes, CORS, rate limits, safe errors and HTTPS forwarding. Node emits an experimental VM modules warning for Jest's ESM support.

For a real Supabase/PostgreSQL integration test, configure `TEST_DATABASE_URL` in `.env` to a **dedicated test database**, with all migrations already applied. Never point it at production. Generate the client, then run:

```bash
npm run test:integration
```

The separate integration suite creates a temporary administrator and course, logs in through the real API, tests course persistence and cleanup, and removes its records. It never falls back to `DATABASE_URL`, migrates, or seeds automatically. See [Supabase's Prisma guide](https://supabase.com/docs/guides/database/prisma) for connection choices.

## Demo data and session cleanup

```bash
npm run db:seed
npm run sessions:cleanup
```

Seed is **development only**: 48 linked school records with fixed UUIDs, publicly known password `SchoolDemo123!`, and the same secure hash format as login. Reruns restore demo values and revoke those users' sessions. Demo users are students/teachers/employees; create the first admin separately. Expired sessions are denied on every request even before cleanup; run cleanup periodically to remove expired database rows.

## React client contract

Use `credentials: "include"` for cookie requests. Bootstrap CSRF, register if needed, log in, and retain the returned CSRF token in memory for writes:

```js
const api = 'http://localhost:3000';
const { csrfToken } = await fetch(`${api}/auth/csrf`, {
  credentials: 'include',
}).then(response => response.json());
const response = await fetch(`${api}/auth/login`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
  body: JSON.stringify({ email, password }),
});
if (!response.ok) throw new Error('Login failed');
const { user, csrfToken: authenticatedCsrfToken } = await response.json();
```

Send `authenticatedCsrfToken` in `X-CSRF-Token` for subsequent writes. On reload, call `/auth/csrf` and `/auth/me`. Handle 401 as expired/missing authentication and 403 as insufficient permission or an invalid CSRF token. Never store passwords or session credentials in localStorage. Use the same hostname in development for frontend and API (`localhost` on different ports is supported); do not mix `localhost` with `127.0.0.1` in browser URLs.

## Code structure and deployment

`src/validation/` is the only input schema system. `src/auth/` handles passwords, cookie settings, CSRF and public user output. Authentication middleware resolves current database identity; resource middleware supplies scoped Prisma filters and writable-field policies. Named controllers retain the resource queries, with helpers for unique-ID scoping and transactional creation checks. `src/main.js` loads `.env`, validates config, connects Prisma, and starts the server.

Follow [HTTPS deployment](docs/security.md#https-deployment), using the supplied [Caddyfile](deploy/Caddyfile). Production needs a real hostname, verified database TLS, an independent random `CSRF_SECRET`, trusted proxy IPs, explicit HTTPS frontend origins and same-site frontend/API hosting. The repository provides configuration and migrations; it does not provision live hosting or public certificates. Review the [known dependency findings](docs/security.md#dependency-audit) before release.
