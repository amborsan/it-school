# API reference

Local base URL: `http://localhost:3000`. Production uses HTTPS. Responses are JSON except `204`. Authenticate with the session cookie returned by login; the old admin bearer token is not accepted. Every state-changing request requires the matching `X-CSRF-Token`. The [README](../README.md) includes a complete cookie-jar walkthrough and React fetch example.

## Account endpoints

| Method/path | Input | Success |
| --- | --- | --- |
| `GET /auth/csrf` | None; send any existing cookies | `200 {"csrfToken":"<signed token>"}` plus an HttpOnly CSRF cookie |
| `POST /auth/register` | `{"email":"student@example.com","password":"ExamplePassword123!","fullName":"Student"}` | `201 {"user":{"id":"<uuid>","email":"student@example.com","role":"STUDENT",...}}` |
| `POST /auth/login` | `{"email":"student@example.com","password":"ExamplePassword123!"}` | `200 {"user":{...},"csrfToken":"<new token>"}` plus session and new CSRF cookies |
| `GET /auth/me` | Session cookie | `200 {"user":{...}}` |
| `POST /auth/logout` | Session cookie and CSRF header/cookie | `204`; session is deleted and cookies are cleared |

Registration also accepts optional nullable `firstName`, `lastName`, and `fullName`. All other fields, including `role`, `passwordHash`, profile IDs and nested relations, are rejected. Public registration transactionally creates a student profile. It does not log in automatically. Passwords require 12–128 characters, cannot be blank, and are not trimmed or normalized. Login validates the submitted password without changing it. Unknown, incorrect and deleted-account login attempts use the same `401` message.

Bootstrap CSRF **before** registration or login and reuse its cookie jar. Login rotates CSRF; use the new token in its response for subsequent writes, or fetch `/auth/csrf` again. Sessions have a fixed 24-hour expiry; logout invalidates the active session immediately. Other sessions are unchanged by logout. Administrative password/role/deletion-state changes revoke all sessions belonging to that user. `/auth/me` uses the current database role and rejects deleted accounts.

## School resource paths

| Model | Base path |
| --- | --- |
| User | `/users` |
| Student | `/students` |
| Teacher | `/teachers` |
| Course | `/courses` |
| Employee | `/employees` |
| Enrollment | `/enrollments` |
| Assignment | `/assignments` |
| Submission | `/submissions` |
| Grade | `/grades` |
| CourseMaterial | `/course-materials` |
| Payment | `/payments` |
| Event | `/events` |
| Review | `/reviews` |
| AuditLog | `/audit-logs` |

All resource operations require authentication. **Administrators** can use the full CRUD contract:

| Method | Path | Success |
| --- | --- | --- |
| GET | `/resource?limit=50&offset=0` | `200`, scoped array ordered by UUID ascending |
| GET | `/resource/:id` | `200`, one permitted record |
| POST | `/resource` | `201`, new record with `Location: /resource/<uuid>` |
| PUT | `/resource/:id` | `200`, all mandatory fields required; omitted optional fields retain values |
| PATCH | `/resource/:id` | `200`, only supplied fields change |
| DELETE | `/resource/:id` | `204`, empty body; dependencies may prevent deletion |

IDs are UUID primary keys, not course codes or student display identifiers. List `limit` is 1–100, default 50; `offset` is 0–2147483647, default 0. Duplicate, unknown or invalid pagination parameters are rejected. Lists are bare arrays with no total count. Read/update/delete queries include the permitted scope: records outside it return `404`, while an entirely forbidden resource/action returns `403`.

`GET /` (and HEAD) is public route discovery: `{ "message": "Express + Prisma API", "users": "/users", "resources": { "user": "/users", ... } }`. Allowed OPTIONS preflights return 204 without login. HEAD follows the same permissions as GET. Unknown authenticated routes return 404; unauthenticated resource requests return 401.

## Permissions and non-admin writes

| Role | Read scope | Write scope |
| --- | --- | --- |
| STUDENT | Own user/student profile, enrollments, payments, grades and submissions/reviews; courses/assignments/materials for ACTIVE or COMPLETED enrollments; events | PATCH own contact/profile fields; POST own submissions/reviews within enrolled courses; PATCH own submission content/review rating/comment |
| TEACHER | Own user/teacher profile; assigned courses and related enrollments, academic student identities, assignments/materials, grades, submissions/reviews; events | POST/PATCH/DELETE assigned assignments/materials/grades; PATCH assigned submission scores; PATCH own user contact fields |
| EMPLOYEE | Own user/employee profile and employment details; events | PATCH own user contact fields only |
| ADMIN | All school resources | Full validated CRUD and user role/password management |

