import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /course-materials
export async function getCourseMaterials(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const courseMaterials = await prisma.courseMaterial.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(courseMaterials);
}

// GET /course-materials/:id
export async function getCourseMaterialById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const courseMaterial = await prisma.courseMaterial.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!courseMaterial) {
    return res.status(404).json({ error: "Course material not found." });
  }

  return res.status(200).json(courseMaterial);
}

// POST /course-materials
export async function createCourseMaterial(req, res) {
  const data =
    req.validatedBody ?? parseBody("courseMaterial", "POST", req.body);

  const courseMaterial = await authorizedCreate(req, (tx) =>
    tx.courseMaterial.create({
      data,
    }),
  );

  return res
    .status(201)
    .location(`/course-materials/${courseMaterial.id}`)
    .json(courseMaterial);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateCourseMaterial(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data =
    req.validatedBody ?? parseBody("courseMaterial", req.method, req.body);

  const courseMaterial = await prisma.courseMaterial.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(courseMaterial);
}

// DELETE /course-materials/:id; foreign-key constraints may prevent deletion.
export async function deleteCourseMaterial(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.courseMaterial.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
