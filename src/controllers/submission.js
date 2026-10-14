import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /submissions
export async function getSubmissions(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const submissions = await prisma.submission.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(submissions);
}

// GET /submissions/:id
export async function getSubmissionById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const submission = await prisma.submission.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!submission) {
    return res.status(404).json({ error: "Submission not found." });
  }

  return res.status(200).json(submission);
}

// POST /submissions
export async function createSubmission(req, res) {
  const data = req.validatedBody ?? parseBody("submission", "POST", req.body);

  const submission = await authorizedCreate(req, (tx) =>
    tx.submission.create({
      data,
    }),
  );

  return res
    .status(201)
    .location(`/submissions/${submission.id}`)
    .json(submission);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateSubmission(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data =
    req.validatedBody ?? parseBody("submission", req.method, req.body);

  const submission = await prisma.submission.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(submission);
}

// DELETE /submissions/:id; foreign-key constraints may prevent deletion.
export async function deleteSubmission(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.submission.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
