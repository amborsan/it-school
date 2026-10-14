import { authorizedCreate } from "../middleware/authorized-create.js";
import { scopedWhere } from "../middleware/scope.js";
import {
  parsePagination as pagination,
  parseBody,
} from "../middleware/validation.js";

// GET /events
export async function getEvents(req, res) {
  const prisma = req.app.locals.prisma;
  const { take, skip } = pagination(req.query);

  const events = await prisma.event.findMany({
    ...(req.access?.where && Object.keys(req.access.where).length
      ? { where: req.access.where }
      : {}),
    ...(req.access?.select ? { select: req.access.select } : {}),
    orderBy: { id: "asc" },
    take,
    skip,
  });

  return res.status(200).json(events);
}

// GET /events/:id
export async function getEventById(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  const event = await prisma.event.findUnique({
    where: scopedWhere(req, id),
    ...(req.access?.select ? { select: req.access.select } : {}),
  });

  if (!event) {
    return res.status(404).json({ error: "Event not found." });
  }

  return res.status(200).json(event);
}

// POST /events
export async function createEvent(req, res) {
  const data = req.validatedBody ?? parseBody("event", "POST", req.body);

  const event = await authorizedCreate(req, (tx) =>
    tx.event.create({
      data,
    }),
  );

  return res.status(201).location(`/events/${event.id}`).json(event);
}

// PUT requires mandatory fields; PATCH validates only the fields being changed.
export async function updateEvent(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;
  const data = req.validatedBody ?? parseBody("event", req.method, req.body);

  const event = await prisma.event.update({
    where: scopedWhere(req, id),
    data,
  });

  return res.status(200).json(event);
}

// DELETE /events/:id; foreign-key constraints may prevent deletion.
export async function deleteEvent(req, res) {
  const prisma = req.app.locals.prisma;
  const { id } = req.params;

  await prisma.event.delete({
    where: scopedWhere(req, id),
  });

  return res.status(204).end();
}
