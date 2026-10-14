import assert from "node:assert/strict";
import { afterEach, test } from "@jest/globals";
import { serve, browser } from "./helpers/http.js";
import { database } from "./helpers/database.js";
import { verifyPassword } from "../src/auth/passwords.js";
import { tokenHash } from "../src/auth/cookies.js";
const servers = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((api) => api.close()));
});
async function setup() {
  const db = database();
  const api = await serve(db);
  servers.push(api);
  const client = browser(api.base);
  return { db, api, client };
}
const signup = {
  email: " Person@Example.COM ",
  password: "LongPassword123!",
  fullName: " Person ",
};

test("registration requires signed CSRF, creates a student atomically, and stores only a salted hash", async () => {
  const { db, client } = await setup();
  assert.equal(
    (await client.request("/auth/register", "POST", signup)).status,
    403,
  );
  const bootstrap = await client.bootstrap();
  assert.equal(bootstrap.status, 200);
  const response = await client.request("/auth/register", "POST", signup);
  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, "person@example.com");
  assert.equal(response.body.user.role, "STUDENT");
  assert.equal("passwordHash" in response.body.user, false);
  assert.equal("password" in db.rows.user[0], false);
  assert.equal(db.rows.student[0].userId, response.body.user.id);
  assert.ok(
    await verifyPassword(signup.password, db.rows.user[0].passwordHash),
  );
  assert.equal(
    (await client.request("/auth/register", "POST", signup)).status,
    409,
  );
});

test("strict auth schemas reject privilege escalation, password hashes, short passwords and malformed login", async () => {
  const { client } = await setup();
  await client.bootstrap();
  for (const body of [
    { ...signup, role: "ADMIN" },
    { ...signup, passwordHash: "hash" },
    { ...signup, password: "short" },
    { ...signup, user: { role: "ADMIN" } },
  ])
    assert.equal(
      (await client.request("/auth/register", "POST", body)).status,
      400,
    );
  assert.equal(
    (
      await client.request("/auth/login", "POST", {
        email: "invalid",
        password: signup.password,
      })
    ).status,
    400,
  );
});

test("failed profile creation rolls back account registration", async () => {
  const { db, client } = await setup();
  await client.bootstrap();
  db.student.create = async () => {
    throw Object.assign(new Error("relationship"), { code: "P2003" });
  };
  assert.equal(
    (await client.request("/auth/register", "POST", signup)).status,
    409,
  );
  assert.equal(db.rows.user.length, 0);
});

test("login creates a 24-hour hashed session and logout invalidates credential replay", async () => {
  const { db, api, client } = await setup();
  await client.bootstrap();
  await client.request("/auth/register", "POST", signup);
  const before = Date.now();
  const login = await client.request("/auth/login", "POST", {
    email: signup.email,
    password: signup.password,
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, "STUDENT");
  const sessionCookie = client
    .cookie()
    .split("; ")
    .find((pair) => pair.startsWith("school_session="));
  const token = sessionCookie.split("=")[1];
  assert.equal(db.rows.session[0].tokenHash, tokenHash(token));
  assert.equal(JSON.stringify(db.rows.session).includes(token), false);
  assert.ok(db.rows.session[0].expiresAt.getTime() >= before + 86400000);
  const header = login.headers
    .getSetCookie()
    .find((value) => value.startsWith("school_session="));
  assert.ok(header.includes("HttpOnly"));
  assert.ok(header.includes("SameSite=Lax"));
  assert.equal((await client.request("/auth/me")).status, 200);
  assert.equal((await client.request("/auth/logout", "POST")).status, 204);
  assert.equal(db.rows.session.length, 0);
  assert.equal(
    (await browser(api.base, sessionCookie).request("/auth/me")).status,
    401,
  );
});

test("login failures are generic and expired/deleted accounts are rejected", async () => {
  const { db, client } = await setup();
  await client.bootstrap();
  await client.request("/auth/register", "POST", signup);
  const wrong = await client.request("/auth/login", "POST", {
    email: signup.email,
    password: "WrongPassword123!",
  });
  const unknown = await client.request("/auth/login", "POST", {
    email: "missing@example.com",
    password: signup.password,
  });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.body.error, unknown.body.error);
  assert.equal(
    (
      await client.request("/auth/login", "POST", {
        email: signup.email,
        password: signup.password,
      })
    ).status,
    200,
  );
  db.rows.session[0].expiresAt = new Date(0);
  assert.equal((await client.request("/auth/me")).status, 401);
  await client.bootstrap();
  await client.request("/auth/login", "POST", {
    email: signup.email,
    password: signup.password,
  });
  db.rows.user[0].deletedAt = new Date();
  assert.equal((await client.request("/auth/me")).status, 401);
});

test("CSRF rotates on login and cannot be forged by changing both cookie and header", async () => {
  const { api, client } = await setup();
  const bootstrap = await client.bootstrap();
  const oldToken = bootstrap.body.csrfToken;
  await client.request("/auth/register", "POST", signup);
  await client.request("/auth/login", "POST", {
    email: signup.email,
    password: signup.password,
  });
  assert.equal(
    (
      await client.request("/auth/logout", "POST", undefined, {
        headers: { "x-csrf-token": oldToken },
      })
    ).status,
    403,
  );
  const forged = `${"0".repeat(64)}.${Date.now()}.${"0".repeat(64)}`;
  const evil = browser(api.base, `school_csrf=${forged}`);
  assert.equal(
    (
      await evil.request("/auth/register", "POST", signup, {
        headers: { "x-csrf-token": forged },
      })
    ).status,
    403,
  );
});
