import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import { hashPassword } from "../auth/passwords.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// Never include a password hash in an API response.
function toPublicUser(user) {
  const { passwordHash, password, ...publicUser } = user;
  return publicUser;
}

// GET /users
export async function getUsers(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const users = await prisma.user.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
    ...(req.access?.select ? {} : { omit: { passwordHash: true } }),
  });

  return res.status(200).json(users.map(toPublicUser));
}

// GET /users/:id
export async function getUserById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
    ...(req.access?.select ? {} : { omit: { passwordHash: true } }),
  });

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  return res.status(200).json(toPublicUser(user));
}

// POST /users
export async function createUser(req, res) {
  const data = req.validatedBody ?? parseBody("user", "POST", req.body);
  data.passwordHash = await hashPassword(data.password);
  delete data.password;

  const user = await authorizedCreate(req, (tx) =>
    tx.user.create({
      data,
      ...(req.access?.select ? {} : { omit: { passwordHash: true } }),
    }),
  );

  return res.status(201).location(`/users/${user.id}`).json(toPublicUser(user));
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateUser(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data = req.validatedBody ?? parseBody("user", req.method, req.body);
  if (data.password !== undefined) {
    data.passwordHash = await hashPassword(data.password);
    delete data.password;
  }

  const user = await prisma.$transaction(
    async (tx) => {
      const updated = await tx.user.update({
        where: scopedWhere(req, id),
        data,
        omit: { passwordHash: true },
      });
      if (
        ["passwordHash", "role", "deletedAt"].some((key) =>
          Object.hasOwn(data, key),
        )
      ) {
        await tx.session.deleteMany({ where: { userId: id } });
      }
      return updated;
    },
    { isolationLevel: "Serializable" },
  );

  return res.status(200).json(toPublicUser(user));
}

// DELETE /users/:id; foreign-key constraints may prevent deletion.
export async function deleteUser(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.user.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
