import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /teachers
export async function getTeachers(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const teachers = await prisma.teacher.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(teachers);
}

// GET /teachers/:id
export async function getTeacherById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const teacher = await prisma.teacher.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!teacher) {
    return res.status(404).json({ error: "Teacher not found." });
  }

  return res.status(200).json(teacher);
}

// POST /teachers
export async function createTeacher(req, res) {
  const data = req.validatedBody ?? parseBody("teacher", "POST", req.body);

  const teacher = await authorizedCreate(req, (tx) =>
    tx.teacher.create({
      data,
    }),
  );

  return res.status(201).location(`/teachers/${teacher.id}`).json(teacher);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateTeacher(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data = req.validatedBody ?? parseBody("teacher", req.method, req.body);

  const teacher = await prisma.teacher.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(teacher);
}

// DELETE /teachers/:id; foreign-key constraints may prevent deletion.
export async function deleteTeacher(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.teacher.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
