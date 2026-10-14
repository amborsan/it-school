import assert from "node:assert/strict";
import { test } from "@jest/globals";
import { database } from "./helpers/database.js";
import { bootstrapAdmin } from "../src/auth/bootstrap-admin.js";
import { verifyPassword } from "../src/auth/passwords.js";
test("server bootstrap creates only the initial administrator with a compatible hash", async () => {
  const db = database();
  const input = { email: " Admin@Example.com ", password: "LongPassword123!" };
  const admin = await bootstrapAdmin(db, input);
  assert.equal(admin.role, "ADMIN");
  assert.equal(admin.email, "admin@example.com");
  assert.equal("passwordHash" in admin, false);
  assert.ok(await verifyPassword(input.password, db.rows.user[0].passwordHash));
  await assert.rejects(
    bootstrapAdmin(db, { ...input, email: "another@example.com" }),
    /already exists/,
  );
  assert.equal(db.rows.user.length, 1);
});
