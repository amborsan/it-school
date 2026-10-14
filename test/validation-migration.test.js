import assert from "node:assert/strict";
import { test } from "@jest/globals";
import { parseBody, parsePagination } from "../src/middleware/validation.js";
import { Password } from "../src/validation/school-schema.js";
test("Zod strictly validates user writes and leaves omitted PATCH values absent", () => {
  assert.equal(
    parseBody("user", "POST", {
      email: " Person@Example.com ",
      password: "LongPassword123!",
    }).email,
    "person@example.com",
  );
  assert.throws(() =>
    parseBody("user", "POST", {
      email: "person@example.com",
      passwordHash: "client-hash",
    }),
  );
  assert.deepEqual(parseBody("user", "PATCH", { fullName: " Name " }), {
    fullName: "Name",
  });
  assert.throws(() => parseBody("user", "PATCH", {}));
  assert.throws(() => parseBody("user", "PATCH", { role: "SUPERADMIN" }));
  assert.throws(() =>
    parseBody("student", "PATCH", { dateOfBirth: "2026-02-30T00:00:00Z" }),
  );
  assert.throws(() => parsePagination({ limit: ["10", "20"] }));
  assert.equal(Password.parse("  LongPassword123!  "), "  LongPassword123!  ");
});
