import assert from "node:assert/strict";
import { once } from "node:events";
import { afterEach, test } from "@jest/globals";
import { createApp } from "../src/app.js";
import { attachSession, browser, fixtureToken } from "./helpers/http.js";

const servers = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

const id = "550e8400-e29b-41d4-a716-446655440000";
const resources = [
  [
    "users",
    "user",
    { email: "student@example.com", password: "LongPassword123!" },
  ],
  ["students", "student", { userId: id }],
  ["teachers", "teacher", { userId: id }],
  [
    "courses",
    "course",
    { code: "CS101", title: "Computer Science", prerequisites: [] },
  ],
  [
    "employees",
    "employee",
    {
      userId: id,
      employeeId: "EMP-001",
      department: "IT",
      position: "Support",
    },
  ],
  ["enrollments", "enrollment", { studentId: id, courseId: id }],
  [
    "assignments",
    "assignment",
    { courseId: id, title: "Homework", maxPoints: 100 },
  ],
  ["submissions", "submission", { assignmentId: id, studentId: id }],
  [
    "grades",
    "grade",
    { enrollmentId: id, courseId: id, category: "Final", totalPoints: 100 },
  ],
  [
    "course-materials",
    "courseMaterial",
    { courseId: id, title: "Introduction" },
  ],
  ["payments", "payment", { userId: id, amount: "123.4567890123456789" }],
  [
    "events",
    "event",
    { title: "Open Day", eventDate: "2026-10-10T10:00:00.000Z" },
  ],
  ["reviews", "review", { studentId: id, courseId: id, rating: 5 }],
  [
    "audit-logs",
    "auditLog",
    { entityType: "Course", entityId: id, action: "CREATE" },
  ],
];

// Only the database boundary is replaced; requests run through the real Express app.
async function withApi(prisma) {
  const app = createApp();
  app.locals.prisma = attachSession(prisma);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  servers.push(server);
  const client = browser(
    `http://127.0.0.1:${server.address().port}`,
    `school_session=${fixtureToken}`,
  );
  await client.bootstrap();
  return client.request;
}

for (const [path, model, input] of resources) {
  test(`${model}: create, list, read, update, and delete using UUIDs`, async () => {
    let record;
    const prisma = {
      [model]: {
        create: async ({ data }) => (record = { id, ...data }),
        findMany: async () => (record ? [record] : []),
        findUnique: async ({ where }) =>
          record?.id === where.id ? record : null,
        update: async ({ where, data }) => {
          assert.equal(where.id, id);
          return (record = { ...record, ...data });
        },
        delete: async ({ where }) => {
          assert.equal(where.id, id);
          record = undefined;
        },
      },
    };
    const request = await withApi(prisma);
    const created = await request(`/${path}`, "POST", input);
    assert.equal(created.status, 201);
    assert.equal(created.body.id, id);
    assert.equal(created.location, `/${path}/${id}`);
    if (model === "user") assert.equal("passwordHash" in created.body, false);
    if (model === "payment") assert.equal(created.body.amount, input.amount);
    assert.equal((await request(`/${path}`)).body.length, 1);
    assert.equal((await request(`/${path}/${id}`)).body.id, id);
    const [field, value] = Object.entries(input)[0];
    assert.equal(
      (await request(`/${path}/${id}`, "PATCH", { [field]: value })).status,
      200,
    );
    assert.equal((await request(`/${path}/${id}`, "PUT", input)).status, 200);
    assert.equal((await request(`/${path}/${id}`, "DELETE")).status, 204);
    assert.equal((await request(`/${path}/${id}`)).status, 404);
  });
}

test("user responses never expose password hashes", async () => {
  const user = { id, email: "student@example.com", passwordHash: "secret" };
  const request = await withApi({
    user: { findMany: async () => [user], findUnique: async () => user },
  });
  assert.equal("passwordHash" in (await request("/users")).body[0], false);
  assert.equal("passwordHash" in (await request(`/users/${id}`)).body, false);
});

