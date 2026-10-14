import { randomBytes } from "node:crypto";
import { RegisterSchema, LoginSchema } from "../validation/school-schema.js";
import { hashPassword, verifyPassword } from "../auth/passwords.js";
import { publicUser } from "../auth/public-user.js";
import {
  tokenHash,
  setSessionCookie,
  clearAuthCookies,
  SESSION_MS,
  sessionToken,
  cookieNames,
} from "../auth/cookies.js";
import { issueCsrf } from "../auth/csrf.js";
export function getCsrf(req, res) {
  res.json({ csrfToken: issueCsrf(req, res) });
}
export async function register(req, res) {
  const { password, ...profile } = RegisterSchema.parse(req.body);
  const passwordHash = await hashPassword(password);
  const user = await req.app.locals.prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { ...profile, passwordHash, role: "STUDENT" },
    });
    await tx.student.create({ data: { userId: created.id } });
    return created;
  });
  res.status(201).json({ user: publicUser(user) });
}
export async function login(req, res) {
  const input = LoginSchema.parse(req.body);
  const prisma = req.app.locals.prisma;
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = await verifyPassword(input.password, user?.passwordHash);
  if (!valid || user.deletedAt)
    return res.status(401).json({ error: "Invalid email or password." });
  const token = randomBytes(32).toString("hex");
  await prisma.$transaction(
    async (tx) => {
      // Recheck the identity inside the same transaction used by password/role changes.
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (
        !current ||
        current.deletedAt ||
        current.passwordHash !== user.passwordHash ||
        current.role !== user.role
      )
        throw Object.assign(new Error("Invalid email or password."), {
          status: 401,
          expose: true,
        });
      if (sessionToken(req))
        await tx.session.deleteMany({
          where: { tokenHash: tokenHash(sessionToken(req)) },
        });
      await tx.session.create({
        data: {
          tokenHash: tokenHash(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + SESSION_MS),
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
  setSessionCookie(req, res, token);
  // CSRF rotates with the session, so pre-login CSRF credentials cannot be reused.
  req.headers.cookie = `${cookieNames(req.app.locals.config).session}=${token}`;
  res.json({ user: publicUser(user), csrfToken: issueCsrf(req, res) });
}
export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
export async function logout(req, res) {
  await req.app.locals.prisma.session.deleteMany({
    where: { id: req.session.id },
  });
  clearAuthCookies(req, res);
  res.status(204).end();
}
