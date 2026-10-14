import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import {
  cookieNames,
  cookieOptions,
  cookies,
  sessionToken,
  tokenHash,
  SESSION_MS,
} from "./cookies.js";
function signature(req, payload) {
  const binding = sessionToken(req)
    ? tokenHash(sessionToken(req))
    : "anonymous";
  return createHmac("sha256", req.app.locals.config.csrfSecret)
    .update(`${binding}:${payload}`)
    .digest("hex");
}
export function issueCsrf(req, res) {
  const payload = `${randomBytes(32).toString("hex")}.${Date.now()}`;
  const token = `${payload}.${signature(req, payload)}`;
  res.cookie(cookieNames(req.app.locals.config).csrf, token, {
    ...cookieOptions(req.app.locals.config),
    maxAge: SESSION_MS,
  });
  return token;
}
export function requireCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const token = req.get("x-csrf-token") ?? "";
  const parts = /^([a-f0-9]{64})\.(\d{13})\.([a-f0-9]{64})$/.exec(token);
  const cookie = cookies(req)[cookieNames(req.app.locals.config).csrf];
  if (
    parts &&
    token === cookie &&
    Number(parts[2]) <= Date.now() &&
    Date.now() - Number(parts[2]) < SESSION_MS &&
    timingSafeEqual(
      Buffer.from(parts[3], "hex"),
      Buffer.from(signature(req, `${parts[1]}.${parts[2]}`), "hex"),
    )
  )
    return next();
  res.status(403).json({ error: "A valid CSRF token is required." });
}
