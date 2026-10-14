import { parseCookie } from "cookie";
import { createHash } from "node:crypto";
export const SESSION_MS = 24 * 60 * 60 * 1000;
export const tokenHash = (token) =>
  createHash("sha256").update(token).digest("hex");
export function cookieNames(config) {
  const prefix = config.production ? "__Host-" : "";
  return { session: `${prefix}school_session`, csrf: `${prefix}school_csrf` };
}
export function cookies(req) {
  return parseCookie(req.headers.cookie ?? "");
}
export function sessionToken(req) {
  return cookies(req)[cookieNames(req.app.locals.config).session];
}
export function cookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.production,
    sameSite: "lax",
    path: "/",
  };
}
export function setSessionCookie(req, res, token) {
  res.cookie(cookieNames(req.app.locals.config).session, token, {
    ...cookieOptions(req.app.locals.config),
    maxAge: SESSION_MS,
  });
}
export function clearAuthCookies(req, res) {
  for (const name of Object.values(cookieNames(req.app.locals.config)))
    res.clearCookie(name, cookieOptions(req.app.locals.config));
}
