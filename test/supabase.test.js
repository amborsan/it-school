import { randomUUID } from "node:crypto";
import { expect, test } from "@jest/globals";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { hashPassword } from "../src/auth/passwords.js";
import { serve, browser } from "./helpers/http.js";

test("cookie-authenticated course CRUD persists in the dedicated test database", async () => {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error(
      "Set TEST_DATABASE_URL to a dedicated migrated test database.",
    );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.TEST_DATABASE_URL,
      connectionTimeoutMillis: 10000,
    }),
  });
  const suffix = randomUUID();
  const userId = randomUUID();
  const code = `TEST-${suffix}`;
  const password = "IntegrationPassword123!";
  let api,
    connected = false,
    userCreated = false;
  try {
    await prisma.$connect();
    connected = true;
    await prisma.user.create({
      data: {
        id: userId,
        email: `test-${suffix}@example.com`,
        role: "ADMIN",
        passwordHash: await hashPassword(password),
      },
    });
    userCreated = true;
    api = await serve(prisma);
    const client = browser(api.base);
    await client.bootstrap();
    expect((await client.request("/courses")).status).toBe(401);
    expect(
      (
        await client.request("/auth/login", "POST", {
          email: `test-${suffix}@example.com`,
          password,
        })
      ).status,
    ).toBe(200);
    const created = await client.request("/courses", "POST", {
      code,
      title: "Integration course",
      prerequisites: [],
    });
    expect(created.status).toBe(201);
    const course = created.body;
    expect(created.location).toBe(`/courses/${course.id}`);
    expect(
      (await prisma.course.findUnique({ where: { id: course.id } })).title,
    ).toBe("Integration course");
    expect((await client.request(`/courses/${course.id}`)).status).toBe(200);
    expect(
      Array.isArray((await client.request("/courses?limit=100")).body),
    ).toBe(true);
    expect(
      (
        await client.request(`/courses/${course.id}`, "PATCH", {
          title: "Updated",
        })
      ).status,
    ).toBe(200);
    expect(
      (await prisma.course.findUnique({ where: { id: course.id } })).title,
    ).toBe("Updated");
    expect(
      (
        await client.request(`/courses/${course.id}`, "PUT", {
          code,
          title: "Replaced",
          prerequisites: [],
        })
      ).status,
    ).toBe(200);
    expect(
      (await client.request(`/courses/${course.id}`, "DELETE")).status,
    ).toBe(204);
    expect(
      await prisma.course.findUnique({ where: { id: course.id } }),
    ).toBeNull();
    expect((await client.request("/auth/logout", "POST")).status).toBe(204);
    expect((await client.request("/auth/me")).status).toBe(401);
  } finally {
    try {
      if (api) await api.close();
      if (connected) {
        await prisma.course.deleteMany({ where: { code } });
        if (userCreated) await prisma.user.delete({ where: { id: userId } });
      }
    } finally {
      await prisma.$disconnect();
    }
  }
});
