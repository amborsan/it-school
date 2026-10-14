import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /courses
export async function getCourses(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const courses = await prisma.course.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(courses);
}

// GET /courses/:id
export async function getCourseById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const course = await prisma.course.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!course) {
    return res.status(404).json({ error: "Course not found." });
  }

  return res.status(200).json(course);
}

// POST /courses
export async function createCourse(req, res) {
  const data = req.validatedBody ?? parseBody("course", "POST", req.body);

  const course = await authorizedCreate(req, (tx) =>
    tx.course.create({
      data,
    }),
  );

  return res.status(201).location(`/courses/${course.id}`).json(course);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateCourse(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data = req.validatedBody ?? parseBody("course", req.method, req.body);

  const course = await prisma.course.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(course);
}

// DELETE /courses/:id; foreign-key constraints may prevent deletion.
export async function deleteCourse(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.course.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
