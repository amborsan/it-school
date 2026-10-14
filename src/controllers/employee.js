import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /employees
export async function getEmployees(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const employees = await prisma.employee.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(employees);
}

// GET /employees/:id
export async function getEmployeeById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const employee = await prisma.employee.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!employee) {
    return res.status(404).json({ error: "Employee not found." });
  }

  return res.status(200).json(employee);
}

// POST /employees
export async function createEmployee(req, res) {
  const data = req.validatedBody ?? parseBody("employee", "POST", req.body);

  const employee = await authorizedCreate(req, (tx) =>
    tx.employee.create({
      data,
    }),
  );

  return res.status(201).location(`/employees/${employee.id}`).json(employee);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateEmployee(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data = req.validatedBody ?? parseBody("employee", req.method, req.body);

  const employee = await prisma.employee.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(employee);
}

// DELETE /employees/:id; foreign-key constraints may prevent deletion.
export async function deleteEmployee(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.employee.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
