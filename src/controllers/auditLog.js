import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /audit-logs
export async function getAuditLogs(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const auditLogs = await prisma.auditLog.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(auditLogs);
}

// GET /audit-logs/:id
export async function getAuditLogById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const auditLog = await prisma.auditLog.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!auditLog) {
    return res.status(404).json({ error: "Audit log not found." });
  }

  return res.status(200).json(auditLog);
}

// POST /audit-logs
export async function createAuditLog(req, res) {
  const data = req.validatedBody ?? parseBody("auditLog", "POST", req.body);

  const auditLog = await authorizedCreate(req, (tx) =>
    tx.auditLog.create({
      data,
    }),
  );

  return res.status(201).location(`/audit-logs/${auditLog.id}`).json(auditLog);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateAuditLog(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data = req.validatedBody ?? parseBody("auditLog", req.method, req.body);

  const auditLog = await prisma.auditLog.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(auditLog);
}

// DELETE /audit-logs/:id; foreign-key constraints may prevent deletion.
export async function deleteAuditLog(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.auditLog.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
