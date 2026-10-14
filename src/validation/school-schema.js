import { z } from "zod";
import {
  Text,
  RequiredText,
  Email,
  Password,
  IdSchema,
  Integer,
  Timestamp,
  HttpUrl,
  Decimal,
} from "./values.js";
export { IdSchema, Password } from "./values.js";

function resource(shape) {
  const create = z.strictObject(shape);
  const update = create
    .partial()
    .refine(
      (value) => Object.keys(value).length > 0,
      "Provide at least one writable field.",
    );
  return { create, update };
}
export const resourceSchemas = {
  courseMaterial: resource({
    courseId: IdSchema,
    title: RequiredText,
    description: Text.nullable().optional(),
    fileUrl: HttpUrl.nullable().optional(),
    materialType: z
      .enum([
        "VIDEO",
        "PDF",
        "LIVE_Lecture",
        "DOCUMENT",
        "QUIZ",
        "CODE_REPOSITORY",
      ])
      .optional(),
  }),
  grade: resource({
    enrollmentId: IdSchema,
    courseId: IdSchema,
    category: RequiredText,
    pointsObtained: Integer.nullable().optional(),
    totalPoints: Integer,
  }),
  payment: resource({
    userId: IdSchema,
    amount: Decimal,
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
    method: Text.nullable().optional(),
    enrollmentId: IdSchema.nullable().optional(),
  }),
  event: resource({
    title: RequiredText,
    description: Text.nullable().optional(),
    eventDate: Timestamp,
    maxAttendees: Integer.nullable().optional(),
    location: Text.nullable().optional(),
  }),
  teacher: resource({
    userId: IdSchema,
    employeeId: Text.nullable().optional(),
    department: Text.nullable().optional(),
    position: Text.nullable().optional(),
    hireDate: Timestamp.nullable().optional(),
  }),
  user: resource({
    email: Email,
    password: Password,
    fullName: Text.nullable().optional(),
    firstName: Text.nullable().optional(),
    lastName: Text.nullable().optional(),
    role: z.enum(["STUDENT", "TEACHER", "ADMIN", "EMPLOYEE"]).optional(),
    phone: Text.nullable().optional(),
    address: Text.nullable().optional(),
    deletedAt: Timestamp.nullable().optional(),
  }),
  employee: resource({
    userId: IdSchema,
    employeeId: RequiredText,
    department: RequiredText,
    position: RequiredText,
    hireDate: Timestamp.nullable().optional(),
    salary: Decimal.nullable().optional(),
    isActive: z.boolean().optional(),
  }),
  student: resource({
    userId: IdSchema,
    studentId: Text.nullable().optional(),
    dateOfBirth: Timestamp.nullable().optional(),
    enrollmentDate: Timestamp.optional(),
  }),
  assignment: resource({
    courseId: IdSchema,
    title: RequiredText,
    description: Text.nullable().optional(),
    dueDate: Timestamp.nullable().optional(),
    maxPoints: Integer,
    fileUrl: HttpUrl.nullable().optional(),
  }),
  auditLog: resource({
    entityType: RequiredText,
    entityId: RequiredText,
    action: RequiredText,
    userId: Text.nullable().optional(),
    description: Text.nullable().optional(),
  }),
  submission: resource({
    assignmentId: IdSchema,
    studentId: IdSchema,
    content: Text.nullable().optional(),
    points: Integer.nullable().optional(),
    submittedAt: Timestamp.optional(),
  }),
  review: resource({
    studentId: IdSchema,
    courseId: IdSchema,
    rating: Integer.min(1).max(5),
    comment: Text.nullable().optional(),
    reviewedAt: Timestamp.optional(),
  }),
  course: resource({
    code: RequiredText,
    title: RequiredText,
    description: Text.nullable().optional(),
    instructorId: IdSchema.nullable().optional(),
    credits: Integer.optional(),
    level: z.enum(["BASIC", "INTERMEDIATE", "ADVANCED"]).optional(),
    prerequisites: z.array(RequiredText).max(100),
    maxStudents: Integer.nullable().optional(),
  }),
  enrollment: resource({
    studentId: IdSchema,
    courseId: IdSchema,
    status: z.enum(["PENDING", "ACTIVE", "COMPLETED", "DROPPED"]).optional(),
    enrolledAt: Timestamp.optional(),
  }),
};
export const RegisterSchema = z.strictObject({
  email: Email,
  password: Password,
  fullName: Text.nullable().optional(),
  firstName: Text.nullable().optional(),
  lastName: Text.nullable().optional(),
});
export const LoginSchema = z.strictObject({
  email: Email,
  password: z.string().min(1).max(128),
});
const queryInteger = (fallback, min, max) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max))
    .default(fallback);
export const PaginationSchema = z
  .strictObject({
    limit: queryInteger(50, 1, 100),
    offset: queryInteger(0, 0, 2147483647),
  })
  .transform(({ limit, offset }) => ({ take: limit, skip: offset }));
