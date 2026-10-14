import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /grades
export async function getGrades(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const grades = await prisma.grade.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(grades);
}

// GET /grades/:id
export async function getGradeById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const grade = await prisma.grade.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!grade) {
    return res.status(404).json({ error: "Grade not found." });
  }

  return res.status(200).json(grade);
}

// POST /grades
export async function createGrade(req, res) {
  const data = req.validatedBody ?? parseBody("grade", "POST", req.body);

  const grade = await authorizedCreate(req, (tx) =>
    tx.grade.create({
      data,
    }),
  );

  return res.status(201).location(`/grades/${grade.id}`).json(grade);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateGrade(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data = req.validatedBody ?? parseBody("grade", req.method, req.body);

  const grade = await prisma.grade.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(grade);
}

// DELETE /grades/:id; foreign-key constraints may prevent deletion.
export async function deleteGrade(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.grade.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
