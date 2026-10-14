import { parseBody } from "./validation.js";
const contact = [
  "email",
  "fullName",
  "firstName",
  "lastName",
  "phone",
  "address",
];
const identity = {
  id: true,
  email: true,
  fullName: true,
  firstName: true,
  lastName: true,
};
const studentIdentity = { id: true, userId: true, studentId: true };
const forbidden = () =>
  Object.assign(new Error("This action is not permitted."), {
    status: 403,
    expose: true,
  });

function policy(model, user) {
  const id = user.id;
  const enrolled = {
    enrollments: {
      some: {
        student: { userId: id },
        status: { in: ["ACTIVE", "COMPLETED"] },
      },
    },
  };
  const assigned = { instructor: { userId: id } };
  if (user.role === "ADMIN")
    return { where: {}, create: true, patch: true, put: true, delete: true };
  if (model === "event") return { where: {} };
  if (model === "user") {
    if (user.role === "TEACHER")
      return {
        where: {
          OR: [
            { id },
            { student: { enrollments: { some: { course: assigned } } } },
          ],
        },
        select: identity,
        patch: contact,
      };
    return { where: { id }, patch: contact };
  }
  if (user.role === "STUDENT") {
    switch (model) {
      case "student":
        return { where: { userId: id }, patch: ["dateOfBirth"] };
      case "course":
        return { where: enrolled };
      case "enrollment":
        return { where: { student: { userId: id } } };
      case "payment":
        return { where: { userId: id } };
      case "assignment":
      case "courseMaterial":
        return { where: { course: enrolled } };
      case "grade":
        return {
          where: { enrollment: { student: { userId: id } }, course: enrolled },
        };
      case "submission":
        return {
          where: { student: { userId: id }, assignment: { course: enrolled } },
          create: ["assignmentId", "studentId", "content"],
          patch: ["content"],
        };
      case "review":
        return {
          where: { student: { userId: id }, course: enrolled },
          create: ["courseId", "studentId", "rating", "comment"],
          patch: ["rating", "comment"],
        };
      default:
        return null;
    }
  }
  if (user.role === "TEACHER") {
    switch (model) {
      case "teacher":
        return { where: { userId: id } };
      case "student":
        return {
          where: { enrollments: { some: { course: assigned } } },
          select: studentIdentity,
        };
      case "course":
        return { where: assigned };
      case "enrollment":
        return { where: { course: assigned } };
      case "assignment":
        return {
          where: { course: assigned },
          create: [
            "courseId",
            "title",
            "description",
            "dueDate",
            "maxPoints",
            "fileUrl",
          ],
          patch: ["title", "description", "dueDate", "maxPoints", "fileUrl"],
          delete: true,
        };
      case "courseMaterial":
        return {
          where: { course: assigned },
          create: [
            "courseId",
            "title",
            "description",
            "fileUrl",
            "materialType",
          ],
          patch: ["title", "description", "fileUrl", "materialType"],
          delete: true,
        };
      case "grade":
        return {
          where: { course: assigned, enrollment: { course: assigned } },
          create: [
            "enrollmentId",
            "courseId",
            "category",
            "pointsObtained",
            "totalPoints",
          ],
          patch: ["category", "pointsObtained", "totalPoints"],
          delete: true,
        };
      case "submission":
        return {
          where: { assignment: { course: assigned } },
          patch: ["points"],
        };
      case "review":
        return { where: { course: assigned } };
      default:
        return null;
    }
  }
  if (user.role === "EMPLOYEE" && model === "employee")
    return { where: { userId: id } };
  return null;
}

export function authorizeResource(model) {
  return async (req, res, next) => {
    const access = policy(model, req.user);
    if (!access) throw forbidden();
    const reading = ["GET", "HEAD"].includes(req.method);
    if (!reading) {
      const operation = {
        POST: "create",
        PATCH: "patch",
        PUT: "put",
        DELETE: "delete",
      }[req.method];
      const allowed = access[operation];
      if (!allowed) throw forbidden();
      if (req.method !== "DELETE") {
        if (
          Array.isArray(allowed) &&
          req.body &&
          Object.keys(req.body).some((key) => !allowed.includes(key))
        )
          throw forbidden();
        // Teacher user reads include pupils; profile writes must always target self.
        if (model === "user" && req.user.role !== "ADMIN")
          access.where = { id: req.user.id };
        req.validatedBody = parseBody(model, req.method, req.body);
        if (req.method === "POST" && req.user.role !== "ADMIN")
          access.checkCreate = (tx) =>
            checkCreation(model, req.validatedBody, req, tx);
      }
    }
    req.access = access;
    next();
  };
}
async function checkCreation(model, data, req, db) {
  const user = req.user;
  if (user.role === "STUDENT") {
    const owner = await db.student.findFirst({
      where: { id: data.studentId, userId: user.id },
    });
    if (!owner) throw forbidden();
    const membership = {
      enrollments: {
        some: { studentId: owner.id, status: { in: ["ACTIVE", "COMPLETED"] } },
      },
    };
    const parent =
      model === "submission"
        ? await db.assignment.findFirst({
            where: { id: data.assignmentId, course: membership },
          })
        : await db.course.findFirst({
            where: { id: data.courseId, ...membership },
          });
    if (!parent) throw forbidden();
  } else if (user.role === "TEACHER") {
    const course = await db.course.findFirst({
      where: { id: data.courseId, instructor: { userId: user.id } },
    });
    if (!course) throw forbidden();
    if (
      model === "grade" &&
      !(await db.enrollment.findFirst({
        where: { id: data.enrollmentId, courseId: course.id },
      }))
    )
      throw forbidden();
  }
}
