import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { createApp } from "../../src/app.js";
import { tokenHash } from "../../src/auth/cookies.js";
export const admin = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "admin@example.com",
  role: "ADMIN",
  deletedAt: null,
};
export const fixtureToken = "a".repeat(64);
export function attachSession(db, user = admin) {
  let valid = true;
  db.session ??= {
    findUnique: async ({ where }) =>
      valid && where.tokenHash === tokenHash(fixtureToken)
        ? {
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            tokenHash: where.tokenHash,
            userId: user.id,
            expiresAt: new Date(Date.now() + 86400000),
            user,
          }
        : null,
    deleteMany: async ({ where }) => {
      if (where.userId === user.id) valid = false;
      return { count: 0 };
    },
  };
  db.$transaction ??= async (fn) => fn(db);
  return db;
}
export async function serve(db = {}, options = {}) {
  const app = createApp(options.config);
  app.locals.prisma = db;
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  return {
    app,
    server,
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
export function browser(base, initialCookie = "") {
  const jar = new Map(
    initialCookie
      .split("; ")
      .filter(Boolean)
      .map((pair) => {
        const i = pair.indexOf("=");
        return [pair.slice(0, i), pair.slice(i + 1)];
      }),
  );
  let csrfToken;
  const cookie = () =>
    [...jar].map(([key, value]) => `${key}=${value}`).join("; ");
  async function request(path, method = "GET", body, options = {}) {
    const headers = {
      ...(cookie() ? { cookie: cookie() } : {}),
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      ...options.headers,
    };
    if (body !== undefined)
      headers["content-type"] = options.contentType ?? "application/json";
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      ...(body === undefined
        ? {}
        : { body: options.raw ? body : JSON.stringify(body) }),
    });
    for (const item of response.headers.getSetCookie()) {
      const pair = item.split(";", 1)[0];
      const i = pair.indexOf("=");
      const key = pair.slice(0, i),
        value = pair.slice(i + 1);
      if (value) jar.set(key, decodeURIComponent(value));
      else jar.delete(key);
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (data?.csrfToken) csrfToken = data.csrfToken;
    return {
      status: response.status,
      body: data,
      headers: response.headers,
      location: response.headers.get("location"),
    };
  }
  return { request, cookie, bootstrap: () => request("/auth/csrf") };
}
