import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /students
export async function getStudents(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const students = await prisma.student.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(students);
}

// GET /students/:id
export async function getStudentById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const student = await prisma.student.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!student) {
    return res.status(404).json({ error: "Student not found." });
  }

  return res.status(200).json(student);
}

// POST /students
export async function createStudent(req, res) {
  const data = req.validatedBody ?? parseBody("student", "POST", req.body);

  const student = await authorizedCreate(req, (tx) =>
    tx.student.create({
      data,
    }),
  );

  return res.status(201).location(`/students/${student.id}`).json(student);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateStudent(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data = req.validatedBody ?? parseBody("student", req.method, req.body);

  const student = await prisma.student.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(student);
}

// DELETE /students/:id; foreign-key constraints may prevent deletion.
export async function deleteStudent(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.student.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
