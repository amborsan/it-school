import assert from "node:assert/strict";
import { afterEach, test, jest } from "@jest/globals";
import { serve, browser, attachSession, fixtureToken } from "./helpers/http.js";
import { readSecurityConfig } from "../src/config/security.js";
const servers = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((api) => api.close()));
  jest.restoreAllMocks();
});
async function setup(db = {}, config = {}) {
  const api = await serve(attachSession(db), {
    config: { ...readSecurityConfig(), ...config },
  });
  servers.push(api);
  const client = browser(api.base, `school_session=${fixtureToken}`);
  await client.bootstrap();
  return { api, client, anonymous: browser(api.base) };
}
const paths = [
  "users",
  "students",
  "teachers",
  "courses",
  "employees",
  "enrollments",
  "assignments",
  "submissions",
  "grades",
  "course-materials",
  "payments",
  "events",
  "reviews",
  "audit-logs",
];
test("all resources reject anonymous list/read/write operations and old bearer tokens", async () => {
  const { anonymous } = await setup();
  for (const path of paths)
    for (const [method, suffix] of [
      ["GET", ""],
      ["GET", "/550e8400-e29b-41d4-a716-446655440000"],
      ["POST", ""],
      ["PATCH", "/550e8400-e29b-41d4-a716-446655440000"],
      ["PUT", "/550e8400-e29b-41d4-a716-446655440000"],
      ["DELETE", "/550e8400-e29b-41d4-a716-446655440000"],
    ]) {
      const response = await anonymous.request(`/${path}${suffix}`, method);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
  assert.equal(
    (
      await anonymous.request("/users", "GET", undefined, {
        headers: {
          authorization: "Bearer old-admin-token",
          "x-user-role": "ADMIN",
        },
      })
    ).status,
    401,
  );
});
test("credentialed CORS preflights allow only configured origins and CSRF headers", async () => {
  const { anonymous } = await setup();
  const allowed = await anonymous.request("/users", "OPTIONS", undefined, {
    headers: {
      origin: "http://localhost:5173",
      "access-control-request-method": "POST",
      "access-control-request-headers": "x-csrf-token,content-type",
    },
  });
  assert.equal(allowed.status, 204);
  assert.equal(
    allowed.headers.get("access-control-allow-origin"),
    "http://localhost:5173",
  );
  assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");
  assert.ok(
    allowed.headers
      .get("access-control-allow-headers")
      .toLowerCase()
      .includes("x-csrf-token"),
  );
  const denied = await anonymous.request("/users", "GET", undefined, {
    headers: { origin: "https://evil.example" },
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
});
test("public discovery sends safe headers without identifying Express", async () => {
  const { anonymous } = await setup();
  const r = await anonymous.request("/");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-powered-by"), null);
});
test("malformed and oversized authenticated JSON return safe errors", async () => {
  const { client } = await setup();
  for (const [body, status] of [
    ["{secret-invalid-json", 400],
    [JSON.stringify({ title: "x".repeat(11000) }), 413],
  ]) {
    const r = await client.request("/courses", "POST", body, { raw: true });
    assert.equal(r.status, status);
    assert.equal(JSON.stringify(r.body).includes("secret-invalid-json"), false);
  }
});
test("unexpected database errors expose no internals in responses or logs", async () => {
  const { client } = await setup({
    course: {
      findMany: async () => {
        throw new Error("postgres://user:secret@private/database");
      },
    },
  });
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  const r = await client.request("/courses");
  assert.equal(r.status, 500);
  assert.equal(r.body.error, "Something went wrong.");
  assert.equal(JSON.stringify(log.mock.calls).includes("secret"), false);
});
test("bounds text/arrays, rejects unsafe URLs, and normalizes text", async () => {
  const { client } = await setup({
    course: {
      create: async ({ data }) => ({
        id: "550e8400-e29b-41d4-a716-446655440000",
        ...data,
      }),
    },
  });
  for (const body of [
    { code: "CS1", title: "x".repeat(4001), prerequisites: [] },
    { code: "CS1", title: "Title", prerequisites: Array(101).fill("CS0") },
    { code: "CS1", title: "Title\u0000", prerequisites: [] },
    { code: "CS1", title: "Title", prerequisites: [], credits: -1 },
  ])
    assert.equal((await client.request("/courses", "POST", body)).status, 400);
  const good = await client.request("/courses", "POST", {
    code: " CS1 ",
    title: " Title ",
    prerequisites: [],
  });
  assert.equal(good.status, 201);
  assert.equal(good.body.title, "Title");
  assert.equal(
    (
      await client.request("/course-materials", "POST", {
        courseId: "550e8400-e29b-41d4-a716-446655440000",
        title: "Test",
        fileUrl: "javascript:alert(1)",
      })
    ).status,
    400,
  );
});
test("registration/login attempts are rate limited", async () => {
  const { anonymous } = await setup({}, { authRateLimit: 2 });
  await anonymous.bootstrap();
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await anonymous.request("/auth/login", "POST", {})).status,
      400,
    );
  const r = await anonymous.request("/auth/login", "POST", {});
  assert.equal(r.status, 429);
  assert.ok(Number(r.headers.get("retry-after")) > 0);
});
test("global budget protects discovery and allowed browsers can inspect 429 responses", async () => {
  const { anonymous } = await setup({}, { apiRateLimit: 2 });
  const headers = { origin: "http://localhost:5173" };
  assert.equal(
    (await anonymous.request("/", "GET", undefined, { headers })).status,
    200,
  );
  const r = await anonymous.request("/", "GET", undefined, { headers });
  assert.equal(r.status, 429);
  assert.equal(r.headers.get("access-control-allow-origin"), headers.origin);
  assert.ok(
    r.headers.get("access-control-expose-headers").includes("Retry-After"),
  );
});
test("write budget blocks mutations without blocking reads", async () => {
  const { client } = await setup(
    {
      course: {
        create: async ({ data }) => ({
          id: "550e8400-e29b-41d4-a716-446655440000",
          ...data,
        }),
        findMany: async () => [],
      },
    },
    { writeRateLimit: 2 },
  );
  const body = { code: "CS1", title: "Intro", prerequisites: [] };
  assert.equal((await client.request("/courses", "POST", body)).status, 201);
  assert.equal((await client.request("/courses", "POST", body)).status, 201);
  assert.equal((await client.request("/courses", "POST", body)).status, 429);
  assert.equal((await client.request("/courses")).status, 200);
});
test("production rejects insecure/spoofed HTTP and only trusts configured proxies", async () => {
  const a = await serve(
    {},
    {
      config: { ...readSecurityConfig(), production: true, trustedProxies: [] },
    },
  );
  servers.push(a);
  assert.equal((await browser(a.base).request("/")).status, 403);
  assert.equal(
    (
      await browser(a.base).request("/", "GET", undefined, {
        headers: { "x-forwarded-proto": "https" },
      })
    ).status,
    403,
  );
  const b = await serve(
    {},
    {
      config: {
        ...readSecurityConfig(),
        production: true,
        trustedProxies: ["127.0.0.1"],
      },
    },
  );
  servers.push(b);
  const r = await browser(b.base).request("/", "GET", undefined, {
    headers: { "x-forwarded-proto": "https" },
  });
  assert.equal(r.status, 200);
  assert.ok(r.headers.get("strict-transport-security").includes("31536000"));
  const csrf = await browser(b.base).request("/auth/csrf", "GET", undefined, {
    headers: { "x-forwarded-proto": "https" },
  });
  assert.ok(csrf.headers.getSetCookie()[0].startsWith("__Host-school_csrf="));
  assert.ok(csrf.headers.getSetCookie()[0].includes("Secure"));
});
test("monetary bounds reject overflow/rounding and accept exact boundary values", async () => {
  const { client } = await setup({
    payment: {
      create: async ({ data }) => ({
        id: "550e8400-e29b-41d4-a716-446655440000",
        ...data,
      }),
    },
  });
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  for (const amount of [
    "-1e-999",
    "-1.00",
    "1e999",
    "1e100",
    "1e35",
    "0.1234567890123456789012345678901",
    "1e-999",
  ])
    assert.equal(
      (await client.request("/payments", "POST", { userId, amount })).status,
      400,
      amount,
    );
  for (const amount of [
    "99999999999999999999999999999999999",
    "1e34",
    "1e-30",
    "000123.4500",
    "0.0000000000000000000000000000000",
  ])
    assert.equal(
      (await client.request("/payments", "POST", { userId, amount })).status,
      201,
      amount,
    );
  assert.equal(
    (
      await client.request("/payments", "POST", {
        userId,
        amount: "1",
        currency: "eur",
      })
    ).status,
    400,
  );
});
