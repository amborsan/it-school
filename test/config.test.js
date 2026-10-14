import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "@jest/globals";

function startup(env) {
  return spawnSync(
    process.execPath,
    ["--input-type=module", "-e", "await import('./src/app.js')"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, ...env },
    },
  );
}

test("startup rejects missing or weak CSRF secrets, wildcard origins, invalid limits, and broad proxy trust", () => {
  for (const env of [
    { CSRF_SECRET: "" },
    { CSRF_SECRET: "short" },
    { CORS_ORIGINS: "*" },
    { CORS_ORIGINS: "https://admin.example/path" },
    { API_RATE_LIMIT: "0" },
    { AUTH_RATE_LIMIT: "NaN" },
    { TRUSTED_PROXIES: "true" },
    { TRUSTED_PROXIES: "0.0.0.0/0" },
    { NODE_ENV: "production", TRUSTED_PROXIES: "" },
    {
      NODE_ENV: "production",
      TRUSTED_PROXIES: "127.0.0.1",
      CORS_ORIGINS: "http://admin.example",
    },
  ]) {
    const result = startup(env);
    assert.notEqual(
      result.status,
      0,
      `Should reject ${Object.keys(env).join(", ")}`,
    );
    assert.equal(result.stderr.includes(process.env.CSRF_SECRET), false);
  }
});

test("production configuration accepts explicit HTTPS origins and exact proxy addresses", () => {
  const result = startup({
    NODE_ENV: "production",
    TRUSTED_PROXIES: "127.0.0.1,::1",
    CORS_ORIGINS: "https://admin.example",
  });
  assert.equal(result.status, 0, result.stderr);
});