All unspecified permissions are denied. Non-admin edits use PATCH; PUT is administrator-only. Non-admin DELETE is limited to teachers' assigned assignments/materials/grades. Students cannot delete submissions/reviews. The following non-admin field allowlists apply in addition to the schemas below:

- Own `/users/:id` PATCH: `email`, `fullName`, `firstName`, `lastName`, `phone`, `address`.
- Own student profile PATCH: `dateOfBirth` only. Display IDs, enrollment dates and profile ownership are administrator-managed.
- Student submission POST: `assignmentId`, `studentId`, optional `content`; PATCH: `content` only.
- Student review POST: `studentId`, `courseId`, `rating`, optional `comment`; PATCH: `rating`, `comment` only.
- Teacher assignment POST: writable assignment fields below; PATCH excludes `courseId`.
- Teacher material POST: writable material fields below; PATCH excludes `courseId`.
- Teacher grade POST: writable grade fields below with matching assigned course/enrollment; PATCH: `category`, `pointsObtained`, `totalPoints`.
- Teacher submission PATCH: `points` only. Teachers cannot rewrite students' answers.

Student POST references must belong to the current student and an ACTIVE or COMPLETED course enrollment. Teacher POST references must belong to an assigned course. Creation reference checks and inserts run in a serializable transaction. Foreign-key ownership cannot be reassigned by non-admin updates. Teacher student responses contain only `id`, `userId`, `studentId`; teacher user responses contain `id`, `email`, `fullName`, `firstName`, `lastName`. Personal contact, birth dates, salaries and payment records are not exposed through these academic projections.

## Validation and response rules

Zod strict objects reject unknown/read-only fields, nested Prisma operations, empty updates and wrong types. POST/PUT require mandatory fields; PATCH requires one writable field and does not apply defaults to omitted values. IDs and automatic timestamps are database-managed. Nullable fields marked `?` below accept null; optional non-null fields may be omitted but cannot be null.

Text is at most 4,000 characters with unsafe controls rejected and outer whitespace trimmed. Email is lowercased and trimmed; passwords remain exact. Arrays contain at most 100 nonblank bounded strings. Integers are nonnegative 32-bit values, except ratings (1–5). Dates require valid ISO timestamps including seconds and a timezone, with at most millisecond precision, and serialize in UTC. Monetary input must fit nonnegative `DECIMAL(65,30)` (35 integer / 30 fractional places, trailing zeros ignored); strings preserve precision and values requiring rounding are rejected. Decimal responses are strings and may omit trailing zeros. File URLs require HTTP(S) with no credentials. JSON bodies are limited to 10kb.

Responses contain scalar model fields and defaults; no relation expansion is available. Password/hash fields are always excluded from user responses. Teacher responses use the reduced projections described above.

## Writable fields by resource

### Users

Required: `email` (valid email, normalized lowercase), `password` (12–128 characters, hashed by the server).

Optional: `fullName?`, `firstName?`, `lastName?`, `phone?`, `address?` (strings); `role` (`STUDENT`, `TEACHER`, `ADMIN`, `EMPLOYEE`, default `STUDENT`); `deletedAt?` (timestamp).

Email is unique. Only administrators may write roles; authorization uses the current database role. Password hashes and plaintext passwords are never returned. Setting `deletedAt` revokes sessions and prevents login; administrator resource reads can still retrieve the record.

### Students

Required: `userId` (User UUID).

Optional: `studentId?` (unique display string), `dateOfBirth?` (timestamp), `enrollmentDate` (timestamp, default now).

Each user can have at most one Student profile.

### Teachers

Required: `userId` (User UUID).

Optional: `employeeId?` (unique display string), `department?`, `position?` (strings), `hireDate?` (timestamp).

Each user can have at most one Teacher profile.

### Courses

Required: `code` (unique string), `title` (string), `prerequisites` (strings; `[]` is allowed).

Optional: `description?` (string), `instructorId?` (Teacher UUID), `credits` (int, default 3), `level` (`BASIC`, `INTERMEDIATE`, `ADVANCED`, default `BASIC`), `maxStudents?` (int).

### Employees

Required: `userId` (User UUID), `employeeId` (unique string), `department`, `position` (strings).

Optional: `hireDate?` (timestamp), `salary?` (decimal), `isActive` (boolean, default true).

