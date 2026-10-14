import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /assignments
export async function getAssignments(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const assignments = await prisma.assignment.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(assignments);
}

// GET /assignments/:id
export async function getAssignmentById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const assignment = await prisma.assignment.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found." });
  }

  return res.status(200).json(assignment);
}

// POST /assignments
export async function createAssignment(req, res) {
  const data = req.validatedBody ?? parseBody("assignment", "POST", req.body);

  const assignment = await authorizedCreate(req, (tx) =>
    tx.assignment.create({
      data,
    }),
  );

  return res
    .status(201)
    .location(`/assignments/${assignment.id}`)
    .json(assignment);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateAssignment(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data =
    req.validatedBody ?? parseBody("assignment", req.method, req.body);

  const assignment = await prisma.assignment.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(assignment);
}

// DELETE /assignments/:id; foreign-key constraints may prevent deletion.
export async function deleteAssignment(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.assignment.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
