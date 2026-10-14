import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /enrollments
export async function getEnrollments(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const enrollments = await prisma.enrollment.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(enrollments);
}

// GET /enrollments/:id
export async function getEnrollmentById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const enrollment = await prisma.enrollment.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!enrollment) {
    return res.status(404).json({ error: "Enrollment not found." });
  }

  return res.status(200).json(enrollment);
}

// POST /enrollments
export async function createEnrollment(req, res) {
  const data = req.validatedBody ?? parseBody("enrollment", "POST", req.body);

  const enrollment = await authorizedCreate(req, (tx) =>
    tx.enrollment.create({
      data,
    }),
  );

  return res
    .status(201)
    .location(`/enrollments/${enrollment.id}`)
    .json(enrollment);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateEnrollment(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data =
    req.validatedBody ?? parseBody("enrollment", req.method, req.body);

  const enrollment = await prisma.enrollment.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(enrollment);
}

// DELETE /enrollments/:id; foreign-key constraints may prevent deletion.
export async function deleteEnrollment(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.enrollment.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