Each user can have at most one Employee profile.

### Enrollments

Required: `studentId` (Student UUID), `courseId` (Course UUID).

Optional: `status` (`PENDING`, `ACTIVE`, `COMPLETED`, `DROPPED`, default `PENDING`), `enrolledAt` (timestamp, default now).

### Assignments

Required: `courseId` (Course UUID), `title` (string), `maxPoints` (int).

Optional: `description?` (string), `dueDate?` (timestamp), `fileUrl?` (URL).

### Submissions

Required: `assignmentId` (Assignment UUID), `studentId` (Student UUID).

Optional: `content?` (string), `points?` (int), `submittedAt` (timestamp, default now).

### Grades

Required: `enrollmentId` (Enrollment UUID), `courseId` (Course UUID), `category` (string), `totalPoints` (int).

Optional: `pointsObtained?` (int).

### Course materials

Required: `courseId` (Course UUID), `title` (string).

Optional: `description?` (string), `fileUrl?` (URL), `materialType` (`VIDEO`, `PDF`, `LIVE_Lecture`, `DOCUMENT`, `QUIZ`, `CODE_REPOSITORY`, default `VIDEO`). Enum case matters.

### Payments

Required: `userId` (User UUID), `amount` (decimal).

Optional: `currency` (three uppercase letters, default `USD`), `status` (`PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`, default `PENDING`), `method?` (string), `enrollmentId?` (Enrollment UUID, unique when supplied).

These are payment records; creating one does not charge a card or contact a payment provider.

### Events

Required: `title` (string), `eventDate` (timestamp).

Optional: `description?`, `location?` (strings), `maxAttendees?` (int).

### Reviews

Required: `studentId` (Student UUID), `courseId` (Course UUID), `rating` (int, 1–5).

Optional: `comment?` (string), `reviewedAt` (timestamp, default now).

### Audit logs

Required: `entityType`, `entityId`, `action` (strings).

Optional: `userId?`, `description?` (strings).

These are manually managed records. `userId` and `entityId` are descriptive values with no database foreign-key enforcement. Other API operations do not automatically create audit records.

## Administrator course walkthrough

First log in as an administrator using the [README instructions](../README.md), saving cookies in `/tmp/school-cookies.txt` and the **post-login** CSRF token in `CSRF_TOKEN`.

```bash
curl -i -b /tmp/school-cookies.txt -X POST http://localhost:3000/courses \
  -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"code":"CS101","title":"Computer Science","prerequisites":[]}'
```

Example: `201 Created`, `Location: /courses/550e8400-e29b-41d4-a716-446655440000`, with:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "CS101",
  "title": "Computer Science",
  "description": null,
  "instructorId": null,
  "credits": 3,
  "level": "BASIC",
  "prerequisites": [],
  "maxStudents": null,
  "createdAt": "2026-10-14T10:00:00.000Z",
  "updatedAt": "2026-10-14T10:00:00.000Z"
}
```

UUID/timestamps are illustrative. Substitute the actual ID below; repeated unique codes return 409.

```bash
export COURSE_ID=550e8400-e29b-41d4-a716-446655440000
curl -b /tmp/school-cookies.txt 'http://localhost:3000/courses?limit=10&offset=0'
curl -b /tmp/school-cookies.txt "http://localhost:3000/courses/$COURSE_ID"
curl -b /tmp/school-cookies.txt -X PATCH "http://localhost:3000/courses/$COURSE_ID" \
  -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF_TOKEN" -d '{"title":"Revised title"}'
curl -b /tmp/school-cookies.txt -X PUT "http://localhost:3000/courses/$COURSE_ID" \
  -H 'Content-Type: application/json' -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{"code":"CS101","title":"Replacement title","prerequisites":[]}'
curl -i -b /tmp/school-cookies.txt -X DELETE "http://localhost:3000/courses/$COURSE_ID" \
  -H "X-CSRF-Token: $CSRF_TOKEN"
