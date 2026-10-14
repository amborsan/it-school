import { z } from "zod";
// Explicit output allowlist: newly added database fields cannot accidentally leak.
export const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(["STUDENT", "TEACHER", "EMPLOYEE", "ADMIN"]),
  fullName: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().nullable().optional(),
});
export const publicUser = (user) => PublicUserSchema.parse(user);
export const accountSelect = {
  id: true,
  email: true,
  role: true,
  fullName: true,
  firstName: true,
  lastName: true,
  phone: true,
  address: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};
