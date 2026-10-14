import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /payments
export async function getPayments(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const payments = await prisma.payment.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(payments);
}

// GET /payments/:id
export async function getPaymentById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!payment) {
    return res.status(404).json({ error: "Payment not found." });
  }

  return res.status(200).json(payment);
}

// POST /payments
export async function createPayment(req, res) {
  const data = req.validatedBody ?? parseBody("payment", "POST", req.body);

  const payment = await authorizedCreate(req, (tx) =>
    tx.payment.create({
      data,
    }),
  );

  return res.status(201).location(`/payments/${payment.id}`).json(payment);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updatePayment(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data = req.validatedBody ?? parseBody("payment", req.method, req.body);

  const payment = await prisma.payment.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(payment);
}

// DELETE /payments/:id; foreign-key constraints may prevent deletion.
export async function deletePayment(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.payment.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
