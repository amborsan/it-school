import { sessionToken, tokenHash } from "../auth/cookies.js";
import { accountSelect } from "../auth/public-user.js";
export async function requireUser(req, res, next) {
  const token = sessionToken(req);
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    return res.status(401).json({ error: "Authentication is required." });
  const session = await req.app.locals.prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { select: accountSelect } },
  });
  if (
    !session ||
    session.expiresAt <= new Date() ||
    !session.user ||
    session.user.deletedAt
  )
    return res.status(401).json({ error: "Authentication is required." });
  req.user = session.user;
  req.session = session;
  next();
}