test("rejects invalid UUIDs, invalid bodies, unknown fields, and empty updates before database access", async () => {
  const request = await withApi({});
  const invalid = [
    ["/students/123", "GET"],
    ["/students", "POST", {}],
    ["/students", "POST", { userId: "123" }],
    ["/students", "POST", { userId: id, user: { connect: { id } } }],
    ["/students", "POST", { userId: id, id }],
    ["/students", "POST", []],
    ["/students", "POST", null],
    [`/students/${id}`, "PATCH", {}],
    [`/students/${id}`, "PATCH", { userId: null }],
    [`/students/${id}`, "PUT", { studentId: "STU-001" }],
    ["/users", "POST", { email: "bad", passwordHash: "hash" }],
    [
      "/users",
      "POST",
      { email: "a@example.com", passwordHash: "hash", role: "SUPERADMIN" },
    ],
    ["/courses", "POST", { code: "CS1", title: "Intro", prerequisites: [1] }],
    ["/assignments", "POST", { courseId: id, title: "Test", maxPoints: 1.5 }],
    [
      "/assignments",
      "POST",
      { courseId: id, title: "Test", maxPoints: 2147483648 },
    ],
    ["/reviews", "POST", { studentId: id, courseId: id, rating: 6 }],
    ["/events", "POST", { title: "Test", eventDate: "tomorrow" }],
    ["/payments", "POST", { userId: id, amount: "NaN" }],
    [
      "/employees",
      "POST",
      {
        userId: id,
        employeeId: "E1",
        department: "IT",
        position: "Support",
        isActive: "true",
      },
    ],
  ];
  for (const [path, method, body] of invalid) {
    const result = await request(path, method, body);
    assert.equal(
      result.status,
      400,
      `${method} ${path}: ${JSON.stringify(body)}`,
    );
  }
});

test("list pagination defaults and explicit bounds reach Prisma", async () => {
  const queries = [];
  const request = await withApi({
    course: {
      findMany: async (query) => {
        queries.push(query);
        return [];
      },
    },
  });
  assert.equal((await request("/courses")).status, 200);
  assert.deepEqual(queries[0], { orderBy: { id: "asc" }, take: 50, skip: 0 });
  assert.equal((await request("/courses?limit=10&offset=20")).status, 200);
  assert.equal(queries[1].take, 10);
  assert.equal(queries[1].skip, 20);
  for (const query of [
    "limit=0",
    "limit=101",
    "offset=-1",
    "limit=1.5",
    "limit=10&limit=20",
  ]) {
    assert.equal((await request(`/courses?${query}`)).status, 400);
  }
});

test("converts dates and preserves nullable fields", async () => {
  let saved;
  const request = await withApi({
    student: {
      update: async ({ data }) => {
        saved = data;
        return { id, ...data };
      },
    },
  });
  const dateOfBirth = "2000-01-01T00:00:00.000Z";
  const result = await request(`/students/${id}`, "PATCH", {
    dateOfBirth,
    studentId: null,
  });
  assert.equal(result.status, 200);
  assert.ok(saved.dateOfBirth instanceof Date);
  assert.equal(result.body.dateOfBirth, dateOfBirth);
  assert.equal(saved.studentId, null);
});

for (const [code, status] of [
  ["P2002", 409],
  ["P2003", 409],
  ["P2025", 404],
  ["P2014", 409],
  ["P2034", 409],
]) {
  test(`maps Prisma ${code} to HTTP ${status}`, async () => {
    const request = await withApi({
      course: {
        delete: async () => {
          throw Object.assign(new Error("database details"), { code });
        },
      },
    });
    const result = await request(`/courses/${id}`, "DELETE");
    assert.equal(result.status, status);
    assert.ok(result.body.error);
    assert.equal(
      JSON.stringify(result.body).includes("database details"),
      false,
    );
  });
}
