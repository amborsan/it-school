# School API testing with Postman

Use this guide to test all 14 resources, their relationships, and common errors. Run the examples against your local development database. They create, update, and delete sample records.

Complete the [README setup](README.md#install-and-configure), apply migrations, create the first administrator, and start the server before testing.

## 1. Set up Postman

Create a collection called **School API** and an environment called **School Local**. Select that environment and add these variables:

| Variable | Value |
| --- | --- |
| `baseUrl` | `http://localhost:3000` |
| `adminEmail` | Your bootstrapped administrator email |
| `adminPassword` | Your bootstrapped administrator password |
| `testPassword` | `PostmanDemo123!` |
| `runId` | A unique value for this run, for example `demo01` |
| `csrfToken` | Leave empty; save it in section 2 |

Change `runId` before starting a new run so emails and course codes remain unique. Keep these local test passwords private when sharing your environment.

For requests in this guide:

1. Set **Authorization** to **No Auth**. Authentication uses cookies, not a bearer token.
2. Keep Postman's cookie jar enabled. Postman stores response cookies and sends them on later requests to the same host.
3. Use `localhost` consistently. Do not switch between `localhost` and `127.0.0.1`.
4. For JSON bodies, select **Body → raw → JSON**.
5. On **every POST, PUT, PATCH, and DELETE**, add this header, including login and logout:

```text
X-CSRF-Token: {{csrfToken}}
```

Requests with a JSON body also need:

```text
Content-Type: application/json
```

You can add the CSRF header to each saved request. GET requests do not require it. Do not manually create a Cookie header; let Postman's cookie jar handle cookies.

## 2. Get CSRF and log in as administrator

### Get a CSRF token

```http
GET {{baseUrl}}/auth/csrf
```

Expected: **200**, a cookie, and a response containing `csrfToken`.

In this request's **Scripts → Post-response** tab, paste:

```javascript
pm.test("CSRF request succeeds", function () {
  pm.response.to.have.status(200);
});

if (pm.response.code === 200) {
  pm.environment.set("csrfToken", pm.response.json().csrfToken);
}
```

Send the request. The script saves the token to your selected environment.

### Log in

```http
POST {{baseUrl}}/auth/login
```

```json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
```

Expected: **200**, an administrator `user`, a session cookie, and a **new** `csrfToken`.

Add this Post-response script to the login request:

```javascript
pm.test("Administrator login succeeds", function () {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().user.role).to.eql("ADMIN");
});

if (pm.response.code === 200) {
  pm.environment.set("csrfToken", pm.response.json().csrfToken);
}
```

Login changes the CSRF token. Use the new saved value for all following writes.

### Check your identity

```http
GET {{baseUrl}}/auth/me
```

Expected: **200** and `user.role` equal to `ADMIN`.

## 3. How to save returned IDs

Each successful resource POST returns **201** and an object containing `id`. Copy that value into the environment variable named under its example below. Add new environment variables as you need them.

You can also save an ID with a Post-response script. For the student user creation request, use:

```javascript
pm.test("Record created", function () {
  pm.response.to.have.status(201);
});

if (pm.response.code === 201) {
  pm.environment.set("studentUserId", pm.response.json().id);
}
```

For other POST requests, change `studentUserId` in the script to that example's variable name. Add the script before sending the request; sending the same POST again can create a duplicate or return 409.

**Important:** A user's `id` and their student/teacher/employee profile `id` are different. The `studentId` variable below stores the Student record's UUID, not the display value such as `STU-demo01`.

## 4. Create the sample records in this order

Stay logged in as administrator for this section. All POST requests below should return **201**, a `Location` header, and the created object. No request body should contain a generated `id` or `passwordHash`.

### 4.1 Create the student user

```http
POST {{baseUrl}}/users
```

```json
{
  "email": "student-{{runId}}@example.com",
  "password": "{{testPassword}}",
  "fullName": "Postman Student",
  "role": "STUDENT"
}
```

Save `id` as **`studentUserId`**. Passwords and hashes must not appear in the response.

### 4.2 Create the student's profile

```http
POST {{baseUrl}}/students
```

```json
{
  "userId": "{{studentUserId}}",
  "studentId": "STU-{{runId}}",
  "dateOfBirth": "2000-04-15T00:00:00.000Z"
}
```

Save `id` as **`studentId`**. Verify the returned `userId` equals `studentUserId`.

### 4.3 Create the teacher user

```http
POST {{baseUrl}}/users
```

```json
{
  "email": "teacher-{{runId}}@example.com",
  "password": "{{testPassword}}",
  "fullName": "Postman Teacher",
  "role": "TEACHER"
}
```

Save `id` as **`teacherUserId`**.

### 4.4 Create the teacher's profile

```http
POST {{baseUrl}}/teachers
```

```json
{
  "userId": "{{teacherUserId}}",
  "employeeId": "TCH-{{runId}}",
  "department": "IT",
  "position": "Teacher"
}
```

Save `id` as **`teacherId`**.

### 4.5 Create the employee user

```http
POST {{baseUrl}}/users
```

```json
{
  "email": "employee-{{runId}}@example.com",
  "password": "{{testPassword}}",
  "fullName": "Postman Employee",
  "role": "EMPLOYEE"
}
```

Save `id` as **`employeeUserId`**.

### 4.6 Create the employee's profile

```http
POST {{baseUrl}}/employees
```

```json
{
  "userId": "{{employeeUserId}}",
  "employeeId": "EMP-{{runId}}",
  "department": "Office",
  "position": "Coordinator",
  "salary": "3500.00"
}
```

Save `id` as **`employeeId`**. Decimal responses are strings; trailing zeros may be omitted.

### 4.7 Create a course assigned to the teacher

```http
POST {{baseUrl}}/courses
```

```json
{
  "code": "PM-{{runId}}",
  "title": "Postman Backend Course",
  "description": "A course for API testing",
  "instructorId": "{{teacherId}}",
  "credits": 3,
  "level": "BASIC",
  "prerequisites": [],
  "maxStudents": 20
}
```

Save `id` as **`courseId`**. `instructorId` must be the Teacher profile UUID, not the teacher's User UUID.

### 4.8 Enroll the student in the course

```http
POST {{baseUrl}}/enrollments
```

```json
{
  "studentId": "{{studentId}}",
  "courseId": "{{courseId}}",
  "status": "ACTIVE"
}
```

Save `id` as **`enrollmentId`**. ACTIVE enrollment allows the student to access coursework.

### 4.9 Create an assignment in the course

```http
POST {{baseUrl}}/assignments
```

```json
{
  "courseId": "{{courseId}}",
  "title": "Build a REST API",
  "description": "Create a small Express API",
  "maxPoints": 100,
  "dueDate": "2026-11-10T12:00:00.000Z"
}
```

Save `id` as **`assignmentId`**.

### 4.10 Create a submission linking student and assignment

```http
POST {{baseUrl}}/submissions
```

```json
{
  "assignmentId": "{{assignmentId}}",
  "studentId": "{{studentId}}",
  "content": "My Express API solution",
  "points": 85
}
```

Save `id` as **`submissionId`**. This is an administrator request. A student creating a submission must omit `points`.

### 4.11 Create a grade linked to enrollment and course

```http
POST {{baseUrl}}/grades
```

```json
{
  "enrollmentId": "{{enrollmentId}}",
  "courseId": "{{courseId}}",
  "category": "Homework",
  "pointsObtained": 85,
  "totalPoints": 100
}
```

Save `id` as **`gradeId`**. Use the same course as the enrollment.

### 4.12 Create a course material

```http
POST {{baseUrl}}/course-materials
```

```json
{
  "courseId": "{{courseId}}",
  "title": "Express Study Guide",
  "description": "Reading material",
  "fileUrl": "https://example.com/express-guide.pdf",
  "materialType": "PDF"
}
```

Save `id` as **`materialId`**. The API stores this URL; it does not upload or download the file.

### 4.13 Create a payment linked to the student user and enrollment

```http
POST {{baseUrl}}/payments
```

```json
{
  "userId": "{{studentUserId}}",
  "enrollmentId": "{{enrollmentId}}",
  "amount": "299.50",
  "currency": "EUR",
  "status": "PENDING",
  "method": "bank_transfer"
}
```

Save `id` as **`paymentId`**. `userId` is the User UUID. Each enrollment can link to at most one payment. Creating this record does not charge money.

### 4.14 Create a review linking student and course

```http
POST {{baseUrl}}/reviews
```

```json
{
  "studentId": "{{studentId}}",
  "courseId": "{{courseId}}",
  "rating": 5,
  "comment": "Clear explanations and useful exercises"
}
```

Save `id` as **`reviewId`**.

### 4.15 Create an event

```http
POST {{baseUrl}}/events
```

```json
{
  "title": "Postman Open Day",
  "description": "Meet the school team",
  "eventDate": "2026-11-15T10:00:00.000Z",
  "location": "Room 101",
  "maxAttendees": 30
}
```

Save `id` as **`eventId`**. Events are standalone records.

### 4.16 Create a manual audit record

```http
POST {{baseUrl}}/audit-logs
```

```json
{
  "entityType": "Course",
  "entityId": "{{courseId}}",
  "action": "TESTED",
  "userId": "{{studentUserId}}",
  "description": "Manual Postman testing note"
}
```

Save `id` as **`auditLogId`**. Audit records are created manually. Their `entityId` and `userId` are descriptive strings, not enforced database relations.

## 5. Read every resource

Send both GET requests in each row. Expected: **200**. List responses are arrays; individual responses are objects. Check the saved IDs and foreign-key values.

| Resource | List request | Read one request |
| --- | --- | --- |
| Users | `GET {{baseUrl}}/users` | `GET {{baseUrl}}/users/{{studentUserId}}` |
| Students | `GET {{baseUrl}}/students` | `GET {{baseUrl}}/students/{{studentId}}` |
| Teachers | `GET {{baseUrl}}/teachers` | `GET {{baseUrl}}/teachers/{{teacherId}}` |
| Employees | `GET {{baseUrl}}/employees` | `GET {{baseUrl}}/employees/{{employeeId}}` |
| Courses | `GET {{baseUrl}}/courses` | `GET {{baseUrl}}/courses/{{courseId}}` |
| Enrollments | `GET {{baseUrl}}/enrollments` | `GET {{baseUrl}}/enrollments/{{enrollmentId}}` |
| Assignments | `GET {{baseUrl}}/assignments` | `GET {{baseUrl}}/assignments/{{assignmentId}}` |
| Submissions | `GET {{baseUrl}}/submissions` | `GET {{baseUrl}}/submissions/{{submissionId}}` |
| Grades | `GET {{baseUrl}}/grades` | `GET {{baseUrl}}/grades/{{gradeId}}` |
| Course materials | `GET {{baseUrl}}/course-materials` | `GET {{baseUrl}}/course-materials/{{materialId}}` |
| Payments | `GET {{baseUrl}}/payments` | `GET {{baseUrl}}/payments/{{paymentId}}` |
| Reviews | `GET {{baseUrl}}/reviews` | `GET {{baseUrl}}/reviews/{{reviewId}}` |
| Events | `GET {{baseUrl}}/events` | `GET {{baseUrl}}/events/{{eventId}}` |
| Audit logs | `GET {{baseUrl}}/audit-logs` | `GET {{baseUrl}}/audit-logs/{{auditLogId}}` |

Test pagination:

```http
GET {{baseUrl}}/courses?limit=10&offset=0
```

Expected: **200**, an array of at most 10 records. Lists default to 50 records, so a sample record may be on another page.

There are no nested relation endpoints or relation expansion. For example, `GET /courses/{{courseId}}` returns the course's scalar fields, including `instructorId`, without an assignments array. Read assignments separately and compare their `courseId` values. A query such as `?courseId=...` is not supported and returns 400.

## 6. Update every resource with PATCH

Each block changes one or two fields. Send the request, expect **200**, then repeat its individual GET from section 5 and check the updated value.

### User

```http
PATCH {{baseUrl}}/users/{{studentUserId}}
```

```json
{ "fullName": "Updated Postman Student" }
```

### Student

```http
PATCH {{baseUrl}}/students/{{studentId}}
```

```json
{ "dateOfBirth": "2001-05-20T00:00:00.000Z" }
```

### Teacher

```http
PATCH {{baseUrl}}/teachers/{{teacherId}}
```

```json
{ "department": "Computer Science" }
```

### Employee

```http
PATCH {{baseUrl}}/employees/{{employeeId}}
```

```json
{ "position": "Senior Coordinator", "salary": "3700.00" }
```

### Course

```http
PATCH {{baseUrl}}/courses/{{courseId}}
```

```json
{ "title": "Updated Backend Course" }
```

### Enrollment

```http
PATCH {{baseUrl}}/enrollments/{{enrollmentId}}
```

```json
{ "status": "COMPLETED" }
```

COMPLETED enrollment still permits student coursework access.

### Assignment

```http
PATCH {{baseUrl}}/assignments/{{assignmentId}}
```

```json
{ "title": "Updated REST API Homework" }
```

### Submission

```http
PATCH {{baseUrl}}/submissions/{{submissionId}}
```

```json
{ "content": "My improved solution", "points": 90 }
```

### Grade

```http
PATCH {{baseUrl}}/grades/{{gradeId}}
```

```json
{ "pointsObtained": 90 }
```

### Course material

```http
PATCH {{baseUrl}}/course-materials/{{materialId}}
```

```json
{ "title": "Updated Express Guide" }
```

### Payment

```http
PATCH {{baseUrl}}/payments/{{paymentId}}
```

```json
{ "status": "COMPLETED" }
```

### Review

```http
PATCH {{baseUrl}}/reviews/{{reviewId}}
```

```json
{ "rating": 4, "comment": "Updated feedback" }
```

### Event

```http
PATCH {{baseUrl}}/events/{{eventId}}
```

```json
{ "location": "Room 202" }
```

### Audit log

```http
PATCH {{baseUrl}}/audit-logs/{{auditLogId}}
```

```json
{ "description": "Postman CRUD checks completed" }
```

## 7. Test PUT for every resource

PUT is administrator-only and requires all mandatory create fields. In this API, omitted optional fields retain their current values.

For **each resource in section 4**, copy its POST request, change the method to PUT, and append the saved record ID from section 5. Reuse its original JSON body. For example:

```http
PUT {{baseUrl}}/courses/{{courseId}}
```

```json
{
  "code": "PM-{{runId}}",
  "title": "Course Updated With PUT",
  "instructorId": "{{teacherId}}",
  "prerequisites": []
}
```

Expected: **200**. Repeat GET and verify the values. The same procedure covers all 14 resources, including all three sample User records. Reusing the existing email or code on the same record is allowed.

User PUT requires `email` and `password`; it resets the user's password and revokes that user's sessions. Perform these administrator checks before the role tests below. Do not PUT your own administrator account as part of this walkthrough.

To compare PUT and PATCH, send this same body to the course using each method:

```json
{ "title": "Only a title" }
```

- PUT → **400**, because `code` and `prerequisites` are missing.
- PATCH → **200**, because only the provided field changes.

## 8. Test relationships and constraints

Run these as administrator before deleting any sample records.

### Read the relationship chain

Use the individual GET requests from section 5 to check:

| Record | Expected reference |
| --- | --- |
| Student | `userId` equals `studentUserId` |
| Teacher | `userId` equals `teacherUserId` |
| Employee | `userId` equals `employeeUserId` |
| Course | `instructorId` equals `teacherId` |
| Enrollment | `studentId` and `courseId` equal the saved profile/course IDs |
| Assignment and material | `courseId` equals `courseId` |
| Submission | `assignmentId` and `studentId` equal the saved IDs |
| Grade | `enrollmentId` and `courseId` equal the saved IDs |
| Payment | `userId` and `enrollmentId` equal the saved IDs |
| Review | `studentId` and `courseId` equal the saved IDs |

### Missing parent record

Use a valid UUID known not to exist in your database:

```http
POST {{baseUrl}}/assignments
```

```json
{
  "courseId": "ffffffff-ffff-4fff-8fff-ffffffffffff",
  "title": "Missing course test",
  "maxPoints": 100
}
```

Expected: **409**, because the course does not exist. An invalid UUID format would instead return 400 before the database query.

### Duplicate one-to-one profile

```http
POST {{baseUrl}}/students
```

```json
{ "userId": "{{studentUserId}}" }
```

Expected: **409**, because that user already has a Student profile.

### Duplicate payment for one enrollment

```http
POST {{baseUrl}}/payments
```

```json
{
  "userId": "{{studentUserId}}",
  "enrollmentId": "{{enrollmentId}}",
  "amount": "50.00"
}
```

Expected: **409**, because the enrollment already has a linked payment.

### Update an optional relationship

```http
PATCH {{baseUrl}}/courses/{{courseId}}
```

```json
{ "instructorId": null }
```

Expected: **200**. Read the course and confirm `instructorId` is null. Read the teacher and confirm it still exists.

Restore the relationship before the teacher permission tests:

```json
{ "instructorId": "{{teacherId}}" }
```

Expected: **200**. The same nullable-reference pattern works for `Payment.enrollmentId`: unlink using null, then restore `{{enrollmentId}}`.

### Attempt to delete a parent with children

```http
DELETE {{baseUrl}}/courses/{{courseId}}
```

Expected: **409**, because assignments/enrollments and other child records still reference it. GET the course again; it should still return 200.

Likewise, deleting the student user while its profile exists or deleting the assignment while its submission exists should return **409**.

Not every relation restricts deletion: deleting a Teacher sets a course's optional `instructorId` to null; deleting an Enrollment sets a linked payment's `enrollmentId` to null if other relations do not block deletion. Use the cleanup order below to avoid losing references during this walkthrough.

### Current limitations

The database does not require one enrollment or review per student/course pair. Administrator writes do not check every cross-record business rule, such as whether a grade's course matches its enrollment's course. Do not expect those cases to return 409. Teacher grade creation does check the course/enrollment match. Nested Prisma bodies such as `{ "course": { "connect": ... } }` are not accepted; use scalar ID fields.

## 9. Test student, teacher, and employee permissions

Do this before cleanup. Use the same cookie jar and switch accounts sequentially. For each switch: POST `/auth/logout` with the current token → GET `/auth/csrf` and save its token → POST `/auth/login` with the next account → save the new login token. Reuse the token-saving scripts from section 2.

### Student login

```http
POST {{baseUrl}}/auth/login
```

```json
{
  "email": "student-{{runId}}@example.com",
  "password": "{{testPassword}}"
}
```

Expect **200** and role STUDENT. Check these requests:

| Request | Body | Expected |
| --- | --- | --- |
| `GET {{baseUrl}}/students/{{studentId}}` | None | 200, own profile |
| `GET {{baseUrl}}/courses/{{courseId}}` | None | 200, enrolled course |
| `GET {{baseUrl}}/assignments/{{assignmentId}}` | None | 200, coursework |
| `GET {{baseUrl}}/grades/{{gradeId}}` | None | 200, own grade |
| `GET {{baseUrl}}/payments/{{paymentId}}` | None | 200, own payment |
| `GET {{baseUrl}}/users/{{teacherUserId}}` | None | 404, outside own scope |
| `POST {{baseUrl}}/courses` | Course JSON from section 4.7 | 403, forbidden action |
| `PATCH {{baseUrl}}/submissions/{{submissionId}}` | `{ "content": "Student updated answer" }` | 200 |
| `PATCH {{baseUrl}}/submissions/{{submissionId}}` | `{ "points": 100 }` | 403, cannot score own work |
| `PATCH {{baseUrl}}/reviews/{{reviewId}}` | `{ "rating": 5 }` | 200 |
| `PATCH {{baseUrl}}/users/{{studentUserId}}` | `{ "role": "ADMIN" }` | 403, cannot promote self |

For student POST submission testing, reuse section 4.10's body **without `points`**. Expect 201; save the extra `id` as `studentSubmissionId`. For student POST review testing, reuse section 4.14's body and save its new `id` as `studentReviewId`. These endpoints currently allow additional submissions/reviews for the same parents. Delete these extra records as administrator in section 11.

### Teacher login

Switch accounts as described above and use:

```json
{
  "email": "teacher-{{runId}}@example.com",
  "password": "{{testPassword}}"
}
```

Expect role TEACHER. Keep the course assigned to `teacherId`.

| Request | Body | Expected |
| --- | --- | --- |
| `GET {{baseUrl}}/courses/{{courseId}}` | None | 200, assigned course |
| `GET {{baseUrl}}/students/{{studentId}}` | None | 200, academic identity fields only |
| `GET {{baseUrl}}/payments` | None | 403 |
| `PATCH {{baseUrl}}/assignments/{{assignmentId}}` | `{ "title": "Teacher updated homework" }` | 200 |
| `PATCH {{baseUrl}}/submissions/{{submissionId}}` | `{ "points": 95 }` | 200 |
| `PATCH {{baseUrl}}/submissions/{{submissionId}}` | `{ "content": "Changed answer" }` | 403, teacher cannot rewrite student answers |
| `PATCH {{baseUrl}}/assignments/{{assignmentId}}` | `{ "courseId": "{{courseId}}" }` | 403, ownership field is forbidden even if unchanged |

### Employee login

Switch accounts and use:

```json
{
  "email": "employee-{{runId}}@example.com",
  "password": "{{testPassword}}"
}
```

Expect role EMPLOYEE.

| Request | Body | Expected |
| --- | --- | --- |
| `GET {{baseUrl}}/employees/{{employeeId}}` | None | 200 |
| `GET {{baseUrl}}/events/{{eventId}}` | None | 200 |
| `GET {{baseUrl}}/courses` | None | 403 |
| `PATCH {{baseUrl}}/users/{{employeeUserId}}` | `{ "phone": "+49123456789" }` | 200 |
| `PATCH {{baseUrl}}/employees/{{employeeId}}` | `{ "salary": "9999.00" }` | 403 |

Switch back to the administrator before continuing.

## 10. Test invalid input and security errors

Run these as administrator unless the row says otherwise. Write requests need valid CSRF except when testing missing CSRF.

| Test | Request/body | Expected |
| --- | --- | --- |
| Invalid UUID | `GET {{baseUrl}}/courses/not-a-uuid` | 400 |
| Missing record | GET a resource with a valid UUID known not to exist | 404 |
| Invalid pagination | `GET {{baseUrl}}/courses?limit=101` | 400 |
| Unsupported filter | `GET {{baseUrl}}/courses?title=Express` | 400 |
| Missing required fields | `POST /courses` with `{ "title": "Incomplete" }` | 400 |
| Unknown field | `PATCH /courses/{{courseId}}` with `{ "unknown": true }` | 400 |
| Empty update | `PATCH /courses/{{courseId}}` with `{}` | 400 |
| Invalid rating | `PATCH /reviews/{{reviewId}}` with `{ "rating": 6 }` | 400 |
| Negative money | `PATCH /payments/{{paymentId}}` with `{ "amount": "-1" }` | 400 |
| Invalid calendar date | `PATCH /assignments/{{assignmentId}}` with `{ "dueDate": "2026-02-30T12:00:00.000Z" }` | 400 |
| Unsafe URL | `PATCH /course-materials/{{materialId}}` with `{ "fileUrl": "javascript:alert(1)" }` | 400 |
| Client-supplied hash | `PATCH /users/{{studentUserId}}` with `{ "passwordHash": "fake" }` | 400 |
| Duplicate course code | Repeat section 4.7's POST | 409 |
| Malformed JSON | POST `/courses` with raw body `{ "title": }` | 400 |
| Missing CSRF | Disable the CSRF header on an authenticated PATCH | 403 |
| Untrusted origin | GET `/courses` with header `Origin: https://untrusted.example` | 403 |

Paths abbreviated with `/courses` or similar in this table still need the `{{baseUrl}}` prefix. After the missing-CSRF test, enable the header again. Remove the untrusted Origin header after its test.

Errors have this general shape; wording depends on the cause:

```json
{
  "error": "Invalid request data.",
  "fields": ["title"]
}
```

Avoid rapid repeated login tests: the default shared registration/login limit is 10 attempts per 15 minutes per client IP. A **429** response means wait for `Retry-After`. Rate limiting is not a failed password check.

## 11. Delete all sample records in dependency order

Log in as administrator again. Every successful DELETE below should return **204 with an empty body**. Send each URL with the DELETE method and CSRF header. Then send GET to the same URL and expect **404**.

If you created `studentSubmissionId` and `studentReviewId` in section 9, delete those extra records first. Skip these two requests if you did not create them:

```http
DELETE {{baseUrl}}/submissions/{{studentSubmissionId}}
DELETE {{baseUrl}}/reviews/{{studentReviewId}}
```

Then delete the main sample records in this order:

```http
DELETE {{baseUrl}}/submissions/{{submissionId}}
DELETE {{baseUrl}}/grades/{{gradeId}}
DELETE {{baseUrl}}/payments/{{paymentId}}
DELETE {{baseUrl}}/reviews/{{reviewId}}
DELETE {{baseUrl}}/course-materials/{{materialId}}
DELETE {{baseUrl}}/assignments/{{assignmentId}}
DELETE {{baseUrl}}/enrollments/{{enrollmentId}}
DELETE {{baseUrl}}/courses/{{courseId}}
DELETE {{baseUrl}}/students/{{studentId}}
DELETE {{baseUrl}}/teachers/{{teacherId}}
DELETE {{baseUrl}}/employees/{{employeeId}}
DELETE {{baseUrl}}/users/{{studentUserId}}
DELETE {{baseUrl}}/users/{{teacherUserId}}
DELETE {{baseUrl}}/users/{{employeeUserId}}
DELETE {{baseUrl}}/events/{{eventId}}
DELETE {{baseUrl}}/audit-logs/{{auditLogId}}
```

These lines are separate Postman requests, not one batch request.

If deleting a parent returns 409, a child still references it. Find the child in your saved requests and delete it first. Do not delete your bootstrapped administrator.

## 12. Test logout and anonymous access

```http
POST {{baseUrl}}/auth/logout
```

Include `X-CSRF-Token: {{csrfToken}}`. Expected: **204**, cookies cleared.

```http
GET {{baseUrl}}/auth/me
```

Expected: **401**.

```http
GET {{baseUrl}}/courses
```

Expected: **401**. Public discovery and CSRF bootstrap still work:

```http
GET {{baseUrl}}/
GET {{baseUrl}}/auth/csrf
```

Expected: **200** for each separate request.

## 13. Optional public registration test

After logout, GET `/auth/csrf` and save the new token. Then send:

```http
POST {{baseUrl}}/auth/register
```

```json
{
  "email": "registered-{{runId}}@example.com",
  "password": "{{testPassword}}",
  "fullName": "Registered Student"
}
```

Expected: **201**, with `user.role` STUDENT. Save `response.user.id` as `registeredUserId` manually or with:

```javascript
if (pm.response.code === 201) {
  pm.environment.set("registeredUserId", pm.response.json().user.id);
}
```

Registration automatically creates a Student profile; it does not log in. Log in with this email/password, save the new CSRF token, and GET `/students`. The response should contain the new student's own profile. Save its `id` as `registeredStudentId`.

If you add `"role": "ADMIN"` to the registration body, expect **400**. Public registration does not accept a role field.

For cleanup, log out, bootstrap CSRF, log in as administrator, save the new token, then delete:

```http
DELETE {{baseUrl}}/students/{{registeredStudentId}}
DELETE {{baseUrl}}/users/{{registeredUserId}}
```

Expected: **204** each. Do not create a second profile for a publicly registered user.

## Quick troubleshooting

| Result | What to check |
| --- | --- |
| Connection refused | Start the server; check `baseUrl`, host, and port. |
| 400 on a UUID field | Save the correct returned `id`; check the selected environment and unresolved `{{variables}}`. |
| 401 | Log in and check Postman's cookie jar and hostname. |
| 403 mentioning CSRF | Bootstrap CSRF, save the response token, and use the latest login token with the same cookie jar. |
| 403 mentioning permission | Check the logged-in role and the permitted fields. |
| 404 for an existing record | Check the ID and account scope; another user's records may be hidden. |
| 409 | Check duplicate values, missing parents, and children preventing deletion. |
| 429 | Wait for `Retry-After` before continuing. |

The guide's requests were checked against the API routes, validation schemas, authorization rules, and migrations. They have not been executed in your Postman session or against your live database.

Postman references: [environment variables](https://learning.postman.com/docs/use/send-requests/variables/environment-variables), [response test scripts](https://learning.postman.com/docs/tests-and-scripts/write-scripts/test-scripts), and [cookie manager](https://learning.postman.com/v11/docs/use/send-requests/response-data/cookies).
