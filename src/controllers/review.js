import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /reviews
export async function getReviews(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const reviews = await prisma.review.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(reviews);
}

// GET /reviews/:id
export async function getReviewById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const review = await prisma.review.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!review) {
    return res.status(404).json({ error: "Review not found." });
  }

  return res.status(200).json(review);
}

// POST /reviews
export async function createReview(req, res) {
  const data = req.validatedBody ?? parseBody("review", "POST", req.body);

  const review = await authorizedCreate(req, (tx) =>
    tx.review.create({
      data,
    }),
  );

  return res.status(201).location(`/reviews/${review.id}`).json(review);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateReview(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data = req.validatedBody ?? parseBody("review", req.method, req.body);

  const review = await prisma.review.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(review);
}

// DELETE /reviews/:id; foreign-key constraints may prevent deletion.
export async function deleteReview(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.review.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
