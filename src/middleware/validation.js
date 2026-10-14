import {
  resourceSchemas,
  PaginationSchema,
  IdSchema,
} from "../validation/school-schema.js";

export function parseInput(schema, input) {
  return schema.parse(input);
}
export function parseBody(model, method, body) {
  const schemas = resourceSchemas[model];
  return parseInput(method === "PATCH" ? schemas.update : schemas.create, body);
}
export function parsePagination(query) {
  return parseInput(PaginationSchema, query);
}
export function validateUuidParam(req, res, next, id) {
  IdSchema.parse(id);
  next();
}
