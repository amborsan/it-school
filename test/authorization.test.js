import assert from "node:assert/strict";
import { afterEach, test } from "@jest/globals";
import { database } from "./helpers/database.js";
import { serve, browser, fixtureToken } from "./helpers/http.js";
import { tokenHash } from "../src/auth/cookies.js";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const servers = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((api) => api.close()));
});
function seed() {
  return {
    user: [
      ...[
        [1, "ADMIN"],
        [2, "STUDENT"],
        [3, "STUDENT"],
        [4, "TEACHER"],
        [5, "TEACHER"],
        [6, "EMPLOYEE"],
      ].map(([n, role]) => ({
        id: id(n),
        email: `user${n}@example.com`,
        role,
        fullName: `User ${n}`,
        phone: "private-phone",
        address: "private-address",
        passwordHash: "secret-hash",
        deletedAt: null,
      })),
    ],
    student: [
      {
        id: id(10),
        userId: id(2),
        studentId: "S1",
        dateOfBirth: new Date("2000-01-01"),
      },
      {
        id: id(11),
        userId: id(3),
        studentId: "S2",
        dateOfBirth: new Date("2001-01-01"),
      },
    ],
    teacher: [
      { id: id(12), userId: id(4) },
      { id: id(13), userId: id(5) },
    ],
    employee: [{ id: id(14), userId: id(6), salary: "3500" }],
    course: [
      {
        id: id(20),
        instructorId: id(12),
        code: "A",
        title: "A",
        prerequisites: [],
      },
      {
        id: id(21),
        instructorId: id(13),
        code: "B",
        title: "B",
        prerequisites: [],
      },
    ],
    enrollment: [
      { id: id(40), studentId: id(10), courseId: id(20), status: "ACTIVE" },
      { id: id(41), studentId: id(11), courseId: id(21), status: "ACTIVE" },
      { id: id(42), studentId: id(10), courseId: id(21), status: "PENDING" },
    ],
    assignment: [
      { id: id(50), courseId: id(20), title: "A", maxPoints: 100 },
      { id: id(51), courseId: id(21), title: "B", maxPoints: 100 },
    ],
    submission: [
      {
        id: id(60),
        assignmentId: id(50),
        studentId: id(10),
        content: "Own answer",
        points: 90,
      },
      {
        id: id(61),
        assignmentId: id(51),
        studentId: id(11),
        content: "Private answer",
        points: 95,
      },
    ],
    grade: [
      {
        id: id(70),
        enrollmentId: id(40),
        courseId: id(20),
        category: "Final",
        totalPoints: 100,
        pointsObtained: 90,
      },
      {
        id: id(71),
        enrollmentId: id(41),
        courseId: id(21),
        category: "Final",
        totalPoints: 100,
      },
    ],
    payment: [
      { id: id(80), userId: id(2), amount: "100" },
      { id: id(81), userId: id(3), amount: "200" },
    ],
    courseMaterial: [
      { id: id(90), courseId: id(20), title: "A" },
      { id: id(91), courseId: id(21), title: "B" },
    ],
    review: [
      { id: id(100), studentId: id(10), courseId: id(20), rating: 5 },
      { id: id(101), studentId: id(11), courseId: id(21), rating: 4 },
    ],
    event: [{ id: id(110), title: "Event" }],
    auditLog: [
      { id: id(120), entityType: "Course", entityId: id(20), action: "CREATE" },
    ],
  };
}
async function setup(n) {
  const db = database(seed());
  db.rows.session.push({
    id: id(200),
    tokenHash: tokenHash(fixtureToken),
    userId: id(n),
    expiresAt: new Date(Date.now() + 86400000),
  });
  const api = await serve(db);
  servers.push(api);
  const client = browser(api.base, `school_session=${fixtureToken}`);
  await client.bootstrap();
  return { db, api, client };
}
const routes = {
  users: "user",
  students: "student",
  teachers: "teacher",
  employees: "employee",
  courses: "course",
  enrollments: "enrollment",
  assignments: "assignment",
  submissions: "submission",
  grades: "grade",
  payments: "payment",
  "course-materials": "courseMaterial",
  reviews: "review",
  events: "event",
  "audit-logs": "auditLog",
};
for (const [n, label, allowed] of [
  [
    2,
    "student",
    {
      users: [2],
      students: [10],
      courses: [20],
      enrollments: [40, 42],
      assignments: [50],
      submissions: [60],
      grades: [70],
      payments: [80],
      "course-materials": [90],
      reviews: [100],
      events: [110],
    },
  ],
  [
    4,
    "teacher",
    {
      users: [2, 4],
      students: [10],
      teachers: [12],
      courses: [20],
      enrollments: [40],
      assignments: [50],
      submissions: [60],
      grades: [70],
      "course-materials": [90],
      reviews: [100],
      events: [110],
    },
  ],
  [6, "employee", { users: [6], employees: [14], events: [110] }],
]) {
  test(`${label} list queries expose only permitted records across every resource`, async () => {
    const { client } = await setup(n);
    for (const path of Object.keys(routes)) {
      const response = await client.request(`/${path}`);
      if (!allowed[path]) assert.equal(response.status, 403, path);
      else {
        assert.equal(response.status, 200, path);
        assert.deepEqual(
          response.body.map((row) => row.id).sort(),
          allowed[path].map(id).sort(),
          path,
        );
      }
    }
  });
}
test("teacher student/user projections exclude personal, financial and password data", async () => {
  const { client } = await setup(4);
  const students = await client.request("/students");
  assert.deepEqual(Object.keys(students.body[0]).sort(), [
    "id",
    "studentId",
    "userId",
  ]);
  const users = await client.request("/users");
  for (const user of users.body) {
    for (const key of ["address", "phone", "passwordHash", "deletedAt"])
      assert.equal(key in user, false);
  }
  assert.equal((await client.request(`/students/${id(11)}`)).status, 404);
  assert.equal((await client.request(`/users/${id(3)}`)).status, 404);
});
test("students cannot access foreign records or mutate ownership, grades, roles or payment state", async () => {
  const { db, client } = await setup(2);
  for (const [path, n] of [
    ["users", 3],
    ["students", 11],
    ["courses", 21],
    ["assignments", 51],
    ["submissions", 61],
    ["grades", 71],
    ["payments", 81],
    ["reviews", 101],
  ])
    assert.equal((await client.request(`/${path}/${id(n)}`)).status, 404, path);
  for (const [path, n, body] of [
    ["users", 2, { role: "ADMIN" }],
    ["users", 2, { deletedAt: new Date().toISOString() }],
    ["students", 10, { userId: id(3) }],
    ["submissions", 60, { points: 100 }],
    ["submissions", 60, { studentId: id(11) }],
    ["submissions", 60, { assignmentId: id(51) }],
    ["payments", 80, { status: "COMPLETED" }],
    ["grades", 70, { pointsObtained: 100 }],
  ])
    assert.equal(
      (await client.request(`/${path}/${id(n)}`, "PATCH", body)).status,
      403,
      path,
    );
  const own = await client.request(`/users/${id(2)}`, "PATCH", {
    fullName: "Changed",
  });
  assert.equal(own.status, 200);
  const foreign = await client.request(`/users/${id(3)}`, "PATCH", {
    fullName: "Hacked",
  });
  assert.equal(foreign.status, 404);
  assert.equal(db.rows.user.find((u) => u.id === id(2)).fullName, "Changed");
  assert.equal(db.rows.user.find((u) => u.id === id(3)).fullName, "User 3");
  assert.equal((await client.request(`/users/${id(2)}`, "DELETE")).status, 403);
  assert.equal(
    (
      await client.request(`/users/${id(2)}`, "PUT", {
        email: "other@example.com",
        password: "LongPassword123!",
      })
    ).status,
    403,
  );
});
test("student coursework creation checks ownership and enrollment, while own content/review edits succeed", async () => {
  const { client } = await setup(2);
  assert.equal(
    (
      await client.request("/submissions", "POST", {
        studentId: id(10),
        assignmentId: id(50),
        content: "Answer",
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await client.request("/reviews", "POST", {
        studentId: id(10),
        courseId: id(20),
        rating: 5,
      })
    ).status,
    201,
  );
  for (const body of [
    { studentId: id(11), assignmentId: id(50) },
    { studentId: id(10), assignmentId: id(51) },
  ])
    assert.equal(
      (await client.request("/submissions", "POST", body)).status,
      403,
    );
  assert.equal(
    (
      await client.request("/reviews", "POST", {
        studentId: id(10),
        courseId: id(21),
        rating: 5,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await client.request(`/submissions/${id(60)}`, "PATCH", {
        content: "Revised",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await client.request(`/reviews/${id(100)}`, "PATCH", {
        rating: 4,
        comment: "Revised",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await client.request(`/submissions/${id(61)}`, "PATCH", {
        content: "Hacked",
      })
    ).status,
    404,
  );
});
test("teachers manage only assigned coursework and cannot reassign ownership or write student contact data", async () => {
  const { client } = await setup(4);
  assert.equal(
    (
      await client.request("/assignments", "POST", {
        courseId: id(20),
        title: "Quiz",
        maxPoints: 10,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await client.request("/course-materials", "POST", {
        courseId: id(20),
        title: "Notes",
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await client.request("/grades", "POST", {
        courseId: id(20),
        enrollmentId: id(40),
        category: "Quiz",
        totalPoints: 10,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await client.request("/assignments", "POST", {
        courseId: id(21),
        title: "Hacked",
        maxPoints: 10,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await client.request("/grades", "POST", {
        courseId: id(20),
        enrollmentId: id(41),
        category: "Quiz",
        totalPoints: 10,
      })
    ).status,
    403,
  );
  assert.equal(
    (await client.request(`/submissions/${id(60)}`, "PATCH", { points: 95 }))
      .status,
    200,
  );
  assert.equal(
    (
      await client.request(`/submissions/${id(60)}`, "PATCH", {
        content: "Rewritten answer",
      })
    ).status,
    403,
  );
  assert.equal(
    (await client.request(`/submissions/${id(61)}`, "PATCH", { points: 100 }))
      .status,
    404,
  );
  assert.equal(
    (
      await client.request(`/assignments/${id(50)}`, "PATCH", {
        courseId: id(21),
      })
    ).status,
    403,
  );
  assert.equal(
    (await client.request(`/users/${id(2)}`, "PATCH", { fullName: "Hacked" }))
      .status,
    404,
  );
  assert.equal(
    (await client.request(`/grades/${id(70)}`, "PATCH", { pointsObtained: 96 }))
      .status,
    200,
  );
  assert.equal(
    (await client.request(`/assignments/${id(51)}`, "DELETE")).status,
    404,
  );
  assert.equal(
    (await client.request(`/assignments/${id(50)}`, "DELETE")).status,
    204,
  );
});
test("employee baseline allows own contact edits but no employment/salary or school administration writes", async () => {
  const { client } = await setup(6);
  assert.equal(
    (await client.request(`/users/${id(6)}`, "PATCH", { phone: "123" })).status,
    200,
  );
  for (const [path, body] of [
    [`/employees/${id(14)}`, { salary: "9999" }],
    [`/events/${id(110)}`, { title: "Hacked" }],
    [`/users/${id(6)}`, { role: "ADMIN" }],
  ])
    assert.equal((await client.request(path, "PATCH", body)).status, 403);
});
test("admin role/password changes revoke target sessions, and current database role governs each request", async () => {
  const { db, api, client } = await setup(1);
  const studentToken = "b".repeat(64);
  db.rows.session.push({
    id: id(201),
    tokenHash: tokenHash(studentToken),
    userId: id(2),
    expiresAt: new Date(Date.now() + 86400000),
  });
  const student = browser(api.base, `school_session=${studentToken}`);
  assert.equal((await student.request("/auth/me")).status, 200);
  assert.equal(
    (await client.request(`/users/${id(2)}`, "PATCH", { role: "TEACHER" }))
      .status,
    200,
  );
  assert.equal((await student.request("/auth/me")).status, 401);
  db.rows.session.push({
    id: id(202),
    tokenHash: tokenHash(studentToken),
    userId: id(2),
    expiresAt: new Date(Date.now() + 86400000),
  });
  assert.equal(
    (
      await client.request(`/users/${id(2)}`, "PATCH", {
        password: "NewPassword123!",
      })
    ).status,
    200,
  );
  assert.equal((await student.request("/auth/me")).status, 401);
  db.rows.user.find((u) => u.id === id(1)).role = "STUDENT";
  assert.equal((await client.request("/audit-logs")).status, 403);
});

test("non-admin creation checks references and writes in one database transaction", async () => {
  const { db, client } = await setup(4);
  let inTransaction = false;
  const originalTransaction = db.$transaction;
  db.$transaction = async (fn, options) =>
    originalTransaction(async (tx) => {
      inTransaction = true;
      try {
        return await fn(tx);
      } finally {
        inTransaction = false;
      }
    }, options);
  for (const [model, method] of [
    ["course", "findFirst"],
    ["assignment", "create"],
  ]) {
    const original = db[model][method];
    db[model][method] = async (args) => {
      if (!inTransaction)
        throw Object.assign(
          new Error("Authorization and insert must be atomic"),
          { code: "P2034" },
        );
      return original(args);
    };
  }
  assert.equal(
    (
      await client.request("/assignments", "POST", {
        courseId: id(20),
        title: "Atomic",
        maxPoints: 10,
      })
    ).status,
    201,
  );
});

test("enrollment revoked before the creation transaction prevents a student insert", async () => {
  const { db, client } = await setup(2);
  const original = db.$transaction;
  db.$transaction = async (fn, options) => {
    db.rows.enrollment.find(row => row.id === id(40)).status = "DROPPED";
    return original(fn, options);
  };
  const count = db.rows.submission.length;
  const result = await client.request("/submissions", "POST", {
    studentId: id(10), assignmentId: id(50), content: "Too late",
  });
  assert.equal(result.status, 403);
  assert.equal(db.rows.submission.length, count);
});
