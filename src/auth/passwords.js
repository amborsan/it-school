import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
// Fixed cost prevents corrupt/untrusted stored parameters causing unbounded work.
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64, options);
  return `scrypt$131072$8$1$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password, encoded) {
  const match = /^scrypt\$131072\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(
    encoded ?? "",
  );
  // Missing or legacy hashes still perform the same costly derivation.
  const salt = match?.[1] ?? "00000000000000000000000000000000";
  const expected = Buffer.from(match?.[2] ?? "0".repeat(128), "hex");
  const key = await derive(password, salt, 64, options);
  return timingSafeEqual(key, expected) && Boolean(match);
}