```

List returns `[<course object>]` or `[]`. Read returns the object above. PATCH/PUT return the updated object with a new `updatedAt`. Delete returns 204 and no body; subsequent read returns 404. Existing dependent records may cause delete to return 409.

## Creation examples for every resource

Administrator clients use the same POST command format from the walkthrough, substituting one of these paths and JSON bodies. Replace the foreign-key UUIDs with existing parent records. The development demo seed provides the parent IDs used here; use a development database, and choose different unique emails/codes if needed. Create users before profiles, courses before enrollments and coursework, and enrollments before grades/payments.

Each successful POST returns 201, a Location header, and the supplied fields plus schema defaults, nullable fields, and generated scalar fields. Examples below are requests, not a batch transaction.

| Path | Example JSON request body |
| --- | --- |
| `/users` | `{"email":"new.student@example.com","password":"ExamplePassword123!","fullName":"New Student","role":"STUDENT"}` |
| `/students` | `{"userId":"<UUID returned by POST /users>","studentId":"STU-NEW-001"}` |
| `/teachers` | `{"userId":"<an existing user UUID without a teacher profile>","department":"Computer Science"}` |
| `/employees` | `{"userId":"<an existing user UUID without an employee profile>","employeeId":"EMP-NEW-001","department":"IT","position":"Support","salary":"3500.00"}` |
| `/courses` | `{"code":"NEW-CS102","title":"Databases","prerequisites":[]}` |
| `/enrollments` | `{"studentId":"00000002-0000-4000-8000-000000000001","courseId":"00000005-0000-4000-8000-000000000001","status":"ACTIVE"}` |
| `/assignments` | `{"courseId":"00000005-0000-4000-8000-000000000001","title":"Homework","maxPoints":100,"dueDate":"2026-11-01T12:00:00.000Z"}` |
| `/submissions` | `{"assignmentId":"00000007-0000-4000-8000-000000000001","studentId":"00000002-0000-4000-8000-000000000001","content":"My answer"}` |
| `/grades` | `{"enrollmentId":"00000006-0000-4000-8000-000000000001","courseId":"00000005-0000-4000-8000-000000000001","category":"Quiz","pointsObtained":18,"totalPoints":20}` |
| `/course-materials` | `{"courseId":"00000005-0000-4000-8000-000000000001","title":"Study guide","fileUrl":"https://example.com/guide.pdf","materialType":"PDF"}` |
| `/payments` | `{"userId":"00000001-0000-4000-8000-000000000001","amount":"299.50","currency":"EUR","method":"bank_transfer"}` |
| `/events` | `{"title":"Open Day","eventDate":"2026-11-05T10:00:00.000Z","maxAttendees":100}` |
| `/reviews` | `{"studentId":"00000002-0000-4000-8000-000000000001","courseId":"00000005-0000-4000-8000-000000000001","rating":5,"comment":"Useful exercises"}` |
| `/audit-logs` | `{"entityType":"Course","entityId":"00000005-0000-4000-8000-000000000001","action":"REVIEWED","description":"Manual administrative note"}` |

## Expected errors

Errors use `{ "error": "message" }`; input errors may add a `fields` array containing field paths, never submitted values. Authentication, origin policy, rate limits and CSRF may reject a request before resource validation.

| Status | Example cause and response |
| --- | --- |
| 400 | Invalid/missing/unknown field, UUID, pagination or date: `{"error":"Invalid request data.","fields":["email"]}` |
| 400 | Malformed JSON: `{"error":"Request body must be valid JSON."}` |
| 401 | Missing/expired/revoked session: `{"error":"Authentication is required."}` |
| 401 | Failed login: `{"error":"Invalid email or password."}` |
| 403 | Disallowed action/field: `{"error":"This action is not permitted."}` |
| 403 | CSRF missing/invalid/expired: `{"error":"A valid CSRF token is required."}` |
| 403 | Disallowed Origin or insecure production request: `Origin is not allowed.` / `HTTPS is required.` |
| 404 | Record absent or outside scope; unknown authenticated route |
| 409 | Duplicate email/code/display ID, conflicting relation/deletion, or serializable transaction conflict (retry request) |
| 413 | Body exceeds 10kb |
| 429 | Rate budget exhausted; includes `Retry-After` |
| 500 | Unexpected error: `{"error":"Something went wrong."}` |

Examples after administrator login:

```bash
# 401: no cookie
curl -i http://localhost:3000/payments
# 400: malformed UUID
curl -i -b /tmp/school-cookies.txt http://localhost:3000/users/not-a-uuid
# 403: no CSRF on a write
curl -i -b /tmp/school-cookies.txt -X POST http://localhost:3000/courses \
  -H 'Content-Type: application/json' -d '{"code":"X","title":"X","prerequisites":[]}'
# 400: limit outside supported range
curl -i -b /tmp/school-cookies.txt 'http://localhost:3000/courses?limit=101'
# 403: forbidden origin
curl -i -b /tmp/school-cookies.txt http://localhost:3000/courses -H 'Origin: https://untrusted.example'
```
